// src/app.ts
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import bcrypt from "bcryptjs";
import type { Db } from "mongodb";
import { eventApi } from "./eventApi";

export type UserInfo = {
  sub: string;
  name?: string;
  picture?: string;
  email?: string;
  isAdmin?: boolean;
};

export type AuthedRequest = Request & { userinfo?: UserInfo | unknown };

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

export function createApp(opts: {
  db: Db;
  sessionSecret: string;
  staticDir?: string; // e.g. "../client/dist"
  // test hook: bypass auth middleware entirely
  testAuth?: { userinfo: UserInfo; isAdmin?: boolean } | null;
}) {
  const app = express();

  app.use(express.json());
  app.use(cookieParser(opts.sessionSecret));

  // Serve SPA assets (optional)
  if (opts.staticDir) {
    app.use(express.static(path.resolve(opts.staticDir)));
  }

  // ✅ Test-only auth injection (no Google/admin cookies needed in tests)
  if (opts.testAuth) {
    app.use((req: any, _res: any, next: any) => {
      req.userinfo = opts.testAuth!.userinfo;
      req.signedCookies = req.signedCookies ?? {};
      if (opts.testAuth!.isAdmin) req.signedCookies.admin = "1";
      next();
    });
  } else {
    // Auth middleware (admin cookie OR Google access_token)
    app.use(async (req: AuthedRequest, res: Response, next: NextFunction) => {
      const signed = (req as any).signedCookies ?? {};

      // Admin cookie -> userinfo
      if (signed.admin_userinfo) {
        const u = decodeCookie<UserInfo>(signed.admin_userinfo);
        if (u?.sub) {
          req.userinfo = u;
          return next();
        }
      }

      // Google access token -> userinfo
      const { access_token } = signed;
      if (!access_token) return next();

      try {
        const { userinfo_endpoint } = await fetchJSON(
          "https://accounts.google.com/.well-known/openid-configuration",
        );

        req.userinfo = await fetchJSON(userinfo_endpoint, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
      } catch {
        res.clearCookie("access_token");
        req.userinfo = undefined;
      }

      next();
    });
  }

  // --------- Auth/Profile endpoints ----------

  app.get("/api/profile", (req: AuthedRequest, res) => {
    if (!req.userinfo) return res.sendStatus(401);

    res.json({
      ...(req.userinfo as any),
      isAdmin: (req as any).signedCookies?.admin === "1",
    });
  });

  app.get("/api/user-profile", async (req: AuthedRequest, res) => {
    try {
      const userinfo = req.userinfo as any;
      if (!userinfo?.sub) return res.sendStatus(401);

      const user = await opts.db
        .collection("users")
        .findOne(
          { sub: userinfo.sub },
          { projection: { _id: 0, passwordHash: 0 } },
        );

      res.json({
        ...user,
        role: user?.isAdmin ? "admin" : "user",
      });
    } catch {
      res.status(500).send("Server error");
    }
  });

  app.post("/api/logout", (_req, res) => {
    res.clearCookie("access_token");
    res.clearCookie("admin");
    res.clearCookie("admin_userinfo");
    res.sendStatus(204);
  });

  // Google login: store user in DB + set access_token cookie
  app.post("/api/login/accessToken", async (req, res) => {
    const { access_token } = req.body ?? {};
    if (!access_token) return res.status(400).send("Missing access_token");

    try {
      const { userinfo_endpoint } = await fetchJSON(
        "https://accounts.google.com/.well-known/openid-configuration",
      );

      const userinfo = await fetchJSON(userinfo_endpoint, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      const { sub, email, name, picture } = userinfo ?? {};
      if (!sub || !email) return res.status(401).send("Invalid token");

      await opts.db.collection("users").updateOne(
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

      res.cookie("access_token", access_token, {
        signed: true,
        httpOnly: true,
        sameSite: "lax",
      });

      res.sendStatus(204);
    } catch {
      res.status(401).send("Invalid token");
    }
  });

  // Admin login: validate passwordHash in users collection and set admin cookies
  app.post("/api/admin/login", async (req, res) => {
    try {
      const email = String(req.body?.email ?? "")
        .toLowerCase()
        .trim();
      const password = String(req.body?.password ?? "");

      if (!email || !password)
        return res.status(400).send("Missing credentials");

      const user = await opts.db.collection("users").findOne({ email });
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

      res.sendStatus(204);
    } catch (err) {
      console.error(err);
      res.status(500).send("Server error");
    }
  });

  // --------- API routes that need DB ----------
  app.use(eventApi(opts.db));

  // SPA fallback (optional)
  if (opts.staticDir) {
    app.use((req, res, next) => {
      if (req.method === "GET" && !req.path.startsWith("/api")) {
        res.sendFile(path.resolve(opts.staticDir!, "index.html"));
      } else {
        next();
      }
    });
  }

  return app;
}
