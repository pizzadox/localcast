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

function formatTimestamp(date: Date = new Date()): string {
  return date.toISOString()
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_REACTIONS = new Set(['👍', '👎', '❤️', '😂', '🎉', '👏', '🔥'])
const CHAT_RATE_LIMIT_MS = 100

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const rooms = new Map<string, Room>()
const socketToRoom = new Map<string, string>()
const chatRateLimits = new Map<string, number>()

// ---------------------------------------------------------------------------
// Helpers (need io reference)
// ---------------------------------------------------------------------------

function broadcastViewerCount(io: Server, room: Room): void {
  const totalViewers = room.viewers.size
  const approvedViewers = Array.from(room.viewers.values()).filter(
    (v) => v.approved,
  ).length
  const payload = { roomId: room.id, totalViewers, approvedViewers }

  const hostSocket = io.sockets.sockets.get(room.hostId)
  if (hostSocket) {
    hostSocket.emit('VIEWER_COUNT_UPDATE', payload)
  }
  for (const [viewerId] of room.viewers) {
    const viewerSocket = io.sockets.sockets.get(viewerId)
    if (viewerSocket) {
      viewerSocket.emit('VIEWER_COUNT_UPDATE', payload)
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton Starter
// ---------------------------------------------------------------------------

let started = false

export function ensureSignalingServer(): void {
  if (started) return
  started = true

  const httpServer = createServer()

  const io = new Server(httpServer, {
    // Use DEFAULT path '/socket.io' to match client defaults
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60_000,
    pingInterval: 25_000,
  })

  // ---------------------------------------------------------------------------
  // Middleware – log every connection
  // ---------------------------------------------------------------------------

  io.use((socket, next) => {
    console.log(`[${formatTimestamp()}] CONNECT  socket=${socket.id}`)
    next()
  })

  // ---------------------------------------------------------------------------
  // Connection handler
  // ---------------------------------------------------------------------------

  io.on('connection', (socket: Socket) => {
    // CREATE_ROOM
    socket.on('CREATE_ROOM', (payload?: { requireApproval?: boolean; password?: string; maxViewers?: number }, callback?: (response: unknown) => void) => {
      try {
        if (socketToRoom.has(socket.id)) {
          const existingRoomId = socketToRoom.get(socket.id)!
          console.warn(`[${formatTimestamp()}] WARN     socket=${socket.id} already in room ${existingRoomId}`)
          socket.emit('ERROR', { message: 'You are already in a room. Leave before creating a new one.', code: 'ALREADY_IN_ROOM' })
          callback?.({ success: false, error: 'Already in a room' })
          return
        }

        let roomId: string
        do { roomId = generateRoomId() } while (rooms.has(roomId))

        const room: Room = {
          id: roomId,
          hostId: socket.id,
          viewers: new Map(),
          createdAt: Date.now(),
          settings: {
            maxViewers: payload?.maxViewers ?? 0,
            requireApproval: payload?.requireApproval ?? false,
            password: payload?.password || '',
            theme: payload?.theme || 'default',
          },
        }

        rooms.set(roomId, room)
        socketToRoom.set(socket.id, roomId)
        socket.emit('ROOM_CREATED', { roomId, roomInfo: { id: room.id, hostId: socket.id, viewers: {}, createdAt: room.createdAt, settings: room.settings } })
        console.log(`[${formatTimestamp()}] ROOM+    room=${roomId} host=${socket.id}`)
        callback?.({ success: true, roomId })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    CREATE_ROOM socket=${socket.id}`, err)
        callback?.({ success: false, error: 'Internal server error' })
      }
    })

    // JOIN_ROOM
    socket.on('JOIN_ROOM', (payload: { roomId: string; password?: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId, password } = payload
        const room = rooms.get(roomId)

        if (!room) {
          socket.emit('ROOM_NOT_FOUND', { roomId })
          callback?.({ success: false, error: 'Room not found' })
          return
        }

        if (room.settings.password) {
          if (!password || password !== room.settings.password) {
            socket.emit('ROOM_PASSWORD_REQUIRED', { roomId, requiresPassword: true })
            callback?.({ success: false, error: 'Password required' })
            return
          }
        }

        if (room.hostId === socket.id) {
          socket.emit('ERROR', { message: 'Host cannot join their own room.', code: 'SELF_JOIN' })
          callback?.({ success: false, error: 'Cannot join own room' })
          return
        }

        if (room.viewers.has(socket.id)) {
          callback?.({ success: true, roomId })
          return
        }

        if (room.settings.maxViewers > 0 && room.viewers.size >= room.settings.maxViewers) {
          socket.emit('ROOM_FULL', { message: 'Room is full.', maxViewers: room.settings.maxViewers, currentViewers: room.viewers.size })
          callback?.({ success: false, error: 'Room is full' })
          return
        }

        const viewerInfo: ViewerInfo = {
          id: socket.id,
          connectedAt: Date.now(),
          approved: !room.settings.requireApproval,
        }

        room.viewers.set(socket.id, viewerInfo)
        socketToRoom.set(socket.id, roomId)

        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) {
          hostSocket.emit('VIEWER_JOINED', { viewerId: socket.id, viewerInfo })
        }

        socket.emit('ROOM_JOINED', { roomId: room.id, hostId: room.hostId, approved: viewerInfo.approved })
        console.log(`[${formatTimestamp()}] JOIN     room=${roomId} viewer=${socket.id} approved=${viewerInfo.approved}`)
        broadcastViewerCount(io, room)
        callback?.({ success: true, roomId })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    JOIN_ROOM socket=${socket.id}`, err)
        callback?.({ success: false, error: 'Internal server error' })
      }
    })

    // WEBRTC_SIGNAL
    socket.on('WEBRTC_SIGNAL', (payload: { targetId: string; signal: unknown }) => {
      try {
        const { targetId, signal } = payload
        if (!targetId || !signal) return
        const targetSocket = io.sockets.sockets.get(targetId)
        if (!targetSocket) {
          socket.emit('ERROR', { message: 'Target peer is no longer connected.', code: 'PEER_GONE' })
          return
        }
        targetSocket.emit('WEBRTC_SIGNAL', { from: socket.id, signal })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    WEBRTC_SIGNAL socket=${socket.id}`, err)
      }
    })

    // DISCONNECT_VIEWER
    socket.on('DISCONNECT_VIEWER', (payload: { viewerId: string }, callback?: (response: unknown) => void) => {
      try {
        const { viewerId } = payload
        const roomId = socketToRoom.get(socket.id)
        const room = roomId ? rooms.get(roomId) : null
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }
        if (!room.viewers.has(viewerId)) {
          callback?.({ success: false, error: 'Viewer not found' })
          return
        }
        const viewerSocket = io.sockets.sockets.get(viewerId)
        if (viewerSocket) {
          viewerSocket.emit('KICKED', { roomId: room.id })
          viewerSocket.disconnect(true)
        }
        room.viewers.delete(viewerId)
        socketToRoom.delete(viewerId)
        broadcastViewerCount(room)
        console.log(`[${formatTimestamp()}] KICK     room=${room.id} viewer=${viewerId} by host=${socket.id}`)
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    DISCONNECT_VIEWER socket=${socket.id}`, err)
      }
    })

    // UPDATE_ROOM_SETTINGS
    socket.on('UPDATE_ROOM_SETTINGS', (payload: Partial<RoomSettings>, callback?: (response: unknown) => void) => {
      try {
        const roomId = socketToRoom.get(socket.id)
        const room = roomId ? rooms.get(roomId) : null
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }
        Object.assign(room.settings, payload)
        const eventPayload = { roomId: room.id, settings: room.settings }
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) hostSocket.emit('ROOM_SETTINGS_UPDATED', eventPayload)
        for (const [viewerId] of room.viewers) {
          const vs = io.sockets.sockets.get(viewerId)
          if (vs) vs.emit('ROOM_SETTINGS_UPDATED', eventPayload)
        }
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    UPDATE_ROOM_SETTINGS socket=${socket.id}`, err)
      }
    })

    // DEVICE_INFO
    socket.on('DEVICE_INFO', (payload: { viewerId?: string; deviceName?: string; os?: string; browser?: string; screenWidth?: number; screenHeight?: number }) => {
      try {
        const roomId = socketToRoom.get(socket.id)
        const room = roomId ? rooms.get(roomId) : null
        if (!room) return
        const viewerId = payload.viewerId || socket.id
        const viewer = room.viewers.get(viewerId)
        if (viewer) {
          Object.assign(viewer, { deviceName: payload.deviceName, os: payload.os, browser: payload.browser, screenWidth: payload.screenWidth, screenHeight: payload.screenHeight })
          const hostSocket = io.sockets.sockets.get(room.hostId)
          if (hostSocket) hostSocket.emit('VIEWER_JOINED', { viewerId, viewerInfo: viewer })
        }
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    DEVICE_INFO socket=${socket.id}`, err)
      }
    })

    // APPROVE_VIEWER
    socket.on('APPROVE_VIEWER', (payload: { viewerId: string }, callback?: (response: unknown) => void) => {
      try {
        const { viewerId } = payload
        const roomId = socketToRoom.get(socket.id)
        const room = roomId ? rooms.get(roomId) : null
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }
        const viewer = room.viewers.get(viewerId)
        if (!viewer) {
          callback?.({ success: false, error: 'Viewer not found' })
          return
        }
        viewer.approved = true
        const viewerSocket = io.sockets.sockets.get(viewerId)
        if (viewerSocket) viewerSocket.emit('VIEWER_APPROVED', { roomId: room.id })
        console.log(`[${formatTimestamp()}] APPROVE  room=${room.id} viewer=${viewerId}`)
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    APPROVE_VIEWER socket=${socket.id}`, err)
      }
    })

    // DENY_VIEWER
    socket.on('DENY_VIEWER', (payload: { viewerId: string }, callback?: (response: unknown) => void) => {
      try {
        const { viewerId } = payload
        const roomId = socketToRoom.get(socket.id)
        const room = roomId ? rooms.get(roomId) : null
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }
        const viewerSocket = io.sockets.sockets.get(viewerId)
        if (viewerSocket) {
          viewerSocket.emit('VIEWER_DENIED', { roomId: room.id })
          viewerSocket.disconnect(true)
        }
        room.viewers.delete(viewerId)
        socketToRoom.delete(viewerId)
        broadcastViewerCount(io, room)
        console.log(`[${formatTimestamp()}] DENY     room=${room.id} viewer=${viewerId}`)
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    DENY_VIEWER socket=${socket.id}`, err)
      }
    })

    // ANNOTATION
    socket.on('ANNOTATION', (payload: { roomId: string; annotation: unknown }) => {
      try {
        const { roomId, annotation } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) return
        for (const [viewerId] of room.viewers) {
          const vs = io.sockets.sockets.get(viewerId)
          if (vs) vs.emit('ANNOTATION', { roomId, annotation })
        }
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    ANNOTATION socket=${socket.id}`, err)
      }
    })

    // SPOTLIGHT_VIEWER
    socket.on('SPOTLIGHT_VIEWER', (payload: { roomId: string; viewerId: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId, viewerId } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }
        const hs = io.sockets.sockets.get(room.hostId)
        if (hs) hs.emit('SPOTLIGHT_VIEWER', { roomId, viewerId })
        for (const [vid] of room.viewers) {
          const vs = io.sockets.sockets.get(vid)
          if (vs) vs.emit('SPOTLIGHT_VIEWER', { roomId, viewerId })
        }
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    SPOTLIGHT_VIEWER socket=${socket.id}`, err)
      }
    })

    // RAISE_HAND / LOWER_HAND
    socket.on('RAISE_HAND', (payload: { roomId: string }) => {
      try {
        const { roomId } = payload
        const room = rooms.get(roomId)
        if (!room) return
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) hostSocket.emit('VIEWER_HAND_RAISED', { roomId, viewerId: socket.id })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    RAISE_HAND socket=${socket.id}`, err)
      }
    })

    socket.on('LOWER_HAND', (payload: { roomId: string }) => {
      try {
        const { roomId } = payload
        const room = rooms.get(roomId)
        if (!room) return
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) hostSocket.emit('VIEWER_HAND_LOWERED', { roomId, viewerId: socket.id })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    LOWER_HAND socket=${socket.id}`, err)
      }
    })

    socket.on('HOST_LOWER_HAND', (payload: { roomId: string; viewerId: string }) => {
      try {
        const { roomId, viewerId } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) return
        const viewerSocket = io.sockets.sockets.get(viewerId)
        if (viewerSocket) viewerSocket.emit('HAND_LOWERED_BY_HOST', { roomId })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    HOST_LOWER_HAND socket=${socket.id}`, err)
      }
    })

    // PAUSE_STREAM / RESUME_STREAM
    socket.on('PAUSE_STREAM', (payload: { roomId: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) { callback?.({ success: false, error: 'Not host' }); return }
        for (const [vid] of room.viewers) {
          const vs = io.sockets.sockets.get(vid)
          if (vs) vs.emit('STREAM_PAUSED', { roomId })
        }
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    PAUSE_STREAM socket=${socket.id}`, err)
      }
    })

    socket.on('RESUME_STREAM', (payload: { roomId: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) { callback?.({ success: false, error: 'Not host' }); return }
        for (const [vid] of room.viewers) {
          const vs = io.sockets.sockets.get(vid)
          if (vs) vs.emit('STREAM_RESUMED', { roomId })
        }
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    RESUME_STREAM socket=${socket.id}`, err)
      }
    })

    // CHANGE_PASSWORD
    socket.on('CHANGE_PASSWORD', (payload: { roomId: string; password: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId, password } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) { callback?.({ success: false, error: 'Not host' }); return }
        room.settings.password = password || ''
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    CHANGE_PASSWORD socket=${socket.id}`, err)
      }
    })

    // PING / PONG
    socket.on('PING', (callback?: (response: unknown) => void) => {
      const timestamp = Date.now()
      socket.emit('PONG', { timestamp })
      callback?.({ timestamp })
    })

    // CHAT_MESSAGE
    socket.on('CHAT_MESSAGE', (payload: { roomId: string; message: string; senderName: string; senderType: 'host' | 'viewer' }) => {
      try {
        const { roomId, message, senderName, senderType } = payload
        if (!roomId || !message || !senderName || !senderType) return
        const room = rooms.get(roomId)
        if (!room || (room.hostId !== socket.id && !room.viewers.has(socket.id))) return

        const now = Date.now()
        if (now - (chatRateLimits.get(socket.id) ?? 0) < CHAT_RATE_LIMIT_MS) {
          socket.emit('ERROR', { message: 'You are sending messages too quickly.', code: 'RATE_LIMITED' })
          return
        }
        chatRateLimits.set(socket.id, now)

        const chatPayload = { roomId, message, senderName, senderType, senderId: socket.id, timestamp: now }
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) hostSocket.emit('CHAT_MESSAGE', chatPayload)
        for (const [vid] of room.viewers) {
          const vs = io.sockets.sockets.get(vid)
          if (vs) vs.emit('CHAT_MESSAGE', chatPayload)
        }
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    CHAT_MESSAGE socket=${socket.id}`, err)
      }
    })

    // REACTION
    socket.on('REACTION', (payload: { roomId: string; emoji: string; viewerId?: string }) => {
      try {
        const { roomId, emoji, viewerId } = payload
        if (!roomId || !emoji || !VALID_REACTIONS.has(emoji)) return
        const room = rooms.get(roomId)
        if (!room) return
        const effectiveViewerId = viewerId || socket.id
        if (!room.viewers.has(effectiveViewerId)) return
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) hostSocket.emit('REACTION', { roomId, emoji, viewerId: effectiveViewerId, timestamp: Date.now() })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    REACTION socket=${socket.id}`, err)
      }
    })

    // DISCONNECT
    socket.on('disconnect', (reason) => {
      try {
        const roomId = socketToRoom.get(socket.id)
        socketToRoom.delete(socket.id)
        chatRateLimits.delete(socket.id)

        if (!roomId) return
        const room = rooms.get(roomId)
        if (!room) return

        if (room.hostId === socket.id) {
          // Host left
          for (const [vid] of room.viewers) {
            const vs = io.sockets.sockets.get(vid)
            if (vs) {
              vs.emit('HOST_DISCONNECTED', { roomId })
              vs.disconnect(true)
              socketToRoom.delete(vid)
            }
          }
          rooms.delete(roomId)
          console.log(`[${formatTimestamp()}] HOST-    room=${roomId} reason=${reason}`)
        } else {
          // Viewer left
          room.viewers.delete(socket.id)
          const hostSocket = io.sockets.sockets.get(room.hostId)
          if (hostSocket) hostSocket.emit('VIEWER_DISCONNECTED', { viewerId: socket.id })
          broadcastViewerCount(io, room)
          console.log(`[${formatTimestamp()}] VIEWER-  room=${roomId} viewer=${socket.id} reason=${reason}`)
        }
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    disconnect socket=${socket.id}`, err)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Start server
  // ---------------------------------------------------------------------------

  httpServer.listen(3003, '0.0.0.0', () => {
    console.log('[signaling] LocalCast signaling server started on port 3003 (path=/socket.io)')
  })
}
