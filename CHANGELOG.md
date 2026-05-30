# Changelog

All notable changes to LocalCast will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.5] - 2025-05-30

### Fixed
- **Critical: Stale closure in reconnection logic** — The `getOrCreateSocket` callback captured `isSharing` and `currentView` by value (empty dependency array), so the disconnect handler always saw `isSharing=false` and `currentView="home"`. Socket auto-reconnect NEVER triggered. Fixed by using refs (`isSharingRef`, `currentViewRef`) that stay in sync with state.
- **Critical: `broadcastViewerCount(room)` missing argument** — Line 264 in signaling server called `broadcastViewerCount(room)` with 1 arg instead of 2 (`broadcastViewerCount(io, room)`). This caused a runtime crash every time a viewer was kicked/disconnected, breaking all subsequent room operations.
- **Black screen on viewer side** — `ontrack` handler set `srcObject` but never called `video.play()`. With `muted=false`, autoplay is blocked in most browsers. Now explicitly calls `play()` with a fallback that mutes and retries.
- **Black screen on broadcaster preview** — Added explicit `play()` call when attaching local stream to preview video element.
- **Missing `instrumentation.ts`** — The file was referenced but didn't exist, so the signaling server only started via the `/api/start-signal` endpoint (called on page load). Recreated to ensure the signaling server starts with the Next.js process lifecycle.

### Changed
- **WebRTC ICE servers** — Added 3 more Google STUN servers + Metered.ca free TURN relay servers for better NAT traversal. TURN relays ensure WebRTC works even when both peers are behind symmetric NATs. Added `iceCandidatePoolSize: 10`.
- **Connection quality thresholds** — Adjusted for proxy/sandbox environments: Excellent < 150ms (was 80ms), Good < 350ms (was 200ms), Fair < 600ms (was 400ms).
- **Socket.IO timeout** — Increased from 10s to 20s for main connection, 15s for speed test.
- **Transport preference** — Added explicit `transports: ["websocket", "polling"]` to prefer WebSocket with polling fallback.

---

## [1.0.3] - 2025-06-30

### Fixed
- **Signaling server crash**: Root cause was `createServer((_req, res) => {...})` callback in the standalone signaling server intercepting ALL HTTP requests before Socket.IO could handle them. Removed the callback to let Socket.IO manage all requests.
- **Port conflict**: Eliminated dual signaling server architecture (inline in Next.js process + standalone mini-service). Removed the inline version (`src/lib/signaling-server.ts` and `/api/signal` route) to prevent port 3003 conflicts.
- **Dev server startup**: Updated dev script to use `bunx next dev` and separate signaling server log output to `/tmp/signaling-server.log`.

### Changed
- **Architecture simplification**: Signaling server now runs exclusively as a standalone mini-service on port 3003 with keep-alive auto-restart wrapper. No more inline Socket.IO inside Next.js.
- **Removed `--hot` flag**: Removed `bun --hot` from signaling server (causes crashes in sandbox environment). Keep-alive wrapper provides restart capability instead.

---

## [1.0.4] - 2025-06-30

### Fixed
- **"Could not reach signaling server"**: Root cause was Socket.IO path mismatch — server used `path: '/'` but client defaulted to `/socket.io`. Changed server to use default `/socket.io` path matching the client.
- **Port conflict (again)**: The previously "deleted" inline signaling server files (`src/instrumentation.ts`, `src/lib/signaling-server.ts`, `src/app/api/signal/route.ts`) still existed and were starting a SECOND signaling server with `path: '/'`, causing EADDRINUSE conflicts. Permanently resolved.
- **Stale `/api/signal` fetch in page.tsx**: Removed `useEffect` that called the now-deleted `/api/signal` API route on every page load.

