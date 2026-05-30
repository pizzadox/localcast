"use client";

// ─── ShareActiveView ─────────────────────────────────────────────────────
// Active screen sharing view showing room code, preview, viewer list,
// stats panel, and stop button.

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
} from "lucide-react";

import { useState } from "react";
import { pageVariants, formatBytes } from "./types";
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
  onCopyRoomCode,
  onShowQrDialog,
  onApproveViewer,
  onDenyViewer,
  onDisconnectViewer,
  onStopSharing,
}: ShareActiveViewProps) {
  const [statsOpen, setStatsOpen] = useState(false);

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
          {/* Room Code Card with animated gradient border when sharing */}
          <div className="relative rounded-xl p-[2px]" style={{
            background: "conic-gradient(from 0deg, #10b981, #059669, #14b8a6, #10b981)",
            animation: "spin 3s linear infinite",
          }}>
            <Card className="relative rounded-[10px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wifi className="size-5 text-emerald-600 dark:text-emerald-400" />
                  Room Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-950/50">
                    <span className="room-code-display text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                      {roomId}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onCopyRoomCode}
                      className="size-10"
                      title="Copy room code"
                    >
                      {copied ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onShowQrDialog}
                      className="size-10"
                      title="Show QR code"
                    >
                      <QrCode className="size-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Share this code or scan the QR code to join
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Monitor className="size-5 text-muted-foreground" />
                Stream Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border bg-black">
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
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-teal-600 dark:text-teal-400" />
                  Viewers
                </div>
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={viewers.length}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  >
                    <Badge variant="secondary">{viewers.length}</Badge>
                  </motion.div>
                </AnimatePresence>
              </CardTitle>
              <CardDescription>
                {viewers.length === 0
                  ? "No viewers connected yet"
                  : `${viewers.length} viewer${viewers.length > 1 ? "s" : ""} connected`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {viewers.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                  {/* Scanning rings animation */}
                  <div className="relative mb-2 flex size-12 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
                    <span className="absolute inset-2 animate-pulse rounded-full border-2 border-dashed border-emerald-400/30" />
                    <span className="absolute inset-4 animate-pulse rounded-full border-2 border-dashed border-emerald-400/20" style={{ animationDelay: "0.5s" }} />
                    <Users className="size-8 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Waiting for viewers...
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
                  {viewers.map((viewer) => (
                    <div
                      key={viewer.id}
                      className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                        viewer.approved
                          ? "border-l-4 border-l-emerald-500"
                          : "border-l-4 border-l-yellow-500"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
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
                            {viewer.screenWidth && viewer.screenHeight && (
                              <span className="text-[10px] text-muted-foreground">
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
                            className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                            onClick={() => onApproveViewer(viewer.id)}
                            title="Approve"
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
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
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onDisconnectViewer(viewer.id)}
                          title="Disconnect viewer"
                        >
                          <X className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button
                variant="destructive"
                className="w-full"
                onClick={onStopSharing}
              >
                <MonitorUp className="size-4" />
                Stop Sharing
              </Button>
            </CardFooter>
          </Card>

          {/* Feature: Connection Stats Panel */}
          <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
            <Card>
              <CardHeader className="py-3">
                <CollapsibleTrigger asChild>
                  <button className="flex w-full items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <BarChart3 className="size-4 text-muted-foreground" />
                      Connection Stats
                    </CardTitle>
                    <ChevronDown className={`size-4 text-muted-foreground transition-transform ${statsOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="stat-card flex flex-col items-center gap-1 p-3">
                      <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-medium text-muted-foreground">Peers</span>
                      <span className="text-lg font-bold tabular-nums">{activePeerCount}</span>
                    </div>
                    <div className="stat-card flex flex-col items-center gap-1 p-3">
                      <Monitor className="size-4 text-teal-600 dark:text-teal-400" />
                      <span className="text-xs font-medium text-muted-foreground">Resolution</span>
                      <span className="text-xs font-bold tabular-nums leading-5">{streamResolution}</span>
                    </div>
                    <div className="stat-card flex flex-col items-center gap-1 p-3">
                      <BarChart3 className="size-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-muted-foreground">Est. Data</span>
                      <span className="text-xs font-bold tabular-nums leading-5">{formatBytes(estimatedDataTransferred)}</span>
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
