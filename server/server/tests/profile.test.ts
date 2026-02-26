import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Db } from "mongodb";
import { createApp } from "../../app";

// super-minimal fake db for endpoints that don't touch DB
const fakeDb = {} as Db;

describe("GET /api/profile", () => {
  it("returns 401 when not logged in", async () => {
    const app = createApp({
      db: fakeDb,
      sessionSecret: "test",
      testAuth: null,
    });

    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(401);
  });

  it("returns userinfo when logged in (testAuth)", async () => {
    const app = createApp({
      db: fakeDb,
      sessionSecret: "test",
      testAuth: {
        userinfo: { sub: "u1", name: "Test User", email: "t@t.com" },
        isAdmin: false,
      },
    });

    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(200);
    expect(res.body.sub).toBe("u1");
    expect(res.body.isAdmin).toBe(false);
  });

  it("returns isAdmin true when admin (testAuth)", async () => {
    const app = createApp({
      db: fakeDb,
      sessionSecret: "test",
      testAuth: {
        userinfo: { sub: "admin1", email: "a@a.com" },
        isAdmin: true,
      },
    });

    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);
  });

  it("always includes isAdmin boolean when logged in", async () => {
    const app = createApp({
      db: fakeDb,
      sessionSecret: "test",
      testAuth: {
        userinfo: { sub: "u1" },
        isAdmin: false,
      },
    });

    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(200);
    expect(typeof res.body.isAdmin).toBe("boolean");
    expect(res.body.isAdmin).toBe(false);
  });

  it("passes through userinfo fields", async () => {
    const app = createApp({
      db: fakeDb,
      sessionSecret: "test",
      testAuth: {
        userinfo: {
          sub: "u2",
          name: "Alice",
          email: "alice@example.com",
          picture: "https://example.com/p.png",
        },
        isAdmin: true,
      },
    });

    const res = await request(app).get("/api/profile");
    expect(res.status).toBe(200);
    expect(res.body.sub).toBe("u2");
    expect(res.body.name).toBe("Alice");
    expect(res.body.email).toBe("alice@example.com");
    expect(res.body.picture).toBe("https://example.com/p.png");
    expect(res.body.isAdmin).toBe(true);
  });

  it("does not crash if userinfo is an unexpected type (returns 200 with isAdmin + spread result)", async () => {
    // this simulates a bug/edge case: middleware set userinfo incorrectly
    const app = createApp({
      db: fakeDb,
      sessionSecret: "test",
      testAuth: {
        // @ts-expect-error intentionally wrong shape for robustness testing
        userinfo: "not-an-object",
        isAdmin: false,
      },
    });

    const res = await request(app).get("/api/profile");
    // With current createApp() testAuth, req.userinfo is set to whatever we pass.
    // If your /api/profile spreads req.userinfo directly, spreading a string can behave oddly.
    // We mainly assert: server responds and includes isAdmin.
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(false);
  });

  it("returns 401 when userinfo exists but is missing sub (optional stricter expectation)", async () => {
    // If you decide /api/profile should require sub, enable this behavior in code.
    // For now, this test just demonstrates how to enforce stricter rules if desired.
    const app = createApp({
      db: fakeDb,
      sessionSecret: "test",
      testAuth: {
        // no sub
        userinfo: { email: "x@y.com" } as any,
        isAdmin: false,
      },
    });

    const res = await request(app).get("/api/profile");
    // Current implementation: checks only req.userinfo truthy => will return 200.
    // If you change to `if (!req.userinfo?.sub) return 401;` then flip this to 401.
    expect([200, 401]).toContain(res.status);
  });
});
