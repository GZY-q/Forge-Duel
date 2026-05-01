import crypto from "crypto";

const MAX_PLAYERS = 4;
const ROOM_CODE_LENGTH = 4;
const ROOM_CLEANUP_INTERVAL_MS = 60_000;
const ROOM_IDLE_TIMEOUT_MS = 10 * 60_000;

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(ROOM_CODE_LENGTH);
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRooms = new Map();

    this._cleanupInterval = setInterval(() => this._cleanupStaleRooms(), ROOM_CLEANUP_INTERVAL_MS);

    io.on("connection", (socket) => {
      this._setupSocketHandlers(socket);
    });
  }

  _setupSocketHandlers(socket) {
    socket.on("room:create", (data, ack) => {
      try {
        const { fighterType } = data || {};
        if (this.playerRooms.has(socket.id)) {
          return ack?.({ error: "Already in a room" });
        }

        let code;
        do { code = generateRoomCode(); } while (this.rooms.has(code));

        const room = {
          code,
          hostId: socket.id,
          players: new Map(),
          state: "lobby",
          createdAt: Date.now()
        };

        room.players.set(socket.id, {
          socketId: socket.id,
          userId: socket.userId,
          username: socket.username,
          fighterType: fighterType || "scout",
          ready: false,
          x: 0, y: 0, facing: "south", hp: 100, maxHp: 100,
          isDead: false, level: 1
        });

        this.rooms.set(code, room);
        this.playerRooms.set(socket.id, code);
        socket.join(code);

        ack?.({
          roomCode: code,
          playerId: socket.id,
          isHost: true,
          players: this._serializePlayers(room)
        });
      } catch (err) {
        console.error("[Room] create error:", err);
        ack?.({ error: "Failed to create room" });
      }
    });

    socket.on("room:join", (data, ack) => {
      try {
        const { roomCode, fighterType } = data || {};
        if (this.playerRooms.has(socket.id)) {
          return ack?.({ error: "Already in a room" });
        }

        const code = (roomCode || "").toUpperCase();
        const room = this.rooms.get(code);
        if (!room) {
          return ack?.({ error: "Room not found" });
        }
        if (room.state !== "lobby") {
          return ack?.({ error: "Game already in progress" });
        }
        if (room.players.size >= MAX_PLAYERS) {
          return ack?.({ error: "Room is full" });
        }

        room.players.set(socket.id, {
          socketId: socket.id,
          userId: socket.userId,
          username: socket.username,
          fighterType: fighterType || "scout",
          ready: false,
          x: 0, y: 0, facing: "south", hp: 100, maxHp: 100,
          isDead: false, level: 1
        });

        this.playerRooms.set(socket.id, code);
        socket.join(code);

        socket.to(code).emit("room:player-joined", {
          playerId: socket.id,
          username: socket.username,
          fighterType: fighterType || "scout"
        });

        ack?.({
          roomCode: code,
          playerId: socket.id,
          isHost: false,
          players: this._serializePlayers(room)
        });
      } catch (err) {
        console.error("[Room] join error:", err);
        ack?.({ error: "Failed to join room" });
      }
    });

    socket.on("room:leave", () => {
      this._leaveRoom(socket);
    });

    socket.on("room:ready", (data, ack) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return ack?.({ error: "Not in a room" });
      const room = this.rooms.get(code);
      if (!room) return ack?.({ error: "Room not found" });

      const player = room.players.get(socket.id);
      if (!player) return ack?.({ error: "Player not in room" });

      player.ready = !!data?.ready;
      this.io.to(code).emit("room:ready-changed", {
        playerId: socket.id,
        ready: player.ready
      });

      const allReady = [...room.players.values()].every((p) => p.ready);
      if (allReady && room.players.size >= 1) {
        this.io.to(code).emit("room:all-ready");
      }

      ack?.({ ok: true });
    });

    socket.on("room:start", (ack) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return ack?.({ error: "Not in a room" });
      const room = this.rooms.get(code);
      if (!room) return ack?.({ error: "Room not found" });
      if (room.hostId !== socket.id) return ack?.({ error: "Only host can start" });

      const allReady = [...room.players.values()].every((p) => p.ready);
      if (!allReady) return ack?.({ error: "Not all players ready" });

      room.state = "playing";
      const seed = Date.now();

      this.io.to(code).emit("game:started", {
        seed,
        hostId: room.hostId,
        players: this._serializePlayers(room)
      });

      ack?.({ ok: true });
    });

    socket.on("game:player-update", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room || room.state !== "playing") return;

      const player = room.players.get(socket.id);
      if (player) {
        player.x = data.x;
        player.y = data.y;
        player.facing = data.facing;
        player.hp = data.hp;
        player.maxHp = data.maxHp;
        player.isDead = data.isDead;
        player.level = data.level;
      }

      socket.to(code).emit("game:remote-player-update", {
        playerId: socket.id,
        ...data
      });
    });

    socket.on("game:enemy-sync", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room || room.state !== "playing") return;
      if (room.hostId !== socket.id) return;

      socket.to(code).emit("game:enemy-state", data);
    });

    socket.on("game:enemy-killed", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      this.io.to(code).emit("game:enemy-killed", { killerId: socket.id, ...data });
    });

    socket.on("game:item-drop", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      this.io.to(code).emit("game:item-drop", data);
    });

    socket.on("game:xp-drop", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      socket.to(code).emit("game:xp-drop", data);
    });

    socket.on("game:player-died", () => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room) return;

      const player = room.players.get(socket.id);
      if (player) player.isDead = true;

      this.io.to(code).emit("game:player-died", { playerId: socket.id });

      const allDead = [...room.players.values()].every((p) => p.isDead);
      if (allDead) {
        room.state = "finished";
        this.io.to(code).emit("game:over", {
          players: this._serializePlayers(room)
        });
      }
    });

    socket.on("game:game-over", (data) => {
      const code = this.playerRooms.get(socket.id);
      if (!code) return;
      const room = this.rooms.get(code);
      if (!room) return;
      room.state = "finished";
      this.io.to(code).emit("game:over", data);
    });

    socket.on("disconnect", () => {
      this._leaveRoom(socket);
    });
  }

  _leaveRoom(socket) {
    const code = this.playerRooms.get(socket.id);
    if (!code) return;

    const room = this.rooms.get(code);
    if (!room) {
      this.playerRooms.delete(socket.id);
      return;
    }

    room.players.delete(socket.id);
    this.playerRooms.delete(socket.id);
    socket.leave(code);

    if (room.players.size === 0) {
      this.rooms.delete(code);
      return;
    }

    this.io.to(code).emit("room:player-left", { playerId: socket.id });

    if (room.hostId === socket.id) {
      room.hostId = room.players.keys().next().value;
      this.io.to(code).emit("game:host-migrated", { newHostId: room.hostId });
    }

    if (room.state === "playing") {
      const allDead = [...room.players.values()].every((p) => p.isDead);
      if (allDead) {
        room.state = "finished";
        this.io.to(code).emit("game:over", {
          players: this._serializePlayers(room)
        });
      }
    }
  }

  _serializePlayers(room) {
    return [...room.players.values()].map((p) => ({
      playerId: p.socketId,
      username: p.username,
      fighterType: p.fighterType,
      ready: p.ready,
      isHost: p.socketId === room.hostId
    }));
  }

  _cleanupStaleRooms() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.state === "finished" || (room.state === "lobby" && now - room.createdAt > ROOM_IDLE_TIMEOUT_MS)) {
        for (const [, player] of room.players) {
          this.playerRooms.delete(player.socketId);
        }
        this.rooms.delete(code);
      }
    }
  }
}
