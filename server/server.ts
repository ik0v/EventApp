import express from "express";
import type { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";
import { eventApi } from "./eventApi";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static(path.resolve("../client/dist")));
app.use(cookieParser(process.env.SESSION_SECRET));

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

const router = express.Router();
export const eventsApi = router;

// const events = [
//   {
//     id: 1,
//     title: "Event 1",
//     description:
//       "lorem ipsum dolor sit amet, consetetur lorem ipsum dolor sit amet, consetetur",
//     place: "Oslo",
//     time: "2026-02-23T18:30:00Z",
//     category: "Fun",
//   },
//   {
//     id: 2,
//     title: "Event 2",
//     description:
//       "lorem ipsum dolor sit amet, consetetur lorem ipsum dolor sit amet, consetetur",
//     place: "Bergen",
//     time: "2026-02-23T18:30:00Z",
//     category: "Fun",
//   },
//   {
//     id: 3,
//     title: "Event 3",
//     description:
//       "lorem ipsum dolor sit amet, consetetur lorem ipsum dolor sit amet, consetetur",
//     place: "Asker",
//     time: "2026-02-23T18:30:00Z",
//     category: "Fun",
//   },
//   {
//     id: 3,
//     title: "Event 4",
//     description:
//       "lorem ipsum dolor sit amet, consetetur lorem ipsum dolor sit amet, consetetur",
//     place: "Horten",
//     time: "2026-02-23T18:30:00Z",
//     category: "Fun",
//   },
// ];

// eventsApi.get("/api/events", (req, res) => {
//   res.send(events);
// });
//
// eventsApi.post("/api/events", (req, res) => {
//   const { title } = req.body;
//   events.push({ title, id: events.length + 1 });
//   res.sendStatus(201);
// });

type AuthedRequest = Request & { userinfo?: unknown };

app.use(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const { access_token } = (req as any).signedCookies ?? {};
  if (!access_token) return next();

  try {
    const { userinfo_endpoint } = await fetchJSON(
      "https://accounts.google.com/.well-known/openid-configuration",
    );

    req.userinfo = await fetchJSON(userinfo_endpoint, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
  } catch (e) {
    res.clearCookie("access_token");
    req.userinfo = undefined;
  }

  next();
});

// app.use(async (req, res, next) => {
//   const { access_token } = req.signedCookies;
//   if (!access_token) return next();
//
//   try {
//     const { userinfo_endpoint } = await fetchJSON(
//       "https://accounts.google.com/.well-known/openid-configuration",
//     );
//     (req as any).userinfo = await fetchJSON(userinfo_endpoint, {
//       headers: { Authorization: `Bearer ${access_token}` },
//     });
//   } catch (e) {
//     res.clearCookie("access_token");
//     req.userinfo = undefined;
//   }
//   next();
// });

app.post("/api/login/accessToken", (req, res) => {
  const { access_token } = req.body;
  res.cookie("access_token", access_token, { signed: true, httpOnly: true });
  res.sendStatus(204);
});

app.get("/api/profile", (req: AuthedRequest, res) => {
  if (!req.userinfo) {
    res.sendStatus(401);
  } else {
    res.send(req.userinfo);
  }
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("access_token");
  res.sendStatus(204);
});

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(path.resolve("../client/dist/index.html"));
  } else {
    next();
  }
});

const client = new MongoClient(process.env["MONGODB_URL"]!);
client.connect().then(async (con) => {
  const db = con.db("event-app");
  const result = await db
    .collection("events")
    .find({ category: "Fun" })
    .toArray();
  console.log(result);
  app.use(eventApi(db));
});

app.listen(process.env.PORT || 3000);
