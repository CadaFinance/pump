import "dotenv/config";
import http from "node:http";
import { WebSocketServer } from "ws";
import { Redis } from "ioredis";
import { arenaRoom, parseClientMessage, redisChannelToRooms, } from "./channels.js";
const PORT = Number(process.env.PORT ?? 3013);
const MAX_CONNECTIONS = Number(process.env.MAX_CONNECTIONS ?? 2000);
const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const roomClients = new Map();
const socketState = new WeakMap();
function getState(ws) {
    let state = socketState.get(ws);
    if (!state) {
        state = { rooms: new Set() };
        socketState.set(ws, state);
    }
    return state;
}
function subscribe(ws, room) {
    const normalized = room.trim();
    if (!normalized)
        return;
    const state = getState(ws);
    if (state.rooms.has(normalized))
        return;
    state.rooms.add(normalized);
    let clients = roomClients.get(normalized);
    if (!clients) {
        clients = new Set();
        roomClients.set(normalized, clients);
    }
    clients.add(ws);
    send(ws, { type: "subscribed", room: normalized });
    void sendReplay(ws, normalized);
}
async function sendReplay(ws, room) {
    try {
        const entries = await redisCmd.xrevrange(`pump:stream:${room}`, "+", "-", "COUNT", 40);
        if (!entries.length)
            return;
        const events = [];
        for (const entry of entries.reverse()) {
            const fields = entry[1];
            const payloadIndex = fields.indexOf("p");
            if (payloadIndex === -1 || payloadIndex + 1 >= fields.length)
                continue;
            try {
                events.push(JSON.parse(fields[payloadIndex + 1]));
            }
            catch {
                // Skip malformed stream entries.
            }
        }
        if (events.length > 0) {
            send(ws, { type: "replay", room, events });
        }
    }
    catch (error) {
        console.warn("replay failed:", error instanceof Error ? error.message : error);
    }
}
function unsubscribe(ws, room) {
    const normalized = room.trim();
    const state = getState(ws);
    if (!state.rooms.has(normalized))
        return;
    state.rooms.delete(normalized);
    roomClients.get(normalized)?.delete(ws);
}
function cleanup(ws) {
    const state = socketState.get(ws);
    if (!state)
        return;
    for (const room of state.rooms) {
        roomClients.get(room)?.delete(ws);
    }
    state.rooms.clear();
}
function send(ws, message) {
    if (ws.readyState !== ws.OPEN)
        return;
    ws.send(JSON.stringify(message));
}
function broadcast(room, payload) {
    const clients = roomClients.get(room);
    if (!clients?.size)
        return;
    for (const client of clients) {
        if (client.readyState === client.OPEN) {
            client.send(payload);
        }
    }
}
function originAllowed(origin) {
    if (!ALLOWED_ORIGINS.length)
        return true;
    if (!origin)
        return false;
    return ALLOWED_ORIGINS.includes(origin);
}
const server = http.createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("pump-realtime ok\n");
});
const wss = new WebSocketServer({ server, maxPayload: 256 * 1024 });
wss.on("connection", (ws, req) => {
    if (wss.clients.size > MAX_CONNECTIONS) {
        ws.close(1013, "max connections");
        return;
    }
    if (!originAllowed(req.headers.origin)) {
        ws.close(1008, "origin not allowed");
        return;
    }
    ws.on("message", (raw) => {
        const message = parseClientMessage(String(raw));
        if (!message)
            return;
        if (message.type === "subscribe") {
            subscribe(ws, message.room);
            return;
        }
        if (message.type === "unsubscribe") {
            unsubscribe(ws, message.room);
            return;
        }
        if (message.type === "ping") {
            send(ws, { type: "pong" });
        }
    });
    ws.on("close", () => cleanup(ws));
});
const redisSub = new Redis(REDIS_URL);
const redisCmd = new Redis(REDIS_URL);
redisSub.on("error", (error) => {
    console.warn("redis sub error:", error.message);
});
redisCmd.on("error", (error) => {
    console.warn("redis cmd error:", error.message);
});
server.listen(PORT, "127.0.0.1", () => {
    console.log(`pump-realtime listening on 127.0.0.1:${PORT} (rooms: ${arenaRoom()}, token:{addr}, wallet:{addr})`);
});
async function startRedis() {
    await redisSub.psubscribe("pump:*");
    redisSub.on("pmessage", (_pattern, channel, message) => {
        for (const room of redisChannelToRooms(channel, message)) {
            broadcast(room, message);
        }
    });
}
void startRedis().catch((error) => {
    console.error("redis subscribe failed:", error);
    process.exitCode = 1;
});
process.on("SIGINT", () => {
    wss.close();
    server.close();
    void redisSub.quit();
    void redisCmd.quit();
});
process.on("SIGTERM", () => {
    wss.close();
    server.close();
    void redisSub.quit();
    void redisCmd.quit();
});
