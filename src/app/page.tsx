"use client";

// ─── Page (Orchestrator) ─────────────────────────────────────────────────
// Slim orchestrator that imports the useLocalCast hook and all view
// sub-components. Handles layout (header, footer, dialogs) and delegates
// each view's content to its dedicated component.

import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "next-themes";
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
  Monitor,
  MonitorUp,
  Eye,
  QrCode,
  Sun,
  Moon,
  Shield,
  Timer,
  HelpCircle,
  MessageSquare,
} from "lucide-react";

import type { View } from "@/components/localcast/types";
import { formatElapsed } from "@/components/localcast/types";
import { useLocalCast } from "@/components/localcast/use-localcast";
import { HomeView } from "@/components/localcast/home-view";
import { ShareSetupView } from "@/components/localcast/share-setup-view";
import { ShareActiveView } from "@/components/localcast/share-active-view";
import { JoinView } from "@/components/localcast/join-view";
import { WatchView } from "@/components/localcast/watch-view";
import { ChatPanel } from "@/components/localcast/chat-panel";
import { ShortcutsDialog } from "@/components/localcast/shortcuts-dialog";

// ─── StatusDot Sub-Component ─────────────────────────────────────────────

function StatusDot({ status }: { status: "disconnected" | "connecting" | "connected" }) {
  const colors = {
    disconnected: "bg-red-500",
    connecting: "bg-yellow-500 dot-pulse",
    connected: "bg-emerald-500",
  };
  const labels = {
    disconnected: "Disconnected",
    connecting: "Connecting...",
    connected: "Connected",
  };
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block size-2.5 rounded-full ${colors[status]}`} />
      <span className="text-sm text-muted-foreground">{labels[status]}</span>
    </div>
  );
}

// ─── Floating Reactions ──────────────────────────────────────────────────

function FloatingReactions({ reactions }: { reactions: { emoji: string; id: string }[] }) {
  return (
    <div className="pointer-events-none fixed bottom-20 right-6 z-50 flex flex-col-reverse gap-1">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            transition={{ duration: 0.4 }}
            className="text-2xl"
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────

export default function Home() {
  const { theme, setTheme } = useTheme();

  const {
    // View state
    currentView,
    setCurrentView,
    // Broadcaster state
    roomId,
    isSharing,
    requireApproval,
    setRequireApproval,
    qualityPreset,
    setQualityPreset,
    // Viewer state
    viewerInput,
    setViewerInput,
    isMuted,
    setIsMuted,
    isFullscreen,
    connectionQuality,
    // Shared state
    connectionStatus,
    viewers,
    error,
    setError,
    showQrDialog,
    setShowQrDialog,
    showShortcutsDialog,
    setShowShortcutsDialog,
    showChatPanel,
    setShowChatPanel,
    copied,
    elapsedTime,
    waitingApproval,
    setWaitingApproval,
    pipSupported,
    activePeerCount,
    estimatedDataTransferred,
    streamResolution,
    latency,
    currentBitrate,
    qrUrl,
    // Chat
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    unreadCount,
    // Reactions
    recentReactions,
    // Refs
    videoRef,
    previewVideoRef,
    containerRef,
    // Actions
    startSharing,
    stopSharing,
    approveViewer,
    denyViewer,
    disconnectViewer,
    joinRoom,
    leaveRoom,
    toggleFullscreen,
    togglePiP,
    copyRoomCode,
    sendReaction,
    cleanupAll,
  } = useLocalCast();

  const isSession = isSharing || currentView === "watching";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <button
            onClick={() => {
              if (currentView !== "home") {
                cleanupAll();
                setCurrentView("home");
              }
            }}
            className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
          >
            <div className="flex size-7 items-center justify-center rounded-lg gradient-emerald">
              <Monitor className="size-4 text-white" />
            </div>
            <span className="text-gradient text-lg font-bold">LocalCast</span>
          </button>

          <div className="flex items-center gap-3">
            {currentView !== "home" && currentView !== "join" && (
              <StatusDot status={connectionStatus} />
            )}
            {currentView === "share" && isSharing && (
              <>
                <Badge variant="secondary" className="gap-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  <MonitorUp className="size-3" />
                  Live
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-1 font-mono text-xs tabular-nums"
                >
                  <Timer className="size-3" />
                  {formatElapsed(elapsedTime)}
                </Badge>
              </>
            )}
            {currentView === "watching" && (
              <Badge variant="secondary" className="gap-1.5 bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <Eye className="size-3" />
                Watching
              </Badge>
            )}
            {/* Chat Toggle Button */}
            {isSession && (
              <Button
                variant="ghost"
                size="icon"
                className="relative size-8"
                onClick={() => {
                  setShowChatPanel(!showChatPanel);
                  // Clear unread when opening
                }}
                title={showChatPanel ? "Hide chat (C)" : "Show chat (C)"}
              >
                <MessageSquare className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title="Toggle theme"
            >
              <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────── */}
      <main className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {currentView === "home" && (
            <HomeView
              onNavigate={(view: View) => {
                setError(null);
                setCurrentView(view);
              }}
              onClearError={() => setError(null)}
            />
          )}

          {currentView === "share" && !isSharing && (
            <ShareSetupView
              onStartSharing={startSharing}
              requireApproval={requireApproval}
              onToggleApproval={setRequireApproval}
              qualityPreset={qualityPreset}
              onQualityChange={setQualityPreset}
              error={error}
              onBack={() => {
                setCurrentView("home");
                setError(null);
              }}
            />
          )}

          {currentView === "share" && isSharing && (
            <ShareActiveView
              roomId={roomId}
              viewers={viewers}
              requireApproval={requireApproval}
              copied={copied}
              previewVideoRef={previewVideoRef}
              activePeerCount={activePeerCount}
              estimatedDataTransferred={estimatedDataTransferred}
              streamResolution={streamResolution}
              currentBitrate={currentBitrate}
              elapsedTime={elapsedTime}
              onCopyRoomCode={copyRoomCode}
              onShowQrDialog={() => setShowQrDialog(true)}
              onApproveViewer={approveViewer}
              onDenyViewer={denyViewer}
              onDisconnectViewer={disconnectViewer}
              onStopSharing={stopSharing}
            />
          )}

          {currentView === "join" && (
            <JoinView
              viewerInput={viewerInput}
              onViewerInputChange={(v) => {
                setViewerInput(v);
              }}
              onJoinRoom={joinRoom}
              onClearError={() => setError(null)}
              error={error}
              waitingApproval={waitingApproval}
              onBack={() => {
                setCurrentView("home");
                setViewerInput("");
                setError(null);
                setWaitingApproval(false);
              }}
            />
          )}

          {currentView === "watching" && (
            <WatchView
              videoRef={videoRef}
              containerRef={containerRef}
              roomId={roomId}
              connectionStatus={connectionStatus}
              connectionQuality={connectionQuality}
              isMuted={isMuted}
              isFullscreen={isFullscreen}
              pipSupported={pipSupported}
              waitingApproval={waitingApproval}
              error={error}
              latency={latency}
              onToggleMute={() => {
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              onTogglePiP={togglePiP}
              onToggleFullscreen={toggleFullscreen}
              onLeaveRoom={leaveRoom}
              onSendReaction={sendReaction}
            />
          )}
        </AnimatePresence>
      </main>

      {/* ─── Chat Panel (Slide-in) ──────────────────────────────────────── */}
      <AnimatePresence>
        {showChatPanel && isSession && (
          <ChatPanel
            messages={chatMessages}
            input={chatInput}
            onInputChange={setChatInput}
            onSend={sendChatMessage}
            isHost={isSharing}
            onClose={() => {
              setShowChatPanel(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Floating Reactions ──────────────────────────────────────────── */}
      {isSharing && <FloatingReactions reactions={recentReactions} />}

      {/* ─── Footer with scroll reveal animation ───────────────────────── */}
      <motion.footer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-auto border-t"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Monitor className="size-3" />
            <span className="font-medium">LocalCast</span>
            <span className="text-muted-foreground/50">v1.0</span>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <Shield className="size-3" />
            <span>Peer-to-peer · No data leaves your network</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">C</kbd>
            <span className="hidden sm:inline">Chat</span>
            <span className="text-muted-foreground/30">·</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => setShowShortcutsDialog(true)}
              title="Keyboard shortcuts"
            >
              <HelpCircle className="size-3.5" />
            </Button>
          </div>
        </div>
      </motion.footer>

      {/* ─── QR Code Dialog ────────────────────────────────────────────── */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="size-5 text-emerald-600 dark:text-emerald-400" />
              Scan to Join
            </DialogTitle>
            <DialogDescription>
              Share this QR code with viewers so they can join your room
              instantly.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-xl border-2 border-emerald-200 bg-white p-4 dark:border-emerald-800 dark:bg-emerald-950/50">
              <QRCodeSVG
                value={qrUrl}
                size={200}
                level="H"
                includeMargin={false}
                fgColor="#059669"
                bgColor="transparent"
              />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Room Code</p>
              <p className="font-mono text-2xl font-bold tracking-wider text-emerald-700 dark:text-emerald-300">
                {roomId}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Keyboard Shortcuts Dialog ──────────────────────────────────── */}
      <ShortcutsDialog
        open={showShortcutsDialog}
        onOpenChange={setShowShortcutsDialog}
      />
    </div>
  );
}
