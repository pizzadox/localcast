// ─── instrumentation.ts ──────────────────────────────────────────────────
// Next.js instrumentation hook — auto-starts the LocalCast signaling server
// (Socket.IO on port 3003) alongside the Next.js server process.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to ensure it runs in Node.js runtime
    const { ensureSignalingServer } = await import("./lib/signaling-server");
    ensureSignalingServer();
    console.log("[instrumentation] LocalCast signaling server ensured");
  }
}
