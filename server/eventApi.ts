import express from "express";
import { Db, ObjectId } from "mongodb";

export function eventApi(db: Db) {
  const router = express.Router();

  interface Event {
    id?: string;
    title: string;
    description?: string;
    place: string;
    time: string;
    category: string;
    img_url?: string;
  }

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

  return router;
}
