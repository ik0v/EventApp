import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { createApp } from "./app";

dotenv.config();

const client = new MongoClient(process.env["MONGODB_URL"]!);

async function main() {
  const con = await client.connect();
  const db = con.db("event-app");

  const app = createApp({
    db,
    sessionSecret: process.env.SESSION_SECRET ?? "dev_secret",
    staticDir: "../client/dist",
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
