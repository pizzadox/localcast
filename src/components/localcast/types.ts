// ─── Types ───────────────────────────────────────────────────────────────────
// Shared type definitions, constants, and helpers for the LocalCast application.

export type View = "home" | "share" | "join" | "watching";

export interface ViewerInfo {
  id: string;
  deviceName: string;
  os: string;
  browser: string;
  screenWidth?: number;
  screenHeight?: number;
  approved: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  message: string;
  senderName: string;
  senderType: "host" | "viewer";
  senderId: string;
  timestamp: number;
}

export interface Reaction {
  id: string;
  roomId: string;
  emoji: string;
  viewerId: string;
  timestamp: number;
}

export type QualityPreset = "high" | "medium" | "low";

export interface QualityConfig {
  label: string;
  width: { ideal: number };
  height: { ideal: number };
  frameRate: { ideal: number };
  bitrate: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const QUALITY_PRESETS: Record<QualityPreset, QualityConfig> = {
  high: {
    label: "1080p",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
    bitrate: 5_000_000,
  },
  medium: {
    label: "720p",
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
    bitrate: 2_500_000,
  },
  low: {
    label: "480p",
    width: { ideal: 854 },
    height: { ideal: 480 },
    frameRate: { ideal: 24 },
    bitrate: 1_000_000,
  },
};

export const REACTION_EMOJIS = ["👍", "👎", "❤️", "😂", "🎉", "👏", "🔥"];

// ─── Animation Variants ──────────────────────────────────────────────────────

export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function parseDeviceInfo(ua: string): { os: string; browser: string; deviceName: string } {
  let os = "Unknown";
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

  let browser = "Unknown";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  return { os, browser, deviceName: `${browser} on ${os}` };
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatBitrate(bps: number): string {
  if (bps < 1000) return `${bps} bps`;
  if (bps < 1_000_000) return `${(bps / 1000).toFixed(0)} Kbps`;
  return `${(bps / 1_000_000).toFixed(1)} Mbps`;
}

let msgCounter = 0;
export function generateId(): string {
  return `msg_${Date.now()}_${++msgCounter}`;
}
