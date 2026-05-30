// Next.js instrumentation — runs once when the server starts
// Starts the signaling server as part of the Next.js process

export async function register() {
  const { ensureSignalingServer } = await import('@/lib/signaling-server')
  ensureSignalingServer()
  console.log('[instrumentation] Signaling server initialized')
}
