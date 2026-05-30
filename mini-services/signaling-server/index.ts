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

/**
 * Generate a human-friendly, easy-to-type 6-character alphanumeric room ID.
 *
 * Uses `crypto.randomBytes(6)` and maps each byte to the uppercase
 * alphanumeric subset (0-9, A-Z) via `byte % 36`.
 *
 * Collisions are astronomically unlikely (36^6 ≈ 2.2 billion) but we
 * guard against them anyway.
 */
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

/** Allowed emoji characters for reactions. */
const VALID_REACTIONS = new Set(['👍', '👎', '❤️', '😂', '🎉', '👏', '🔥'])

/** Minimum interval (ms) between chat messages for a single socket. */
const CHAT_RATE_LIMIT_MS = 100

/**
 * Broadcast current viewer count to ALL participants in a room (host + viewers).
 */
function broadcastViewerCount(room: Room): void {
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

/** Build a serialisable room snapshot (converts Map → plain object). */
function serializeRoom(room: Room) {
  return {
    id: room.id,
    hostId: room.hostId,
    viewers: Object.fromEntries(room.viewers),
    createdAt: room.createdAt,
    settings: room.settings,
  }
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const rooms = new Map<string, Room>()

/** Reverse index: socketId → roomId  (for fast lookup on disconnect). */
const socketToRoom = new Map<string, string>()

/** Per-socket chat rate-limit tracking: socketId → lastChatTimestamp. */
const chatRateLimits = new Map<string, number>()

// ---------------------------------------------------------------------------
// HTTP & Socket.IO server
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3003

const httpServer = createServer()

const io = new Server(httpServer, {
  // Use default path '/socket.io' to match client defaults
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
  // -----------------------------------------------------------------------
  // 1. CREATE_ROOM
  // -----------------------------------------------------------------------
  socket.on('CREATE_ROOM', (payload?: { requireApproval?: boolean; password?: string; maxViewers?: number }, callback?: (response: unknown) => void) => {
    try {
      // Prevent double-creation
      if (socketToRoom.has(socket.id)) {
        const existingRoomId = socketToRoom.get(socket.id)!
        console.warn(
          `[${formatTimestamp()}] WARN     socket=${socket.id} already in room ${existingRoomId}`,
        )
        socket.emit('ERROR', {
          message: 'You are already in a room. Leave before creating a new one.',
          code: 'ALREADY_IN_ROOM',
        })
        callback?.({ success: false, error: 'Already in a room' })
        return
      }

      let roomId: string
      // Avoid collisions (extremely unlikely with 36^6 ≈ 2.2 B possibilities)
      do {
        roomId = generateRoomId()
      } while (rooms.has(roomId))

      const room: Room = {
        id: roomId,
        hostId: socket.id,
        viewers: new Map(),
        createdAt: Date.now(),
        settings: {
          maxViewers: payload?.maxViewers ?? 0, // 0 = unlimited
          requireApproval: payload?.requireApproval ?? false,
          password: payload?.password || '',
          theme: payload?.theme || 'default',
        },
      }

      rooms.set(roomId, room)
      socketToRoom.set(socket.id, roomId)

      const roomInfo = serializeRoom(room)
      socket.emit('ROOM_CREATED', { roomId, roomInfo })

      console.log(
        `[${formatTimestamp()}] ROOM+    room=${roomId} host=${socket.id}`,
      )

      callback?.({ success: true, roomId })
    } catch (err) {
      console.error(
        `[${formatTimestamp()}] ERROR    CREATE_ROOM socket=${socket.id}`,
        err,
      )
      callback?.({ success: false, error: 'Internal server error' })
    }
  })

  // -----------------------------------------------------------------------
  // 2. JOIN_ROOM
  // -----------------------------------------------------------------------
  socket.on(
    'JOIN_ROOM',
    (payload: { roomId: string; password?: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId, password } = payload
        const room = rooms.get(roomId)

        if (!room) {
          socket.emit('ROOM_NOT_FOUND', { roomId })
          console.log(
            `[${formatTimestamp()}] DENIED   socket=${socket.id} room=${roomId} (not found)`,
          )
          callback?.({ success: false, error: 'Room not found' })
          return
        }

        // Password check
        if (room.settings.password) {
          if (!password || password !== room.settings.password) {
            socket.emit('ROOM_PASSWORD_REQUIRED', { roomId, requiresPassword: true })
            console.log(
              `[${formatTimestamp()}] DENIED   socket=${socket.id} room=${roomId} (wrong/missing password)`,
            )
            callback?.({ success: false, error: 'Password required' })
            return
          }
        }

        // Prevent joining own room
        if (room.hostId === socket.id) {
          socket.emit('ERROR', {
            message: 'Host cannot join their own room as a viewer.',
            code: 'SELF_JOIN',
          })
          callback?.({ success: false, error: 'Cannot join own room' })
          return
        }

        // Prevent double-join
        if (room.viewers.has(socket.id)) {
          callback?.({ success: true, roomId })
          return
        }

        // Max viewer check (0 = unlimited)
        if (
          room.settings.maxViewers > 0 &&
          room.viewers.size >= room.settings.maxViewers
        ) {
          socket.emit('ROOM_FULL', {
            message: 'Room is full.',
            maxViewers: room.settings.maxViewers,
            currentViewers: room.viewers.size,
          })
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

        // Notify host
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) {
          hostSocket.emit('VIEWER_JOINED', {
            viewerId: socket.id,
            viewerInfo,
          })
        }

        // Notify viewer
        socket.emit('ROOM_JOINED', {
          roomId: room.id,
          hostId: room.hostId,
          approved: viewerInfo.approved,
        })

        console.log(
          `[${formatTimestamp()}] JOIN     room=${roomId} viewer=${socket.id} approved=${viewerInfo.approved}`,
        )

        // Broadcast updated viewer count to all room participants
        broadcastViewerCount(room)

        callback?.({ success: true, roomId })
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    JOIN_ROOM socket=${socket.id}`,
          err,
        )
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  // -----------------------------------------------------------------------
  // 3. WEBRTC_SIGNAL
  // -----------------------------------------------------------------------
  socket.on(
    'WEBRTC_SIGNAL',
    (payload: { targetId: string; signal: unknown }) => {
      try {
        const { targetId, signal } = payload

        if (!targetId || !signal) {
          console.warn(
            `[${formatTimestamp()}] WARN     WEBRTC_SIGNAL from ${socket.id} missing targetId or signal`,
          )
          return
        }

        const targetSocket = io.sockets.sockets.get(targetId)
        if (!targetSocket) {
          console.warn(
            `[${formatTimestamp()}] WARN     WEBRTC_SIGNAL target ${targetId} not connected`,
          )
          socket.emit('ERROR', {
            message: 'Target peer is no longer connected.',
            code: 'PEER_GONE',
          })
          return
        }

        targetSocket.emit('WEBRTC_SIGNAL', {
          from: socket.id,
          signal,
        })
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    WEBRTC_SIGNAL socket=${socket.id}`,
          err,
        )
      }
    },
  )

  // -----------------------------------------------------------------------
  // 4. DISCONNECT_VIEWER (host kicks)
  // -----------------------------------------------------------------------
  socket.on(
    'DISCONNECT_VIEWER',
    (payload: { viewerId: string }, callback?: (response: unknown) => void) => {
      try {
        const { viewerId } = payload
        const roomId = socketToRoom.get(socket.id)
        const room = roomId ? rooms.get(roomId) : null

        if (!room || room.hostId !== socket.id) {
          socket.emit('ERROR', {
            message: 'Only the host can disconnect viewers.',
            code: 'NOT_HOST',
          })
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

        // Broadcast updated viewer count
        broadcastViewerCount(room)

        console.log(
          `[${formatTimestamp()}] KICK     room=${room.id} viewer=${viewerId} by host=${socket.id}`,
        )

        callback?.({ success: true })
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    DISCONNECT_VIEWER socket=${socket.id}`,
          err,
        )
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  // -----------------------------------------------------------------------
  // 5. UPDATE_ROOM_SETTINGS
  // -----------------------------------------------------------------------
  socket.on(
    'UPDATE_ROOM_SETTINGS',
    (
      payload: Partial<RoomSettings>,
      callback?: (response: unknown) => void,
    ) => {
      try {
        const roomId = socketToRoom.get(socket.id)
        const room = roomId ? rooms.get(roomId) : null

        if (!room || room.hostId !== socket.id) {
          socket.emit('ERROR', {
            message: 'Only the host can update room settings.',
            code: 'NOT_HOST',
          })
          callback?.({ success: false, error: 'Not host' })
          return
        }

        // Merge settings
        Object.assign(room.settings, payload)

        // Broadcast updated settings to everyone in the room
        const eventPayload = { roomId: room.id, settings: room.settings }
        io.to(room.hostId).emit('ROOM_SETTINGS_UPDATED', eventPayload)
        for (const [viewerId] of room.viewers) {
          io.to(viewerId).emit('ROOM_SETTINGS_UPDATED', eventPayload)
        }

        console.log(
          `[${formatTimestamp()}] SETTINGS room=${room.id} settings=${JSON.stringify(payload)}`,
        )

        callback?.({ success: true })
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    UPDATE_ROOM_SETTINGS socket=${socket.id}`,
          err,
        )
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  // -----------------------------------------------------------------------
  // 6. DEVICE_INFO
  // -----------------------------------------------------------------------
  socket.on(
    'DEVICE_INFO',
    (payload: {
      viewerId?: string
      deviceName?: string
      os?: string
      browser?: string
      screenWidth?: number
      screenHeight?: number
    }) => {
      try {
        const roomId = socketToRoom.get(socket.id)
        const room = roomId ? rooms.get(roomId) : null

        if (!room) return

        // The sending socket IS the viewer (use socket.id as authority)
        const viewerId = payload.viewerId || socket.id
        const viewer = room.viewers.get(viewerId)

        if (viewer) {
          viewer.deviceName = payload.deviceName
          viewer.os = payload.os
          viewer.browser = payload.browser
          viewer.screenWidth = payload.screenWidth
          viewer.screenHeight = payload.screenHeight

          // Forward updated info to host
          const hostSocket = io.sockets.sockets.get(room.hostId)
          if (hostSocket) {
            hostSocket.emit('VIEWER_JOINED', {
              viewerId,
              viewerInfo: viewer,
            })
          }

          console.log(
            `[${formatTimestamp()}] DEVICE   room=${roomId} viewer=${viewerId} device=${payload.deviceName ?? 'unknown'}`,
          )
        }
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    DEVICE_INFO socket=${socket.id}`,
          err,
        )
      }
    },
  )

  // -----------------------------------------------------------------------
  // 7. APPROVE_VIEWER
  // -----------------------------------------------------------------------
  socket.on(
    'APPROVE_VIEWER',
    (payload: { viewerId: string }, callback?: (response: unknown) => void) => {
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
        if (viewerSocket) {
          viewerSocket.emit('VIEWER_APPROVED', { roomId: room.id })
        }

        console.log(
          `[${formatTimestamp()}] APPROVE  room=${room.id} viewer=${viewerId}`,
        )

        callback?.({ success: true })
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    APPROVE_VIEWER socket=${socket.id}`,
          err,
        )
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  // -----------------------------------------------------------------------
  // 8. DENY_VIEWER
  // -----------------------------------------------------------------------
  socket.on(
    'DENY_VIEWER',
    (payload: { viewerId: string }, callback?: (response: unknown) => void) => {
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

        // Broadcast updated viewer count
        broadcastViewerCount(room)

        console.log(
          `[${formatTimestamp()}] DENY     room=${room.id} viewer=${viewerId}`,
        )

        callback?.({ success: true })
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    DENY_VIEWER socket=${socket.id}`,
          err,
        )
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  // -----------------------------------------------------------------------
  // 8b. ANNOTATION (host draws, broadcast to all viewers)
  // -----------------------------------------------------------------------
  socket.on(
    'ANNOTATION',
    (payload: { roomId: string; annotation: unknown }) => {
      try {
        const { roomId, annotation } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) return

        for (const [viewerId] of room.viewers) {
          const viewerSocket = io.sockets.sockets.get(viewerId)
          if (viewerSocket) {
            viewerSocket.emit('ANNOTATION', { roomId, annotation })
          }
        }
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    ANNOTATION socket=${socket.id}`, err)
      }
    },
  )

  // -----------------------------------------------------------------------
  // 8c. SPOTLIGHT_VIEWER (host spotlights a viewer)
  // -----------------------------------------------------------------------
  socket.on(
    'SPOTLIGHT_VIEWER',
    (payload: { roomId: string; viewerId: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId, viewerId } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }

        // Broadcast spotlight to all participants
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) {
          hostSocket.emit('SPOTLIGHT_VIEWER', { roomId, viewerId })
        }
        for (const [vid] of room.viewers) {
          const viewerSocket = io.sockets.sockets.get(vid)
          if (viewerSocket) {
            viewerSocket.emit('SPOTLIGHT_VIEWER', { roomId, viewerId })
          }
        }

        console.log(`[${formatTimestamp()}] SPOTLIGHT room=${roomId} viewer=${viewerId}`)
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    SPOTLIGHT_VIEWER socket=${socket.id}`, err)
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  // -----------------------------------------------------------------------
  // 8d. RAISE_HAND / LOWER_HAND (viewer gestures)
  // -----------------------------------------------------------------------
  socket.on(
    'RAISE_HAND',
    (payload: { roomId: string }) => {
      try {
        const { roomId } = payload
        const room = rooms.get(roomId)
        if (!room) return

        // Notify host
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) {
          hostSocket.emit('VIEWER_HAND_RAISED', { roomId, viewerId: socket.id })
        }

        console.log(`[${formatTimestamp()}] HAND_UP  room=${roomId} viewer=${socket.id}`)
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    RAISE_HAND socket=${socket.id}`, err)
      }
    },
  )

  socket.on(
    'LOWER_HAND',
    (payload: { roomId: string }) => {
      try {
        const { roomId } = payload
        const room = rooms.get(roomId)
        if (!room) return

        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) {
          hostSocket.emit('VIEWER_HAND_LOWERED', { roomId, viewerId: socket.id })
        }

        console.log(`[${formatTimestamp()}] HAND_DOWN room=${roomId} viewer=${socket.id}`)
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    LOWER_HAND socket=${socket.id}`, err)
      }
    },
  )

  // -----------------------------------------------------------------------
  // 9. PING / PONG  (application-level keepalive — works for host & viewer)
  // -----------------------------------------------------------------------
  socket.on('PING', (callback?: (response: unknown) => void) => {
    const timestamp = Date.now()
    socket.emit('PONG', { timestamp })
    callback?.({ timestamp })
  })

  // -----------------------------------------------------------------------
  // 10. CHAT_MESSAGE
  // -----------------------------------------------------------------------
  socket.on(
    'CHAT_MESSAGE',
    (payload: {
      roomId: string
      message: string
      senderName: string
      senderType: 'host' | 'viewer'
    }) => {
      try {
        const { roomId, message, senderName, senderType } = payload

        if (!roomId || !message || !senderName || !senderType) {
          console.warn(
            `[${formatTimestamp()}] WARN     CHAT_MESSAGE from ${socket.id} missing fields`,
          )
          return
        }

        const room = rooms.get(roomId)
        if (!room) return

        // Verify the sender belongs to this room
        if (room.hostId !== socket.id && !room.viewers.has(socket.id)) {
          console.warn(
            `[${formatTimestamp()}] WARN     CHAT_MESSAGE from ${socket.id} not in room ${roomId}`,
          )
          return
        }

        // Rate-limit: max 1 message per 100ms per socket
        const now = Date.now()
        const lastSent = chatRateLimits.get(socket.id) ?? 0
        if (now - lastSent < CHAT_RATE_LIMIT_MS) {
          socket.emit('ERROR', {
            message: 'You are sending messages too quickly.',
            code: 'RATE_LIMITED',
          })
          return
        }
        chatRateLimits.set(socket.id, now)

        const chatPayload = {
          roomId,
          message,
          senderName,
          senderType,
          senderId: socket.id,
          timestamp: now,
        }

        // Broadcast to ALL participants (host + all viewers)
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) {
          hostSocket.emit('CHAT_MESSAGE', chatPayload)
        }
        for (const [viewerId] of room.viewers) {
          const viewerSocket = io.sockets.sockets.get(viewerId)
          if (viewerSocket) {
            viewerSocket.emit('CHAT_MESSAGE', chatPayload)
          }
        }

        console.log(
          `[${formatTimestamp()}] CHAT     room=${roomId} sender=${socket.id} type=${senderType} msg=${message.slice(0, 50)}`,
        )
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    CHAT_MESSAGE socket=${socket.id}`,
          err,
        )
      }
    },
  )

  // -----------------------------------------------------------------------
  // 11b. HOST_LOWER_HAND (host lowers a viewer's hand)
  // -----------------------------------------------------------------------
  socket.on(
    'HOST_LOWER_HAND',
    (payload: { roomId: string; viewerId: string }) => {
      try {
        const { roomId, viewerId } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) return

        // Notify the specific viewer
        const viewerSocket = io.sockets.sockets.get(viewerId)
        if (viewerSocket) {
          viewerSocket.emit('HAND_LOWERED_BY_HOST', { roomId })
        }

        console.log(`[${formatTimestamp()}] HOST_HAND_DOWN room=${roomId} viewer=${viewerId}`)
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    HOST_LOWER_HAND socket=${socket.id}`, err)
      }
    },
  )

  // -----------------------------------------------------------------------
  // 12. PAUSE_STREAM / RESUME_STREAM (host controls)
  // -----------------------------------------------------------------------
  socket.on(
    'PAUSE_STREAM',
    (payload: { roomId: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }
        // Broadcast STREAM_PAUSED to all viewers
        for (const [viewerId] of room.viewers) {
          const viewerSocket = io.sockets.sockets.get(viewerId)
          if (viewerSocket) {
            viewerSocket.emit('STREAM_PAUSED', { roomId })
          }
        }
        console.log(`[${formatTimestamp()}] PAUSE    room=${roomId}`)
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    PAUSE_STREAM socket=${socket.id}`, err)
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  socket.on(
    'RESUME_STREAM',
    (payload: { roomId: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }
        // Broadcast STREAM_RESUMED to all viewers
        for (const [viewerId] of room.viewers) {
          const viewerSocket = io.sockets.sockets.get(viewerId)
          if (viewerSocket) {
            viewerSocket.emit('STREAM_RESUMED', { roomId })
          }
        }
        console.log(`[${formatTimestamp()}] RESUME   room=${roomId}`)
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    RESUME_STREAM socket=${socket.id}`, err)
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  // -----------------------------------------------------------------------
  // 13. CHANGE_PASSWORD (host only)
  // -----------------------------------------------------------------------
  socket.on(
    'CHANGE_PASSWORD',
    (payload: { roomId: string; password: string }, callback?: (response: unknown) => void) => {
      try {
        const { roomId, password } = payload
        const room = rooms.get(roomId)
        if (!room || room.hostId !== socket.id) {
          callback?.({ success: false, error: 'Not host' })
          return
        }
        room.settings.password = password || ''
        console.log(`[${formatTimestamp()}] PASSWD   room=${roomId} passwordSet=${!!password}`)
        callback?.({ success: true })
      } catch (err) {
        console.error(`[${formatTimestamp()}] ERROR    CHANGE_PASSWORD socket=${socket.id}`, err)
        callback?.({ success: false, error: 'Internal server error' })
      }
    },
  )

  // -----------------------------------------------------------------------
  // 14. REACTION
  // -----------------------------------------------------------------------
  socket.on(
    'REACTION',
    (payload: { roomId: string; emoji: string; viewerId?: string }) => {
      try {
        const { roomId, emoji, viewerId } = payload

        if (!roomId || !emoji) {
          console.warn(
            `[${formatTimestamp()}] WARN     REACTION from ${socket.id} missing fields`,
          )
          return
        }

        // Validate emoji against whitelist
        if (!VALID_REACTIONS.has(emoji)) {
          console.warn(
            `[${formatTimestamp()}] WARN     REACTION from ${socket.id} invalid emoji=${emoji}`,
          )
          socket.emit('ERROR', {
            message: 'Unsupported emoji reaction.',
            code: 'INVALID_REACTION',
          })
          return
        }

        const room = rooms.get(roomId)
        if (!room) return

        // Verify the sender is a viewer in this room
        const effectiveViewerId = viewerId || socket.id
        if (!room.viewers.has(effectiveViewerId)) {
          console.warn(
            `[${formatTimestamp()}] WARN     REACTION from ${socket.id} not a viewer in room ${roomId}`,
          )
          return
        }

        // Forward reaction to the HOST only
        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) {
          hostSocket.emit('REACTION', {
            roomId,
            emoji,
            viewerId: effectiveViewerId,
            timestamp: Date.now(),
          })
        }

        console.log(
          `[${formatTimestamp()}] REACTION room=${roomId} viewer=${effectiveViewerId} emoji=${emoji}`,
        )
      } catch (err) {
        console.error(
          `[${formatTimestamp()}] ERROR    REACTION socket=${socket.id}`,
          err,
        )
      }
    },
  )

  // -----------------------------------------------------------------------
  // DISCONNECT  (cleanup)
  // -----------------------------------------------------------------------
  socket.on('disconnect', (reason) => {
    try {
      const roomId = socketToRoom.get(socket.id)
      socketToRoom.delete(socket.id)

      if (!roomId) {
        // Clean up rate-limit entry if present
        chatRateLimits.delete(socket.id)
        console.log(
          `[${formatTimestamp()}] LEAVE    socket=${socket.id} (no room) reason=${reason}`,
        )
        return
      }

      // Clean up rate-limit entry for disconnected socket
      chatRateLimits.delete(socket.id)

      const room = rooms.get(roomId)
      if (!room) return

      if (room.hostId === socket.id) {
        // ---- Host left ----
        console.log(
          `[${formatTimestamp()}] HOST-    room=${roomId} host=${socket.id} viewers=${room.viewers.size} reason=${reason}`,
        )

        for (const [viewerId] of room.viewers) {
          const viewerSocket = io.sockets.sockets.get(viewerId)
          if (viewerSocket) {
            viewerSocket.emit('HOST_DISCONNECTED', { roomId })
            viewerSocket.disconnect(true)
            socketToRoom.delete(viewerId)
          }
        }

        rooms.delete(roomId)
      } else {
        // ---- Viewer left ----
        room.viewers.delete(socket.id)

        console.log(
          `[${formatTimestamp()}] VIEWER-  room=${roomId} viewer=${socket.id} reason=${reason}`,
        )

        const hostSocket = io.sockets.sockets.get(room.hostId)
        if (hostSocket) {
          hostSocket.emit('VIEWER_DISCONNECTED', { viewerId: socket.id })
        }

        // Broadcast updated viewer count
        broadcastViewerCount(room)
      }
    } catch (err) {
      console.error(
        `[${formatTimestamp()}] ERROR    disconnect socket=${socket.id}`,
        err,
      )
    }
  })
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

function gracefulShutdown(signal: string) {
  console.log(`\n[${formatTimestamp()}] SHUTDOWN received ${signal}`)

  // Notify all connected clients
  for (const [roomId, room] of rooms) {
    const hostSocket = io.sockets.sockets.get(room.hostId)
    if (hostSocket) {
      hostSocket.emit('SERVER_SHUTDOWN', {
        reason: 'Server is shutting down',
      })
    }
    for (const [viewerId] of room.viewers) {
      const viewerSocket = io.sockets.sockets.get(viewerId)
      if (viewerSocket) {
        viewerSocket.emit('SERVER_SHUTDOWN', {
          reason: 'Server is shutting down',
        })
      }
    }
  }

  io.close(() => {
    console.log(`[${formatTimestamp()}] SHUTDOWN Socket.IO closed`)
    httpServer.close(() => {
      console.log(`[${formatTimestamp()}] SHUTDOWN HTTP server closed`)
      process.exit(0)
    })
  })

  // Force exit after 5 s if graceful shutdown hangs
  setTimeout(() => {
    console.error(
      `[${formatTimestamp()}] SHUTDOWN forcing exit after timeout`,
    )
    process.exit(1)
  }, 5_000)
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(56))
  console.log('  LocalCast Signaling Server')
  console.log(`  Port      : ${PORT}`)
  console.log(`  Socket.IO : path="/socket.io" (default)`)
  console.log(`  CORS      : all origins`)
  console.log(`  Ping      : timeout=60s  interval=25s`)
  console.log('='.repeat(56))
})
