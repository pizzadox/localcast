import { createServer } from "http";
import { Server } from "socket.io";
import crypto from "crypto";

// ─── Types ──────────────────────────────────────────────────────────

interface ViewerInfo {
  id: string;
  deviceName?: string;
  os?: string;
  browser?: string;
  screenWidth?: number;
  screenHeight?: number;
  connectedAt: number;
  approved: boolean;
}

interface Room {
  id: string;
  hostId: string;
  viewers: Map<string, ViewerInfo>;
  createdAt: number;
  settings: {
    maxViewers: number;
    requireApproval: boolean;
    password?: string;
    theme?: string;
    [key: string]: unknown;
  };
}

// ─── State (persists across imports in same process) ────────────────

const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const chatRateLimits = new Map<string, number>();
const VALID_REACTIONS = new Set(["👍","👎","❤️","😂","🎉","👏","🔥"]);

function generateRoomId(): string {
  const bytes = crypto.randomBytes(6);
  const chars: string[] = [];
  for (const byte of bytes) {
    const idx = byte % 36;
    chars.push(idx < 10 ? String(idx) : String.fromCharCode(65 + idx - 10));
  }
  return chars.join("").toUpperCase();
}

function broadcastViewerCount(room: Room): void {
  const totalViewers = room.viewers.size;
  const approvedViewers = Array.from(room.viewers.values()).filter(v => v.approved).length;
  const payload = { roomId: room.id, totalViewers, approvedViewers };
  const io = globalThis.__localcastIO as Server;
  const hs = io?.sockets.sockets.get(room.hostId);
  if (hs) hs.emit("VIEWER_COUNT_UPDATE", payload);
  for (const [vid] of room.viewers) {
    const vs = io?.sockets.sockets.get(vid);
    if (vs) vs.emit("VIEWER_COUNT_UPDATE", payload);
  }
}

// ─── Singleton Starter ─────────────────────────────────────────────

let started = false;

