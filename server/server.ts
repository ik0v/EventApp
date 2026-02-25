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
  app.use(eventApi(db));
});

// app.post("/api/login/accessToken", (req, res) => {
//   const { access_token } = req.body;
//   res.cookie("access_token", access_token, { signed: true, httpOnly: true });
//   res.sendStatus(204);
// });

app.post("/api/login/accessToken", async (req, res) => {
  const { access_token } = req.body;
  try {
    const { userinfo_endpoint } = await fetchJSON(
      "https://accounts.google.com/.well-known/openid-configuration",
    );
    const userinfo = await fetchJSON(userinfo_endpoint, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    console.log("USERINFO:", userinfo);
    const { sub, email, name, picture } = userinfo;

    const db = client.db("event-app");
    try {
      await db.collection("users").updateOne(
        { email },
        {
          $set: {
            sub,
            email,
            name: name ?? null,
            picture: picture ?? null,
            lastLoginAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
      );
    } catch (err) {
      console.error("DB ERROR:", err);
    }
    res.cookie("access_token", access_token, { signed: true, httpOnly: true });
    res.sendStatus(204);
  } catch (e) {
    res.status(401).send("Invalid token");
  }
});

app.listen(process.env.PORT || 3000);
