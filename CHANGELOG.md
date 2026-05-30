# Changelog

All notable changes to LocalCast will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
