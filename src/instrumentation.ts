// Next.js instrumentation — runs once when the server starts
// This starts the signaling server as part of the Next.js process
// so it shares the same lifecycle and stays alive.

export async function register() {
  // Dynamic import to avoid bundling issues
  const { ensureSignalingServer } = await import('@/lib/signaling-server')
  ensureSignalingServer()
  console.log('[instrumentation] Signaling server initialized')
}
