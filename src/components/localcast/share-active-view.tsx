"use client";

// ─── ShareActiveView ─────────────────────────────────────────────────────
// Active screen sharing view with room code, preview, viewer list,
// live stats, and controls.

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
} from "lucide-react";

import { useState } from "react";
import { pageVariants, formatBytes, formatBitrate, formatElapsed } from "./types";
import type { ViewerInfo } from "./types";

interface ShareActiveViewProps {
  roomId: string;
  viewers: ViewerInfo[];
  requireApproval: boolean;
  copied: boolean;
  previewVideoRef: React.RefObject<HTMLVideoElement | null>;
  activePeerCount: number;
  estimatedDataTransferred: number;
  streamResolution: string;
  currentBitrate: number;
  elapsedTime: number;
  onCopyRoomCode: () => void;
  onShowQrDialog: () => void;
  onApproveViewer: (viewerId: string) => void;
  onDenyViewer: (viewerId: string) => void;
  onDisconnectViewer: (viewerId: string) => void;
  onStopSharing: () => void;
}

export function ShareActiveView({
  roomId,
  viewers,
  requireApproval,
  copied,
  previewVideoRef,
  activePeerCount,
  estimatedDataTransferred,
  streamResolution,
  currentBitrate,
  elapsedTime,
  onCopyRoomCode,
  onShowQrDialog,
  onApproveViewer,
  onDenyViewer,
  onDisconnectViewer,
  onStopSharing,
}: ShareActiveViewProps) {
  const [statsOpen, setStatsOpen] = useState(false);

  // Split room code into individual characters for animation
  const codeChars = roomId.split("");

  return (
    <motion.div
      key="share-active"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl px-4 py-6"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Room Info + Controls */}
        <div className="space-y-4 lg:col-span-2">
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
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-emerald-300/60 bg-emerald-50/50 p-4 transition-colors dark:border-emerald-700/60 dark:bg-emerald-950/30">
                  <div className="flex gap-2">
                    {codeChars.map((char, i) => (
                      <motion.span
                        key={`${char}-${i}`}
                        initial={{ opacity: 0, scale: 0.5, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.08, type: "spring", stiffness: 400, damping: 20 }}
                        className="inline-flex size-10 sm:size-12 items-center justify-center rounded-lg bg-emerald-100/80 font-mono text-2xl sm:text-3xl font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                      >
                        {char}
                      </motion.span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
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
                <Badge variant="outline" className="text-[10px] gap-1 bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800">
                  <Radio className="size-2.5" />
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="video-container overflow-hidden rounded-xl border shadow-lg shadow-black/10">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="aspect-video w-full object-contain"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Viewers + Stats */}
        <div className="space-y-4">
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
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-10 text-center bg-muted/10">
                  <div className="relative mb-3 flex size-16 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/10" />
                    <span className="absolute inset-3 animate-pulse rounded-full border-2 border-dashed border-emerald-400/20" />
                    <span className="absolute inset-6 animate-pulse rounded-full border-2 border-dashed border-emerald-400/15" style={{ animationDelay: "0.5s" }} />
                    <Eye className="size-7 text-muted-foreground/30" />
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
                  {viewers.map((viewer) => (
                    <motion.div
                      key={viewer.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      className={`group flex items-center justify-between rounded-xl border p-3 transition-all duration-200 hover:shadow-sm ${
                        viewer.approved
                          ? "border-l-4 border-l-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                          : "border-l-4 border-l-yellow-500 hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                          viewer.approved
                            ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                            : "bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400"
                        }`}>
                          <Monitor className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {viewer.browser} on {viewer.os}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {!viewer.approved && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-300 text-yellow-600 dark:border-yellow-700 dark:text-yellow-400">
                                Pending
                              </Badge>
                            )}
                            {viewer.approved && (
                              <span className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Watching
                              </span>
                            )}
                            {viewer.screenWidth && viewer.screenHeight && (
                              <span className="text-[10px] text-muted-foreground/60">
                                {viewer.screenWidth}×{viewer.screenHeight}
                              </span>
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
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          onClick={() => onDisconnectViewer(viewer.id)}
                          title="Disconnect viewer"
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                variant="destructive"
                className="w-full shadow-sm"
                onClick={onStopSharing}
              >
                <MonitorUp className="size-4" />
                Stop Sharing
              </Button>
            </CardFooter>
          </Card>

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
                        className="stat-number text-lg font-bold tabular-nums"
                      >
                        {activePeerCount}
                      </motion.span>
                    </div>
                    <div className="stat-card flex flex-col items-center gap-1 p-3 rounded-xl">
                      <Zap className="size-4 text-yellow-500 dark:text-yellow-400" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Bitrate</span>
                      <span className="stat-number text-sm font-bold tabular-nums">{formatBitrate(currentBitrate)}</span>
                    </div>
                    <div className="stat-card flex flex-col items-center gap-1 p-3 rounded-xl">
                      <Monitor className="size-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Resolution</span>
                      <span className="stat-number text-xs font-bold tabular-nums leading-5">{streamResolution}</span>
                    </div>
                    <div className="stat-card flex flex-col items-center gap-1 p-3 rounded-xl">
                      <HardDrive className="size-4 text-teal-500 dark:text-teal-400" />
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Data Sent</span>
                      <span className="stat-number text-xs font-bold tabular-nums leading-5">{formatBytes(estimatedDataTransferred)}</span>
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </motion.div>
  );
}
