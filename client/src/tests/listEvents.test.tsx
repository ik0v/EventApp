import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import EventsPage from "../pages/eventsPage";
import ListEvents from "../components/listEvents";

// ---- shared auth mock state (used by ListEvents + LoginCallback in other tests) ----
const reloadMock = vi.fn();

let authState: {
  loggedIn: boolean;
  isAdmin: boolean;
  sub: string | null;
  loadingUser: boolean;
} = {
  loggedIn: false,
  isAdmin: false,
  sub: null,
  loadingUser: false,
};

vi.mock("../components/authContext", () => ({
  useAuth: () => ({
    ...authState,
    reload: reloadMock,
  }),
}));

// Mock NavBar to keep EventsPage test stable (NavBar often has extra logic/fetch)
vi.mock("../components/navBar", () => ({
  default: () => <div>NavBar</div>,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // reset auth between tests
  authState = {
    loggedIn: false,
    isAdmin: false,
    sub: null,
    loadingUser: false,
  };
});

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/**
 * Fetch mock with per-url handlers.
 * Supports sequential responses by passing an array of responses for a prefix.
 */
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

      const [prefix, config] = hit;
      const idx = callsByPrefix.get(prefix) ?? 0;
      callsByPrefix.set(prefix, idx + 1);

      const r = Array.isArray(config)
        ? config[Math.min(idx, config.length - 1)]
        : config;

      return {
        ok: r?.ok,
        status: r?.status,
        statusText: r?.statusText ?? (r?.ok ? "OK" : "ERR"),
        json: async () => r?.body ?? {},
      } as any;
    }),
  );
}

describe("EventsPage", () => {
  it("renders NavBar and ListEvents section", async () => {
    // Mock events so ListEvents doesn't get stuck in loading
    mockFetch({
      "/api/events": { ok: true, status: 200, body: [] },
    });

    const app = renderWithRouter(<EventsPage />);
    expect(app.getByText("NavBar")).toBeInTheDocument();
    expect(await app.findByText("Events")).toBeInTheDocument();
    expect(await app.findByText("No events yet.")).toBeInTheDocument();
  });
});

