"use client";

// ─── Types ───────────────────────────────────────────────────────────────────
// Shared type definitions, constants, and helpers for the LocalCast application.

// ── View & Connection Types ─────────────────────────────────────────────────

export type View = "home" | "share" | "join" | "watching";

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

export type ConnectionQuality = "good" | "fair" | "poor";

// ── Viewer ───────────────────────────────────────────────────────────────────

export interface Viewer {
  id: string;
  deviceName?: string;
  os?: string;
  browser?: string;
  screenWidth?: number;
  screenHeight?: number;
  connectedAt: number;
  approved: boolean;
}

/** @deprecated Use `Viewer` instead. Kept for backward compatibility. */
export type ViewerInfo = Viewer;

// ── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  senderName: string;
  senderType: "host" | "viewer";
  message: string;
  timestamp: number;
  roomId?: string;
  senderId?: string;
}

// ── Reactions ───────────────────────────────────────────────────────────────

export interface Reaction {
  emoji: string;
  id: string;
  roomId?: string;
  viewerId?: string;
  timestamp?: number;
}

// ── Quality Presets ─────────────────────────────────────────────────────────

export type QualityPreset = "high" | "medium" | "low";

export type ShareMode = "screen" | "window" | "tab";

export type ViewerConnectionQuality = "good" | "checking" | "disconnected";

export interface QualityConfig {
  label: string;
  width: { ideal: number };
  height: { ideal: number };
  frameRate: { ideal: number };
  bitrate: number;
}

// ── Event Log ───────────────────────────────────────────────────────────────

export type EventLogType =
  | "viewer_joined"
  | "viewer_left"
  | "viewer_approved"
  | "viewer_denied"
  | "viewer_kicked"
  | "chat"
  | "reaction"
  | "quality_change"
  | "auto_quality"
  | "url_join";

export interface ConnectionLogEntry {
  id: string;
  type: EventLogType;
  message: string;
  timestamp: number;
}

/** @deprecated Use `ConnectionLogEntry` instead. */
export type EventLogEntry = ConnectionLogEntry;

// ─── Constants ───────────────────────────────────────────────────────────────

/** WebRTC ICE configuration (public STUN servers for local network). */
export const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/** Quality presets mapping preset key → resolution / fps / bitrate. */
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

/** Share mode configuration mapping. */
export const SHARE_MODE_CONFIG: Record<ShareMode, { label: string; icon: string; displaySurface: string; description: string }> = {
  screen: { label: "Entire Screen", icon: "🖥️", displaySurface: "monitor", description: "Share your entire screen" },
  window: { label: "Application Window", icon: "🪟", displaySurface: "window", description: "Share a specific application" },
  tab: { label: "Browser Tab", icon: "🌐", displaySurface: "browser", description: "Share a browser tab" },
};

/** Allowed reaction emojis (mirrors server-side whitelist). */
export const REACTION_EMOJIS = [
  "\u{1F44D}",
  "\u{1F44E}",
  "\u2764\uFE0F",
  "\u{1F602}",
  "\u{1F389}",
  "\u{1F44F}",
  "\u{1F525}",
];

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

export const slideVariants = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 },
};

export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse a user-agent string into OS, browser, and device name.
 * Returns sensible defaults when the UA cannot be parsed.
 */
export function parseDeviceInfo(ua: string): {
  os: string;
  browser: string;
  deviceName: string;
} {
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

/**
 * Format elapsed milliseconds as HH:MM:SS or MM:SS.
 * When the elapsed time is less than 1 hour, only MM:SS is shown.
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Format a byte count as a human-readable string (B / KB / MB / GB). */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Format bits-per-second as a human-readable string. */
export function formatBitrate(bps: number): string {
  if (bps < 1000) return `${bps} bps`;
  if (bps < 1_000_000) return `${(bps / 1000).toFixed(0)} Kbps`;
  return `${(bps / 1_000_000).toFixed(1)} Mbps`;
}

/** Format a seconds count as a human-readable relative time (e.g. "3m ago"). */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

// ─── ID Generation ───────────────────────────────────────────────────────────

// ─── Sound Utility ───────────────────────────────────────────────────────

let audioCtxRef: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtxRef || audioCtxRef.state === "closed") {
    audioCtxRef = new AudioContext();
  }
  if (audioCtxRef.state === "suspended") {
    audioCtxRef.resume();
  }
  return audioCtxRef;
}

/** Play a short oscillator-based notification sound. No audio files needed. */
export function playNotificationSound(type: "join" | "chat" | "reaction" | "leave"): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case "join": {
        // Rising two-tone chime
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
        break;
      }
      case "chat": {
        // Soft single pop
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
        break;
      }
      case "reaction": {
        // Quick happy blip
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
        osc.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.06); // E6
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
        break;
      }
      case "leave": {
        // Falling two-tone
        osc.type = "sine";
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.1); // C5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
        break;
      }
    }
  } catch {
    // Silently ignore audio errors (e.g. no audio support)
  }
}

let _msgCounter = 0;

/** Generate a unique ID (primarily for chat messages and reactions). */
export function generateId(): string {
  return `lc_${Date.now()}_${++_msgCounter}`;
}
