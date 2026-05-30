<div align="center">

<img src="public/logo.svg" alt="LocalCast" width="80" height="80" />

# LocalCast — LAN Screen Sharing

**Share your screen with unlimited viewers on your local network. No install, no cloud, no accounts.**

[![Version](https://img.shields.io/badge/version-1.0.2-emerald?style=flat-square)](https://github.com/pizzadox/localcast/releases)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-blue?style=flat-square)](https://webrtc.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [How It Works](#-how-it-works) · [Privacy](#-privacy)

</div>

---

## About

LocalCast is a **pure browser-based** LAN screen sharing application inspired by [Deskreen](https://github.com/deskreen/deskreen). Unlike Deskreen, it requires **no desktop app or virtual display driver** — everything runs in the browser using **WebRTC** for peer-to-peer video streaming and **Socket.IO** for signaling.

Just open the page, share your screen, give viewers a 6-digit code, and they can watch in real-time — directly from their browsers, no installation needed.

---

## Features

### Core
| Feature | Description |
|---------|-------------|
| **WebRTC Mesh P2P** | Direct peer-to-peer connections — no SFU, no intermediate server for video |
| **Unlimited Viewers** | Every new viewer connects directly to the host via a separate WebRTC peer connection |
| **6-Digit Room Codes** | Easy to remember and share, with auto-generated QR codes |
| **Share Modes** | Entire screen, application window, or browser tab |
| **Quality Presets** | 1080p High / 720p Medium / 480p Low with configurable bitrate |

### Room Management
| Feature | Description |
|---------|-------------|
| **Device Approval** | Host can approve or deny viewers before they see the stream |
| **Room Password** | Optional password protection for private sessions |
| **Max Viewers Limit** | Cap at 5, 10, 20, 50, or unlimited |
| **Session Themes** | 4 visual themes: Default, Sunset, Ocean, Midnight |
| **Viewer Spotlight** | Host can spotlight specific viewers |
| **Kick Viewers** | Disconnect unwanted viewers instantly |
| **Change Password** | Update or remove room password mid-session |

### Communication
| Feature | Description |
|---------|-------------|
| **Live Chat** | Real-time messaging between host and viewers |
| **Emoji Reactions** | 7 reaction emojis with animated floating particles |
| **Raise Hand** | Viewers can raise hand; host can lower it |
| **Notification Sounds** | Oscillator-based sounds for join, leave, chat, reactions (toggleable) |

### Broadcaster Tools
| Feature | Description |
|---------|-------------|
| **Stream Preview** | See exactly what viewers see |
| **Whiteboard / Annotations** | Draw directly on screen with pen, highlighter, eraser — visible to all viewers |
| **Pause / Resume** | Temporarily pause the stream without disconnecting viewers |
| **Connection Speed Test** | Quick latency check against the signaling server |
| **Connection Log** | Timestamped log of all connection events |
| **Session Statistics** | Track session time, data transferred, peak bitrate, viewer count, chat messages, reactions |
| **Export Stats** | Download session statistics as JSON |

### Viewer Features
| Feature | Description |
|---------|-------------|
| **Picture-in-Picture** | Pop out the stream into a floating window |
| **Fullscreen** | Native fullscreen support |
| **Mute / Unmute** | Toggle audio independently |
| **Recording** | Record the received stream locally as WebM |
| **Annotation Overlay** | View host's drawings in real-time |
| **Stream Paused Overlay** | Visual indicator when host pauses the stream |
| **Auto-Reconnect** | Exponential backoff reconnection on connection loss |

### Monitoring
| Feature | Description |
|---------|-------------|
| **Connection Status** | Real-time badge (Connected / Connecting / Disconnected) |
| **Connection Quality** | Good / Fair / Poor with color-coded indicators |
| **Latency Display** | Live ping in milliseconds |
| **Connection Health** | Percentage-based health score |
| **Live Stats** | Current bitrate, resolution, data transferred |
| **Per-Viewer Quality** | Individual connection quality for each viewer |
| **ICE / Network Info** | ICE connection state, local/remote candidates, transport protocol |
| **Auto Quality** | Automatically adjusts bitrate when connection degrades |

### UI / UX
| Feature | Description |
|---------|-------------|
| **Dark / Light Mode** | Full theme support with next-themes |
| **Responsive Design** | Works on desktop, tablet, and mobile |
| **Page Transitions** | Animated view switching with Framer Motion |
| **Parallax Video Container** | Subtle 3D tilt on mouse hover |
| **Animated Home Page** | Typing text effect, floating particles, mesh grid |
| **Keyboard Shortcuts** | `F` fullscreen, `M` mute, `C` chat, `Esc` back |
| **URL Auto-Join** | Share a link with `?join=CODE` for one-click joining |
| **Sticky Footer** | Always visible with decorative wave animation |

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (recommended) or Node.js 18+
- A modern browser (Chrome, Edge, Firefox, Safari)

### Installation

```bash
# Clone the repository
git clone https://github.com/pizzadox/localcast.git
cd localcast

# Install dependencies
bun install

# Install signaling server dependencies
cd mini-services/signaling-server
bun install
cd ../..
```

### Running

You need to run **two processes**:

```bash
# Terminal 1 — Main application (port 3000)
bun run dev

# Terminal 2 — Signaling server (port 3003)
cd mini-services/signaling-server
bun run dev
```

Open **http://localhost:3000** in your browser.

### One-line Start

```bash
# Start both services simultaneously
bun run dev & cd mini-services/signaling-server && bun run dev
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                         │
│                                                              │
│  Next.js 16 SPA (port 3000)                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useLocalCast() Hook                                  │  │
│  │  ├─ Socket.IO Client  ──────► Signaling Server       │  │
│  │  ├─ WebRTC Peers     ──────► Viewers (P2P video)     │  │
│  │  ├─ MediaRecorder    ──────► Local .webm files       │  │
│  │  └─ AudioContext     ──────► Notification sounds    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Views: Home → Setup → Share / Join → Watch                 │
└─────────────────────────────────────────────────────────────┘
              │                        │
              │ Socket.IO signaling    │ WebRTC (video/audio)
              │ (room mgmt, chat, etc)  │ (direct P2P)
              ▼                        ▼
┌─────────────────────┐    ┌─────────────────────────────────┐
│  Signaling Server   │    │       Other Browsers           │
│  (port 3003)        │    │                                 │
│  Socket.IO v4       │    │  Viewer 1 ←── WebRTC ──┐       │
│  In-memory state     │    │  Viewer 2 ←── WebRTC ──┤       │
│  No database needed  │    │  Viewer N ←── WebRTC ──┤       │
│  No authentication   │    │                         │       │
└─────────────────────┘    │  Host ──────────────────┘       │
                           └─────────────────────────────────┘
```

### Key Design Decisions

- **Mesh topology** — Each viewer connects directly to the host. No SFU means simpler architecture and no server-side video processing.
- **Signaling only** — The server never touches video data. It only relays connection setup messages (SDP offers/answers, ICE candidates).
- **In-memory state** — Room data lives only in server memory. No database, no persistence. Rooms disappear when the server restarts.
- **No accounts** — Security through obscurity: 6-digit room codes (1M combinations) + optional passwords.

---

## Project Structure

```
localcast/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Main SPA orchestrator (all views)
│   │   ├── layout.tsx               # Root layout (ThemeProvider, Sonner, fonts)
│   │   ├── globals.css              # Custom emerald theme, animations, keyframes
│   │   └── api/route.ts             # Health-check API endpoint
│   │
│   ├── components/
│   │   ├── localcast/               # ★ Application components
│   │   │   ├── use-localcast.ts     # Core hook (~1000 lines: state, WebRTC, Socket.IO)
│   │   │   ├── types.ts             # Types, constants, ICE config, helpers
│   │   │   ├── home-view.tsx        # Landing page (hero, features, CTA)
│   │   │   ├── share-setup-view.tsx # Pre-share configuration
│   │   │   ├── share-active-view.tsx# Active broadcasting dashboard
│   │   │   ├── join-view.tsx        # Room code entry + approval wait
│   │   │   ├── watch-view.tsx       # Viewer playback with controls
│   │   │   ├── chat-panel.tsx       # Slide-in chat sidebar
│   │   │   └── shortcuts-dialog.tsx # Keyboard shortcuts modal
│   │   └── ui/                      # shadcn/ui components (46 components)
│   │
│   ├── hooks/
│   │   ├── use-mobile.ts
│   │   └── use-toast.ts
│   │
│   └── lib/
│       ├── db.ts                    # Prisma client
│       └── utils.ts                 # cn() utility
│
├── mini-services/
│   └── signaling-server/
│       ├── index.ts                 # Socket.IO server (~1077 lines)
│       └── package.json
│
├── public/
│   └── logo.svg
│
├── prisma/
│   └── schema.prisma
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── eslint.config.mjs
```

---

## How It Works

1. **Host** clicks "Share Your Screen" → browser prompts for screen/window/tab capture via `getDisplayMedia()`
2. A **6-digit room code** is generated and displayed — host shares it or shows a QR code
3. **Viewers** open the same URL, click "Watch a Screen", and enter the room code
4. (Optional) If **approval mode** is on, the host sees pending requests and can approve or deny each one
5. Through the **signaling server**, the host and viewer exchange WebRTC SDP offers/answers and ICE candidates
6. Once WebRTC connects, **video flows directly P2P** — the server is no longer involved in the video path
7. Chat messages, reactions, annotations, and hand raises are relayed through the signaling server in real-time

---

## Socket.IO Protocol

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `CREATE_ROOM` | `{ requireApproval?, password?, maxViewers?, theme? }` | Create a new room |
| `JOIN_ROOM` | `{ roomId, password? }` | Join as a viewer |
| `WEBRTC_SIGNAL` | `{ targetId, signal }` | Relay WebRTC SDP/ICE |
| `APPROVE_VIEWER` | `{ viewerId }` | Approve pending viewer |
| `DENY_VIEWER` | `{ viewerId }` | Deny pending viewer |
| `DISCONNECT_VIEWER` | `{ viewerId }` | Kick a viewer |
| `CHAT_MESSAGE` | `{ roomId, message, senderName, senderType }` | Send chat message |
| `REACTION` | `{ roomId, emoji, viewerId? }` | Send emoji reaction |
| `ANNOTATION` | `{ roomId, annotation }` | Broadcast drawing event |
| `SPOTLIGHT_VIEWER` | `{ roomId, viewerId }` | Spotlight a viewer |
| `RAISE_HAND` | `{ roomId }` | Viewer raises hand |
| `LOWER_HAND` | `{ roomId }` | Viewer lowers hand |
| `PAUSE_STREAM` | `{ roomId }` | Pause the stream |
| `RESUME_STREAM` | `{ roomId }` | Resume the stream |
| `CHANGE_PASSWORD` | `{ roomId, password }` | Update room password |
| `PING` | — | Keepalive / latency check |

### Server → Client Events

| Event | Description |
|-------|-------------|
| `ROOM_CREATED` | Room created successfully |
| `ROOM_JOINED` | Viewer joined |
| `ROOM_NOT_FOUND` | Room doesn't exist |
| `ROOM_PASSWORD_REQUIRED` | Password needed |
| `ROOM_FULL` | Room at capacity |
| `VIEWER_JOINED` | New viewer joined (host notified) |
| `VIEWER_APPROVED` | Viewer was approved |
| `VIEWER_DENIED` | Viewer was denied |
| `VIEWER_DISCONNECTED` | Viewer left |
| `WEBRTC_SIGNAL` | Relayed WebRTC signal |
| `CHAT_MESSAGE` | Chat broadcast |
| `REACTION` | Reaction forwarded |
| `ANNOTATION` | Drawing data broadcast |
| `SPOTLIGHT_VIEWER` | Spotlight notification |
| `VIEWER_HAND_RAISED` | Hand raise notification |
| `VIEWER_HAND_LOWERED` | Hand lower notification |
| `STREAM_PAUSED` | Stream paused by host |
| `STREAM_RESUMED` | Stream resumed by host |
| `HOST_DISCONNECTED` | Host left the room |
| `KICKED` | Viewer was kicked |
| `SERVER_SHUTDOWN` | Server shutting down |
| `PONG` | Pong response (latency) |

---

## Privacy & Security

- **100% Local** — No data leaves your LAN. The signaling server runs on the same machine as the host.
- **P2P Video** — Video and audio streams go directly between devices via WebRTC DTLS encryption.
- **No Cloud Servers** — Zero dependencies on external services.
- **No Accounts** — No personal data collection. No sign-ups, no cookies, no tracking.
- **No Storage** — All state is in-memory. Nothing is written to disk during sessions.
- **Ephemeral Rooms** — Rooms exist only while the host is connected. Everything is gone on disconnect.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Components** | shadcn/ui (46 components) |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |
| **Theme** | next-themes (dark/light) |
| **Signaling** | Socket.IO v4 |
| **Video Transport** | WebRTC (Mesh P2P) |
| **Runtime** | Bun |
| **Notifications** | Sonner |

---

## Browser Support

| Browser | Screen Share | Watch | Notes |
|---------|-------------|-------|-------|
| Chrome 80+ | ✅ | ✅ | Full support |
| Edge 80+ | ✅ | ✅ | Full support |
| Firefox 90+ | ✅ | ✅ | Full support |
| Safari 15+ | ✅ | ✅ | May require user gesture |

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle fullscreen |
| `M` | Mute / unmute audio |
| `C` | Toggle chat panel |
| `Esc` | Leave room / go back |

---

## Roadmap

- [ ] Audio-only sharing mode
- [ ] File sharing between host and viewers
- [ ] Session recording on host side
- [ ] Screen sharing from mobile devices (camera)
- [ ] Multi-host mode (multiple presenters)
- [ ] Persistent rooms (with database)
- [ ] STUN/TURN server configuration UI
- [ ] Docker deployment

---

## License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

Built with Next.js, WebRTC, and Socket.IO

**Made for local networks**

</div>
