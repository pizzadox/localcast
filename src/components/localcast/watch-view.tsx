"use client";

// ─── WatchView ───────────────────────────────────────────────────────────
// Active viewing screen with playback controls and emoji reactions.

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback } from "react";
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
  Pause,
  Hand,
} from "lucide-react";

import { pageVariants, REACTION_EMOJIS } from "./types";
import { formatElapsed } from "./types";
import type { AnnotationEvent } from "./types";

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
  isPaused: boolean;
  isRecording: boolean;
  recordingDuration: number;
  connectionHealthScore: number;
  error: string | null;
  latency: number;
  onToggleMute: () => void;
  onTogglePiP: () => void;
  onToggleFullscreen: () => void;
  onLeaveRoom: () => void;
  onSendReaction: (emoji: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  annotations: AnnotationEvent[];
  annotationCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onRaiseHand: () => void;
  onLowerHand: () => void;
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
  isPaused,
  isRecording,
  recordingDuration,
  connectionHealthScore,
  error,
  latency,
  onToggleMute,
  onTogglePiP,
  onToggleFullscreen,
  onLeaveRoom,
  onSendReaction,
  onStartRecording,
  onStopRecording,
  annotations,
  annotationCanvasRef,
  onRaiseHand,
  onLowerHand,
}: WatchViewProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qualityClass = connectionQuality === "good" ? "quality-good" : connectionQuality === "fair" ? "quality-fair" : "quality-poor";
  const latencyClass = latency < 50 ? "latency-good" : latency < 100 ? "latency-fair" : "latency-poor";
  const healthColor = connectionHealthScore > 80 ? "bg-emerald-500" : connectionHealthScore >= 50 ? "bg-yellow-500" : "bg-red-500";
  const healthLabel = connectionHealthScore > 80 ? "Excellent" : connectionHealthScore >= 50 ? "Fair" : "Poor";
  const healthPercent = Math.min(100, Math.max(0, connectionHealthScore));

  const handleMouseMove = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    controlsTimeout.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    controlsTimeout.current = setTimeout(() => {
      setControlsVisible(false);
    }, 1500);
  }, []);

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
      {/* Top Controls Bar — fades on mouse idle */}
      <div
        className="frosted-glass control-bar-fade mb-3 flex items-center justify-between rounded-xl p-2 control-bar"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ opacity: controlsVisible ? 1 : 0 }}
      >
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
            variant="outline"
            className={`gap-1 ${
              connectionQuality === "good"
                ? "quality-badge-good"
                : connectionQuality === "fair"
                  ? "quality-badge-fair"
                  : "quality-badge-poor"
            } ${connectionQuality === "poor" ? "breathing" : ""}`}
          >
            {connectionQuality === "poor" ? (
              <WifiOff className="size-3" />
            ) : (
              <Wifi className="size-3" />
            )}
            {connectionQuality.charAt(0).toUpperCase() + connectionQuality.slice(1)}
          </Badge>

          {/* Latency — color-coded */}
          {latency > 0 && (
            <Badge variant="outline" className={`gap-1 font-mono text-[10px] ${latencyClass}`}>
              <Gauge className="size-3" />
              {latency}ms
            </Badge>
          )}

          {/* Connection Health Bar */}
          <div className="flex items-center gap-2" title={`Connection Health: ${healthPercent}% — ${healthLabel}`}>
            <div className="h-1.5 w-16 rounded-full bg-muted/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out ${healthColor}`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
            <span className={`text-[9px] font-semibold tabular-nums ${
              connectionHealthScore > 80 ? "text-emerald-600 dark:text-emerald-400" :
              connectionHealthScore >= 50 ? "text-amber-600 dark:text-amber-400" :
              "text-red-600 dark:text-red-400"
            }`}>
              {healthPercent}%
            </span>
          </div>

          <div className="mx-1 h-4 w-px bg-border/50" />

          {/* Recording indicator */}
          {isRecording && (
            <Badge
              variant="outline"
              className="gap-1.5 border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
            >
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
              </span>
              <span className="font-mono text-[10px] tabular-nums">REC {formatElapsed(recordingDuration)}</span>
            </Badge>
          )}

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

      {/* Video Container with Vignette + Gradient Border + Ambient Glow + Parallax */}
      <div
        className={`vignette video-bottom-gradient video-container ambient-glow parallax-container flex flex-1 items-center justify-center overflow-hidden rounded-xl border shadow-xl shadow-black/20 transition-all duration-500 ${connectionStatus === "connected" ? "gradient-border-subtle" : ""} ${connectionQuality === "poor" && connectionStatus === "connected" ? "ring-1 ring-red-500/30" : ""}`}
        ref={(el) => {
          if (el && !containerRef.current) {
            containerRef.current = el;
          }
          if (el) {
            el.onmousemove = (e) => {
              const rect = el.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
              const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6;
              el.style.transform = `perspective(1000px) rotateX(${-y}deg) rotateY(${x}deg)`;
              handleMouseMove();
            };
            el.onmouseleave = () => {
              el.style.transform = '';
              handleMouseLeave();
            };
          }
        }}
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
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted={false}
              className="max-h-full w-full object-contain"
            />
            {/* Annotation overlay for viewers */}
            {annotations.length > 0 && (
              <canvas
                ref={annotationCanvasRef}
                className="pointer-events-none absolute inset-0 z-10 w-full h-full"
              />
            )}
            <AnimatePresence>
              {isPaused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="connection-lost-overlay absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl"
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-amber-500/20">
                    <Pause className="size-8 text-amber-300" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-amber-200">Stream Paused</p>
                    <p className="mt-1 text-sm text-amber-300/60">The host will resume shortly</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
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
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute bottom-full right-0 mb-2 flex gap-1 rounded-2xl border border-emerald-200/40 bg-background/95 p-2 shadow-xl backdrop-blur-md dark:border-emerald-800/30 frosted-glass"
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
                      className="reaction-btn flex size-9 items-center justify-center rounded-lg text-lg hover:bg-muted active:scale-90 transition-transform duration-150"
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
              className={`size-9 rounded-xl transition-all duration-200 ${showReactions ? "bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-500/20 dark:bg-emerald-950 dark:text-emerald-300" : "hover:bg-muted"}`}
              title="Send reaction"
            >
              <SmilePlus className="size-4" />
            </Button>
          </div>
        )}

        {/* Recording Controls */}
        {connectionStatus === "connected" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`size-9 rounded-xl transition-all duration-200 ${isRecording ? "bg-red-100 text-red-700 shadow-sm shadow-red-500/20 hover:bg-red-200 dark:bg-red-950 dark:text-red-400" : "hover:bg-muted"}`}
            title={isRecording ? "Stop recording" : "Start recording"}
          >
            <Radio className="size-4" />
          </Button>
        )}

        {/* Raise Hand */}
        {connectionStatus === "connected" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRaiseHand}
            className="size-9 rounded-xl transition-all duration-200 hover:bg-amber-100 hover:text-amber-600 dark:hover:bg-amber-950 dark:hover:text-amber-400"
            title="Raise hand"
          >
            <Hand className="size-4" />
          </Button>
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
