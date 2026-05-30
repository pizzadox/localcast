import { NextResponse } from "next/server";
import { ensureSignalingServer } from "@/lib/signaling-server";

// This API route ensures the signaling server is running in the Next.js process.
// Called automatically by the frontend on page load.
export async function GET() {
  try {
    ensureSignalingServer();
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json({ status: "error", error: String(err) }, { status: 500 });
  }
}
