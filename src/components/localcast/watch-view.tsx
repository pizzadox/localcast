"use client";

// ─── WatchView ───────────────────────────────────────────────────────────
// Active viewing screen showing the remote stream with playback controls.

import { motion } from "framer-motion";
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
} from "lucide-react";

import { pageVariants } from "./types";

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
}: WatchViewProps) {
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
      {/* Viewer controls bar with frosted glass effect */}
      <div className="control-bar mb-3 flex items-center justify-between rounded-xl p-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeaveRoom}
            className="gap-1.5"
          >
            <ArrowLeft className="size-4" />
            Leave
          </Button>
          <Badge variant="outline" className="gap-1.5">
            <Wifi className="size-3" />
            {connectionStatus === "connected" ? "Connected" : "Connecting..."}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
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

          {/* Volume */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
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
          >
            {isFullscreen ? (
              <Minimize className="size-4" />
            ) : (
              <Maximize className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Video container */}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden rounded-xl border bg-black"
        style={{ minHeight: "60vh" }}
      >
        {error ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <AlertCircle className="size-12 text-destructive" />
            <p className="text-lg font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={onLeaveRoom}>
              <ArrowLeft className="size-4" />
              Back to Home
            </Button>
          </div>
        ) : connectionStatus !== "connected" ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            {/* Scanning rings animation */}
            <div className="relative flex size-12 items-center justify-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20" />
              <span className="absolute inset-2 animate-pulse rounded-full border-2 border-dashed border-emerald-400/30" />
              <span className="absolute inset-4 animate-pulse rounded-full border-2 border-dashed border-emerald-400/20" style={{ animationDelay: "0.5s" }} />
              <span className="absolute inset-6 animate-pulse rounded-full border-2 border-dashed border-emerald-400/10" style={{ animationDelay: "1s" }} />
              <Wifi className="size-6 text-emerald-500" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              {waitingApproval ? "Waiting for host approval..." : "Connecting to stream..."}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {waitingApproval
                ? "The host will need to approve your connection"
                : "Please wait while the host sets up the connection"}
            </p>
            <Button variant="outline" onClick={onLeaveRoom} className="mt-4">
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
      </div>

      {/* Room info bar */}
      <div className="control-bar mt-3 flex items-center justify-center gap-4 rounded-xl px-4 py-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Monitor className="size-4" />
          <span>
            Room{" "}
            <span className="font-mono font-bold text-foreground">
              {roomId}
            </span>
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <Wifi className="size-3" />
          <span className={`${qualityClass} text-xs font-medium`}>
            {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
          </span>
          {latency > 0 && (
            <span className="text-xs text-muted-foreground">
              · {latency}ms
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
