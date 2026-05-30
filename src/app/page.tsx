"use client";

// ─── Page (Orchestrator) ─────────────────────────────────────────────────
// Slim orchestrator that imports the useLocalCast hook and all view
// sub-components. Handles layout (header, footer, dialogs) and delegates
// each view's content to its dedicated component.

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
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
  Volume2,
  VolumeX,
  User,
  Lightbulb,
} from "lucide-react";
import { toast } from "sonner";

import type { View } from "@/components/localcast/types";
import { formatElapsed } from "@/components/localcast/types";
import { useLocalCast } from "@/components/localcast/use-localcast";
import type { IceConnectionInfo } from "@/components/localcast/use-localcast";
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
      <span className={`inline-block size-2.5 rounded-full ${colors[status]} ${status === "connected" ? "status-dot-pulse" : ""}`} />
      <span className={`text-sm ${status === "connected" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>{labels[status]}</span>
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
            animate={{ opacity: 1, scale: 1.2, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -30 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 20 }}
            className="text-2xl drop-shadow-lg"
          >
            {r.emoji}
            <span
              className="absolute inset-0 text-2xl opacity-40 blur-[1px]"
              style={{ animation: "reaction-trail 0.8s ease-out forwards" }}
            >
              {r.emoji}
            </span>
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
    shareMode,
    setShareMode,
    // Room Password
    roomPassword,
    setRoomPassword,
    roomRequiresPassword,
    joinPassword,
    setJoinPassword,
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
    // Recording
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    // Display Name
    displayName,
    setDisplayName,
    // Sound
    soundEnabled,
    setSoundEnabled,
    // Connection Log
    connectionLog,
    // Auto Quality
    isAutoQualityActive,
    // Per-Viewer Quality
    viewerQualities,
    // Session Statistics
    peakBitrate,
    totalChatMessages,
    totalReactions,
    // Network Info
    iceConnectionInfo,
    showNetworkInfo,
    setShowNetworkInfo,
    // Pause/Resume
    isPaused,
    togglePause,
    // Max Viewers
    maxViewers,
    setMaxViewers,
    // Connection Health
    connectionHealthScore,
    // Export Session Stats
    exportSessionStats,
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
 changePassword,
    cleanupAll,
    // Annotations / Whiteboard
    showAnnotationOverlay,
    setShowAnnotationOverlay,
    annotationTool,
    setAnnotationTool,
    annotationColor,
    setAnnotationColor,
    sendAnnotation,
    annotations,
    clearAnnotations,
    annotationCanvasRef,
    // Viewer Spotlight
    spotlightedViewer,
    spotlightViewer,
    // Session Theme
    roomTheme,
    setRoomTheme,
    // Connection Speed Test
    speedTestResult,
    connectionSpeedTest,
    // Viewer Hand Raise
    raisedHands,
    raiseHand,
    lowerHand,
    hostLowerHand,
  } = useLocalCast();

  const isSession = isSharing || currentView === "watching";

  // ── Feature 2: Auto-join from URL param ?join=CODE ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get("join");
    if (joinCode && joinCode.length === 6) {
      const cleanCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (cleanCode.length === 6) {
        setViewerInput(cleanCode);
        setCurrentView("join");
        // Auto-join after a brief delay so UI renders first
        const timer = setTimeout(() => {
          joinRoom(cleanCode);
          toast.info("Joining room from link...");
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  return (
    <div className="page-dot-grid min-h-screen flex flex-col bg-background">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <header className="header-border-glow sticky top-0 z-40 w-full border-b border-b-emerald-100/50 dark:border-b-emerald-900/30 bg-background/80 backdrop-blur-md header-gradient-shift"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8), rgba(240,253,245,0.85))",
          backgroundSize: "200% 100%",
          animation: "header-shift 8s ease-in-out infinite",
        }}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-4">
          <button
            onClick={() => {
              if (currentView !== "home") {
                cleanupAll();
                setCurrentView("home");
              }
            }}
            className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
          >
            <div className={`flex size-7 items-center justify-center rounded-lg gradient-emerald ${isSharing ? "logo-pulse-active" : ""}`}>
              <Monitor className="size-4 text-white" />
            </div>
            <span className="text-gradient text-lg font-bold">LocalCast</span>
          </button>

          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Name Editor (during active sessions) */}
            {isSession && (
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-1">
                <User className="size-3 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                  className="w-20 bg-transparent text-xs font-medium outline-none placeholder:text-muted-foreground/50"
                  placeholder="Your name"
                  aria-label="Display name"
                />
              </div>
            )}
            {currentView !== "home" && currentView !== "join" && (
              <StatusDot status={connectionStatus} />
            )}
            {currentView === "share" && isSharing && (
              <>
                <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 sm:gap-1.5">
                  <MonitorUp className="size-3" />
                  <span className="hidden sm:inline">Live</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="gap-0.5 font-mono text-[10px] sm:gap-1 sm:text-xs tabular-nums"
                >
                  <Timer className="size-3" />
                  {formatElapsed(elapsedTime)}
                </Badge>
              </>
            )}
            {currentView === "watching" && (
              <Badge variant="secondary" className="gap-1 bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 sm:gap-1.5">
                <Eye className="size-3" />
                <span className="hidden xs:inline">Watching</span>
              </Badge>
            )}
            {/* Connection Tips Button — hidden on mobile */}
            {currentView === "watching" && connectionQuality === "poor" && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex size-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                onClick={() => {
                  toast.warning("Connection Tips", {
                    description: "• Try refreshing the page\n• Make sure both devices are on the same network\n• Check if a firewall is blocking connections\n• Try reducing other network usage",
                    duration: 10000,
                    id: "connection-tips-manual",
                  });
                }}
                title="Connection troubleshooting tips"
              >
                <Lightbulb className="size-4" />
              </Button>
            )}
            {/* Chat Toggle Button */}
            {isSession && (
              <Button
                variant="ghost"
                size="icon"
                className="relative size-8 min-w-[32px] min-h-[32px]"
                onClick={() => {
                  setShowChatPanel(!showChatPanel);
                }}
                title={showChatPanel ? "Hide chat (C)" : "Show chat (C)"}
              >
                <MessageSquare className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white notification-badge">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            )}
            {/* Sound Toggle Button */}
            {isSession && (
              <Button
                variant="ghost"
                size="icon"
                className={`size-8 min-w-[32px] min-h-[32px] ${!soundEnabled ? "text-muted-foreground" : ""}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? "Mute sounds" : "Enable sounds"}
              >
                {soundEnabled ? (
                  <Volume2 className="size-4" />
                ) : (
                  <VolumeX className="size-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 min-w-[32px] min-h-[32px]"
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
      <main className="ambient-glow flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {currentView === "home" && (
            <HomeView
              key="home"
              onNavigate={(view: View) => {
                setError(null);
                setCurrentView(view);
              }}
              onClearError={() => setError(null)}
            />
          )}

          {currentView === "share" && !isSharing && (
            <ShareSetupView
              key="share-setup"
              onStartSharing={startSharing}
              requireApproval={requireApproval}
              onToggleApproval={setRequireApproval}
              qualityPreset={qualityPreset}
              onQualityChange={setQualityPreset}
              shareMode={shareMode}
              onShareModeChange={setShareMode}
              roomPassword={roomPassword}
              onRoomPasswordChange={setRoomPassword}
              maxViewers={maxViewers}
              onMaxViewersChange={setMaxViewers}
              roomTheme={roomTheme}
              onRoomThemeChange={setRoomTheme}
              speedTestResult={speedTestResult}
              onConnectionSpeedTest={connectionSpeedTest}
              error={error}
              onBack={() => {
                setCurrentView("home");
                setError(null);
              }}
            />
          )}

          {currentView === "share" && isSharing && (
            <ShareActiveView
              key="share-active"
              roomId={roomId}
              viewers={viewers}
              viewerQualities={viewerQualities}
              requireApproval={requireApproval}
              copied={copied}
              previewVideoRef={previewVideoRef}
              activePeerCount={activePeerCount}
              estimatedDataTransferred={estimatedDataTransferred}
              streamResolution={streamResolution}
              currentBitrate={currentBitrate}
              elapsedTime={elapsedTime}
              connectionLog={connectionLog}
              isAutoQualityActive={isAutoQualityActive}
              peakBitrate={peakBitrate}
              totalChatMessages={totalChatMessages}
              totalReactions={totalReactions}
              iceConnectionInfo={iceConnectionInfo}
              showNetworkInfo={showNetworkInfo}
              setShowNetworkInfo={setShowNetworkInfo}
              isPaused={isPaused}
              connectionHealthScore={connectionHealthScore}
              onTogglePause={togglePause}
              onCopyRoomCode={copyRoomCode}
              onShowQrDialog={() => setShowQrDialog(true)}
              onApproveViewer={approveViewer}
              onDenyViewer={denyViewer}
              onDisconnectViewer={disconnectViewer}
              onSpotlightViewer={spotlightViewer}
              onHostLowerHand={hostLowerHand}
              spotlightedViewer={spotlightedViewer}
              raisedHands={raisedHands}
              onStopSharing={stopSharing}
              showAnnotationOverlay={showAnnotationOverlay}
              setShowAnnotationOverlay={setShowAnnotationOverlay}
              annotationTool={annotationTool}
              setAnnotationTool={setAnnotationTool}
              annotationColor={annotationColor}
              setAnnotationColor={setAnnotationColor}
              annotations={annotations}
              clearAnnotations={clearAnnotations}
              annotationCanvasRef={annotationCanvasRef}
            />
          )}

          {currentView === "join" && (
            <JoinView
              key="join"
              viewerInput={viewerInput}
              onViewerInputChange={(v) => {
                setViewerInput(v);
              }}
              onJoinRoom={joinRoom}
              onClearError={() => setError(null)}
              error={error}
              waitingApproval={waitingApproval}
              roomRequiresPassword={roomRequiresPassword}
              joinPassword={joinPassword}
              onJoinPasswordChange={setJoinPassword}
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
              key="watching"
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
              isPaused={isPaused}
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              connectionHealthScore={connectionHealthScore}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
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
              annotations={annotations}
              annotationCanvasRef={annotationCanvasRef}
              onRaiseHand={raiseHand}
              onLowerHand={lowerHand}
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
        className="relative mt-auto border-t border-t-emerald-100/30 dark:border-t-emerald-900/20 footer-gradient-animate"
      >
        {/* Animated wave decoration at top of footer */}
        <div className="absolute -top-[19px] left-0 right-0 overflow-hidden pointer-events-none">
          <svg viewBox="0 0 240 20" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-5">
            <path
              d="M0,12 Q30,4 60,12 T120,12 T180,12 T240,12 L240,20 L0,20 Z"
              fill="rgba(5, 150, 105, 0.04)"
            />
            <path
              d="M0,14 Q30,8 60,14 T120,14 T180,14 T240,14 L240,20 L0,20 Z"
              fill="rgba(13, 148, 136, 0.03)"
            />
          </svg>
        </div>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Monitor className="size-3" />
            <span className="font-medium">LocalCast</span>
            <span className="text-muted-foreground/50">v1.0.3</span>
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <Shield className="size-3" />
            <span>Peer-to-peer · No data leaves your network</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="hidden sm:inline-block kbd-gradient text-[10px]">C</kbd>
            <span className="hidden sm:inline">Chat</span>
            <span className="text-muted-foreground/30">·</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6 rounded-md transition-all duration-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400"
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
        <DialogContent className="sm:max-w-sm dialog-corner-deco rounded-xl">
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
            <div className="rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 shadow-lg shadow-emerald-500/10 dark:border-emerald-800 dark:from-emerald-950/80 dark:via-emerald-950/50 dark:to-teal-950/40 qr-glow">
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
