import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db } from "mongodb";
import { createApp } from "../../app";

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
  // clean between tests
  await db.collection("users").deleteMany({});
});

describe("GET /api/user-profile", () => {
  it("returns 401 when not logged in", async () => {
    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: null,
    });

    const res = await request(app).get("/api/user-profile");
    expect(res.status).toBe(401);
  });

  it("returns role=user and excludes passwordHash", async () => {
    await db.collection("users").insertOne({
      sub: "u1",
      email: "u1@test.com",
      name: "User One",
      isAdmin: false,
      passwordHash: "SECRET_HASH",
      createdAt: new Date(),
    });

    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "u1" }, isAdmin: false },
    });

    const res = await request(app).get("/api/user-profile");
    expect(res.status).toBe(200);

    expect(res.body.sub).toBe("u1");
    expect(res.body.role).toBe("user");
    expect(res.body.passwordHash).toBeUndefined(); // projection check
    expect(res.body._id).toBeUndefined(); // projection check
  });

  it("returns role=admin when user.isAdmin true", async () => {
    await db.collection("users").insertOne({
      sub: "a1",
      email: "a1@test.com",
      isAdmin: true,
      passwordHash: "SECRET_HASH",
    });

    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "a1" }, isAdmin: true },
    });

    const res = await request(app).get("/api/user-profile");
    expect(res.status).toBe(200);
    expect(res.body.sub).toBe("a1");
    expect(res.body.role).toBe("admin");
  });

  it("returns role=user when user not found (empty body except role)", async () => {
    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "missing" }, isAdmin: false },
    });

    const res = await request(app).get("/api/user-profile");
    expect(res.status).toBe(200);

    // `...user` spreads undefined -> nothing, so only role is returned
    expect(res.body.role).toBe("user");
    expect(res.body.sub).toBeUndefined();
  });
});