### Changed
- **Architecture**: Reverted to embedded signaling server via Next.js `instrumentation.ts` (the standalone mini-service couldn't persist in the sandbox environment). The signaling server now starts automatically as part of the Next.js process lifecycle, sharing the same PID.
- **Signaling server uses correct Socket.IO path**: Both server and client now use the default `/socket.io` path, ensuring proper WebSocket handshake through the Caddy proxy with `XTransformPort=3003`.
- **Simplified dev script**: `bun run dev` now starts only Next.js (signaling server is embedded via instrumentation).

---

## [1.0.2] - 2025-06-18

### Fixed
- **Connection speed test thresholds**: Adjusted latency categories to account for Caddy proxy overhead. Excellent < 80ms, Good < 200ms, Fair < 400ms (was 50/100/200ms). A 306ms ping now correctly shows "Fair" instead of "Poor".
- **Dependency version conflict**: Fixed `@radix-ui/react-radio-group` version from non-existent `^3.3.7` to `^1.3.8`.
- **Duplicate icons on Stream Quality**: Replaced duplicate Sparkles icon with Check icon in the quality preset selector's selected indicator.
- **Lint error**: Fixed `@typescript-eslint/no-require-imports` in signaling server keep-alive wrapper.

### Changed
- **Mobile responsive design**: Comprehensive mobile adaptation across all views:
  - Share Setup: Advanced settings (Max Viewers, Session Theme, Connection Test, Password, Approval) collapsed into an expandable "Advanced Options" section on mobile
  - Header: tighter spacing, min touch targets on all icon buttons
  - WatchView: latency badge, health bar, and separator hidden on mobile to reduce clutter; bottom bar uses compact text
  - ShareActiveView: room code characters smaller on mobile, tighter spacing
  - HomeView: reduced padding and icon sizes on mobile
  - JoinView: tighter container padding
  - ChatPanel: full-width overlay on mobile

---

## [1.0.1] - 2025-06-02

### Fixed
- Connection speed test thresholds adjusted for proxy environments

---

## [1.0.0] - 2025-05-30

### Added

**Core Application**
- WebRTC mesh P2P screen sharing — direct peer-to-peer video streaming
- Socket.IO signaling server (port 3003) with in-memory room management
- 6-digit room codes with QR code generation (`qrcode.react`)
- URL auto-join via `?join=CODE` query parameter
- Share modes: Entire Screen, Application Window, Browser Tab
- Quality presets: 1080p High / 720p Medium / 480p Low with configurable bitrates
- Max viewers limit (5 / 10 / 20 / 50 / Unlimited)

**Room Management**
- Device approval flow — host approves or denies viewers before stream access
- Room password protection with show/hide toggle
- Change password mid-session
- Kick / disconnect viewers
- Viewer spotlight feature
- 4 session themes: Default, Sunset, Ocean, Midnight

**Communication**
- Real-time live chat between host and all viewers
- 7 emoji reactions (👍 👎 ❤️ 😂 🎉 👏 🔥) with animated floating particles
- Raise hand / lower hand (viewer and host controls)
- Oscillator-based notification sounds (10 event types, toggleable)

**Broadcaster Tools**
- Live stream preview with annotation overlay
- Whiteboard / annotation drawing: pen, highlighter, eraser with color picker
- Pause / resume stream without disconnecting viewers
- Connection speed test (5-ping average to signaling server)
- Connection log with timestamps
- Session statistics dashboard (time, data, bitrate, viewers, chat, reactions)
- Export session stats as JSON
- Per-viewer connection quality monitoring

**Viewer Features**
- Picture-in-Picture mode
- Fullscreen toggle
- Mute / unmute audio
- Local stream recording (WebM download)
- Annotation overlay (read-only, from host)
- Stream paused overlay
- Connection lost overlay with auto-reconnect (exponential backoff)

**Connection Monitoring**
- Real-time connection status badge (Connected / Connecting / Disconnected)
- Connection quality indicator (Good / Fair / Poor) with color coding
- Live latency display (ms)
- Connection health score (percentage)
- Live stats: bitrate, resolution, data transferred
- Per-viewer connection quality dots
- ICE connection state / network info panel
- Auto quality adjustment on connection degradation

**UI / UX**
- Dark / light mode with next-themes
- Fully responsive design (mobile, tablet, desktop)
- Animated page transitions with Framer Motion
- Parallax 3D tilt effect on video container
- Animated home page: typing text, floating particles, mesh grid, gradient shifts
- Keyboard shortcuts: `F` fullscreen, `M` mute, `C` chat, `Esc` back
- Sticky footer with wave decoration
- shadcn/ui component library (46 components)

**Architecture**
- Next.js 16 App Router with TypeScript 5
- Tailwind CSS 4 custom emerald/teal theme
- Core logic encapsulated in `useLocalCast()` hook (~1000 lines)
- Modular view components: Home, Setup, Share, Join, Watch, Chat, Shortcuts
- Signaling server: ~1077 lines, 25+ Socket.IO events, rate limiting, graceful shutdown

**DevOps**
- `.gitignore` configured (node_modules, .next, db, logs)
- Comprehensive README with architecture diagrams, protocol docs, and browser support matrix
- This CHANGELOG.md

---

[1.0.0]: https://github.com/pizzadox/localcast/releases/tag/v1.0.0
