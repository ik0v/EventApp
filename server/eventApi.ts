import express from "express";
import { Db, ObjectId } from "mongodb";

interface Event {
  id?: string;
  title: string;
  description?: string;
  place: string;
  time: string;
  category: string;
  img_url?: string;
  // attendees?: { userSub: string; joinedAt: Date }[];
  createdBy?: number;
}

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
};

type AuthedRequest = express.Request & {
  userinfo?: GoogleUserInfo;
};

export function eventApi(db: Db) {
  const router = express.Router();

  router.get("/api/events", async (req, res) => {
    const events = await db.collection("events").find({}).toArray();
    res.json(events);
  });

  router.post("/api/events", async (req: any, res) => {
    try {
      const userinfo = req.userinfo as { sub?: string } | undefined;
      if (!userinfo?.sub) return res.sendStatus(401); // ✅ must be logged in
      if (req.signedCookies?.admin !== "1") return res.sendStatus(403); // ✅ must be admin

      const { title, description, place, time, category, img_url } =
        req.body ?? {};

      if (!title || !place || !time || !category) {
        return res.status(400).send("Missing required fields");
      }

      const existingEvent = await db.collection("events").findOne({
        title: title,
      });
      if (existingEvent) {
        return res.status(409).json({
          code: "DUPLICATE_TITLE",
          message: "An event with that title already exists.",
        });
      }

      const newEvent = {
        title: String(title).trim(),
        description: description ? String(description).trim() : undefined,
        place: String(place).trim(),
        time: String(time).trim(),
        category: String(category).trim(),
        img_url: img_url ? String(img_url).trim() : undefined,
        createdBy: userinfo.sub, // ✅ set on server (don’t trust body)
        createdAt: new Date(),
      };

      const result = await db.collection("events").insertOne(newEvent);
      res.status(201).json({ id: result.insertedId.toString() });
    } catch (err) {
      console.error(err);
      res.status(500).send("Database error");
    }
  });

  router.put("/api/events/:id", async (req: any, res) => {
    try {
      if (!req.userinfo?.sub) return res.sendStatus(401);
      if (req.signedCookies?.admin !== "1") return res.sendStatus(403);

      const id = String(req.params.id);
      if (!ObjectId.isValid(id))
        return res.status(400).send("Invalid event id");
      const _id = new ObjectId(id);

      const event = await db.collection("events").findOne({ _id });
      if (!event) return res.sendStatus(404);
      if (event.createdBy !== req.userinfo.sub) return res.sendStatus(403);

      const set: any = {};
      const put = (key: string) => {
        const v = req.body?.[key];
        if (typeof v !== "string") return;
        const t = v.trim();
        if (!t) return;
        set[key] = t;
      };

      put("title");
      put("description");
      put("place");
      put("category");
      put("img_url");

      const t = req.body?.time;
      if (typeof t === "string" && t.trim()) {
        const iso = new Date(t).toISOString();
        if (iso === "Invalid Date") return res.status(400).send("Invalid time");
        set.time = iso;
      }

      if (!Object.keys(set).length) return res.status(400).send("No changes");

      await db.collection("events").updateOne({ _id }, { $set: set } as any);
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  router.delete("/api/events/:id", async (req: any, res) => {
    try {
      if (!req.userinfo?.sub) return res.sendStatus(401);
      if (req.signedCookies?.admin !== "1") return res.sendStatus(403);

      const id = String(req.params.id);
      if (!ObjectId.isValid(id)) {
        return res.status(400).send("Invalid event id");
      }

      const _id = new ObjectId(id);

      // Check ownership
      const event = await db.collection("events").findOne({ _id });
      if (!event) return res.sendStatus(404);

      if (event.createdBy !== req.userinfo.sub) {
        return res.sendStatus(403);
      }

      // Delete
      await db.collection("events").deleteOne({ _id });

      res.sendStatus(204); // No Content
    } catch (err) {
      res.status(500).send("Server error");
    }
  });

  router.post("/api/events/:id/attend", async (req: any, res) => {
    try {
      const id = String(req.params.id); // ✅ force string

      if (!ObjectId.isValid(id)) {
        return res.status(400).send("Invalid event id");
      }

      const userinfo = req.userinfo as
        | { sub?: string; name?: string; email?: string; picture?: string }
        | undefined;
      if (!userinfo?.sub) return res.sendStatus(401);

      const eventId = new ObjectId(id);

      await db
        .collection("events")
        .updateOne(
          { _id: eventId, "attendees.userSub": { $ne: userinfo.sub } },
          {
            $push: {
              attendees: {
                userSub: userinfo.sub,
                name: userinfo.name ?? null,
                email: userinfo.email ?? null,
                picture: userinfo.picture ?? null,
                joinedAt: new Date(),
              },
            },
          } as any,
        );

      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  router.delete("/api/events/:id/attend", async (req: any, res) => {
    try {
      const id = String(req.params.id);
      if (!ObjectId.isValid(id))
        return res.status(400).send("Invalid event id");

      const userinfo = req.userinfo as { sub?: string } | undefined;
      if (!userinfo?.sub) return res.sendStatus(401);

      const eventId = new ObjectId(id);

      await db.collection("events").updateOne({ _id: eventId }, {
        $pull: { attendees: { userSub: userinfo.sub } },
      } as any);

      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  router.get("/api/events/:id", async (req, res) => {
    try {
      const event = await db.collection("events").findOne({
        _id: new ObjectId(req.params.id),
      });

      if (!event) return res.sendStatus(404);

      res.json({
        ...event,
        _id: event._id.toString(),
      });
    } catch {
      res.status(500).send("Server error");
    }
  });

  return router;
}
