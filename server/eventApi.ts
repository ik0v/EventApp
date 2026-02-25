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

  router.post("/api/events", async (req, res) => {
    const { title, description, place, time, category, img_url } = req.body;

    if (!title || !place || !time || !category) {
      return res.status(400).send("Missing required fields");
    }

    const newEvent: Event = {
      title,
      description,
      place,
      time,
      category,
      img_url,
    };
    try {
      const result = await db.collection<Event>("events").insertOne(newEvent);
      res.status(201).json({
        // ...newEvent,
        id: result.insertedId.toString(),
      });
    } catch (err) {
      res.status(500).send("Database error");
    }
  });

  router.post("/api/events/:id/attend", async (req: any, res) => {
    try {
      const id = String(req.params.id); // ✅ force string

      if (!ObjectId.isValid(id)) {
        return res.status(400).send("Invalid event id");
      }
      const eventId = new ObjectId(id);

      const sub = req.userinfo?.sub;
      if (!sub) return res.sendStatus(401);

      const events = db.collection("events");

      const updated = await events.updateOne(
        { _id: eventId, "attendees.userSub": sub },
        { $set: { "attendees.$.joinedAt": new Date() } },
      );

      if (updated.matchedCount === 0) {
        await events.updateOne({ _id: eventId }, {
          $push: {
            attendees: {
              userSub: sub,
              joinedAt: new Date(),
            },
          },
        } as any);
      }

      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  router.delete("/api/events/:id/attend", async (req: any, res) => {
    try {
      const id = String(req.params.id);

      if (!ObjectId.isValid(id)) {
        return res.status(400).send("Invalid event id");
      }
      const eventId = new ObjectId(id);

      const sub = req.userinfo?.sub;
      if (!sub) return res.sendStatus(401);

      await db.collection("events").updateOne({ _id: eventId }, {
        $pull: { attendees: { userSub: sub } },
      } as any);

      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  return router;
}
