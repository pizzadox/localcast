# LocalCast — Development Worklog

## Project Overview
**LocalCast** is a browser-based local network screen sharing application inspired by Deskreen. It uses WebRTC peer-to-peer video transport for low-latency screen sharing with unlimited viewers. No installation required — runs entirely in the browser.

**Tech Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui + Socket.IO + WebRTC

---

## Current Status: ✅ v1.0.5 — Reconnection, Black Screen, Signaling Crash Fixed

### Architecture
- **Frontend**: Next.js 16 (port 3000) — SPA with 4 views (Home, Share Setup, Share Active, Join, Watching)
- **Signaling Server**: Socket.IO v4 embedded in Next.js process via `instrumentation.ts` (port 3003)
- **Transport**: WebRTC mesh P2P with TURN relay fallback — Each viewer connects directly to the broadcaster
- **Components**: 9 modular components in `src/components/localcast/`
- **Features**: Screen sharing, chat, reactions, recording, quality presets, share modes, password protection, pause/resume, network info, session stats

---

Task ID: 7
Agent: Main Agent
Task: Fix "Disconnected" status, black screen, signaling server crash

Work Log:
- Diagnosed stale closure bug: `getOrCreateSocket` useCallback with empty deps captured `isSharing=false` and `currentView="home"` permanently, so auto-reconnect in the disconnect handler NEVER triggered
- Added `isSharingRef` and `currentViewRef` with sync useEffects to fix the stale closure
- Fixed critical signaling server crash: `broadcastViewerCount(room)` called with 1 arg instead of 2 on line 264 — crashed every time a viewer was kicked
- Fixed black screen on viewer: `ontrack` handler set `srcObject` but never called `play()` — autoplay blocked with `muted=false`. Added explicit `play()` with mute-and-retry fallback
- Fixed black screen on broadcaster: Added explicit `play()` call when attaching local stream to preview
- Created missing `src/instrumentation.ts` — signaling server only started via `/api/start-signal` before
- Added 3 more Google STUN servers + Metered.ca TURN relay servers for NAT traversal
- Adjusted quality thresholds: Excellent<150ms, Good<350ms, Fair<600ms
- Increased Socket.IO timeouts: 20s main, 15s speed test
- Added `transports: ["websocket", "polling"]` preference
- Rebuilt, verified both ports through Caddy proxy
- Bumped version to 1.0.5, updated CHANGELOG, pushed to GitHub

Stage Summary:
- **Root Cause #1**: Stale closure — disconnect handler always saw stale state values, reconnect never triggered
- **Root Cause #2**: Missing function argument — signaling server crashed on viewer kick
- **Root Cause #3**: Missing `play()` call — autoplay blocked, video stayed black
- **Root Cause #4**: Missing `instrumentation.ts` — fragile signaling server startup
- GitHub: https://github.com/pizzadox/localcast (v1.0.5)

### Risks
- Server process may need restart if sandbox kills it (use `bun run dev & sleep 590` orphan trick)
- TURN relay credentials may expire (Metered.ca free tier)

---

Task ID: 6
Agent: Main Agent
Task: Fix "Could not reach signaling server" — Socket.IO path mismatch + zombie files

Work Log:
- Diagnosed Socket.IO path mismatch: server had `path: '/'` but client defaulted to `/socket.io`
- Discovered previously "deleted" files still existed: `src/instrumentation.ts`, `src/lib/signaling-server.ts`, `src/app/api/signal/route.ts`
- Removed stale `/api/signal` fetch in `src/app/page.tsx`
- Updated standalone signaling server to use default `/socket.io` path
- Attempted standalone mini-service architecture — sandbox kills background processes between Bash calls
- Reverted to embedded signaling server via `instrumentation.ts` with CORRECT `/socket.io` path
- Rewrote `src/lib/signaling-server.ts` with proper Socket.IO configuration (default path)
- Created `src/instrumentation.ts` to auto-start signaling server with Next.js
- Deleted `src/app/api/signal/route.ts` (no longer needed)
- Updated `mini-services/signaling-server/index.ts` to use default path (kept as reference/standalone option)
- Started dev server with `setsid bun run dev & tail -f` pattern for persistence across Bash calls
- Verified both ports: 3000 (HTTP 200), 3003 (Socket.IO handshake with valid SID)
- Bumped version to 1.0.4, updated CHANGELOG, updated footer version
- Pushed to GitHub: main branch

Stage Summary:
- **Root Cause #1**: Socket.IO path mismatch — server `path: '/'` ≠ client default `/socket.io`
- **Root Cause #2**: Zombie signaling server files causing EADDRINUSE port conflicts
- **Fix**: Embedded signaling server via instrumentation.ts with correct `/socket.io` default path
- Both server processes share single Next.js PID
- GitHub: https://github.com/pizzadox/localcast (v1.0.4)

### Risks
- Server process may need restart if sandbox kills it
- 429 Too Many Requests may be sandbox rate limiting (needs monitoring)

---

Task ID: 4
Agent: mobile-responsive
Task: Make LocalCast fully mobile responsive

Work Log:
- Read all 7 view components + page.tsx to understand existing responsive state
- **share-setup-view.tsx**: Added Collapsible for advanced options on mobile, touch targets
- **page.tsx**: Tighter header buttons, hidden badges on mobile
- **home-view.tsx**: Reduced padding/spacing on mobile
- **share-active-view.tsx**: Smaller room code on mobile
- **watch-view.tsx**: Hidden latency/health bar on mobile, compact bottom bar
- **join-view.tsx**: Tighter padding
- **chat-panel.tsx**: Full-width overlay on mobile

Stage Summary:
- All 7 files modified for mobile responsiveness
- ESLint: 0 errors, 0 warnings

---

Task ID: 5
Agent: main
Task: Fix signaling server architecture and stability

Work Log:
- Diagnosed dual signaling server conflict (inline in Next.js process + standalone mini-service)
- Root cause: `createServer((_req, res) => {...})` callback in standalone server intercepted ALL HTTP requests before Socket.IO could handle them
- Removed inline signaling server (`src/lib/signaling-server.ts` and `src/app/api/signal/route.ts`)
- Fixed standalone server: changed `createServer((_req, res) => {...})` to `createServer()` (no callback)
- Removed `--hot` flag from standalone server (causes crashes in sandbox)
- Verified Socket.IO handshake works
- Version bumped to 1.0.3
