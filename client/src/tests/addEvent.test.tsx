import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { waitFor } from "@testing-library/react";

import AddEventPage from "../pages/addEventPage";
import AddEventForm from "../components/addEventForm";

// keep page tests stable
vi.mock("../components/navBar", () => ({
  default: () => <div>NavBar</div>,
}));

// ---- auth mock ----
let authState: { sub: string | null } = { sub: null };

vi.mock("../components/authContext", () => ({
  useAuth: () => authState,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  authState = { sub: null };
});

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("AddEventPage", () => {
  it("renders NavBar and AddEventForm", () => {
    const app = renderWithRouter(<AddEventPage />);
    expect(app.getByText("NavBar")).toBeInTheDocument();
    expect(app.getByText(/Add event/i)).toBeInTheDocument(); // form title
  });
});

describe("AddEventForm", () => {
  it("populates category select options from effect", async () => {
    const app = renderWithRouter(<AddEventForm />);

    // select has a label "Category *" so use getByLabelText
    const select = app.getByLabelText(/Category/i) as HTMLSelectElement;

    // options are rendered after useEffect; find one
    expect(await app.findByRole("option", { name: "Fun" })).toBeInTheDocument();
    expect(app.getByRole("option", { name: "Education" })).toBeInTheDocument();
    expect(app.getByRole("option", { name: "Animals" })).toBeInTheDocument();

    // default is empty (placeholder option selected)
    expect(select.value).toBe("");
  });

  it("submits POST /api/events, shows success result, then 'Add another' brings back empty form", async () => {
    authState.sub = "u1";

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 201,
      statusText: "Created",
      json: async () => ({}),
    })) as any;
    vi.stubGlobal("fetch", fetchSpy);

    const app = renderWithRouter(<AddEventForm />);

    const title = app.getByLabelText(/Title/i) as HTMLInputElement;
    const desc = app.getByLabelText(/Description/i) as HTMLTextAreaElement;
    const place = app.getByLabelText(/Place/i) as HTMLInputElement;
    const time = app.getByLabelText(/Time/i) as HTMLInputElement;
    const category = app.getByLabelText(/Category/i) as HTMLSelectElement;

    fireEvent.change(title, { target: { value: "My Title" } });
    fireEvent.change(desc, { target: { value: "Some description" } });
    fireEvent.change(place, { target: { value: "Oslo" } });
    fireEvent.change(time, { target: { value: "2026-02-26T12:30" } });

    await app.findByRole("option", { name: "Fun" });
    fireEvent.change(category, { target: { value: "Fun" } });

    fireEvent.click(app.getByRole("button", { name: /Submit/i }));

    // request was sent
    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/events",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body).toEqual({
      title: "My Title",
      description: "Some description",
      place: "Oslo",
      time: "2026-02-26T12:30",
      category: "Fun",
      createdBy: "u1",
    });

    // success result card replaces the form
    expect(await app.findByText(/Event added/i)).toBeInTheDocument();
    expect(
      app.getByRole("button", { name: /Add another/i }),
    ).toBeInTheDocument();
    expect(
      app.getByRole("button", { name: /Go to events/i }),
    ).toBeInTheDocument();

    // click add another -> form comes back empty
    fireEvent.click(app.getByRole("button", { name: /Add another/i }));

    await waitFor(() => {
      expect((app.getByLabelText(/Title/i) as HTMLInputElement).value).toBe("");
      expect(
        (app.getByLabelText(/Description/i) as HTMLTextAreaElement).value,
      ).toBe("");
      expect((app.getByLabelText(/Place/i) as HTMLInputElement).value).toBe("");
      expect((app.getByLabelText(/Time/i) as HTMLInputElement).value).toBe("");
      expect((app.getByLabelText(/Category/i) as HTMLSelectElement).value).toBe(
        "",
      );
    });
  });

  it("still submits even if sub is null (createdBy becomes null)", async () => {
    authState.sub = null;

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 201,
      statusText: "Created",
      json: async () => ({}),
    })) as any;
    vi.stubGlobal("fetch", fetchSpy);

    const app = renderWithRouter(<AddEventForm />);

    fireEvent.change(app.getByLabelText(/Title/i), { target: { value: "T" } });
    fireEvent.change(app.getByLabelText(/Place/i), { target: { value: "P" } });
    fireEvent.change(app.getByLabelText(/Time/i), {
      target: { value: "2026-02-26T10:00" },
    });

    await app.findByRole("option", { name: "Fun" });
    fireEvent.change(app.getByLabelText(/Category/i), {
      target: { value: "Fun" },
    });

    fireEvent.click(app.getByRole("button", { name: /Submit/i }));

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.createdBy).toBeNull();
  });
});
