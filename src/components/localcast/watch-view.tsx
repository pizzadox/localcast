"use client";

// ─── WatchView ───────────────────────────────────────────────────────────
// Active viewing screen with playback controls and emoji reactions.

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  ArrowLeft,
  Maximize,
  Minimize,
  Monitor,
  PictureInPicture2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  SmilePlus,
  Gauge,
  RefreshCw,
  Radio,
  Loader2,
} from "lucide-react";

import { pageVariants, REACTION_EMOJIS } from "./types";

interface WatchViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  roomId: string;
  connectionStatus: "disconnected" | "connecting" | "connected";
  connectionQuality: "good" | "fair" | "poor";
  isMuted: boolean;
  isFullscreen: boolean;
  pipSupported: boolean;
  waitingApproval: boolean;
  error: string | null;
  latency: number;
  onToggleMute: () => void;
  onTogglePiP: () => void;
  onToggleFullscreen: () => void;
  onLeaveRoom: () => void;
  onSendReaction: (emoji: string) => void;
}

export function WatchView({
  videoRef,
  containerRef,
  roomId,
  connectionStatus,
  connectionQuality,
  isMuted,
  isFullscreen,
  pipSupported,
  waitingApproval,
  error,
  latency,
  onToggleMute,
  onTogglePiP,
  onToggleFullscreen,
  onLeaveRoom,
  onSendReaction,
}: WatchViewProps) {
  const [showReactions, setShowReactions] = useState(false);
  const qualityClass = connectionQuality === "good" ? "quality-good" : connectionQuality === "fair" ? "quality-fair" : "quality-poor";

  return (
    <motion.div
      key="watching"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="flex w-full flex-col px-4 py-4"
    >
      {/* Top Controls Bar */}
      <div className="control-bar mb-3 flex items-center justify-between rounded-xl p-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeaveRoom}
            className="gap-1.5 hover:text-destructive transition-colors"
          >
            <ArrowLeft className="size-4" />
            Leave
          </Button>
          <Badge
            variant="outline"
            className={`gap-1.5 transition-colors ${
              connectionStatus === "connected"
                ? "border-emerald-200 text-emerald-700 bg-emerald-50/50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/30"
                : connectionStatus === "connecting"
                  ? "border-amber-200 text-amber-700 bg-amber-50/50 dark:border-amber-800 dark:text-amber-300 dark:bg-amber-950/30"
                  : "border-red-200 text-red-700 bg-red-50/50 dark:border-red-800 dark:text-red-300 dark:bg-red-950/30"
            }`}
          >
            {connectionStatus === "connected" ? (
              <Radio className="size-3" />
            ) : connectionStatus === "connecting" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {connectionStatus === "connected" ? "Connected" : connectionStatus === "connecting" ? "Connecting..." : "Disconnected"}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Connection quality */}
          <Badge
            variant={
              connectionQuality === "good"
                ? "secondary"
                : connectionQuality === "fair"
                  ? "outline"
                  : "destructive"
            }
            className="gap-1"
          >
            {connectionQuality === "poor" ? (
              <WifiOff className="size-3" />
            ) : (
              <Wifi className="size-3" />
            )}
            {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
          </Badge>

          {/* Latency */}
          {latency > 0 && (
            <Badge variant="outline" className="gap-1 font-mono text-[10px]">
              <Gauge className="size-3" />
              {latency}ms
            </Badge>
          )}

          <div className="mx-1 h-4 w-px bg-border/50" />

          {/* Volume */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className="size-8 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
          >
            {isMuted ? (
              <VolumeX className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </Button>

          {/* Picture-in-Picture */}
          {pipSupported && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onTogglePiP}
              title="Picture-in-Picture"
              className="size-8"
            >
              <PictureInPicture2 className="size-4" />
            </Button>
          )}

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="size-8"
          >
            {isFullscreen ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Video Container with Vignette */}
      <div
        ref={containerRef}
        className="vignette video-container flex flex-1 items-center justify-center overflow-hidden rounded-xl border shadow-xl shadow-black/20"
        style={{ minHeight: "55vh" }}
      >
        {error ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
              <AlertCircle className="size-8 text-red-500" />
            </div>
            <p className="text-lg font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={onLeaveRoom}>
              <ArrowLeft className="size-4" />
              Back to Home
            </Button>
          </div>
        ) : connectionStatus !== "connected" ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="relative flex size-20 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/15" />
              <span className="absolute inset-2 animate-pulse rounded-full border-2 border-dashed border-emerald-400/20" />
              <span className="absolute inset-5 animate-pulse rounded-full border-2 border-dashed border-emerald-400/15" style={{ animationDelay: "0.5s" }} />
              <span className="absolute inset-8 animate-pulse rounded-full border-2 border-dashed border-emerald-400/10" style={{ animationDelay: "1s" }} />
              <div className="relative flex size-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60">
                {waitingApproval ? (
                  <ShieldAlertIcon />
                ) : (
                  <Wifi className="size-6 text-emerald-500" />
                )}
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-muted-foreground">
                {waitingApproval ? "Waiting for host approval..." : "Connecting to stream..."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground/60">
                {waitingApproval
                  ? "The host will need to approve your connection"
                  : "Please wait while the host sets up the connection"}
              </p>
            </div>
            <Button variant="outline" onClick={onLeaveRoom} className="mt-2">
              Cancel
            </Button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={false}
            className="max-h-full w-full object-contain"
          />
        )}

        {/* Connection Lost Overlay */}
        <AnimatePresence>
          {connectionStatus === "disconnected" && !error && !waitingApproval && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="connection-lost-overlay absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl"
            >
              <div className="relative flex size-16 items-center justify-center">
                <span className="absolute inset-0 rounded-full border-2 border-red-500/30" style={{ animation: "reconnect-pulse 2s ease-in-out infinite" }} />
                <WifiOff className="size-8 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-white">Connection Lost</p>
                <p className="mt-1 text-sm text-white/60">Attempting to reconnect...</p>
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mt-2"
              >
                <RefreshCw className="size-5 text-white/50" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Bar: Room Info + Reactions */}
      <div className="mt-3 flex items-center justify-between">
        {/* Room info */}
        <div className="control-bar flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Monitor className="size-3.5" />
            <span>
              Room{" "}
              <span className="font-mono font-bold text-foreground">
                {roomId}
              </span>
            </span>
          </div>
          <div className="h-3.5 w-px bg-border/50" />
          <div className="flex items-center gap-1">
            <Wifi className="size-3" />
            <span className={`${qualityClass} text-xs font-medium`}>
              {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
            </span>
          </div>
        </div>

        {/* Emoji Reactions */}
        {connectionStatus === "connected" && (
          <div className="relative">
            <AnimatePresence>
              {showReactions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 8 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-full right-0 mb-2 flex gap-1 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur-sm"
                >
                  {REACTION_EMOJIS.map((emoji, i) => (
                    <motion.button
                      key={emoji}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03, type: "spring", stiffness: 500, damping: 20 }}
                      onClick={() => {
                        onSendReaction(emoji);
                        setShowReactions(false);
                      }}
                      className="reaction-btn flex size-9 items-center justify-center rounded-lg text-lg hover:bg-muted active:scale-95"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowReactions(!showReactions)}
              className={`size-9 transition-colors ${showReactions ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : ""}`}
              title="Send reaction"
            >
              <SmilePlus className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Simple shield alert icon for waiting approval
function ShieldAlertIcon() {
  return (
    <svg className="size-6 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
