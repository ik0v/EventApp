// src/tests/eventPage.test.tsx
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import EventPage from "../pages/eventPage";

vi.mock("../components/navBar", () => ({
  default: () => <div>NavBar</div>,
}));

let authState: { isAdmin: boolean; sub: string | null } = {
  isAdmin: false,
  sub: null,
};

vi.mock("../components/authContext", () => ({
  useAuth: () => authState,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  authState = { isAdmin: false, sub: null };
});

type MockResp = {
  ok: boolean;
  status: number;
  statusText?: string;
  body?: any;
};

function mockFetch(routes: Record<string, MockResp | MockResp[]>) {
  const callsByPrefix = new Map<string, number>();

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : (input?.url ?? "");

      const hit = Object.entries(routes).find(([prefix]) =>
        url.startsWith(prefix),
      );
      if (!hit) {
        return {
          ok: false,
          status: 500,
          statusText: "Unhandled fetch in test",
          json: async () => ({ url, init }),
        } as any;
      }

      const [prefix, cfg] = hit;
      const idx = callsByPrefix.get(prefix) ?? 0;
      callsByPrefix.set(prefix, idx + 1);

      const r = Array.isArray(cfg) ? cfg[Math.min(idx, cfg.length - 1)] : cfg;

      return {
        ok: r?.ok,
        status: r?.status,
        statusText: r?.statusText ?? (r?.ok ? "OK" : "ERR"),
        json: async () => r?.body,
      } as any;
    }),
  );
}

function renderEventAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/events/${id}`]}>
      <Routes>
        <Route path="/events/:id" element={<EventPage />} />
        <Route path="/events" element={<div>EventsIndex</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EventPage", () => {
  it("shows loading then renders event with placeholder image and attendees count", async () => {
    mockFetch({
      "/api/events/1": {
        ok: true,
        status: 200,
        body: {
          _id: "1",
          title: "My Event",
          createdBy: "u1",
          attendees: [{ userSub: "x" }, { userSub: "y" }],
        },
      },
    });

    const app = renderEventAt("1");

    expect(app.container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(await app.findByText("My Event")).toBeInTheDocument();

    expect(app.getByText("NavBar")).toBeInTheDocument();
    expect(app.getByText("No image")).toBeInTheDocument();
    expect(app.getByText(/2 attending/i)).toBeInTheDocument();
  });

  it("shows error when load fails", async () => {
    mockFetch({
      "/api/events/1": { ok: false, status: 500, statusText: "Server Error" },
    });

    const app = renderEventAt("1");
    expect(await app.findByText(/500/i)).toBeInTheDocument();
  });

  it("shows error when event id format is wrong", async () => {
    mockFetch({
      "/api/events/1": {
        ok: false,
        status: 404,
        body: { message: "Wrong event id format" },
      },
    });
    const app = renderEventAt("1");
    expect(await app.findByText(/Wrong event id format/i)).toBeInTheDocument();
  });

  it("non-owner admin cannot edit/delete (createdBy mismatch)", async () => {
    authState = { isAdmin: true, sub: "admin-sub" };

    mockFetch({
      "/api/events/1": {
        ok: true,
        status: 200,
        body: {
          _id: "1",
          title: "E",
          createdBy: "someone-else",
          attendees: [],
        },
      },
    });

    const app = renderEventAt("1");
    expect(await app.findByText("E")).toBeInTheDocument();

    expect(app.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(app.queryByRole("button", { name: "Delete" })).toBeNull();
  });

  it("owner admin can enter edit mode, then cancel", async () => {
    authState = { isAdmin: true, sub: "u1" };

    mockFetch({
      "/api/events/1": {
        ok: true,
        status: 200,
        body: {
          _id: "1",
          title: "Editable Title",
          description: "Desc",
          place: "Oslo",
          category: "Fun",
          time: "2026-02-23T18:30:00Z",
          createdBy: "u1",
          attendees: [{ userSub: "x" }],
        },
      },
    });

    const app = renderEventAt("1");
    expect(await app.findByText("Editable Title")).toBeInTheDocument();

    fireEvent.click(app.getByRole("button", { name: "Edit" }));

    expect(app.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(app.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    // attendees count hidden while editing
    expect(app.queryByText(/attending/i)).toBeNull();

    fireEvent.click(app.getByRole("button", { name: "Cancel" }));
    expect(await app.findByText("Editable Title")).toBeInTheDocument();
    expect(app.getByText(/1 attending/i)).toBeInTheDocument();
  });

  it("save edit: PUTs payload (no time when cleared) and then shows updated title", async () => {
    authState = { isAdmin: true, sub: "u1" };

    mockFetch({
      "/api/events/1": [
        // initial GET
        {
          ok: true,
          status: 200,
          body: {
            _id: "1",
            title: "Old Title",
            time: "2026-02-23T18:30:00Z",
            createdBy: "u1",
            attendees: [],
          },
        },
        // PUT response (same URL, second call)
        {
          ok: true,
          status: 200,
          body: {},
        },
        // reload GET after saveEdit()
        {
          ok: true,
          status: 200,
          body: {
            _id: "1",
            title: "New Title",
            createdBy: "u1",
            attendees: [],
          },
        },
      ],
    });

    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    const app = renderEventAt("1");
    expect(await app.findByText("Old Title")).toBeInTheDocument();

    fireEvent.click(app.getByRole("button", { name: "Edit" }));

    const titleInput = app.getByDisplayValue("Old Title") as HTMLInputElement;
    fireEvent.change(titleInput, { target: { value: "New Title" } });

    const timeInput = app.container.querySelector(
      'input[type="datetime-local"]',
    ) as HTMLInputElement;
    expect(timeInput).toBeTruthy();
    fireEvent.change(timeInput, { target: { value: "" } });

    fireEvent.click(app.getByRole("button", { name: "Update" }));

    const putCall = fetchSpy.mock.calls.find(
      (c) => c[0] === "/api/events/1" && c[1]?.method === "PUT",
    );
    expect(putCall).toBeTruthy();

    const body = JSON.parse(putCall![1].body);
    expect(body.title).toBe("New Title");
    expect(body).not.toHaveProperty("time");

    expect(await app.findByText("New Title")).toBeInTheDocument();
  });

  it("delete: cancel confirm does not call DELETE or navigate", async () => {
    authState = { isAdmin: true, sub: "u1" };
    vi.spyOn(window, "confirm").mockReturnValue(false);

    mockFetch({
      "/api/events/1": {
        ok: true,
        status: 200,
        body: { _id: "1", title: "To Delete", createdBy: "u1", attendees: [] },
      },
    });

    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    const app = renderEventAt("1");
    expect(await app.findByText("To Delete")).toBeInTheDocument();

    fireEvent.click(app.getByRole("button", { name: "Delete" }));

    expect(fetchSpy).not.toHaveBeenCalledWith(
      "/api/events/1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(app.queryByText("EventsIndex")).toBeNull();
  });

  it("delete: confirm calls DELETE and navigates to /events", async () => {
    authState = { isAdmin: true, sub: "u1" };
    vi.spyOn(window, "confirm").mockReturnValue(true);

    mockFetch({
      "/api/events/1": [
        // initial GET
        {
          ok: true,
          status: 200,
          body: {
            _id: "1",
            title: "To Delete",
            createdBy: "u1",
            attendees: [],
          },
        },
        // DELETE response
        { ok: true, status: 204, body: {} },
      ],
    });

    const app = renderEventAt("1");
    expect(await app.findByText("To Delete")).toBeInTheDocument();

    fireEvent.click(app.getByRole("button", { name: "Delete" }));

    expect(await app.findByText("EventsIndex")).toBeInTheDocument();
  });

  it("join flow: POST attend then reload reflects 'Leave'", async () => {
    authState = { isAdmin: false, sub: "u1" };

    mockFetch({
      "/api/events/1": [
        // initial GET
        {
          ok: true,
          status: 200,
          body: { _id: "1", title: "Joinable", createdBy: "x", attendees: [] },
        },
        // POST /attend response (will still hit /api/events/1? No, different URL, so we need to include it)
        // so we keep /api/events/1 list for GETs only and add /api/events/1/attend separately
        {
          ok: true,
          status: 200,
          body: {
            _id: "1",
            title: "Joinable",
            createdBy: "x",
            attendees: [{ userSub: "u1" }],
          },
        },
      ],
      "/api/events/1/attend": { ok: true, status: 200, body: {} },
    });

    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    const app = renderEventAt("1");
    expect(await app.findByText("Joinable")).toBeInTheDocument();

    fireEvent.click(app.getByRole("button", { name: "Join" }));

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/events/1/attend",
      expect.objectContaining({ method: "POST" }),
    );

    expect(
      await app.findByRole("button", { name: "Leave" }),
    ).toBeInTheDocument();
  });

  it("admin sees attendee list with fallbacks + avatar placeholder", async () => {
    authState = { isAdmin: true, sub: "admin" };

    mockFetch({
      "/api/events/1": {
        ok: true,
        status: 200,
        body: {
          _id: "1",
          title: "Admin View",
          createdBy: "x",
          attendees: [
            { userSub: "a1", name: "Alice", email: "alice@test.com" },
            { userSub: "a2", email: "bob@test.com" },
            { userSub: "a3" },
          ],
        },
      },
    });

    const app = renderEventAt("1");
    expect(await app.findByText("Admin View")).toBeInTheDocument();

    expect(app.getByText("Attendees")).toBeInTheDocument();
    expect(app.getByText("Alice")).toBeInTheDocument();
    expect(app.getByText("alice@test.com")).toBeInTheDocument();
    expect(app.getByText("bob@test.com")).toBeInTheDocument();
    expect(app.getByText("a3")).toBeInTheDocument();

    const placeholders = app.container.querySelectorAll(
      ".event-page-attendee-avatar.placeholder",
    );
    expect(placeholders.length).toBeGreaterThan(0);
  });
});
