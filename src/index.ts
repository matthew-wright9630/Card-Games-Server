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

const PORT = 2567; // or whatever you’re using
const HOST = "0.0.0.0";

const app = express();

const allowedOrigins =
  process.env.NODE_ENV === "production"
    ? ["https://mwcardgames.csproject.org"]
    : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`❌ CORS blocked for origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true, // important
  })
);

app.use(express.json());
app.options("*", cors()); // handles preflight properly

app.get("/", (_, res) => res.send("✅ Colyseus WS server is up"));

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

gameServer.define("war", WarGame);

httpServer.listen(PORT, HOST, () => {
  console.log(`✅ Colyseus server listening on ws://${HOST}:${PORT}`);
});