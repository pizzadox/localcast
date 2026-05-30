# Changelog

All notable changes to LocalCast will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
