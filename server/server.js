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

app.listen(3000);