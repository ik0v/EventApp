// src/tests/client.test.tsx
import React from "react";
import LogoutButton from "../components/logoutButton";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { fireEvent, waitFor } from "@testing-library/react";

import UserProfile from "../components/userProfile";
import ListEvents from "../components/listEvents";
import LoginCallback from "../pages/loginCallback";

// ---- mock auth context (so LoginCallback can call reload) ----
const reloadMock = vi.fn();

vi.mock("../components/authContext", () => ({
  useAuth: () => ({ reload: reloadMock }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.location.hash = "";
});

function renderWithRouter(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function renderWithRouterAt(path: string, ui: React.ReactNode) {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

/**
 * Fetch mock that:
 * - supports Google OpenID discovery doc (LoginButton)
 * - supports /api/login/accessToken (LoginCallback)
 * - supports a map of route prefixes -> responses
 */
function mockFetch(
  routes: Record<string, { ok: boolean; status: number; body: any }>,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any) => {
      const url = typeof input === "string" ? input : (input?.url ?? "");

      // ✅ Google OpenID discovery doc used by LoginButton
      if (
        url === "https://accounts.google.com/.well-known/openid-configuration"
      ) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            authorization_endpoint:
              "https://accounts.google.com/o/oauth2/v2/auth",
            userinfo_endpoint:
              "https://openidconnect.googleapis.com/v1/userinfo",
          }),
        } as any;
      }

      // ✅ LoginCallback posts here
      if (url === "/api/login/accessToken") {
        return {
          ok: true,
          status: 204,
          statusText: "No Content",
          json: async () => ({}),
        } as any;
      }

      const hit = Object.entries(routes).find(([prefix]) =>
        url.startsWith(prefix),
      );
      if (!hit) {
        return {
          ok: false,
          status: 500,
          statusText: "Unhandled fetch in test",
          json: async () => ({ url }),
        } as any;
      }

      const [, r] = hit;
      return {
        ok: r.ok,
        status: r.status,
        statusText: r.ok ? "OK" : "ERR",
        json: async () => r.body,
      } as any;
    }),
  );
}

describe("Client smoke tests", () => {
  it("UserProfile: shows not logged in when /api/profile returns 401", async () => {
    mockFetch({
      "/api/profile": { ok: false, status: 401, body: {} },
      "/api/user-profile": { ok: false, status: 401, body: {} },
      "/api/me": { ok: false, status: 401, body: {} },
    });

    const app = renderWithRouter(<UserProfile />);
    expect(await app.findByText(/Not logged in/i)).toBeInTheDocument();
    // LoginButton exists but we don't need to assert it; fetch is mocked for Google discovery doc anyway.
  });

  it("UserProfile: renders user info when logged in", async () => {
    // Support multiple versions: some implementations fetch /api/profile first, then /api/user-profile or /api/me
    mockFetch({
      "/api/profile": {
        ok: true,
        status: 200,
        body: { sub: "u1", isAdmin: false },
      },
      "/api/user-profile": {
        ok: true,
        status: 200,
        body: {
          name: "Ivan Kovals",
          email: "ikovals807@gmail.com",
          picture: "https://example.com/p.png",
          createdAt: "2026-02-24T17:53:53.512Z",
          role: "user",
          isAdmin: false,
        },
      },
      "/api/me": {
        ok: true,
        status: 200,
        body: {
          name: "Ivan Kovals",
          email: "ikovals807@gmail.com",
          picture: "https://example.com/p.png",
          createdAt: "2026-02-24T17:53:53.512Z",
          role: "user",
          isAdmin: false,
        },
      },
    });

    const app = renderWithRouter(<UserProfile />);
    expect(await app.findByText(/Ivan Kovals/i)).toBeInTheDocument();
    expect(app.getByText(/ikovals807@gmail\.com/i)).toBeInTheDocument();
  });

  it("ListEvents: loads and renders events from /api/events", async () => {
    mockFetch({
      "/api/events": {
        ok: true,
        status: 200,
        body: [
          {
            id: "1",
            title: "Event 1",
            place: "Oslo",
            time: "2026-02-23T18:30:00Z",
            category: "Fun",
          },
          {
            id: "2",
            title: "Event 2",
            place: "Bergen",
            time: "2026-02-23T18:30:00Z",
            category: "Food",
          },
        ],
      },
      // in case ListEvents checks profile
      "/api/profile": { ok: false, status: 401, body: {} },
    });

    const app = renderWithRouter(<ListEvents />);
    expect(await app.findByText("Event 1")).toBeInTheDocument();
    expect(app.getByText("Event 2")).toBeInTheDocument();
  });

  it("LoginCallback: POSTs access_token, calls reload, navigates to /events", async () => {
    reloadMock.mockClear();

    window.location.hash = "#access_token=abc123&token_type=Bearer";

    const fetchSpy = vi.fn(async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : (input?.url ?? "");

      if (
        url === "https://accounts.google.com/.well-known/openid-configuration"
      ) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({
            authorization_endpoint:
              "https://accounts.google.com/o/oauth2/v2/auth",
            userinfo_endpoint:
              "https://openidconnect.googleapis.com/v1/userinfo",
          }),
        } as any;
      }

      if (url === "/api/login/accessToken") {
        return {
          ok: true,
          status: 204,
          statusText: "No Content",
          json: async () => ({}),
        } as any;
      }

      return {
        ok: false,
        status: 500,
        statusText: "Unhandled fetch in test",
        json: async () => ({ url }),
      } as any;
    });

    vi.stubGlobal("fetch", fetchSpy as any);

    const app = renderWithRouterAt(
      "/login/callback",
      <Routes>
        <Route path="/login/callback" element={<LoginCallback />} />
        <Route path="/events" element={<div>EventsPage</div>} />
      </Routes>,
    );

    expect(await app.findByText("EventsPage")).toBeInTheDocument();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/login/accessToken",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
        body: JSON.stringify({ access_token: "abc123" }),
      }),
    );

    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it("LogoutButton: logs out, calls reload + onLogout, and navigates to /login", async () => {
    const onLogoutMock = vi.fn();
    reloadMock.mockResolvedValue(undefined);

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
    })) as any;

    vi.stubGlobal("fetch", fetchSpy);

    const app = renderWithRouterAt(
      "/",
      <Routes>
        <Route path="/" element={<LogoutButton onLogout={onLogoutMock} />} />
        <Route path="/login" element={<div>LoginPage</div>} />
      </Routes>,
    );

    fireEvent.click(app.getByRole("button", { name: "Logout" }));

    // API call
    expect(fetchSpy).toHaveBeenCalledWith("/api/logout", { method: "POST" });

    // reload called
    await vi.waitFor(() => {
      expect(reloadMock).toHaveBeenCalledTimes(1);
    });

    // optional callback called
    await waitFor(() => {
      expect(onLogoutMock).toHaveBeenCalledTimes(1);
    });

    // navigation happened
    expect(await app.findByText("LoginPage")).toBeInTheDocument();
  });
});
