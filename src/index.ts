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
import express, {Express} from "express";
import { createServer, Server as HTTPServer } from "http";

const PORT = 3001;
const HOST = "0.0.0.0"; 

const app: Express = express();

const httpServer: HTTPServer = createServer(app);

const gameServer: Server = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// define your Colyseus rooms
gameServer.define("war", WarGame);

// start listening
httpServer.listen(PORT, HOST, () => {
  console.log(`Colyseus server listening on ws://${HOST}:${PORT}`);
});