export function ensureSignalingServer(): void {
  if (started) return;
  started = true;

  const httpServer = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ name: "localcast-signaling", activeRooms: rooms.size }));
  });

  const io = new Server(httpServer, {
    path: "/",
    cors: { origin: "*", methods: ["GET", "POST"] },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  (globalThis as any).__localcastIO = io;

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      const roomId = socketToRoom.get(socket.id);
      socketToRoom.delete(socket.id);
      chatRateLimits.delete(socket.id);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.hostId === socket.id) {
        for (const [vid] of room.viewers) {
          const vs = io.sockets.sockets.get(vid);
          if (vs) { vs.emit("HOST_DISCONNECTED", { roomId }); vs.disconnect(true); socketToRoom.delete(vid); }
        }
        rooms.delete(roomId);
      } else {
        room.viewers.delete(socket.id);
        const hs = io.sockets.sockets.get(room.hostId);
        if (hs) hs.emit("VIEWER_DISCONNECTED", { viewerId: socket.id });
        broadcastViewerCount(room);
      }
    });

    socket.on("CREATE_ROOM", (payload, cb) => {
      if (socketToRoom.has(socket.id)) { socket.emit("ERROR", { message: "Already in a room", code: "ALREADY_IN_ROOM" }); cb?.({ success: false }); return; }
      let rid: string;
      do { rid = generateRoomId(); } while (rooms.has(rid));
      const room: Room = {
        id: rid, hostId: socket.id, viewers: new Map(), createdAt: Date.now(),
        settings: { maxViewers: payload?.maxViewers ?? 0, requireApproval: payload?.requireApproval ?? false, password: payload?.password || "", theme: payload?.theme || "default" },
      };
      rooms.set(rid, room);
      socketToRoom.set(socket.id, rid);
      socket.emit("ROOM_CREATED", { roomId: rid, roomInfo: { id: rid, hostId: socket.id, viewers: {}, createdAt: room.createdAt, settings: room.settings } });
      cb?.({ success: true, roomId: rid });
    });

    socket.on("JOIN_ROOM", (payload, cb) => {
      const { roomId, password } = payload;
      const room = rooms.get(roomId);
      if (!room) { socket.emit("ROOM_NOT_FOUND", { roomId }); cb?.({ success: false }); return; }
      if (room.settings.password && password !== room.settings.password) { socket.emit("ROOM_PASSWORD_REQUIRED", { roomId, requiresPassword: true }); cb?.({ success: false }); return; }
      if (room.hostId === socket.id || room.viewers.has(socket.id)) { cb?.({ success: true, roomId }); return; }
      if (room.settings.maxViewers > 0 && room.viewers.size >= room.settings.maxViewers) { socket.emit("ROOM_FULL", { message: "Room full" }); cb?.({ success: false }); return; }
      const vi: ViewerInfo = { id: socket.id, connectedAt: Date.now(), approved: !room.settings.requireApproval };
      room.viewers.set(socket.id, vi);
      socketToRoom.set(socket.id, roomId);
      const hs = io.sockets.sockets.get(room.hostId);
      if (hs) hs.emit("VIEWER_JOINED", { viewerId: socket.id, viewerInfo: vi });
      socket.emit("ROOM_JOINED", { roomId: room.id, hostId: room.hostId, approved: vi.approved });
      broadcastViewerCount(room);
      cb?.({ success: true, roomId });
    });

    socket.on("WEBRTC_SIGNAL", ({ targetId, signal }) => {
      if (!targetId || !signal) return;
      const ts = io.sockets.sockets.get(targetId);
      if (ts) ts.emit("WEBRTC_SIGNAL", { from: socket.id, signal });
      else socket.emit("ERROR", { message: "Peer gone", code: "PEER_GONE" });
    });

    socket.on("APPROVE_VIEWER", ({ viewerId }, cb) => {
      const roomId = socketToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return; }
      const v = room.viewers.get(viewerId);
      if (v) { v.approved = true; const vs = io.sockets.sockets.get(viewerId); if (vs) vs.emit("VIEWER_APPROVED", { roomId: room.id }); }
      cb?.({ success: true });
    });

    socket.on("DENY_VIEWER", ({ viewerId }, cb) => {
      const roomId = socketToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return; }
      const vs = io.sockets.sockets.get(viewerId);
      if (vs) { vs.emit("VIEWER_DENIED", { roomId: room.id }); vs.disconnect(true); }
      room.viewers.delete(viewerId); socketToRoom.delete(viewerId);
      broadcastViewerCount(room);
      cb?.({ success: true });
    });

    socket.on("DISCONNECT_VIEWER", ({ viewerId }, cb) => {
      const roomId = socketToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return; }
      const vs = io.sockets.sockets.get(viewerId);
      if (vs) { vs.emit("KICKED", { roomId: room.id }); vs.disconnect(true); }
      room.viewers.delete(viewerId); socketToRoom.delete(viewerId);
      broadcastViewerCount(room);
      cb?.({ success: true });
    });

    socket.on("DEVICE_INFO", (p) => {
      const roomId = socketToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (!room) return;
      const v = room.viewers.get(p.viewerId || socket.id);
      if (v) { Object.assign(v, { deviceName: p.deviceName, os: p.os, browser: p.browser, screenWidth: p.screenWidth, screenHeight: p.screenHeight }); const hs = io.sockets.sockets.get(room.hostId); if (hs) hs.emit("VIEWER_JOINED", { viewerId: v.id, viewerInfo: v }); }
    });

    socket.on("CHAT_MESSAGE", ({ roomId, message, senderName, senderType }) => {
      const room = rooms.get(roomId);
      if (!room || (room.hostId !== socket.id && !room.viewers.has(socket.id))) return;
      const now = Date.now();
      if (now - (chatRateLimits.get(socket.id) ?? 0) < 100) return;
      chatRateLimits.set(socket.id, now);
      const cp = { roomId, message, senderName, senderType, senderId: socket.id, timestamp: now };
      const hs = io.sockets.sockets.get(room.hostId);
      if (hs) hs.emit("CHAT_MESSAGE", cp);
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit("CHAT_MESSAGE", cp); }
    });

    socket.on("REACTION", ({ roomId, emoji, viewerId }) => {
      if (!roomId || !emoji || !VALID_REACTIONS.has(emoji)) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const vid = viewerId || socket.id;
      if (!room.viewers.has(vid)) return;
      const hs = io.sockets.sockets.get(room.hostId);
      if (hs) hs.emit("REACTION", { roomId, emoji, viewerId: vid, timestamp: Date.now() });
    });

    socket.on("ANNOTATION", ({ roomId, annotation }) => {
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.id) return;
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit("ANNOTATION", { roomId, annotation }); }
    });

    socket.on("SPOTLIGHT_VIEWER", ({ roomId, viewerId }, cb) => {
      const room = rooms.get(roomId);
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return; }
      const hs = io.sockets.sockets.get(room.hostId);
      if (hs) hs.emit("SPOTLIGHT_VIEWER", { roomId, viewerId });
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit("SPOTLIGHT_VIEWER", { roomId, viewerId }); }
      cb?.({ success: true });
    });

    socket.on("RAISE_HAND", ({ roomId }) => { const room = rooms.get(roomId); if (!room) return; const hs = io.sockets.sockets.get(room.hostId); if (hs) hs.emit("VIEWER_HAND_RAISED", { roomId, viewerId: socket.id }); });
    socket.on("LOWER_HAND", ({ roomId }) => { const room = rooms.get(roomId); if (!room) return; const hs = io.sockets.sockets.get(room.hostId); if (hs) hs.emit("VIEWER_HAND_LOWERED", { roomId, viewerId: socket.id }); });
    socket.on("HOST_LOWER_HAND", ({ roomId, viewerId }) => { const room = rooms.get(roomId); if (!room || room.hostId !== socket.id) return; const vs = io.sockets.sockets.get(viewerId); if (vs) vs.emit("HAND_LOWERED_BY_HOST", { roomId }); });

    socket.on("PAUSE_STREAM", ({ roomId }, cb) => {
      const room = rooms.get(roomId); if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return; }
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit("STREAM_PAUSED", { roomId }); }
      cb?.({ success: true });
    });
    socket.on("RESUME_STREAM", ({ roomId }, cb) => {
      const room = rooms.get(roomId); if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return; }
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit("STREAM_RESUMED", { roomId }); }
      cb?.({ success: true });
    });

    socket.on("CHANGE_PASSWORD", ({ roomId, password }, cb) => {
      const room = rooms.get(roomId); if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return; }
      room.settings.password = password || ""; cb?.({ success: true });
    });

    socket.on("UPDATE_ROOM_SETTINGS", (payload, cb) => {
      const roomId = socketToRoom.get(socket.id);
      const room = roomId ? rooms.get(roomId) : null;
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return; }
      Object.assign(room.settings, payload); cb?.({ success: true });
    });

    socket.on("PING", (cb) => { socket.emit("PONG", { timestamp: Date.now() }); cb?.({ timestamp: Date.now() }); });
  });

  httpServer.listen(3003, "0.0.0.0", () => {
    console.log("[signaling] LocalCast signaling server started on port 3003");
  });
}
