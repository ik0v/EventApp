import express from "express";
import type { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { MongoClient } from "mongodb";
import { eventApi } from "./eventApi";
import bcrypt from "bcryptjs";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static(path.resolve("../client/dist")));
app.use(cookieParser(process.env.SESSION_SECRET));

type UserInfo = {
  sub: string;
  name?: string;
  picture?: string;
  email?: string;
  isAdmin?: boolean;
};

function encodeCookie(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function decodeCookie<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

async function fetchJSON(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

const router = express.Router();
export const eventsApi = router;

// type AuthedRequest = Request & { userinfo?: unknown };
type AuthedRequest = Request & { userinfo?: UserInfo | unknown };

app.use(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const signed = (req as any).signedCookies ?? {};

  // ✅ If admin cookie exists, behave like Google userinfo is present
  if (signed.admin_userinfo) {
    const u = decodeCookie<UserInfo>(signed.admin_userinfo);
    if (u?.sub) {
      req.userinfo = u;
      return next();
    }
  }

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
    return res.sendStatus(401);
  }
  res.json({
    ...req.userinfo,
    isAdmin: (req as any).signedCookies?.admin === "1",
  });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("admin");
  res.clearCookie("admin_userinfo");
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

app.post("/api/admin/login", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "")
      .toLowerCase()
      .trim();
    const password = String(req.body?.password ?? "");

    if (!email || !password) return res.status(400).send("Missing credentials");

    const db = client.db("event-app");
    const user = await db.collection("users").findOne({ email });
    if (!user) return res.sendStatus(401);
    if (!user.isAdmin) return res.sendStatus(403);
    if (!user.passwordHash)
      return res.status(500).send("Admin password not set");
    if (!user.sub) return res.status(500).send("Admin sub not set");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.sendStatus(401);

    const adminUserinfo: UserInfo = {
      sub: user.sub,
      email: user.email,
      name: user.name ?? undefined,
      picture: user.picture ?? undefined,
    };

    res.cookie("admin", "1", {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
    });

    res.cookie("admin_userinfo", encodeCookie(adminUserinfo), {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
    });

    return res.sendStatus(204);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server error");
  }
});
app.listen(process.env.PORT || 3000);
