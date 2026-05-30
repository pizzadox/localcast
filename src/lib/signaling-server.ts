import { createServer } from 'http'
import { Server, Socket } from 'socket.io'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ViewerInfo {
  id: string
  deviceName?: string
  os?: string
  browser?: string
  screenWidth?: number
  screenHeight?: number
  connectedAt: number
  approved: boolean
}

interface RoomSettings {
  maxViewers: number
  requireApproval: boolean
  password?: string
  theme?: string
  [key: string]: unknown
}

interface Room {
  id: string
  hostId: string
  viewers: Map<string, ViewerInfo>
  createdAt: number
  settings: RoomSettings
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateRoomId(): string {
  const bytes = crypto.randomBytes(6)
  const chars: string[] = []
  for (const byte of bytes) {
    const idx = byte % 36
    chars.push(idx < 10 ? String(idx) : String.fromCharCode(65 + idx - 10))
  }
  return chars.join('').toUpperCase()
}

// ---------------------------------------------------------------------------
// State (persists across imports in same process)
// ---------------------------------------------------------------------------

const rooms = new Map<string, Room>()
const socketToRoom = new Map<string, string>()
const chatRateLimits = new Map<string, number>()
const VALID_REACTIONS = new Set(['👍', '👎', '❤️', '😂', '🎉', '👏', '🔥'])

function broadcastViewerCount(io: Server, room: Room): void {
  const totalViewers = room.viewers.size
  const approvedViewers = Array.from(room.viewers.values()).filter(v => v.approved).length
  const payload = { roomId: room.id, totalViewers, approvedViewers }
  const hs = io.sockets.sockets.get(room.hostId)
  if (hs) hs.emit('VIEWER_COUNT_UPDATE', payload)
  for (const [vid] of room.viewers) {
    const vs = io.sockets.sockets.get(vid)
    if (vs) vs.emit('VIEWER_COUNT_UPDATE', payload)
  }
}

// ---------------------------------------------------------------------------
// Singleton Starter
// ---------------------------------------------------------------------------

let started = false

export function ensureSignalingServer(): void {
  if (started) return
  started = true

  // IMPORTANT: createServer() without callback so Socket.IO handles all requests
  const httpServer = createServer()

  const io = new Server(httpServer, {
    path: '/',
    cors: { origin: '*', methods: ['GET', 'POST'] },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  })

  // ── Connection handler ──────────────────────────────────────────────────

  io.on('connection', (socket: Socket) => {

    // CREATE_ROOM
    socket.on('CREATE_ROOM', (payload: any, cb: any) => {
      if (socketToRoom.has(socket.id)) { cb?.({ success: false, error: 'Already in a room' }); return }
      let rid: string
      do { rid = generateRoomId() } while (rooms.has(rid))
      const room: Room = {
        id: rid, hostId: socket.id, viewers: new Map(), createdAt: Date.now(),
        settings: { maxViewers: payload?.maxViewers ?? 0, requireApproval: payload?.requireApproval ?? false, password: payload?.password || '', theme: payload?.theme || 'default' },
      }
      rooms.set(rid, room)
      socketToRoom.set(socket.id, rid)
      socket.emit('ROOM_CREATED', { roomId: rid, roomInfo: { id: rid, hostId: socket.id, viewers: {}, createdAt: room.createdAt, settings: room.settings } })
      cb?.({ success: true, roomId: rid })
    })

    // JOIN_ROOM
    socket.on('JOIN_ROOM', (payload: any, cb: any) => {
      const { roomId, password } = payload
      const room = rooms.get(roomId)
      if (!room) { socket.emit('ROOM_NOT_FOUND', { roomId }); cb?.({ success: false, error: 'Room not found' }); return }
      if (room.settings.password && password !== room.settings.password) { socket.emit('ROOM_PASSWORD_REQUIRED', { roomId, requiresPassword: true }); cb?.({ success: false, error: 'Password required' }); return }
      if (room.hostId === socket.id || room.viewers.has(socket.id)) { cb?.({ success: true, roomId }); return }
      if (room.settings.maxViewers > 0 && room.viewers.size >= room.settings.maxViewers) { socket.emit('ROOM_FULL', { message: 'Room full' }); cb?.({ success: false }); return }
      const vi: ViewerInfo = { id: socket.id, connectedAt: Date.now(), approved: !room.settings.requireApproval }
      room.viewers.set(socket.id, vi)
      socketToRoom.set(socket.id, roomId)
      const hs = io.sockets.sockets.get(room.hostId)
      if (hs) hs.emit('VIEWER_JOINED', { viewerId: socket.id, viewerInfo: vi })
      socket.emit('ROOM_JOINED', { roomId: room.id, hostId: room.hostId, approved: vi.approved })
      broadcastViewerCount(io, room)
      cb?.({ success: true, roomId })
    })

    // WEBRTC_SIGNAL
    socket.on('WEBRTC_SIGNAL', ({ targetId, signal }: any) => {
      if (!targetId || !signal) return
      const ts = io.sockets.sockets.get(targetId)
      if (ts) ts.emit('WEBRTC_SIGNAL', { from: socket.id, signal })
      else socket.emit('ERROR', { message: 'Peer gone', code: 'PEER_GONE' })
    })

    // APPROVE_VIEWER
    socket.on('APPROVE_VIEWER', ({ viewerId }: any, cb: any) => {
      const roomId = socketToRoom.get(socket.id)
      const room = roomId ? rooms.get(roomId) : null
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return }
      const v = room.viewers.get(viewerId)
      if (v) { v.approved = true; const vs = io.sockets.sockets.get(viewerId); if (vs) vs.emit('VIEWER_APPROVED', { roomId: room.id }) }
      cb?.({ success: true })
    })

    // DENY_VIEWER
    socket.on('DENY_VIEWER', ({ viewerId }: any, cb: any) => {
      const roomId = socketToRoom.get(socket.id)
      const room = roomId ? rooms.get(roomId) : null
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return }
      const vs = io.sockets.sockets.get(viewerId)
      if (vs) { vs.emit('VIEWER_DENIED', { roomId: room.id }); vs.disconnect(true) }
      room.viewers.delete(viewerId); socketToRoom.delete(viewerId)
      broadcastViewerCount(io, room)
      cb?.({ success: true })
    })

    // DISCONNECT_VIEWER
    socket.on('DISCONNECT_VIEWER', ({ viewerId }: any, cb: any) => {
      const roomId = socketToRoom.get(socket.id)
      const room = roomId ? rooms.get(roomId) : null
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return }
      const vs = io.sockets.sockets.get(viewerId)
      if (vs) { vs.emit('KICKED', { roomId: room.id }); vs.disconnect(true) }
      room.viewers.delete(viewerId); socketToRoom.delete(viewerId)
      broadcastViewerCount(io, room)
      cb?.({ success: true })
    })

