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
import { WarGame } from "./rooms/war"; // path to your room class
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import express from "express";
import cors from "cors";
import { createServer } from "http";

const PORT = 3001;
const HOST = "127.0.0.1"; // Only listen internally

const app = express();

const allowedOrigins = process.env.NODE_ENV === "production"
  ? ["https://mwcardgames.csproject.org"]
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

gameServer.define("war", WarGame);

// start the server

gameServer.listen(PORT);
console.log(`Colyseus server listening on ws://${HOST}:${PORT}`);