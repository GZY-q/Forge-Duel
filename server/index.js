import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

import { PORT, MONGODB_URI, SESSION_SECRET, CORS_ORIGIN, HOST } from "./config.js";
import { connectDB } from "./db/connection.js";
import { authRoutes } from "./auth/routes.js";
import { playerDataRoutes } from "./api/player-data.js";
import { leaderboardRoutes } from "./api/leaderboard.js";
import { RoomManager } from "./rooms/RoomManager.js";
import { setupVoiceSignaling } from "./signaling/voice.js";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await connectDB(MONGODB_URI);

const app = express();
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/player-data", playerDataRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

const distPath = path.resolve(__dirname, "..", "dist");
app.use(express.static(distPath));
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api") && !req.path.startsWith("/socket.io")) {
    res.sendFile(path.join(distPath, "index.html"));
  }
});

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
  pingInterval: 10000,
  pingTimeout: 5000
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.userId = "guest-" + socket.id;
    socket.username = "Guest";
    return next();
  }
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch {
    socket.userId = "guest-" + socket.id;
    socket.username = "Guest";
    next();
  }
});

const roomManager = new RoomManager(io);
setupVoiceSignaling(io, roomManager);

httpServer.listen(PORT, HOST, () => {
  const localIP = getLocalIP();
  console.log(`[Server] ForgeDuel server running on http://${HOST === '0.0.0.0' ? localIP : HOST}:${PORT}`);
  console.log(`[Server] 局域网访问: http://${localIP}:${PORT}`);
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