describe("ListEvents", () => {
  it("shows Loading then 'No events yet.' when API returns empty array", async () => {
    mockFetch({
      "/api/events": { ok: true, status: 200, body: [] },
    });

    const app = renderWithRouter(<ListEvents />);

    expect(app.container.querySelector(".events-loading")).toBeTruthy();
    expect(await app.findByText("No events yet.")).toBeInTheDocument();
  });

  it("shows error when /api/events fails", async () => {
    mockFetch({
      "/api/events": { ok: false, status: 500, statusText: "Server Error" },
    });

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText(/500 Server Error/i)).toBeInTheDocument();
  });

  it("Reload button triggers a second load", async () => {
    mockFetch({
      "/api/events": [
        { ok: true, status: 200, body: [] },
        {
          ok: true,
          status: 200,
          body: [
            {
              _id: "1",
              title: "Event After Reload",
              place: "Oslo",
              time: "2026-02-23T18:30:00Z",
              category: "Fun",
            },
          ],
        },
      ],
    });

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText("No events yet.")).toBeInTheDocument();

    fireEvent.click(app.getByRole("button", { name: /Reload/i }));

    expect(await app.findByText("Event After Reload")).toBeInTheDocument();
    expect(app.getByText("Oslo")).toBeInTheDocument();
    const card = app.getByText("Event After Reload").closest(".event-card");
    expect(card).toBeTruthy();
  });

  it("when logged out: join button says 'Login to join' and is disabled", async () => {
    authState.sub = null;

    mockFetch({
      "/api/events": {
        ok: true,
        status: 200,
        body: [{ _id: "1", title: "Event 1", attendees: [] }],
      },
    });

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText("Event 1")).toBeInTheDocument();

    const btn = app.getByRole("button", { name: /Login to join/i });
    expect(btn).toBeDisabled();
  });

  it("Join flow: POSTs attend, then reloads and shows 'Leave'", async () => {
    authState.sub = "u1";
    authState.loggedIn = true;

    // 1st load: not joined
    // after POST: loadEvents() called again, 2nd load returns attendee -> joined
    mockFetch({
      "/api/events": [
        {
          ok: true,
          status: 200,
          body: [{ _id: "1", title: "Event 1", attendees: [] }],
        },
        {
          ok: true,
          status: 200,
          body: [
            { _id: "1", title: "Event 1", attendees: [{ userSub: "u1" }] },
          ],
        },
      ],
      "/api/events/1/attend": { ok: true, status: 200 },
    });

    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText("Event 1")).toBeInTheDocument();

    const joinBtn = app.getByRole("button", { name: "Join" });
    fireEvent.click(joinBtn);

    // verify attend request
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/events/1/attend",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ status: "going" }),
      }),
    );

    // after reload, should show Leave
    expect(
      await app.findByRole("button", { name: "Leave" }),
    ).toBeInTheDocument();
  });

  it("Leave flow: DELETEs attend, then reloads and shows 'Join'", async () => {
    authState.sub = "u1";
    authState.loggedIn = true;

    mockFetch({
      "/api/events": [
        {
          ok: true,
          status: 200,
          body: [
            { _id: "1", title: "Event 1", attendees: [{ userSub: "u1" }] },
          ],
        },
        {
          ok: true,
          status: 200,
          body: [{ _id: "1", title: "Event 1", attendees: [] }],
        },
      ],
      "/api/events/1/attend": { ok: true, status: 200 },
    });

    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText("Event 1")).toBeInTheDocument();

    const leaveBtn = app.getByRole("button", { name: "Leave" });
    fireEvent.click(leaveBtn);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/events/1/attend",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );

    expect(
      await app.findByRole("button", { name: "Join" }),
    ).toBeInTheDocument();
  });

  it("when logged out: shows 'Login to join' and button is disabled (no attend call)", async () => {
    authState.sub = null;
    authState.loggedIn = false;

    mockFetch({
      "/api/events": {
        ok: true,
        status: 200,
        body: [{ _id: "1", title: "Event 1", attendees: [] }],
      },
    });

    const fetchSpy = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText("Event 1")).toBeInTheDocument();

    const btn = app.getByRole("button", { name: /Login to join/i });
    expect(btn).toBeDisabled();

    // Click does nothing when disabled — and attend endpoint is never called.
    // (Optional assertion:)
    expect(fetchSpy).toHaveBeenCalledTimes(1); // only initial /api/events load
    expect(fetchSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("/attend"),
      expect.anything(),
    );
  });

  it("renders optional fields and shows placeholder when imageUrl is missing", async () => {
    mockFetch({
      "/api/events": {
        ok: true,
        status: 200,
        body: [
          {
            _id: "1",
            title: "No Image Event",
            description: "Hello",
            place: "Oslo",
            time: "2026-02-23T18:30:00Z",
            category: "Fun",
            attendees: [],
          },
        ],
      },
    });

    const app = renderWithRouter(<ListEvents />);

    expect(await app.findByText("No Image Event")).toBeInTheDocument();
    expect(app.getByText("Hello")).toBeInTheDocument();
    expect(app.getByText("Oslo")).toBeInTheDocument();

    // placeholder branch
    expect(app.getByText("No image")).toBeInTheDocument();

    // time branch: we can’t reliably assert exact locale formatting,
    // but we CAN assert that the "Time" label renders.
    expect(app.getByText("Time")).toBeInTheDocument();
  });

  it("links each event card to /events/:id", async () => {
    mockFetch({
      "/api/events": {
        ok: true,
        status: 200,
        body: [{ _id: "abc", title: "Event ABC", attendees: [] }],
      },
    });

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText("Event ABC")).toBeInTheDocument();

    const link = app.getByRole("link"); // only one link in this render
    expect(link).toHaveAttribute("href", "/events/abc");
  });

  it("clears error after successful reload", async () => {
    mockFetch({
      "/api/events": [
        { ok: false, status: 500, statusText: "Server Error" },
        { ok: true, status: 200, body: [] },
      ],
    });

    const app = renderWithRouter(<ListEvents />);

    expect(await app.findByText(/500/i)).toBeInTheDocument();

    fireEvent.click(app.getByRole("button", { name: /Reload/i }));

    // error should disappear and empty state shown
    expect(await app.findByText("No events yet.")).toBeInTheDocument();
    expect(app.queryByText(/500/i)).toBeNull();
  });

  it("shows 'Leave' when current user is in attendees", async () => {
    authState.sub = "u1";
    authState.loggedIn = true;

    mockFetch({
      "/api/events": {
        ok: true,
        status: 200,
        body: [
          {
            _id: "1",
            title: "Joined Event",
            attendees: [{ userSub: "u1" }],
          },
        ],
      },
    });

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText("Joined Event")).toBeInTheDocument();
    expect(app.getByRole("button", { name: "Leave" })).toBeInTheDocument();
  });
  it("Apply and Clear filters update query and reload events", async () => {
    const fetchSpy = vi.fn(async (input: any) => {
      const url = typeof input === "string" ? input : (input?.url ?? "");

      return {
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => [
          {
            _id: "1",
            title: url.includes("title=test")
              ? "Filtered Event"
              : "Initial Event",
            place: "Oslo",
            category: "Fun",
          },
        ],
      } as any;
    });

    vi.stubGlobal("fetch", fetchSpy as any);

    const app = renderWithRouter(<ListEvents />);

    // initial load
    expect(await app.findByText("Initial Event")).toBeInTheDocument();

    // fill filter
    fireEvent.change(app.getByLabelText(/Title/i), {
      target: { value: "test" },
    });

    // click Apply → triggers applyFilters + reload
    fireEvent.click(app.getByRole("button", { name: /Apply/i }));

    expect(await app.findByText("Filtered Event")).toBeInTheDocument();

    // click Clear → triggers clearFilters + reload
    fireEvent.click(app.getByRole("button", { name: /Clear/i }));

    expect(await app.findByText("Initial Event")).toBeInTheDocument();
  });
});
