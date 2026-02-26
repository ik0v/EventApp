import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import bcrypt from "bcryptjs";
import { createApp } from "../app";

let mongod: MongoMemoryServer;
let client: MongoClient;
let db: Db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db("event-app");
});

afterAll(async () => {
  await client.close();
  await mongod.stop();
});

beforeEach(async () => {
  await db.collection("users").deleteMany({});
  vi.restoreAllMocks();
});

describe("Auth endpoints", () => {
  it("POST /api/admin/login returns 400 on missing credentials", async () => {
    const app = createApp({ db, sessionSecret: "test" });

    const res = await request(app).post("/api/admin/login").send({ email: "" });
    expect(res.status).toBe(400);
  });

  it("POST /api/admin/login returns 401 when user not found", async () => {
    const app = createApp({ db, sessionSecret: "test" });

    const res = await request(app).post("/api/admin/login").send({
      email: "missing@eventapp.com",
      password: "pass",
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/admin/login returns 403 when user exists but not admin", async () => {
    await db.collection("users").insertOne({
      email: "user@eventapp.com",
      sub: "u1",
      isAdmin: false,
      passwordHash: await bcrypt.hash("pass", 10),
    });

    const app = createApp({ db, sessionSecret: "test" });

    const res = await request(app).post("/api/admin/login").send({
      email: "user@eventapp.com",
      password: "pass",
    });

    expect(res.status).toBe(403);
  });

  it("POST /api/admin/login returns 204 and sets admin cookies on success", async () => {
    const passwordHash = await bcrypt.hash("secret", 10);
    await db.collection("users").insertOne({
      email: "admin@eventapp.com",
      sub: "adminSub",
      isAdmin: true,
      passwordHash,
      name: "Admin",
      picture: "p.png",
    });

    const app = createApp({ db, sessionSecret: "test" });

    const res = await request(app).post("/api/admin/login").send({
      email: "admin@eventapp.com",
      password: "secret",
    });

    expect(res.status).toBe(204);

    const setCookie = res.headers["set-cookie"] as string[] | undefined;
    expect(setCookie).toBeTruthy();

    // should set signed cookies: admin and admin_userinfo
    expect(setCookie!.some((c) => c.startsWith("admin="))).toBe(true);
    expect(setCookie!.some((c) => c.startsWith("admin_userinfo="))).toBe(true);
  });

  it("POST /api/logout clears auth cookies", async () => {
    const app = createApp({ db, sessionSecret: "test" });

    // send request with cookies to simulate logged-in state
    const res = await request(app)
      .post("/api/logout")
      .set("Cookie", [
        "access_token=s%3Atoken.sig",
        "admin=s%3A1.sig",
        "admin_userinfo=s%3Aabc.sig",
      ]);

    expect(res.status).toBe(204);

    const setCookie = res.headers["set-cookie"] as string[] | undefined;
    expect(setCookie).toBeTruthy();

    // clearCookie sets cookie with Expires in the past / Max-Age=0
    const cleared = setCookie!.join(";");
    expect(cleared).toContain("access_token=");
    expect(cleared).toContain("admin=");
    expect(cleared).toContain("admin_userinfo=");
  });

  it("POST /api/login/accessToken returns 400 when missing token", async () => {
    const app = createApp({ db, sessionSecret: "test" });

    const res = await request(app).post("/api/login/accessToken").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/login/accessToken returns 401 when Google fetch fails", async () => {
    // Mock global fetch to simulate failing Google call
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        return {
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: async () => ({}),
        } as any;
      }),
    );

    const app = createApp({ db, sessionSecret: "test" });

    const res = await request(app).post("/api/login/accessToken").send({
      access_token: "bad-token",
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/login/accessToken stores/updates user and sets access_token cookie on success", async () => {
    // Mock global fetch with two calls:
    // 1) openid configuration returns userinfo_endpoint
    // 2) userinfo endpoint returns sub/email/name/picture
    const fetchMock = vi
      .fn()
      // call 1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userinfo_endpoint: "https://mock/userinfo" }),
      } as any)
      // call 2
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: "googleSub123",
          email: "g@test.com",
          name: "Google User",
          picture: "https://pic",
        }),
      } as any);

    vi.stubGlobal("fetch", fetchMock as any);

    const app = createApp({ db, sessionSecret: "test" });

    const res = await request(app).post("/api/login/accessToken").send({
      access_token: "good-token",
    });

    expect(res.status).toBe(204);

    // cookie set
    const setCookie = res.headers["set-cookie"] as string[] | undefined;
    expect(setCookie).toBeTruthy();
    expect(setCookie!.some((c) => c.startsWith("access_token="))).toBe(true);

    // user stored
    const user = await db.collection("users").findOne({ email: "g@test.com" });
    expect(user).toBeTruthy();
    expect(user?.sub).toBe("googleSub123");
    expect(user?.name).toBe("Google User");
  });
});
