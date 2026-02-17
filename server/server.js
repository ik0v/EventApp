import express from "express";

const app = express();
app.use(express.json());
app.use(express.static("../client/dist"));

export const eventsApi = new express.Router();


eventsApi.get("/api/events", (req, res) => {
    res.send([
        { title: "Event 1" },
        { title: "Event 2" },
    ])
});

app.use(eventsApi);

app.listen(3000);