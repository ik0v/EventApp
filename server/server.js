import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
const app = express();
app.use(express.json());
app.use(express.static(path.resolve("../client/dist")));
app.use(cookieParser(process.env.SESSION_SECRET));

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

export const eventsApi = new express.Router();

const events = [
  {
    id: 1,
    title: "Event 1",
    description:
      "lorem ipsum dolor sit amet, consetetur lorem ipsum dolor sit amet, consetetur",
    place: "Oslo",
    time: "2026-02-23T18:30:00Z",
    category: "Fun",
  },
  {
    id: 2,
    title: "Event 2",
    description:
      "lorem ipsum dolor sit amet, consetetur lorem ipsum dolor sit amet, consetetur",
    place: "Bergen",
    time: "2026-02-23T18:30:00Z",
    category: "Fun",
  },
  {
    id: 3,
    title: "Event 3",
    description:
      "lorem ipsum dolor sit amet, consetetur lorem ipsum dolor sit amet, consetetur",
    place: "Asker",
    time: "2026-02-23T18:30:00Z",
    category: "Fun",
  },
  {
    id: 3,
    title: "Event 4",
    description:
      "lorem ipsum dolor sit amet, consetetur lorem ipsum dolor sit amet, consetetur",
    place: "Horten",
    time: "2026-02-23T18:30:00Z",
    category: "Fun",
  },
];

eventsApi.get("/api/events", (req, res) => {
  res.send(events);
});

eventsApi.post("/api/events", (req, res) => {
  const { title } = req.body;
  events.push({ title, id: events.length + 1 });
  res.sendStatus(201);
});

app.use(async (req, res, next) => {
  const { access_token } = req.signedCookies;
  if (access_token) {
    const { userinfo_endpoint } = await fetchJSON(
      "https://accounts.google.com/.well-known/openid-configuration",
    );
    req.userinfo = await fetchJSON(userinfo_endpoint, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
  }
  next();
});

app.post("/api/login/accessToken", (req, res) => {
  const { access_token } = req.body;
  res.cookie("access_token", access_token, { signed: true, httpOnly: true });
  res.sendStatus(204);
});

app.get("/api/profile", (req, res) => {
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

app.use(eventsApi);

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(path.resolve("../client/dist/index.html"));
  } else {
    next();
  }
});

app.listen(process.env.PORT || 3000);
