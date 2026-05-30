#!/bin/bash
# Start LocalCast: signaling server (port 3003) + Next.js (port 3000)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill any existing processes on our ports
fuser -k 3003/tcp 2>/dev/null
sleep 1

# Start signaling server in background
cd "$SCRIPT_DIR/mini-services/signaling-server"
bun index.ts &
SIG_PID=$!
echo "[start-dev] Signaling server started (PID=$SIG_PID, port=3003)"

# Wait for signaling server to be ready
sleep 2

# Check if signaling server is running
if ! kill -0 $SIG_PID 2>/dev/null; then
  echo "[start-dev] ERROR: Signaling server failed to start!"
  # Still try to start Next.js
fi

# Start Next.js dev server (foreground)
cd "$SCRIPT_DIR"
exec bunx next dev -p 3000
