import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import NavBar from "../components/navBar";
import NavUserChip from "../components/navUserChip";

// ---- shared auth mock state ----
const reloadMock = vi.fn();

type AuthState = {
  loggedIn: boolean;
  isAdmin: boolean;
  sub: string | null;
  name?: string;
  email?: string;
  picture?: string;
  loadingUser?: boolean;
};

let authState: AuthState = {
  loggedIn: false,
  isAdmin: false,
  sub: null,
  name: "",
  email: "",
  picture: "",
  loadingUser: false,
};

vi.mock("../components/authContext", () => ({
  useAuth: () => ({
    ...authState,
    reload: reloadMock,
  }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  reloadMock.mockReset();
  authState = {
    loggedIn: false,
    isAdmin: false,
    sub: null,
    name: "",
    email: "",
    picture: "",
    loadingUser: false,
  };
});

function renderWithRouter(
  ui: React.ReactNode,
  initialEntries: string[] = ["/"],
) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
  );
}

describe("NavBar", () => {
  it("renders brand and main navigation links with correct hrefs", () => {
    const app = renderWithRouter(<NavBar />);

    expect(app.getByText("EventApp")).toBeInTheDocument();

    // Links exist regardless of auth in current implementation
    expect(app.getByRole("link", { name: "Profile" })).toHaveAttribute(
      "href",
      "/profile",
    );
    expect(app.getByRole("link", { name: "Events" })).toHaveAttribute(
      "href",
      "/events",
    );

    // There are two "Login" links overall (center link + NavUserChip when logged out).
    // So we assert using getAllByRole and verify at least one points to "/".
    const loginLinks = app.getAllByRole("link", { name: "Login" });
    expect(loginLinks.length).toBeGreaterThanOrEqual(1);
    expect(loginLinks.some((a) => a.getAttribute("href") === "/login")).toBe(
      true,
    );
  });

  it("shows 'Add event' link only for admins", () => {
    // non-admin
    authState.isAdmin = false;
    let app = renderWithRouter(<NavBar />);
    expect(app.queryByRole("link", { name: /Add event/i })).toBeNull();

    cleanup();

    // admin
    authState.isAdmin = true;
    app = renderWithRouter(<NavBar />);
    expect(app.getByRole("link", { name: /Add event/i })).toHaveAttribute(
      "href",
      "/add",
    );
  });
});

describe("NavUserChip", () => {
  it("when logged out: renders nothing", () => {
    authState.loggedIn = false;

    const app = renderWithRouter(<NavUserChip />);
    expect(app.container).toBeEmptyDOMElement();
  });

  it("when logged in: renders avatar + name (no logout button)", () => {
    authState.loggedIn = true;
    authState.name = "Ivan";
    authState.picture = "https://example.com/p.png";

    const app = renderWithRouter(<NavUserChip />);

    expect(app.getByText("Ivan")).toBeInTheDocument();

    // decorative img -> role is presentation (alt="")
    const avatar = app.getByRole("presentation", { name: "" });
    expect(avatar).toHaveAttribute("src", "https://example.com/p.png");

    // logout is handled in NavBar now
    expect(app.queryByRole("button", { name: /Logout/i })).toBeNull();
  });
});
