import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient, type Db, ObjectId } from "mongodb";
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
  await db.collection("events").deleteMany({});
});

describe("Events CRUD", () => {
  it("GET /api/events returns empty array initially", async () => {
    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: null,
    });

    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it("POST /api/events returns 401 when not logged in", async () => {
    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: null,
    });

    const res = await request(app).post("/api/events").send({
      title: "T",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
    });

    expect(res.status).toBe(401);
  });

  it("POST /api/events returns 403 when logged in but not admin", async () => {
    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: {
        userinfo: { sub: "u1", email: "u1@test.com" },
        isAdmin: false,
      },
    });

    const res = await request(app).post("/api/events").send({
      title: "T",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
    });

    expect(res.status).toBe(403);
  });

  it("POST /api/events (admin) creates event and sets createdBy", async () => {
    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: {
        userinfo: { sub: "adminSub", email: "a@test.com" },
        isAdmin: true,
      },
    });

    const res = await request(app).post("/api/events").send({
      title: "My event",
      description: "Hello",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
      img_url: "https://example.com/p.png",
      // createdBy MUST NOT be accepted from client
      createdBy: "hacker",
    });

    expect(res.status).toBe(201);
    expect(typeof res.body?.id).toBe("string");

    const created = await db
      .collection("events")
      .findOne({ _id: new ObjectId(res.body.id) });
    expect(created).toBeTruthy();
    expect(created?.title).toBe("My event");
    expect(created?.createdBy).toBe("adminSub"); // ✅ server sets it
    expect(created?.img_url).toBe("https://example.com/p.png");
  });

  it("PUT /api/events/:id returns 403 when admin but not creator", async () => {
    // Create event owned by someone else
    const eventId = new ObjectId();
    await db.collection("events").insertOne({
      _id: eventId,
      title: "Original",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
      createdBy: "ownerSub",
    });

    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "otherAdmin" }, isAdmin: true },
    });

    const res = await request(app)
      .put(`/api/events/${eventId.toString()}`)
      .send({
        title: "Hacked",
      });

    expect(res.status).toBe(403);
  });

  it("PUT /api/events/:id (admin + creator) updates only provided fields", async () => {
    const eventId = new ObjectId();
    await db.collection("events").insertOne({
      _id: eventId,
      title: "Original",
      description: "Old",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
      img_url: "old.png",
      createdBy: "adminSub",
    });

    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "adminSub" }, isAdmin: true },
    });

    const res = await request(app)
      .put(`/api/events/${eventId.toString()}`)
      .send({
        title: "Updated",
        img_url: "new.png",
        time: "", // should be ignored by your "only if non-empty" logic
      });

    expect(res.status).toBe(200);

    const updated = await db.collection("events").findOne({ _id: eventId });
    expect(updated?.title).toBe("Updated");
    expect(updated?.img_url).toBe("new.png");
    expect(updated?.description).toBe("Old"); // unchanged
    expect(updated?.time).toBe("2026-02-23T18:30:00Z"); // unchanged
  });

  it("DELETE /api/events/:id (admin + creator) deletes event", async () => {
    const eventId = new ObjectId();
    await db.collection("events").insertOne({
      _id: eventId,
      title: "To delete",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
      createdBy: "adminSub",
    });

    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "adminSub" }, isAdmin: true },
    });

    const res = await request(app).delete(`/api/events/${eventId.toString()}`);
    expect(res.status).toBe(204);

    const found = await db.collection("events").findOne({ _id: eventId });
    expect(found).toBeNull();
  });

  it("PUT /api/events/:id returns 400 for invalid ObjectId", async () => {
    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "adminSub" }, isAdmin: true },
    });

    const res = await request(app)
      .put("/api/events/not-an-id")
      .send({ title: "X" });
    expect(res.status).toBe(400);
  });
});
