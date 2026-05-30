"use client";

// ─── ShareActiveView ─────────────────────────────────────────────────────
// Active screen sharing view with room code, preview, viewer list,
// live stats, session dashboard, and controls.

import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Copy,
  QrCode,
  Users,
  Wifi,
  Monitor,
  MonitorUp,
  Check,
  X,
  BarChart3,
  Activity,
  ChevronDown,
  Zap,
  Clock,
  HardDrive,
  Eye,
  Radio,
  TrendingUp,
  MessageSquare,
  Heart,
  Maximize2,
  Info,
  Network,
  Pause,
  Play,
  Pen,
  Highlighter,
  ArrowUpRight,
  Type,
  Eraser,
  Trash2,
  Star,
  Hand,
  Link,
} from "lucide-react";

import { useState } from "react";
import { toast } from "sonner";
import { pageVariants, formatBytes, formatBitrate, formatElapsed } from "./types";
import type { ViewerInfo, ViewerConnectionQuality, IceConnectionInfo, AnnotationTool, AnnotationEvent } from "./types";

interface ShareActiveViewProps {
  roomId: string;
  viewers: ViewerInfo[];
  viewerQualities: Record<string, ViewerConnectionQuality>;
  requireApproval: boolean;
  copied: boolean;
  previewVideoRef: React.RefObject<HTMLVideoElement | null>;
  activePeerCount: number;
  estimatedDataTransferred: number;
  streamResolution: string;
  currentBitrate: number;
  elapsedTime: number;
  connectionLog: { id: string; type: string; message: string; timestamp: number }[];
  isAutoQualityActive: boolean;
  peakBitrate: number;
  totalChatMessages: number;
  totalReactions: number;
  iceConnectionInfo: IceConnectionInfo;
  showNetworkInfo: boolean;
  setShowNetworkInfo: (v: boolean) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  connectionHealthScore: number;
  exportSessionStats: () => string;
  onCopyRoomCode: () => void;
  onShowQrDialog: () => void;
  onApproveViewer: (viewerId: string) => void;
  onDenyViewer: (viewerId: string) => void;
  onDisconnectViewer: (viewerId: string) => void;
  onSpotlightViewer: (viewerId: string) => void;
  onHostLowerHand: (viewerId: string) => void;
  spotlightedViewer: string | null;
  raisedHands: Set<string>;
  onStopSharing: () => void;
  showAnnotationOverlay: boolean;
  setShowAnnotationOverlay: (v: boolean) => void;
  annotationTool: AnnotationTool;
  setAnnotationTool: (v: AnnotationTool) => void;
  annotationColor: string;
  setAnnotationColor: (v: string) => void;
  annotations: AnnotationEvent[];
  clearAnnotations: () => void;
  annotationCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

// Connection quality dot component
function QualityDot({ quality }: { quality: ViewerConnectionQuality | undefined }) {
  const colors = {
    good: "bg-emerald-500",
    checking: "bg-yellow-500 animate-pulse",
    disconnected: "bg-red-500",
  };
  const q = quality || "checking";
  return (
    <span className={`inline-block size-2 rounded-full ${colors[q]}`} title={q === "good" ? "Connected" : q === "checking" ? "Connecting..." : "Disconnected"} />
  );
}

export function ShareActiveView({
  roomId,
  viewers,
  viewerQualities,
  requireApproval,
  copied,
  previewVideoRef,
  activePeerCount,
  estimatedDataTransferred,
  streamResolution,
  currentBitrate,
  elapsedTime,
  connectionLog,
  isAutoQualityActive,
  peakBitrate,
  totalChatMessages,
  totalReactions,
  iceConnectionInfo,
  showNetworkInfo,
  setShowNetworkInfo,
  isPaused,
  onTogglePause,
  connectionHealthScore,
  exportSessionStats,
  onCopyRoomCode,
  onShowQrDialog,
  onApproveViewer,
  onDenyViewer,
  onDisconnectViewer,
  onSpotlightViewer,
  onHostLowerHand,
  spotlightedViewer,
  raisedHands,
  onStopSharing,
  showAnnotationOverlay,
  setShowAnnotationOverlay,
  annotationTool,
  setAnnotationTool,
  annotationColor,
  setAnnotationColor,
  annotations,
  clearAnnotations,
  annotationCanvasRef,
}: ShareActiveViewProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [networkInfoOpen, setNetworkInfoOpen] = useState(false);

  // Split room code into individual characters for animation
  const codeChars = roomId.split("");

  // Compute average bitrate from current + peak
  const avgBitrate = peakBitrate > 0 && currentBitrate > 0 ? Math.round((peakBitrate + currentBitrate) / 2) : currentBitrate;

  return (
    <motion.div
      key="share-active"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl px-3 py-3 sm:px-4 sm:py-6"
    >
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Left Column: Room Info + Controls */}
        <div className="space-y-3 sm:space-y-4 lg:col-span-2">
          {/* Room Code Card */}
          <Card className="glass-card overflow-hidden border-2">
            <div className="h-1 gradient-emerald" />
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wifi className="size-5 text-emerald-600 dark:text-emerald-400" />
                Room Code
                <Badge variant="outline" className="ml-auto gap-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  <Clock className="size-3" />
                  {formatElapsed(elapsedTime)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Animated connection line decoration */}
              <div className="connection-pulse-line rounded-full mx-auto max-w-[60%]" />
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-emerald-300/60 bg-emerald-50/50 p-3 sm:p-4 transition-colors dark:border-emerald-700/60 dark:bg-emerald-950/30">
                  <div className="flex gap-2">
                    {codeChars.map((char, i) => (
                      <motion.span
                        key={`${char}-${i}`}
                        initial={{ opacity: 0, scale: 0.5, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
                        className="room-code-char inline-flex size-9 sm:size-12 items-center justify-center rounded-lg bg-emerald-100/80 font-mono text-xl sm:text-3xl font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 cursor-default sequential-glow skeleton-shine"
                        style={{ animationDelay: `${i * 0.12}s` }}
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-1.5 sm:gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onCopyRoomCode}
                    className="size-10 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950 dark:hover:border-emerald-700 transition-colors"
                    title="Copy room code"
                  >
                    {copied ? (
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      >
                        <Check className="size-4 text-emerald-600" />
                      </motion.div>
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onShowQrDialog}
                    className="size-10 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950 dark:hover:border-emerald-700 transition-colors"
                    title="Show QR code"
                  >
                    <QrCode className="size-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto sm:mt-1.5 gap-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 dark:hover:bg-emerald-950 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
                  onClick={() => {
                    const url = `${window.location.origin}?join=${roomId}`;
                    navigator.clipboard?.writeText(url);
                    toast.success("Link copied!", { description: "Viewers can use this link to join directly" });
                  }}
                >
                  <Link className="size-3" />
                  Share Invite Link
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground/60">
                Share this code or scan the QR code to join
              </p>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card className="glass-card overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="size-4 text-muted-foreground" />
                  Stream Preview
                </CardTitle>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[10px] sm:gap-1.5 sm:text-xs"
                    onClick={() => setShowNetworkInfo(!showNetworkInfo)}
                  >
                    <Network className="size-3" />
                    <span className="hidden sm:inline">Network Info</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[10px] sm:gap-1.5 sm:text-xs"
                    onClick={() => setShowAnnotationOverlay(!showAnnotationOverlay)}
                  >
                    <Pen className="size-3" />
                    <span className="hidden sm:inline">Whiteboard</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 text-[10px] sm:gap-1.5 sm:text-xs"
                    onClick={() => setDashboardOpen(true)}
                  >
                    <BarChart3 className="size-3" />
                    <span className="hidden sm:inline">Session Stats</span>
                  </Button>
                  <Badge variant="outline" className="text-[10px] gap-1 bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800">
                    <Radio className="size-2.5" />
                    Live
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="video-container video-bottom-gradient overflow-hidden rounded-xl border shadow-lg shadow-black/10 relative">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-video w-full object-contain"
                />
                {/* Annotation Canvas Overlay */}
                {showAnnotationOverlay && (
                  <div className="absolute inset-0 z-20 bg-black/5 rounded-xl">
                    <canvas
                      ref={annotationCanvasRef}
                      className="absolute inset-0 w-full h-full"
                      style={{ touchAction: "none" }}
                    />
                    <div className="absolute top-2 right-2 flex flex-col gap-1 rounded-lg border bg-background/90 p-1 shadow-lg backdrop-blur-sm">
                      <button onClick={() => setAnnotationTool("pen")} className={`flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors ${annotationTool === "pen" ? "bg-muted text-red-500" : "text-muted-foreground"}`} title="Pen"><Pen className="size-4" /></button>
                      <button onClick={() => setAnnotationTool("highlighter")} className={`flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors ${annotationTool === "highlighter" ? "bg-muted text-yellow-500" : "text-muted-foreground"}`} title="Highlighter"><Highlighter className="size-4" /></button>
                      <button onClick={() => setAnnotationTool("eraser")} className={`flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors ${annotationTool === "eraser" ? "bg-muted text-muted-foreground" : "text-muted-foreground"}`} title="Eraser"><Eraser className="size-4" /></button>
                      <div className="h-px bg-border" />
                      <button onClick={() => setAnnotationColor("#ef4444")} className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors" title="Red"><div className="size-4 rounded-full bg-red-500" /></button>
                      <button onClick={() => setAnnotationColor("#3b82f6")} className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors" title="Blue"><div className="size-4 rounded-full bg-blue-500" /></button>
                      <button onClick={() => setAnnotationColor("#22c55e")} className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors" title="Green"><div className="size-4 rounded-full bg-green-500" /></button>
                      <button onClick={() => setAnnotationColor("#f59e0b")} className="flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors" title="Yellow"><div className="size-4 rounded-full bg-amber-500" /></button>
                      <div className="h-px bg-border" />
                      <button onClick={clearAnnotations} className="flex size-8 items-center justify-center rounded-md hover:bg-red-50 hover:text-red-500 text-muted-foreground transition-colors" title="Clear all"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                )}
                {/* PAUSED overlay */}
                {isPaused && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-10"
                  >
                    <div className="flex size-16 items-center justify-center rounded-full bg-white/10">
                      <Pause className="size-8 text-white" />
                    </div>
                    <p className="mt-3 text-lg font-bold text-white">PAUSED</p>
                    <p className="text-xs text-white/60">Screen sharing is paused</p>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Viewers + Stats */}
        <div className="space-y-3 sm:space-y-4">
          <Card className="glass-card h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-teal-600 dark:text-teal-400" />
                  Viewers
                </CardTitle>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={viewers.length}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Badge
                      variant="secondary"
                      className={
                        viewers.length > 0
                          ? "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
                          : ""
                      }
                    >
                      {viewers.length}
                    </Badge>
                  </motion.div>
                </AnimatePresence>
              </div>
              <CardDescription className="text-xs">
                {viewers.length === 0
                  ? "No viewers connected yet"
                  : `${viewers.length} viewer${viewers.length > 1 ? "s" : ""} connected`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {viewers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12 text-center bg-muted/10">
                  <div className="relative mb-4 flex size-20 items-center justify-center">
                    <span className="absolute inset-0 breathing rounded-full bg-emerald-400/10" />
                    <span className="absolute inset-3 breathing rounded-full border-2 border-dashed border-emerald-400/20" style={{ animationDelay: "0.5s" }} />
                    <span className="absolute inset-6 breathing rounded-full border-2 border-dashed border-emerald-400/15" style={{ animationDelay: "1s" }} />
                    <Eye className="size-9 text-muted-foreground/25" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/70">
                    Waiting for viewers...
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/40 max-w-[160px]">
                    Share the room code above to let others join your stream
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                  {viewers.map((viewer, idx) => (
                    <motion.div
                      key={viewer.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ delay: 0.05 + idx * 0.06, duration: 0.3 }}
                      className={`group relative flex items-center justify-between rounded-xl border p-3 transition-all duration-200 hover:shadow-sm ${
                        viewer.approved
                          ? "border-l-4 border-l-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                          : "border-l-4 border-l-yellow-500 hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20"
                      }${spotlightedViewer === viewer.id ? " ring-2 ring-amber-400/60 shadow-amber-500/20" : ""}`}
                    >
                      {/* Heartbeat line for connected viewers */}
                      {viewer.approved && (
                        <motion.div
                          className="absolute bottom-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"
                          animate={{ opacity: [0, 0.6, 0], scaleX: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                          style={{ originX: 0 }}
                        />
                      )}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                          viewer.approved
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
                        }`}>
                          <Monitor className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium flex items-center gap-1.5">
                            {viewer.browser} on {viewer.os}
                            {viewer.approved && <QualityDot quality={viewerQualities[viewer.id]} />}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {!viewer.approved && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-300 text-yellow-600 dark:border-yellow-700 dark:text-yellow-400">
                                Pending
                              </Badge>
                            )}
                            {viewer.approved && viewerQualities[viewer.id] === "good" && (
                              <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Watching
                              </span>
                            )}
                            {viewer.approved && viewerQualities[viewer.id] === "checking" && (
                              <span className="flex items-center gap-0.5 text-[10px] text-yellow-600 dark:text-yellow-400">
                                <span className="size-1.5 rounded-full bg-yellow-500 animate-pulse" />
                                Connecting
                              </span>
                            )}
                            {viewer.screenWidth && viewer.screenHeight && (
                              <span className="text-[10px] text-muted-foreground/60">
                                {viewer.screenWidth}×{viewer.screenHeight}
                              </span>
                            )}
                            {viewer.approved && (
                              <div className="ml-auto w-12">
                                <div className="h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      (viewerQualities[viewer.id] === "good" || !viewerQualities[viewer.id])
                                        ? "bg-emerald-500 w-full"
                                        : viewerQualities[viewer.id] === "checking"
                                          ? "bg-yellow-500 w-2/3 animate-pulse"
                                          : "bg-red-500 w-1/4"
                                    }`}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {requireApproval && !viewer.approved ? (
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 dark:text-emerald-400 dark:hover:bg-emerald-950 dark:hover:border-emerald-700 transition-all"
                            onClick={() => onApproveViewer(viewer.id)}
                            title="Approve"
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300 dark:text-red-400 dark:hover:bg-red-950 dark:hover:border-red-700 transition-all"
                            onClick={() => onDenyViewer(viewer.id)}
                            title="Deny"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1 shrink-0 ml-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-300 dark:text-amber-400 dark:hover:bg-amber-950 dark:hover:border-amber-700 transition-all"
                            onClick={() => onSpotlightViewer(viewer.id)}
                            title={spotlightedViewer === viewer.id ? "Unspotlight" : "Spotlight viewer"}
                          >
                            <Star className={`size-3.5 ${spotlightedViewer === viewer.id ? "fill-current" : ""}`} />
                          </Button>
                          {raisedHands.has(viewer.id) ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 transition-all"
                              onClick={() => onHostLowerHand(viewer.id)}
                              title="Lower hand"
                            >
                              <Hand className="size-3.5" />
                            </Button>
                          ) : null}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => onDisconnectViewer(viewer.id)}
                            title="Disconnect viewer"
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
            {/* Animated gradient separator */}
            <div className="gradient-message-separator" />
            <CardFooter className="flex-col gap-2">
              <div className="flex w-full gap-2">
                <Button
                  variant="destructive"
                  className="flex-1 shadow-sm"
                  onClick={onStopSharing}
                >
                  <MonitorUp className="size-4" />
                  Stop Sharing
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={onTogglePause}
                >
                  {isPaused ? (
                    <>
                      <Play className="size-4" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="size-4" />
                      Pause
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* Network Info Panel */}
          <AnimatePresence>
            {showNetworkInfo && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="glass-card overflow-hidden">
                  <CardHeader className="py-3">
                    <div className="flex w-full items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Network className="size-4 text-muted-foreground" />
                        Network Details
                      </CardTitle>
                      <button
                        onClick={() => setShowNetworkInfo(false)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 rounded-lg bg-muted/30 p-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ICE Connection State</p>
                          <p className="mt-0.5 text-sm font-mono font-medium tabular-nums">
                            {iceConnectionInfo.iceConnectionState || "—"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            iceConnectionInfo.iceConnectionState === "connected" || iceConnectionInfo.iceConnectionState === "completed"
                              ? "secondary"
                              : iceConnectionInfo.iceConnectionState === "checking" || iceConnectionInfo.iceConnectionState === "new"
                                ? "outline"
                                : "destructive"
                          }
                          className="shrink-0 text-[10px]"
                        >
                          {iceConnectionInfo.iceConnectionState || "unknown"}
                        </Badge>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Local Candidate</p>
                        <p className="mt-0.5 text-xs font-mono text-muted-foreground break-all leading-relaxed max-h-12 overflow-y-auto">
                          {iceConnectionInfo.localCandidate || "Waiting for ICE candidates..."}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/30 p-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Remote Candidate</p>
                        <p className="mt-0.5 text-xs font-mono text-muted-foreground break-all leading-relaxed max-h-12 overflow-y-auto">
                          {iceConnectionInfo.remoteCandidate || "Waiting for remote candidates..."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Transport Protocol</p>
                          <p className="mt-0.5 text-sm font-mono font-medium tabular-nums">
                            {iceConnectionInfo.transportProtocol || "—"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {iceConnectionInfo.transportProtocol === "udp" ? "UDP" : iceConnectionInfo.transportProtocol === "tcp" ? "TCP" : "—"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Connection Stats Panel */}
          <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
            <Card className="glass-card overflow-hidden">
              <CardHeader className="py-3">
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between group">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="size-4 text-muted-foreground" />
                      Live Stats
                    </CardTitle>
                    <ChevronDown className={`size-4 text-muted-foreground transition-transform duration-300 ${statsOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="stat-card flex flex-col items-center gap-1 p-3 rounded-xl">
                      <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Peers</span>
                      <motion.span
                        key={activePeerCount}
                        initial={{ scale: 1.3, color: "#059669" }}
                        animate={{ scale: 1, color: "inherit" }}
                        transition={{ duration: 0.3 }}
                        className="stat-number stat-sparkle text-lg font-bold tabular-nums tracking-tight"
                      >
                        {activePeerCount}
                      </motion.span>
                    </div>
                    <div className="stat-card flex flex-col items-center gap-1 p-3 rounded-xl">
                      <Zap className="size-4 text-yellow-500 dark:text-yellow-400" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Bitrate</span>
                      <span className="stat-number text-sm font-bold tabular-nums tracking-tight">{formatBitrate(currentBitrate)}</span>
                    </div>
                    <div className="stat-card flex flex-col items-center gap-1 p-3 rounded-xl">
                      <Monitor className="size-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Resolution</span>
                      <span className="stat-number text-xs font-bold tabular-nums leading-5 tracking-tight">{streamResolution}</span>
                    </div>
                    <div className="stat-card flex flex-col items-center gap-1 p-3 rounded-xl">
                      <HardDrive className="size-4 text-teal-500 dark:text-teal-400" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data Sent</span>
                      <span className="stat-number text-xs font-bold tabular-nums leading-5 tracking-tight">{formatBytes(estimatedDataTransferred)}</span>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>

      {/* ─── Session Statistics Dashboard Dialog ─────────────────────────── */}
      <Dialog open={dashboardOpen} onOpenChange={setDashboardOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
              Session Statistics
            </DialogTitle>
            <DialogDescription>
              Detailed statistics for the current sharing session.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Session Time */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/20 p-4">
              <Clock className="size-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Session Time</span>
              <span className="text-lg font-bold tabular-nums">{formatElapsed(elapsedTime)}</span>
            </div>

            {/* Total Data Transferred */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/20 p-4">
              <HardDrive className="size-5 text-teal-600 dark:text-teal-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Data Sent</span>
              <span className="text-lg font-bold tabular-nums">{formatBytes(estimatedDataTransferred)}</span>
            </div>

            {/* Current Bitrate */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/20 p-4">
              <Zap className="size-5 text-yellow-500 dark:text-yellow-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current Bitrate</span>
              <span className="text-lg font-bold tabular-nums">{formatBitrate(currentBitrate)}</span>
            </div>

            {/* Peak Bitrate */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/20 p-4">
              <TrendingUp className="size-5 text-orange-500 dark:text-orange-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Peak Bitrate</span>
              <span className="text-lg font-bold tabular-nums">{formatBitrate(peakBitrate)}</span>
            </div>

            {/* Current Resolution */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/20 p-4">
              <Maximize2 className="size-5 text-blue-500 dark:text-blue-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Resolution</span>
              <span className="text-lg font-bold tabular-nums leading-6">{streamResolution}</span>
            </div>

            {/* Viewers */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/20 p-4">
              <Users className="size-5 text-teal-600 dark:text-teal-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Viewers</span>
              <span className="text-lg font-bold tabular-nums">
                {activePeerCount}<span className="text-sm font-normal text-muted-foreground">/{viewers.length}</span>
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/20 p-4">
              <MessageSquare className="size-5 text-indigo-500 dark:text-indigo-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Chat Messages</span>
              <span className="text-lg font-bold tabular-nums">{totalChatMessages}</span>
            </div>

            {/* Reactions */}
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/20 p-4">
              <Heart className="size-5 text-rose-500 dark:text-rose-400" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Reactions</span>
              <span className="text-lg font-bold tabular-nums">{totalReactions}</span>
            </div>
          </div>

          {isAutoQualityActive && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <Info className="size-3.5 shrink-0" />
              Auto quality adaptation is active — bitrate adjusts based on connection quality.
            </div>
          )}

          {/* Export Stats Button */}
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => {
                const json = exportSessionStats();
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                const now = new Date();
                const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
                a.href = url;
                a.download = `localcast-stats-${roomId}-${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success("Stats exported!");
              }}
            >
              <TrendingUp className="size-3" />
              Export Stats
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
