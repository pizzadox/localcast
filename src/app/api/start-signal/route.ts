import { NextResponse } from "next/server";

let started = false;

export async function GET() {
  if (!started) {
    started = true;
    // Dynamic import with await to ensure it runs in Node.js runtime
    const { ensureSignalingServer } = await import("@/lib/signaling-server");
    ensureSignalingServer();
  }
  return NextResponse.json({ status: "ok", port: 3003 });
}
