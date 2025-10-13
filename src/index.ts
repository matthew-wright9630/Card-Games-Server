/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to host your server on Colyseus Cloud
 *
 * If you're self-hosting (without Colyseus Cloud), you can manually
 * instantiate a Colyseus Server as documented here:
 *
 * See: https://docs.colyseus.io/server/api/#constructor-options
 */
import { WarGame } from "./rooms/war";
import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import cors from "cors";
import { createServer } from "http";

const PORT = 3001;
const HOST = "0.0.0.0";

const app = express();

const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? "https://mwcardgames.csproject.org"
    : "http://localhost:5173";

app.use(
  cors({
    origin: allowedOrigin,
    methods: ["GET", "POST", "OPTIONS"],
    credentials: false,
  })
);

app.use(express.json());
app.options("*", cors());

app.post("/matchmake/joinOrCreate/:roomName", async (req, res) => {
  try {
    const { roomName } = req.params;
    const room = await matchMaker.joinOrCreate(roomName, req.body);
    res.json(room);
  } catch (err) {
    console.error("joinOrCreate failed:", err);
    res.status(500).json({ error: "Failed to joinOrCreate room" });
  }
});

app.post("/matchmake/join/:roomName", async (req, res) => {
  try {
    const { roomName } = req.params;
    const room = await matchMaker.join(roomName, req.body);
    res.json(room);
  } catch (err) {
    console.error("join failed:", err);
    res.status(500).json({ error: "Failed to join room" });
  }
});

app.get("/", (_, res) => res.send("✅ Colyseus 0.16.5 with Express + CORS working"));

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

gameServer.define("war", WarGame);

httpServer.listen(PORT, HOST, () => {
  console.log(`Colyseus server listening on ws://${HOST}:${PORT}`);
});