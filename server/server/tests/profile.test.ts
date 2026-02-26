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
});
