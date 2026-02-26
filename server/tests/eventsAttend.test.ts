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

describe("Event attend join/leave", () => {
  it("POST /api/events/:id/attend returns 401 when not logged in", async () => {
    const eventId = new ObjectId();
    await db.collection("events").insertOne({
      _id: eventId,
      title: "E",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
      createdBy: "adminSub",
    });

    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: null,
    });

    const res = await request(app).post(
      `/api/events/${eventId.toString()}/attend`,
    );
    expect(res.status).toBe(401);
  });

  it("POST /api/events/:id/attend adds current user as attendee", async () => {
    const eventId = new ObjectId();
    await db.collection("events").insertOne({
      _id: eventId,
      title: "E",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
      createdBy: "adminSub",
    });

    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: {
        userinfo: {
          sub: "u1",
          name: "User One",
          email: "u1@test.com",
          picture: "p.png",
        },
        isAdmin: false,
      },
    });

    const res = await request(app).post(
      `/api/events/${eventId.toString()}/attend`,
    );
    expect([200, 204]).toContain(res.status);

    const ev = await db.collection("events").findOne({ _id: eventId });
    expect(ev).toBeTruthy();

    const attendees = (ev as any).attendees ?? [];
    expect(Array.isArray(attendees)).toBe(true);

    // We assert minimal required fields, allowing your schema to evolve
    const a = attendees.find((x: any) => x.userSub === "u1");
    expect(a).toBeTruthy();
  });

  it("DELETE /api/events/:id/attend removes current user from attendees", async () => {
    const eventId = new ObjectId();
    await db.collection("events").insertOne({
      _id: eventId,
      title: "E",
      place: "Oslo",
      time: "2026-02-23T18:30:00Z",
      category: "Fun",
      createdBy: "adminSub",
      attendees: [{ userSub: "u1", joinedAt: new Date() }],
    });

    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "u1" }, isAdmin: false },
    });

    const res = await request(app).delete(
      `/api/events/${eventId.toString()}/attend`,
    );
    expect([200, 204]).toContain(res.status);

    const ev = await db.collection("events").findOne({ _id: eventId });
    const attendees = (ev as any).attendees ?? [];
    expect(attendees.some((x: any) => x.userSub === "u1")).toBe(false);
  });

  it("POST /api/events/:id/attend returns 400 for invalid event id", async () => {
    const app = createApp({
      db,
      sessionSecret: "test",
      testAuth: { userinfo: { sub: "u1" }, isAdmin: false },
    });

    const res = await request(app).post("/api/events/not-an-id/attend");
    expect(res.status).toBe(400);
  });
});
