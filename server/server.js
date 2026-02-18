import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("../client/dist"));

export const eventsApi = new express.Router();

const events = [
  { title: "Event 1", id: 0 },
  { title: "Event 2", id: 1 },
];

eventsApi.get("/api/events", (req, res) => {
  res.send(events);
});

eventsApi.post("/api/events", (req, res) => {
  const { title } = req.body;
  events.push({ title, id: events.length });
  res.sendStatus(201);
});

app.use(eventsApi);

app.use((req) => {
  if (req.method === "GET" && !req.path.startsWith("/api")) {
    res.sendFile(path.resolve("../client/dist/index.html"));
  }
  console.log("logging: ", req.path);
  next();
});

app.listen(process.env.PORT || 3000);