    // DEVICE_INFO
    socket.on('DEVICE_INFO', (p: any) => {
      const roomId = socketToRoom.get(socket.id)
      const room = roomId ? rooms.get(roomId) : null
      if (!room) return
      const v = room.viewers.get(p.viewerId || socket.id)
      if (v) { Object.assign(v, { deviceName: p.deviceName, os: p.os, browser: p.browser, screenWidth: p.screenWidth, screenHeight: p.screenHeight }); const hs = io.sockets.sockets.get(room.hostId); if (hs) hs.emit('VIEWER_JOINED', { viewerId: v.id, viewerInfo: v }) }
    })

    // CHAT_MESSAGE
    socket.on('CHAT_MESSAGE', ({ roomId, message, senderName, senderType }: any) => {
      const room = rooms.get(roomId)
      if (!room || (room.hostId !== socket.id && !room.viewers.has(socket.id))) return
      const now = Date.now()
      if (now - (chatRateLimits.get(socket.id) ?? 0) < 100) return
      chatRateLimits.set(socket.id, now)
      const cp = { roomId, message, senderName, senderType, senderId: socket.id, timestamp: now }
      const hs = io.sockets.sockets.get(room.hostId)
      if (hs) hs.emit('CHAT_MESSAGE', cp)
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit('CHAT_MESSAGE', cp) }
    })

    // REACTION
    socket.on('REACTION', ({ roomId, emoji, viewerId }: any) => {
      if (!roomId || !emoji || !VALID_REACTIONS.has(emoji)) return
      const room = rooms.get(roomId)
      if (!room) return
      const vid = viewerId || socket.id
      if (!room.viewers.has(vid)) return
      const hs = io.sockets.sockets.get(room.hostId)
      if (hs) hs.emit('REACTION', { roomId, emoji, viewerId: vid, timestamp: Date.now() })
    })

    // ANNOTATION
    socket.on('ANNOTATION', ({ roomId, annotation }: any) => {
      const room = rooms.get(roomId)
      if (!room || room.hostId !== socket.id) return
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit('ANNOTATION', { roomId, annotation }) }
    })

    // SPOTLIGHT_VIEWER
    socket.on('SPOTLIGHT_VIEWER', ({ roomId, viewerId }: any, cb: any) => {
      const room = rooms.get(roomId)
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return }
      const hs = io.sockets.sockets.get(room.hostId)
      if (hs) hs.emit('SPOTLIGHT_VIEWER', { roomId, viewerId })
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit('SPOTLIGHT_VIEWER', { roomId, viewerId }) }
      cb?.({ success: true })
    })

    // RAISE_HAND / LOWER_HAND
    socket.on('RAISE_HAND', ({ roomId }: any) => { const room = rooms.get(roomId); if (!room) return; const hs = io.sockets.sockets.get(room.hostId); if (hs) hs.emit('VIEWER_HAND_RAISED', { roomId, viewerId: socket.id }) })
    socket.on('LOWER_HAND', ({ roomId }: any) => { const room = rooms.get(roomId); if (!room) return; const hs = io.sockets.sockets.get(room.hostId); if (hs) hs.emit('VIEWER_HAND_LOWERED', { roomId, viewerId: socket.id }) })
    socket.on('HOST_LOWER_HAND', ({ roomId, viewerId }: any) => { const room = rooms.get(roomId); if (!room || room.hostId !== socket.id) return; const vs = io.sockets.sockets.get(viewerId); if (vs) vs.emit('HAND_LOWERED_BY_HOST', { roomId }) })

    // PAUSE_STREAM / RESUME_STREAM
    socket.on('PAUSE_STREAM', ({ roomId }: any, cb: any) => {
      const room = rooms.get(roomId); if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return }
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit('STREAM_PAUSED', { roomId }) }
      cb?.({ success: true })
    })
    socket.on('RESUME_STREAM', ({ roomId }: any, cb: any) => {
      const room = rooms.get(roomId); if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return }
      for (const [vid] of room.viewers) { const vs = io.sockets.sockets.get(vid); if (vs) vs.emit('STREAM_RESUMED', { roomId }) }
      cb?.({ success: true })
    })

    // CHANGE_PASSWORD
    socket.on('CHANGE_PASSWORD', ({ roomId, password }: any, cb: any) => {
      const room = rooms.get(roomId); if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return }
      room.settings.password = password || ''; cb?.({ success: true })
    })

    // UPDATE_ROOM_SETTINGS
    socket.on('UPDATE_ROOM_SETTINGS', (payload: any, cb: any) => {
      const roomId = socketToRoom.get(socket.id)
      const room = roomId ? rooms.get(roomId) : null
      if (!room || room.hostId !== socket.id) { cb?.({ success: false }); return }
      Object.assign(room.settings, payload); cb?.({ success: true })
    })

    // PING / PONG
    socket.on('PING', (cb: any) => { socket.emit('PONG', { timestamp: Date.now() }); cb?.({ timestamp: Date.now() }) })

    // DISCONNECT
    socket.on('disconnect', () => {
      const roomId = socketToRoom.get(socket.id)
      socketToRoom.delete(socket.id)
      chatRateLimits.delete(socket.id)
      if (!roomId) return
      const room = rooms.get(roomId)
      if (!room) return
      if (room.hostId === socket.id) {
        for (const [vid] of room.viewers) {
          const vs = io.sockets.sockets.get(vid)
          if (vs) { vs.emit('HOST_DISCONNECTED', { roomId }); vs.disconnect(true); socketToRoom.delete(vid) }
        }
        rooms.delete(roomId)
      } else {
        room.viewers.delete(socket.id)
        const hs = io.sockets.sockets.get(room.hostId)
        if (hs) hs.emit('VIEWER_DISCONNECTED', { viewerId: socket.id })
        broadcastViewerCount(io, room)
      }
    })
  })

  httpServer.listen(3003, '0.0.0.0', () => {
    console.log('[signaling] LocalCast signaling server started on port 3003')
  })
}
