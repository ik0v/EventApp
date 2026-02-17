import express from "express";

const app = express();
express.use(express.static("../client/dist"));
app.listen(3000);