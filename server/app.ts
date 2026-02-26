import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import type { Db } from "mongodb";
import { eventApi } from "./eventApi";

export type UserInfo = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
};

export type AuthedRequest = express.Request & { userinfo?: unknown };

export function createApp(opts: {
  db: Db;
  sessionSecret: string;
  staticDir?: string;
  // test hook: force auth without Google/admin cookies
  testAuth?: { userinfo: UserInfo; isAdmin?: boolean } | null;
}) {
  const app = express();

  app.use(express.json());
  app.use(cookieParser(opts.sessionSecret));

  if (opts.staticDir) {
    app.use(express.static(path.resolve(opts.staticDir)));
  }

  // ✅ Test-only auth injection (so tests can act as admin/user)
  if (opts.testAuth) {
    app.use((req: any, _res, next) => {
      req.userinfo = opts.testAuth!.userinfo;
      req.signedCookies = req.signedCookies ?? {};
      if (opts.testAuth!.isAdmin) req.signedCookies.admin = "1";
      next();
    });
  }

  // Your lightweight profile endpoint (kept)
  app.get("/api/profile", (req: AuthedRequest, res) => {
    if (!req.userinfo) return res.sendStatus(401);
    res.json({
      ...(req.userinfo as any),
      isAdmin: (req as any).signedCookies?.admin === "1",
    });
  });

  // Mount your routes that use db
  app.use(eventApi(opts.db));

  return app;
}
