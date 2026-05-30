# LocalCast — LAN Screen Sharing

A pure browser-based LAN screen sharing application. Share your screen, window, or camera with unlimited viewers on the same local network — no install required.

## ✨ Features

- **WebRTC Mesh P2P** — direct peer-to-peer connections, no SFU needed
- **Unlimited Viewers** — every new viewer connects directly to the host
- **6-Digit Room Codes** — easy to join, with QR code support
- **Device Approval** — host can approve or deny viewers before they see the stream
- **Room Password** — optional password protection
- **Live Chat & Reactions** — real-time messaging and emoji reactions
- **Recording** — record streams directly in browser (WebM)
- **Annotations** — draw on screen for all viewers to see
- **Quality Presets** — Low / Medium / High / Ultra bitrate control
- **Connection Monitoring** — real-time stats, latency, bitrate, connection health
- **Dark/Light Mode** — full theme support
- **Responsive Design** — works on desktop and mobile

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, shadcn/ui |
| Signaling | Socket.IO v4 (mini-service, port 3003) |
| Transport | WebRTC (Mesh P2P) |
| Icons | Lucide React |
| Animations | Framer Motion |

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Push database schema
bun run db:push

# Start main app (port 3000)
bun run dev

# Start signaling server (port 3003, in separate terminal)
cd mini-services/signaling-server
bun install
bun run dev
```

Open **http://localhost:3000** in your browser.

## 📁 Project Structure

```
localcast/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main SPA (all views)
│   │   ├── layout.tsx        # ThemeProvider + Toaster
│   │   └── globals.css       # Custom theme & animations
│   ├── components/
│   │   ├── localcast/
│   │   │   ├── use-localcast.ts  # Core hook (state, WebRTC, signaling)
│   │   │   ├── types.ts           # Types & constants
│   │   │   ├── home-view.tsx      # Home screen
│   │   │   ├── host-view.tsx      # Broadcaster UI
│   │   │   ├── watch-view.tsx     # Viewer UI
│   │   │   ├── chat-panel.tsx     # Chat sidebar
│   │   │   └── ...
│   │   └── ui/               # shadcn/ui components
│   └── lib/
│       └── db.ts             # Prisma client
├── mini-services/
│   └── signaling-server/
│       └── index.ts          # Socket.IO signaling server
├── prisma/
│   └── schema.prisma
├── package.json
└── bun.lock
```

## 📜 How It Works

1. **Host** clicks "Start Sharing" → browser prompts for screen/window/camera capture
2. A **room code** is generated (6 digits) — share it with viewers
3. **Viewers** enter the room code on their devices
4. If approval is enabled, host must **approve** each viewer
5. WebRTC **peer connections** are established directly between host and each viewer
6. The signaling server only coordinates the initial connection setup — all video flows P2P

## 🔒 Privacy

- **100% local** — no data leaves your network
- **No cloud servers** — signaling runs on the same machine
- **P2P video** — streams go directly between devices
- **No accounts needed** — just share a room code

## 📄 License

MIT
