"use client";

// ─── useLocalCast ─────────────────────────────────────────────────────────
// Core custom hook encapsulating ALL LocalCast state management, WebRTC
// peer connections, Socket.IO signaling, stats monitoring, chat, reactions,
// and cleanup logic.  Returns everything the UI layer (page.tsx) needs.

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type RefObject,
} from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

import type {
  View,
  ConnectionStatus,
  ConnectionQuality,
  Viewer,
  ChatMessage,
  Reaction,
  QualityPreset,
  ConnectionLogEntry,
  ShareMode,
  ViewerConnectionQuality,
  SessionTheme,
  AnnotationTool,
  AnnotationEvent,
  SpeedTestQuality,
  SpeedTestResult,
} from "./types";
import {
  ICE_CONFIG,
  QUALITY_PRESETS,
  SHARE_MODE_CONFIG,
  parseDeviceInfo,
  generateId,
  playNotificationSound,
} from "./types";

// ─── Hook Return Type ────────────────────────────────────────────────────

export interface IceConnectionInfo {
  localCandidate: string;
  remoteCandidate: string;
  transportProtocol: string;
  iceConnectionState: string;
}

export interface UseLocalCastReturn {
  // View
  currentView: View;
  setCurrentView: (v: View) => void;

  // Broadcaster
  roomId: string;
  isSharing: boolean;
  requireApproval: boolean;
  setRequireApproval: (v: boolean) => void;
  qualityPreset: QualityPreset;
  setQualityPreset: (v: QualityPreset) => void;
  shareMode: ShareMode;
  setShareMode: (v: ShareMode) => void;

  // Room Password
  roomPassword: string;
  setRoomPassword: (v: string) => void;
  roomRequiresPassword: boolean;
  joinPassword: string;
  setJoinPassword: (v: string) => void;

  // Viewer
  viewerInput: string;
  setViewerInput: (v: string) => void;
  isMuted: boolean;
  setIsMuted: (v: boolean) => void;
  isFullscreen: boolean;
  connectionQuality: ConnectionQuality;

  // Shared
  connectionStatus: ConnectionStatus;
  viewers: Viewer[];
  error: string | null;
  setError: (e: string | null) => void;
  showQrDialog: boolean;
  setShowQrDialog: (v: boolean) => void;
  showShortcutsDialog: boolean;
  setShowShortcutsDialog: (v: boolean) => void;
  showChatPanel: boolean;
  setShowChatPanel: (v: boolean) => void;
  copied: boolean;
  elapsedTime: number;
  waitingApproval: boolean;
  setWaitingApproval: (v: boolean) => void;
  pipSupported: boolean;
  activePeerCount: number;
  estimatedDataTransferred: number;
  streamResolution: string;
  latency: number;
  currentBitrate: number;
  qrUrl: string;

  // Chat
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  sendChatMessage: () => void;
  unreadCount: number;

  // Reactions
  recentReactions: Reaction[];

  // Recording
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => void;
  stopRecording: () => void;

  // Display Name
  displayName: string;
  setDisplayName: (name: string) => void;

  // Sound
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;

  // Connection Log
  connectionLog: ConnectionLogEntry[];

  // Auto Quality
  isAutoQualityActive: boolean;

  // Per-Viewer Connection Quality
  viewerQualities: Record<string, ViewerConnectionQuality>;

  // Session Statistics
  peakBitrate: number;
  totalChatMessages: number;
  totalReactions: number;
  showStatsDashboard: boolean;
  setShowStatsDashboard: (v: boolean) => void;

  // Network Info
  iceConnectionInfo: IceConnectionInfo;
  showNetworkInfo: boolean;
  setShowNetworkInfo: (v: boolean) => void;

  // Pause/Resume
  isPaused: boolean;
  togglePause: () => void;

  // Max Viewers
  maxViewers: number;
  setMaxViewers: (v: number) => void;

  // Connection Health
  connectionHealthScore: number;

  // Export Session Stats
  exportSessionStats: () => string;

  // Annotations / Whiteboard
  showAnnotationOverlay: boolean;
  setShowAnnotationOverlay: (v: boolean) => void;
  annotationTool: AnnotationTool;
  setAnnotationTool: (v: AnnotationTool) => void;
  annotationColor: string;
  setAnnotationColor: (v: string) => void;
  sendAnnotation: (annotation: AnnotationEvent) => void;
  annotations: AnnotationEvent[];
  clearAnnotations: () => void;
  annotationCanvasRef: RefObject<HTMLCanvasElement | null>;

  // Viewer Spotlight
  spotlightedViewer: string | null;
  spotlightViewer: (viewerId: string) => void;

  // Session Theme
  roomTheme: SessionTheme;
  setRoomTheme: (v: SessionTheme) => void;

  // Connection Speed Test
  speedTestResult: SpeedTestResult;
  connectionSpeedTest: () => Promise<void>;

  // Viewer Hand Raise
  raisedHands: Set<string>;
  raiseHand: () => void;
  lowerHand: () => void;
  hostLowerHand: (viewerId: string) => void;

  // Refs
  videoRef: RefObject<HTMLVideoElement | null>;
  previewVideoRef: RefObject<HTMLVideoElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;

  // Actions
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  approveViewer: (viewerId: string) => void;
  denyViewer: (viewerId: string) => void;
  disconnectViewer: (viewerId: string) => void;
  joinRoom: (roomId?: string) => void;
  leaveRoom: () => void;
  toggleFullscreen: () => void;
  togglePiP: () => Promise<void>;
  copyRoomCode: () => Promise<void>;
  sendReaction: (emoji: string) => void;
  changePassword: (newPassword: string) => void;
  cleanupAll: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useLocalCast(): UseLocalCastReturn {
  // ═══════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════

  // ── View ──
  const [currentView, setCurrentView] = useState<View>("home");

  // ── Broadcaster ──
  const [roomId, setRoomId] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("medium");
  const [shareMode, setShareMode] = useState<ShareMode>("screen");
  const [maxViewers, setMaxViewers] = useState(0); // 0 = unlimited

  // ── Room Password ──
  const [roomPassword, setRoomPassword] = useState("");
  const [roomRequiresPassword, setRoomRequiresPassword] = useState(false);
  const [joinPassword, setJoinPassword] = useState("");

  // ── Viewer ──
  const [viewerInput, setViewerInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] =
    useState<ConnectionQuality>("good");
  const [latency, setLatency] = useState(0);

  // ── Shared ──
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);

  // ── Session Timer ──
  const [elapsedTime, setElapsedTime] = useState(0);
  const shareStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Connection Stats ──
  const [streamResolution, setStreamResolution] = useState("---");
  const [currentBitrate, setCurrentBitrate] = useState(0);
  const [estimatedDataTransferred, setEstimatedDataTransferred] =
    useState(0);

  // ── Chat ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Reactions ──
  const [recentReactions, setRecentReactions] = useState<Reaction[]>([]);

  // ── Recording ──
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Display Name ──
  const [displayName, setDisplayNameState] = useState(() => {
    if (typeof window === "undefined") return "";
    const saved = localStorage.getItem("localcast-display-name");
    if (saved) return saved;
    return parseDeviceInfo(navigator.userAgent).deviceName;
  });
  const setDisplayName = useCallback((name: string) => {
    setDisplayNameState(name);
    if (typeof window !== "undefined") {
      localStorage.setItem("localcast-display-name", name);
    }
  }, []);

  // ── Sound ──
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem("localcast-sound-enabled");
    return saved !== "false";
  });

  // ── Connection Log ──
  const [connectionLog, setConnectionLog] = useState<ConnectionLogEntry[]>([]);
  const addConnectionLog = useCallback((type: ConnectionLogEntry["type"], message: string) => {
    setConnectionLog((prev) => [
      ...prev.slice(-49),
      { id: generateId(), type, message, timestamp: Date.now() },
    ]);
  }, []);

  // ── Auto Quality ──
  const [isAutoQualityActive, setIsAutoQualityActive] = useState(false);
  const autoQualityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poorQualitySinceRef = useRef<number>(0);
  const goodQualitySinceRef = useRef<number>(0);

  // ── Per-Viewer Connection Quality ──
  const [viewerQualities, setViewerQualities] = useState<Record<string, ViewerConnectionQuality>>({});

  // ── Session Statistics ──
  const peakBitrateRef = useRef(0);
  const [peakBitrate, setPeakBitrate] = useState(0);
  const totalChatMessagesRef = useRef(0);
  const [totalChatMessages, setTotalChatMessages] = useState(0);
  const totalReactionsRef = useRef(0);
  const [totalReactions, setTotalReactions] = useState(0);
  const [showStatsDashboard, setShowStatsDashboard] = useState(false);

  // ── Network Info ──
  const [iceConnectionInfo, setIceConnectionInfo] = useState<IceConnectionInfo>({
    localCandidate: "",
    remoteCandidate: "",
    transportProtocol: "",
    iceConnectionState: "",
  });
  const [showNetworkInfo, setShowNetworkInfo] = useState(false);

  // ── Pause/Resume ──
  const [isPaused, setIsPaused] = useState(false);

  // ── Connection Health ──
  const [connectionHealthScore, setConnectionHealthScore] = useState(100);
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Troubleshooting ──
  const troubleshootingToastShownRef = useRef(false);
  const poorQualityViewerSinceRef = useRef<number>(0);

  // ── Annotations / Whiteboard ──
  const [showAnnotationOverlay, setShowAnnotationOverlay] = useState(false);
  const [annotationTool, setAnnotationTool] = useState<AnnotationTool>("pen");
  const [annotationColor, setAnnotationColor] = useState("#ef4444");
  const [annotations, setAnnotations] = useState<AnnotationEvent[]>([]);
  const annotationCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // ── Viewer Spotlight ──
  const [spotlightedViewer, setSpotlightedViewer] = useState<string | null>(null);

  // ── Session Theme ──
  const [roomTheme, setRoomThemeState] = useState<SessionTheme>("default");
  const setRoomTheme = useCallback((theme: SessionTheme) => {
    setRoomThemeState(theme);
  }, []);

  // ── Connection Speed Test ──
  const [speedTestResult, setSpeedTestResult] = useState<SpeedTestResult>({
    latencyMs: 0,
    quality: "idle",
    timestamp: 0,
  });

  // ── Viewer Hand Raise ──
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());

  // ═══════════════════════════════════════════════════════════════════════
  // REFS
  // ═══════════════════════════════════════════════════════════════════════

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map(),
  );
  const viewerPeerRef = useRef<RTCPeerConnection | null>(null);
  const hostIdRef = useRef("");

  // ── Reconnection ──
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalDisconnectRef = useRef(false);

  // ── Latency ──
  const lastPingRef = useRef(0);

  // ── Stats ──
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Session start time for export ──
  const shareStartExportRef = useRef<number>(0);
  const prevBytesSentRef = useRef<Map<string, number>>(new Map());
  const totalBytesSentRef = useRef(0);

  // ── Recording Actions ──
  const startRecording = useCallback(() => {
    if (!videoRef.current?.srcObject) {
      toast.error("No stream available to record");
      return;
    }
    try {
      const stream = videoRef.current.srcObject as MediaStream;
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp8,opus",
      });
      recordingChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
        a.href = url;
        a.download = `localcast-recording-${dateStr}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        recordingChunksRef.current = [];
        toast.success("Recording saved!");
      };

      recorder.onerror = () => {
        toast.error("Recording error occurred");
        setIsRecording(false);
        setRecordingDuration(0);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(Date.now() - recordingStartRef.current);
      }, 1000);

      toast.info("Recording started");
    } catch {
      toast.error("Recording is not supported in this browser");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // ── Auto Quality: adjust bitrate on all peers ──
  const applyBitrateToAllPeers = useCallback((bitrate: number) => {
    peersRef.current.forEach((pc) => {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track?.kind === "video");
      if (videoSender) {
        try {
          const params = videoSender.getParameters();
          if (!params.encodings) params.encodings = [{}];
          params.encodings[0].maxBitrate = bitrate;
          videoSender.setParameters(params);
        } catch {
          // Ignore setParameters errors
        }
      }
    });
  }, []);

  // ── Pause/Resume Toggle ──
  const togglePause = useCallback(() => {
    if (!socketRef.current?.connected || !roomId) return;

    if (!isPaused) {
      // Pause: disable video tracks on all peer connections
      peersRef.current.forEach((pc) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === "video") {
            sender.track.enabled = false;
          }
        });
      });
      // Also disable local stream track for preview
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = false;
        });
      }
      socketRef.current.emit("PAUSE_STREAM", { roomId });
      setIsPaused(true);
      toast.info("Screen sharing paused");
      addConnectionLog("quality_change", "Stream paused by host");
    } else {
      // Resume: re-enable video tracks
      peersRef.current.forEach((pc) => {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === "video") {
            sender.track.enabled = true;
          }
        });
      });
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((t) => {
          t.enabled = true;
        });
      }
      socketRef.current.emit("RESUME_STREAM", { roomId });
      setIsPaused(false);
      toast.success("Screen sharing resumed");
      addConnectionLog("quality_change", "Stream resumed by host");
    }
  }, [isPaused, roomId, addConnectionLog]);

  // ── Change Password ──
  const changePassword = useCallback((newPassword: string) => {
    if (!socketRef.current?.connected || !roomId) return;
    socketRef.current.emit("CHANGE_PASSWORD", { roomId, password: newPassword });
    setRoomPassword(newPassword);
    toast.success(newPassword ? "Room password updated" : "Room password removed");
  }, [roomId]);

  // ── Send Annotation (host → server → viewers) ──
  const sendAnnotation = useCallback((annotation: AnnotationEvent) => {
    if (!socketRef.current?.connected || !roomId) return;
    socketRef.current.emit("ANNOTATION", { roomId, annotation });
  }, [roomId]);

  // ── Clear Annotations ──
  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    if (socketRef.current?.connected && roomId) {
      const clearEvent: AnnotationEvent = { type: "clear", points: [], color: "", width: 0, tool: "pen" };
      socketRef.current.emit("ANNOTATION", { roomId, annotation: clearEvent });
    }
    const canvas = annotationCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [roomId]);

  // ── Spotlight Viewer (host action) ──
  const spotlightViewer = useCallback((viewerId: string) => {
    if (!socketRef.current?.connected || !roomId) return;
    setSpotlightedViewer((prev) => prev === viewerId ? null : viewerId);
    socketRef.current.emit("SPOTLIGHT_VIEWER", { roomId, viewerId });
  }, [roomId]);

  // ── Connection Speed Test ──
  const connectionSpeedTest = useCallback(async () => {
    setSpeedTestResult({ latencyMs: 0, quality: "testing", timestamp: Date.now() });

    // Create a temporary socket for the speed test
    try {
      const testSocket = io("/?XTransformPort=3003", {
        reconnection: false,
        timeout: 10000,
      });

      const pings: number[] = [];

      await new Promise<void>((resolve) => {
        testSocket.on("connect", () => {
          let count = 0;
          const maxPings = 5;

          const doPing = () => {
            if (count >= maxPings) {
              testSocket.disconnect();
              resolve();
              return;
            }
            const start = Date.now();
            testSocket.emit("PING", () => {
              const rt = Date.now() - start;
              pings.push(rt);
              count++;
              setTimeout(doPing, 100);
            });
          };
          doPing();
        });

        testSocket.on("connect_error", () => {
          testSocket.disconnect();
          resolve();
        });
      });

      if (pings.length > 0) {
        const avgLatency = Math.round(pings.reduce((a, b) => a + b, 0) / pings.length);
        let quality: SpeedTestQuality;
        if (avgLatency < 50) quality = "excellent";
        else if (avgLatency < 100) quality = "good";
        else if (avgLatency < 200) quality = "fair";
        else quality = "poor";

        setSpeedTestResult({ latencyMs: avgLatency, quality, timestamp: Date.now() });
        toast.success(`Connection: ${quality.charAt(0).toUpperCase() + quality.slice(1)} (${avgLatency}ms avg)`);
      } else {
        setSpeedTestResult({ latencyMs: 0, quality: "poor", timestamp: Date.now() });
        toast.error("Could not reach signaling server");
      }
    } catch {
      setSpeedTestResult({ latencyMs: 0, quality: "poor", timestamp: Date.now() });
      toast.error("Speed test failed");
    }
  }, []);

  // ── Raise Hand (viewer action) ──
  const raiseHand = useCallback(() => {
    if (!socketRef.current?.connected || !roomId) return;
    socketRef.current.emit("RAISE_HAND", { roomId });
    toast.info("Hand raised ✋");
  }, [roomId]);

  // ── Lower Hand (viewer action) ──
  const lowerHand = useCallback(() => {
    if (!socketRef.current?.connected || !roomId) return;
    socketRef.current.emit("LOWER_HAND", { roomId });
  }, [roomId]);

  // ── Host Lower Hand (host action) ──
  const hostLowerHand = useCallback((viewerId: string) => {
    if (!socketRef.current?.connected || !roomId) return;
    socketRef.current.emit("HOST_LOWER_HAND", { roomId, viewerId });
    setRaisedHands((prev) => {
      const next = new Set(prev);
      next.delete(viewerId);
      return next;
    });
    toast.info("Hand lowered");
  }, [roomId]);

  // ── Derived ──
  const activePeerCount = viewers.filter((v) => v.approved).length;
  const pipSupported =
    typeof document !== "undefined" &&
    !!document.pictureInPictureEnabled;

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}?join=${roomId}`
      : "";

  // ═══════════════════════════════════════════════════════════════════════
  // SOCKET.IO — Get / Create
  // ═══════════════════════════════════════════════════════════════════════

  const getOrCreateSocket = useCallback((): Socket => {
    if (socketRef.current) return socketRef.current;

    intentionalDisconnectRef.current = false;
    const socket = io("/?XTransformPort=3003", {
      reconnection: false,
      timeout: 10000,
    });

    // Auto-reconnect with exponential backoff
    socket.on("connect", () => {
      reconnectAttemptRef.current = 0;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    });

    socket.on("disconnect", (reason) => {
      if (!intentionalDisconnectRef.current) {
        // Only auto-reconnect when we believe we're in an active session
        // We check the refs to avoid stale closures
        const sharing = isSharing;
        const view = currentView;
        if (sharing || view === "watching" || view === "join") {
          const attempt = reconnectAttemptRef.current;
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          reconnectAttemptRef.current = attempt + 1;

          toast.warning(
            `Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`,
            { id: "localcast-reconnect" },
          );

          reconnectTimerRef.current = setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              socketRef.current.connect();
            }
          }, delay);
        }
      }
    });

    // PONG latency handler (always attached)
    socket.on("PONG", () => {
      if (lastPingRef.current > 0) {
        setLatency(Date.now() - lastPingRef.current);
        lastPingRef.current = 0;
      }
    });

    socketRef.current = socket;
    return socket;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // SOCKET.IO — Remove All Custom Listeners
  // ═══════════════════════════════════════════════════════════════════════

  const removeAllListeners = useCallback((socket: Socket) => {
    const events = [
      "connect",
      "disconnect",
      "connect_error",
      "ROOM_CREATED",
      "ROOM_JOINED",
      "ROOM_NOT_FOUND",
      "ROOM_PASSWORD_REQUIRED",
      "VIEWER_JOINED",
      "VIEWER_DISCONNECTED",
      "VIEWER_APPROVED",
      "VIEWER_DENIED",
      "WEBRTC_SIGNAL",
      "ERROR",
      "KICKED",
      "HOST_DISCONNECTED",
      "SERVER_SHUTDOWN",
      "CHAT_MESSAGE",
      "REACTION",
      "STREAM_PAUSED",
      "STREAM_RESUMED",
      "VIEWER_COUNT_UPDATE",
      "ROOM_SETTINGS_UPDATED",
      "ROOM_FULL",
      "ANNOTATION",
      "SPOTLIGHT_VIEWER",
      "VIEWER_HAND_RAISED",
      "VIEWER_HAND_LOWERED",
      "HAND_LOWERED_BY_HOST",
    ];
    for (const e of events) {
      socket.removeAllListeners(e);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════

  const cleanupAll = useCallback(() => {
    intentionalDisconnectRef.current = true;

    // Stop recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    // Stop auto-quality timer
    if (autoQualityTimerRef.current) {
      clearInterval(autoQualityTimerRef.current);
      autoQualityTimerRef.current = null;
    }
    setIsAutoQualityActive(false);
    poorQualitySinceRef.current = 0;
    goodQualitySinceRef.current = 0;
    troubleshootingToastShownRef.current = false;
    poorQualityViewerSinceRef.current = 0;
    toast.dismiss("localcast-reconnect");

    // Clear reconnection timer
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;

    // Close all broadcaster peers
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    // Close viewer peer
    if (viewerPeerRef.current) {
      viewerPeerRef.current.close();
      viewerPeerRef.current = null;
    }

    pendingCandidatesRef.current.clear();

    // Stop media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    // Disconnect socket
    if (socketRef.current) {
      removeAllListeners(socketRef.current);
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Clear video sources
    if (videoRef.current) videoRef.current.srcObject = null;
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;

    // Clear intervals
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    prevBytesSentRef.current.clear();
    totalBytesSentRef.current = 0;
    shareStartRef.current = 0;

    // Reset all state
    setConnectionStatus("disconnected");
    setIsSharing(false);
    setRoomId("");
    setViewers([]);
    setError(null);
    setIsFullscreen(false);
    setConnectionQuality("good");
    hostIdRef.current = "";
    setWaitingApproval(false);
    setChatMessages([]);
    setChatInput("");
    setShowChatPanel(false);
    setUnreadCount(0);
    setRecentReactions([]);
    setElapsedTime(0);
    setStreamResolution("---");
    setCurrentBitrate(0);
    setEstimatedDataTransferred(0);
    setLatency(0);
    setCopied(false);
    setRoomRequiresPassword(false);
    setJoinPassword("");
    setConnectionLog([]);
    setViewerQualities({});
    setPeakBitrate(0);
    peakBitrateRef.current = 0;
    setTotalChatMessages(0);
    totalChatMessagesRef.current = 0;
    setTotalReactions(0);
    totalReactionsRef.current = 0;
    setShowStatsDashboard(false);
    setIceConnectionInfo({ localCandidate: "", remoteCandidate: "", transportProtocol: "", iceConnectionState: "" });
    setShowNetworkInfo(false);
    setIsPaused(false);
    setMaxViewers(0);
    setConnectionHealthScore(100);
    shareStartExportRef.current = 0;
    setShowAnnotationOverlay(false);
    setAnnotationTool("pen");
    setAnnotationColor("#ef4444");
    setAnnotations([]);
    setSpotlightedViewer(null);
    setRoomThemeState("default");
    setSpeedTestResult({ latencyMs: 0, quality: "idle", timestamp: 0 });
    setRaisedHands(new Set());
    if (healthIntervalRef.current) {
      clearInterval(healthIntervalRef.current);
      healthIntervalRef.current = null;
    }
  }, [removeAllListeners]);

  // ═══════════════════════════════════════════════════════════════════════
  // WEBRTC — Broadcaster: Create Peer for a Viewer
  // ═══════════════════════════════════════════════════════════════════════

  const createBroadcasterPeer = useCallback(
    (viewerId: string, socket: Socket, stream: MediaStream) => {
      // Close existing peer if any
      const existing = peersRef.current.get(viewerId);
      if (existing) existing.close();

      const pc = new RTCPeerConnection(ICE_CONFIG);
      peersRef.current.set(viewerId, pc);
      pendingCandidatesRef.current.set(viewerId, []);

      // Add local tracks
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // When negotiation is needed, create & send offer
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          // Apply bitrate constraint on video sender
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === "video");
          if (videoSender) {
            const preset = QUALITY_PRESETS[qualityPreset];
            const params = videoSender.getParameters();
            if (!params.encodings) params.encodings = [{}];
            params.encodings[0].maxBitrate = preset.bitrate;
            videoSender.setParameters(params);
          }

          socket.emit("WEBRTC_SIGNAL", {
            targetId: viewerId,
            signal: offer,
          });
        } catch (err) {
          console.error("[LocalCast] Error creating offer:", err);
        }
      };

      // ICE candidate → trickle to viewer
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const cand = event.candidate;
          setIceConnectionInfo((prev) => ({
            ...prev,
            localCandidate: cand.candidate || prev.localCandidate,
            transportProtocol: cand.protocol || prev.transportProtocol,
          }));
          socket.emit("WEBRTC_SIGNAL", {
            targetId: viewerId,
            signal: cand.toJSON(),
          });
        }
      };

      // Connection state monitoring
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (
          state === "disconnected" ||
          state === "failed"
        ) {
          setViewerQualities((prev) => ({ ...prev, [viewerId]: "disconnected" as const }));
          setViewers((prev) => prev.filter((v) => v.id !== viewerId));
          pc.close();
          peersRef.current.delete(viewerId);
          pendingCandidatesRef.current.delete(viewerId);
          toast.info("A viewer disconnected");
        } else if (state === "connected") {
          setViewerQualities((prev) => ({ ...prev, [viewerId]: "good" as const }));
        } else if (state === "connecting" || state === "new") {
          setViewerQualities((prev) => ({ ...prev, [viewerId]: "checking" as const }));
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        setIceConnectionInfo((prev) => ({ ...prev, iceConnectionState: state }));
        if (state === "connected" || state === "completed") {
          setViewerQualities((prev) => ({ ...prev, [viewerId]: "good" as const }));
        } else if (state === "checking" || state === "new") {
          setViewerQualities((prev) => ({ ...prev, [viewerId]: "checking" as const }));
        } else if (state === "disconnected" || state === "failed" || state === "closed") {
          setViewerQualities((prev) => ({ ...prev, [viewerId]: "disconnected" as const }));
        }
      };
    },
    [qualityPreset],
  );

  // ═══════════════════════════════════════════════════════════════════════
  // WEBRTC — Broadcaster: Handle Incoming Signal from Viewer
  // ═══════════════════════════════════════════════════════════════════════

  const handleBroadcasterSignal = useCallback(
    (data: { from: string; signal: unknown }) => {
      const { from: viewerId, signal } = data;
      if (!viewerId || !signal) return;

      const pc = peersRef.current.get(viewerId);
      if (!pc) return;

      const sig = signal as
        | RTCSessionDescriptionInit
        | RTCIceCandidateInit;

      if ("type" in sig && sig.type === "answer") {
        // Viewer sent answer → set remote description
        pc.setRemoteDescription(
          new RTCSessionDescription(sig as RTCSessionDescriptionInit),
        ).catch((err) =>
          console.error("[LocalCast] Error setting remote description:", err),
        );
      } else if ("candidate" in sig) {
        // ICE candidate
        const candidate = sig as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(
            (err) => console.error("[LocalCast] Error adding ICE candidate:", err),
          );
        } else {
          // Queue until remote description is set
          const pending = pendingCandidatesRef.current.get(viewerId) || [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(viewerId, pending);
        }
      }
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════════════════
  // WEBRTC — Viewer: Handle Incoming Signal from Broadcaster
  // ═══════════════════════════════════════════════════════════════════════

  const handleViewerSignal = useCallback(
    (data: { from: string; signal: unknown }) => {
      const socket = socketRef.current;
      if (!socket) return;

      const { from: broadcasterId, signal } = data;
      if (!signal) return;

      const sig = signal as
        | RTCSessionDescriptionInit
        | RTCIceCandidateInit;

      if ("type" in sig && sig.type === "offer") {
        // Broadcaster sent offer → create answer
        const offer = sig as RTCSessionDescriptionInit;

        // Close old peer if any
        if (viewerPeerRef.current) {
          viewerPeerRef.current.close();
        }

        const pc = new RTCPeerConnection(ICE_CONFIG);
        viewerPeerRef.current = pc;
        pendingCandidatesRef.current.set(broadcasterId, []);

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            const cand = event.candidate;
            setIceConnectionInfo((prev) => ({
              ...prev,
              remoteCandidate: cand.candidate || prev.remoteCandidate,
              transportProtocol: cand.protocol || prev.transportProtocol,
            }));
            socket.emit("WEBRTC_SIGNAL", {
              targetId: broadcasterId,
              signal: cand.toJSON(),
            });
          }
        };

        // Connection quality monitoring
        pc.onconnectionstatechange = () => {
          switch (pc.connectionState) {
            case "connected":
              setConnectionQuality("good");
              break;
            case "disconnected":
            case "failed":
              setConnectionQuality("poor");
              break;
          }
        };

        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          setIceConnectionInfo((prev) => ({ ...prev, iceConnectionState: state }));
          switch (pc.iceConnectionState) {
            case "connected":
            case "completed":
              setConnectionQuality("good");
              break;
            case "checking":
            case "new":
              setConnectionQuality("fair");
              break;
            case "disconnected":
            case "failed":
            case "closed":
              setConnectionQuality("poor");
              break;
          }
        };

        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(async () => {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("WEBRTC_SIGNAL", {
              targetId: broadcasterId,
              signal: answer,
            });

            // Flush queued ICE candidates
            const pending =
              pendingCandidatesRef.current.get(broadcasterId) || [];
            for (const cand of pending) {
              await pc
                .addIceCandidate(new RTCIceCandidate(cand))
                .catch(() => {});
            }
            pendingCandidatesRef.current.delete(broadcasterId);
          })
          .catch((err) => {
            console.error("[LocalCast] Error handling offer:", err);
            toast.error("Failed to establish connection");
          });
      } else if ("candidate" in sig) {
        // ICE candidate from broadcaster
        const candidate = sig as RTCIceCandidateInit;

        if (
          viewerPeerRef.current &&
          viewerPeerRef.current.remoteDescription
        ) {
          viewerPeerRef.current
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch(() => {});
        } else {
          const pending =
            pendingCandidatesRef.current.get(broadcasterId) || [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(broadcasterId, pending);
        }
      }
    },
    [],
  );

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIONS — Broadcaster
  // ═══════════════════════════════════════════════════════════════════════

  const startSharing = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      setError(null);

      const preset = QUALITY_PRESETS[qualityPreset];
      const modeConfig = SHARE_MODE_CONFIG[shareMode];

      // Get screen media with selected share mode
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: modeConfig.displaySurface as "monitor",
            width: preset.width,
            height: preset.height,
            frameRate: preset.frameRate,
          },
          audio: true,
        });
      } catch {
        // Fallback: if selected mode fails, try "monitor" (most widely supported)
        if (modeConfig.displaySurface !== "monitor") {
          toast.info(`"${modeConfig.label}" mode not supported, falling back to entire screen`);
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: "monitor",
              width: preset.width,
              height: preset.height,
              frameRate: preset.frameRate,
            },
            audio: true,
          });
        } else {
          throw new Error("Screen sharing permission denied or unavailable.");
        }
      }
      localStreamRef.current = stream;

      // If user stops sharing via browser UI, stop session
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopSharing();
      });

      // Connect to signaling server
      const socket = getOrCreateSocket();
      removeAllListeners(socket);

      socket.on("connect_error", () => {
        setConnectionStatus("disconnected");
        toast.error("Cannot connect to signaling server");
        setError(
          "Cannot connect to signaling server. Make sure it's running on port 3003.",
        );
      });

      socket.on("connect", () => {
        // Create room
        socket.emit("CREATE_ROOM", { requireApproval, password: roomPassword, maxViewers, theme: roomTheme });

        socket.on("ROOM_CREATED", (data: { roomId: string; roomInfo?: { hostId: string } }) => {
          setRoomId(data.roomId);
          shareStartExportRef.current = Date.now();
          hostIdRef.current = data.roomInfo?.hostId || socket.id;
          setIsSharing(true);
          setConnectionStatus("connected");
          setCurrentView("share");
          toast.success("Room created! Share the code with viewers.");
        });

        socket.on(
          "VIEWER_JOINED",
          (data: { viewerId: string; viewerInfo: Viewer }) => {
            const info = data.viewerInfo || {};
            const newViewer: Viewer = {
              id: data.viewerId,
              deviceName: info.deviceName || parseDeviceInfo(navigator.userAgent).deviceName,
              os: info.os || parseDeviceInfo(navigator.userAgent).os,
              browser: info.browser || parseDeviceInfo(navigator.userAgent).browser,
              screenWidth: info.screenWidth,
              screenHeight: info.screenHeight,
              connectedAt: info.connectedAt || Date.now(),
              approved: info.approved ?? !requireApproval,
            };
            setViewers((prev) => {
              if (prev.some((v) => v.id === data.viewerId)) return prev;
              return [...prev, newViewer];
            });

            const name = newViewer.deviceName || "A viewer";
            toast.info(`${name} joined`);
            addConnectionLog("viewer_joined", `${name} joined the room`);
            if (soundEnabled) playNotificationSound("join");

            if (newViewer.approved) {
              createBroadcasterPeer(data.viewerId, socket, stream);
            }
          },
        );

        socket.on("WEBRTC_SIGNAL", handleBroadcasterSignal);

        socket.on(
          "VIEWER_DISCONNECTED",
          (data: { viewerId: string }) => {
            setViewers((prev) =>
              prev.filter((v) => v.id !== data.viewerId),
            );
            const pc = peersRef.current.get(data.viewerId);
            if (pc) {
              pc.close();
              peersRef.current.delete(data.viewerId);
            }
            pendingCandidatesRef.current.delete(data.viewerId);
            toast.info("A viewer left");
            addConnectionLog("viewer_left", "A viewer left the room");
            if (soundEnabled) playNotificationSound("leave");
          },
        );

        socket.on("CHAT_MESSAGE", (data: ChatMessage) => {
          setChatMessages((prev) => [
            ...prev.slice(-99),
            { ...data, id: data.id || generateId() },
          ]);
          setUnreadCount((c) => c + 1);
          totalChatMessagesRef.current += 1;
          setTotalChatMessages(totalChatMessagesRef.current);
          addConnectionLog("chat", `${data.senderName}: ${data.message}`);
          if (soundEnabled) playNotificationSound("chat");
        });

        socket.on("REACTION", (data: { roomId: string; emoji: string; viewerId: string; timestamp: number }) => {
          const reaction: Reaction = {
            emoji: data.emoji,
            id: generateId(),
            viewerId: data.viewerId,
            timestamp: data.timestamp,
          };
          setRecentReactions((prev) => [...prev.slice(-19), reaction]);
          totalReactionsRef.current += 1;
          setTotalReactions(totalReactionsRef.current);
          setTimeout(() => {
            setRecentReactions((prev) =>
              prev.filter((r) => r.id !== reaction.id),
            );
          }, 5000);
          if (soundEnabled) playNotificationSound("reaction");
        });

        socket.on("ANNOTATION", (data: { roomId: string; annotation: AnnotationEvent }) => {
          const ann = data.annotation;
          if (ann.type === "clear") {
            setAnnotations([]);
          } else {
            setAnnotations((prev) => [...prev, ann]);
          }
        });

        socket.on("SPOTLIGHT_VIEWER", (data: { roomId: string; viewerId: string }) => {
          setSpotlightedViewer(data.viewerId);
        });

        socket.on("VIEWER_HAND_RAISED", (data: { roomId: string; viewerId: string }) => {
          setRaisedHands((prev) => new Set(prev).add(data.viewerId));
          const viewer = viewers.find((v) => v.id === data.viewerId);
          const name = viewer?.deviceName || "A viewer";
          toast.info(`${name} raised their hand ✋`);
          if (soundEnabled) playNotificationSound("reaction");
        });

        socket.on("VIEWER_HAND_LOWERED", (data: { roomId: string; viewerId: string }) => {
          setRaisedHands((prev) => {
            const next = new Set(prev);
            next.delete(data.viewerId);
            return next;
          });
        });

        socket.on("ERROR", (data: { message: string }) => {
          toast.error(data.message);
          setError(data.message);
        });
      });

      socket.on("disconnect", () => {
        setConnectionStatus("disconnected");
      });
    } catch (err: unknown) {
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError") {
        toast.error("Screen sharing was cancelled");
      } else {
        toast.error("Failed to start screen sharing");
      }
      setConnectionStatus("disconnected");
      setError("Screen sharing permission denied or unavailable.");
    }
  }, [qualityPreset, shareMode, requireApproval, roomPassword, maxViewers, getOrCreateSocket, removeAllListeners, createBroadcasterPeer, handleBroadcasterSignal]);

  const stopSharing = useCallback(() => {
    cleanupAll();
    setCurrentView("home");
    toast.success("Screen sharing stopped");
  }, [cleanupAll]);

  const approveViewer = useCallback(
    (viewerId: string) => {
      const socket = socketRef.current;
      const stream = localStreamRef.current;
      if (!socket || !stream) return;

      socket.emit("APPROVE_VIEWER", { viewerId });
      setViewers((prev) =>
        prev.map((v) =>
          v.id === viewerId ? { ...v, approved: true } : v,
        ),
      );
      createBroadcasterPeer(viewerId, socket, stream);
      toast.success("Viewer approved");
    },
    [createBroadcasterPeer],
  );

  const denyViewer = useCallback((viewerId: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("DENY_VIEWER", { viewerId });
    setViewers((prev) => prev.filter((v) => v.id !== viewerId));
    const pc = peersRef.current.get(viewerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(viewerId);
    }
    pendingCandidatesRef.current.delete(viewerId);
    toast.info("Viewer denied");
  }, []);

  const disconnectViewer = useCallback((viewerId: string) => {
    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("DISCONNECT_VIEWER", { viewerId });
    setViewers((prev) => prev.filter((v) => v.id !== viewerId));
    const pc = peersRef.current.get(viewerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(viewerId);
    }
    pendingCandidatesRef.current.delete(viewerId);
    toast.info("Viewer disconnected");
  }, []);

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIONS — Viewer
  // ═══════════════════════════════════════════════════════════════════════

  const joinRoom = useCallback(
    (inputRoomId?: string) => {
      const code = (inputRoomId || viewerInput).trim().toUpperCase();
      if (code.length !== 6) {
        toast.error("Please enter a valid 6-character room code");
        return;
      }

      setConnectionStatus("connecting");
      setError(null);

      const socket = getOrCreateSocket();
      removeAllListeners(socket);

      const myDeviceInfo = parseDeviceInfo(navigator.userAgent);

      socket.on("connect_error", () => {
        setConnectionStatus("disconnected");
        toast.error("Cannot connect to signaling server");
        setError(
          "Cannot connect to signaling server. Make sure it's running on port 3003.",
        );
      });

      socket.on("connect", () => {
        socket.emit("JOIN_ROOM", { roomId: code, password: joinPassword });

        socket.on(
          "ROOM_JOINED",
          (data: {
            roomId: string;
            hostId: string;
            approved: boolean;
          }) => {
            hostIdRef.current = data.hostId;
            setRoomId(data.roomId);

            if (data.approved) {
              setConnectionStatus("connected");
              setCurrentView("watching");
              toast.success("Connected to room!");
            } else {
              setWaitingApproval(true);
              toast.info("Waiting for host approval...");
            }

            // Send device info (use displayName if set)
            socket.emit("DEVICE_INFO", {
              deviceName: displayName || myDeviceInfo.deviceName,
              os: myDeviceInfo.os,
              browser: myDeviceInfo.browser,
              screenWidth: screen.width,
              screenHeight: screen.height,
            });
          },
        );

        socket.on("VIEWER_APPROVED", () => {
          setWaitingApproval(false);
          setConnectionStatus("connected");
          setCurrentView("watching");
          toast.success("Approved by host!");
          if (soundEnabled) playNotificationSound("approved");
        });

        socket.on("VIEWER_DENIED", () => {
          if (soundEnabled) playNotificationSound("denied");
          toast.error("You were denied by the host");
          setError("The host denied your request to join.");
          cleanupAll();
          setCurrentView("join");
        });

        socket.on("WEBRTC_SIGNAL", (data: { from: string; signal: unknown }) => {
          handleViewerSignal(data);
        });

        socket.on("HOST_DISCONNECTED", () => {
          toast.error("The host ended the session");
          setError("The host ended the screen sharing session.");
          cleanupAll();
          setCurrentView("home");
        });

        socket.on("ROOM_NOT_FOUND", () => {
          toast.error("Room not found");
          setError("Room not found. Please check the code and try again.");
          setConnectionStatus("disconnected");
        });

        socket.on("ROOM_FULL", () => {
          toast.error("Room is full. No more viewers can join.");
          setError("This room has reached its maximum viewer limit.");
          setConnectionStatus("disconnected");
        });

        socket.on("ROOM_PASSWORD_REQUIRED", () => {
          setRoomRequiresPassword(true);
          toast.error("This room requires a password");
          setError("This room is password protected. Please enter the password.");
          setConnectionStatus("disconnected");
        });

        socket.on("STREAM_PAUSED", () => {
          toast.info("Host paused the stream");
          if (soundEnabled) playNotificationSound("paused");
        });

        socket.on("STREAM_RESUMED", () => {
          toast.success("Stream resumed");
          if (soundEnabled) playNotificationSound("resumed");
        });

        socket.on("KICKED", () => {
          toast.error("You were removed from the room");
          setError("You were removed from the room by the host.");
          cleanupAll();
          setCurrentView("home");
        });

        socket.on("SERVER_SHUTDOWN", () => {
          toast.error("Server is shutting down");
          setError("The server is shutting down.");
          cleanupAll();
          setCurrentView("home");
        });

        socket.on("CHAT_MESSAGE", (data: ChatMessage) => {
          setChatMessages((prev) => [
            ...prev.slice(-99),
            { ...data, id: data.id || generateId() },
          ]);
          setUnreadCount((c) => c + 1);
          if (soundEnabled) playNotificationSound("chat");
        });

        socket.on("ANNOTATION", (data: { roomId: string; annotation: AnnotationEvent }) => {
          const ann = data.annotation;
          if (ann.type === "clear") {
            setAnnotations([]);
          } else {
            setAnnotations((prev) => [...prev, ann]);
          }
        });

        socket.on("SPOTLIGHT_VIEWER", (data: { roomId: string; viewerId: string }) => {
          setSpotlightedViewer(data.viewerId);
        });

        socket.on("HAND_LOWERED_BY_HOST", () => {
          toast.info("Host lowered your hand");
        });

        socket.on("ROOM_SETTINGS_UPDATED", (data: { settings: { theme?: string } }) => {
          if (data.settings?.theme) {
            setRoomThemeState(data.settings.theme as SessionTheme);
          }
        });

        socket.on("ERROR", (data: { message: string }) => {
          toast.error(data.message);
          setError(data.message);
          setConnectionStatus("disconnected");
        });
      });

      socket.on("disconnect", () => {
        setConnectionStatus("disconnected");
      });
    },
    [getOrCreateSocket, removeAllListeners, handleViewerSignal, cleanupAll, viewerInput, joinPassword, displayName, soundEnabled],
  );

  const leaveRoom = useCallback(() => {
    cleanupAll();
    setViewerInput("");
    setCurrentView("home");
    toast.success("Left the room");
  }, [cleanupAll]);

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIONS — UI Controls
  // ═══════════════════════════════════════════════════════════════════════

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(() => toast.error("Failed to enter fullscreen"));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(() => {});
    }
  }, []);

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      toast.error("Picture-in-Picture not available");
    }
  }, []);

  const copyRoomCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      toast.success("Room code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [roomId]);

  // ═══════════════════════════════════════════════════════════════════════
  // ACTIONS — Chat & Reactions
  // ═══════════════════════════════════════════════════════════════════════

  const sendChatMessage = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg || !socketRef.current?.connected || !roomId) return;

    const senderType: "host" | "viewer" = isSharing ? "host" : "viewer";
    const senderName = isSharing
      ? "Host"
      : displayName || parseDeviceInfo(navigator.userAgent).browser;

    socketRef.current.emit("CHAT_MESSAGE", {
      roomId,
      message: msg,
      senderName,
      senderType,
    });
    setChatInput("");
  }, [chatInput, roomId, isSharing, displayName]);

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!socketRef.current?.connected || !roomId) return;
      socketRef.current.emit("REACTION", { roomId, emoji });
    },
    [roomId],
  );

  // ═══════════════════════════════════════════════════════════════════════
  // EFFECTS
  // ═══════════════════════════════════════════════════════════════════════

  // ── Session timer (every 1 s while sharing) ──
  useEffect(() => {
    if (isSharing && !shareStartRef.current) {
      shareStartRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(Date.now() - shareStartRef.current);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isSharing]);

  // ── Detect stream resolution from preview video ──
  useEffect(() => {
    if (!isSharing || !previewVideoRef.current) return;
    const video = previewVideoRef.current;

    const update = () => {
      if (video.videoWidth && video.videoHeight) {
        setStreamResolution(`${video.videoWidth}\u00D7${video.videoHeight}`);
      }
    };

    video.addEventListener("loadedmetadata", update);
    const poll = setInterval(update, 2000);
    return () => {
      video.removeEventListener("loadedmetadata", update);
      clearInterval(poll);
    };
  }, [isSharing]);

  // ── Attach local stream to preview video ──
  useEffect(() => {
    if (
      currentView === "share" &&
      isSharing &&
      previewVideoRef.current &&
      localStreamRef.current
    ) {
      previewVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [currentView, isSharing]);

  // ── Live bitrate & data transferred monitoring ──
  useEffect(() => {
    if (!isSharing) {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      return;
    }

    statsIntervalRef.current = setInterval(() => {
      let totalBitrate = 0;
      let totalBytes = 0;
      let peerCount = 0;

      peersRef.current.forEach((pc) => {
        const statsReport = pc.getStats();
        statsReport.then((report) => {
          report.forEach((stat) => {
            if (
              stat.type === "outbound-rtp" &&
              stat.kind === "video"
            ) {
              const bytes = (stat as RTCOutboundRtpStreamStats).bytesSent ?? 0;
              const prev = prevBytesSentRef.current.get(pc.id) ?? 0;
              const delta = bytes - prev;
              if (delta > 0) {
                totalBitrate += (delta * 8) / 2; // 2-second interval
              }
              prevBytesSentRef.current.set(pc.id, bytes);
              totalBytes = bytes;
            }
          });
        });
        peerCount++;
      });

      // Update after a microtask to let getStats resolve
      setTimeout(() => {
        if (totalBitrate > 0) {
          setCurrentBitrate(Math.round(totalBitrate));
          // Track peak bitrate
          if (totalBitrate > peakBitrateRef.current) {
            peakBitrateRef.current = totalBitrate;
            setPeakBitrate(Math.round(totalBitrate));
          }
        }
        if (totalBytes > 0) {
          totalBytesSentRef.current = totalBytes;
          setEstimatedDataTransferred(totalBytes);
        }
      }, 50);
    }, 2000);

    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [isSharing]);

  // ── Latency measurement via PING/PONG ──
  useEffect(() => {
    if (connectionStatus !== "connected" || !socketRef.current) return;

    const interval = setInterval(() => {
      const socket = socketRef.current;
      if (!socket?.connected) return;
      lastPingRef.current = Date.now();
      socket.emit("PING");
    }, 5000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  // ── Fullscreen change listener ──
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          if (currentView === "watching") {
            leaveRoom();
          } else if (currentView !== "home") {
            cleanupAll();
            setCurrentView("home");
          } else if (showShortcutsDialog) {
            setShowShortcutsDialog(false);
          }
          break;
        case "f":
        case "F":
          if (currentView === "watching") {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case "m":
        case "M":
          if (currentView === "watching" && videoRef.current) {
            e.preventDefault();
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
          }
          break;
        case "c":
        case "C":
          if (currentView === "share" || currentView === "watching") {
            e.preventDefault();
            setShowChatPanel((prev) => !prev);
            setUnreadCount(0);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [
    currentView,
    isMuted,
    showShortcutsDialog,
    showChatPanel,
    leaveRoom,
    toggleFullscreen,
    cleanupAll,
  ]);

  // ── Auto Quality Adaptation (broadcaster only) ──
  useEffect(() => {
    if (!isSharing || !isAutoQualityActive) {
      if (autoQualityTimerRef.current) {
        clearInterval(autoQualityTimerRef.current);
        autoQualityTimerRef.current = null;
      }
      poorQualitySinceRef.current = 0;
      goodQualitySinceRef.current = 0;
      return;
    }

    const now = Date.now();
    if (connectionQuality === "poor") {
      if (poorQualitySinceRef.current === 0) {
        poorQualitySinceRef.current = now;
      }
      if (now - poorQualitySinceRef.current > 5000) {
        // Poor for > 5s: lower bitrate
        const reducedBitrate = QUALITY_PRESETS[qualityPreset].bitrate / 2;
        applyBitrateToAllPeers(reducedBitrate);
        toast.info("Auto-adjusted: quality reduced due to poor connection", {
          id: "auto-quality",
        });
        addConnectionLog("auto_quality", `Auto-adjusted: bitrate reduced to ${reducedBitrate / 1_000_000} Mbps`);
        poorQualitySinceRef.current = 0; // Reset to avoid repeated toasts
      }
    } else if (connectionQuality === "good") {
      if (goodQualitySinceRef.current === 0) {
        goodQualitySinceRef.current = now;
      }
      if (now - goodQualitySinceRef.current > 10000) {
        // Good for > 10s: restore original bitrate
        const originalBitrate = QUALITY_PRESETS[qualityPreset].bitrate;
        applyBitrateToAllPeers(originalBitrate);
        toast.success("Auto-adjusted: quality restored", {
          id: "auto-quality",
        });
        addConnectionLog("auto_quality", `Auto-adjusted: bitrate restored to ${originalBitrate / 1_000_000} Mbps`);
        goodQualitySinceRef.current = 0;
      }
    } else {
      // Fair: reset timers
      poorQualitySinceRef.current = 0;
      goodQualitySinceRef.current = 0;
    }
  }, [isSharing, connectionQuality, isAutoQualityActive, qualityPreset, applyBitrateToAllPeers, addConnectionLog]);

  // ── Troubleshooting Tips (viewer only) ──
  useEffect(() => {
    if (currentView !== "watching" || connectionQuality !== "poor") {
      poorQualityViewerSinceRef.current = 0;
      troubleshootingToastShownRef.current = false;
      return;
    }

    const now = Date.now();
    if (poorQualityViewerSinceRef.current === 0) {
      poorQualityViewerSinceRef.current = now;
    }
    if (
      now - poorQualityViewerSinceRef.current > 10000 &&
      !troubleshootingToastShownRef.current
    ) {
      troubleshootingToastShownRef.current = true;
      toast.warning("Connection quality is poor. Tips:", {
        description: "• Try refreshing the page\n• Make sure both devices are on the same network\n• Check if a firewall is blocking connections",
        duration: 8000,
        id: "troubleshooting-tips",
        action: {
          label: "Dismiss",
          onClick: () => troubleshootingToastShownRef.current = false,
        },
      });
    }
  }, [currentView, connectionQuality]);

  // ── Connection Health Monitor ──
  useEffect(() => {
    if (connectionStatus !== "connected") {
      if (healthIntervalRef.current) {
        clearInterval(healthIntervalRef.current);
        healthIntervalRef.current = null;
      }
      return;
    }

    healthIntervalRef.current = setInterval(() => {
 // Quality score
      let qualityScore = 100;
      if (connectionQuality === "fair") qualityScore = 60;
      else if (connectionQuality === "poor") qualityScore = 30;

      // Latency score
      let latencyScore = 100;
      const lat = latency;
      if (lat <= 0) latencyScore = 80;
      else if (lat <= 50) latencyScore = 80;
      else if (lat <= 100) latencyScore = 40;
      else latencyScore = 10;

      // Bitrate score (higher = better)
      let bitrateScore = 50;
      if (currentBitrate > 0) {
        if (currentBitrate >= 2_000_000) bitrateScore = 100;
        else if (currentBitrate >= 1_000_000) bitrateScore = 80;
        else if (currentBitrate >= 500_000) bitrateScore = 60;
        else bitrateScore = 30;
      }

      const score = Math.round((qualityScore * 0.4) + (latencyScore * 0.35) + (bitrateScore * 0.25));
      setConnectionHealthScore(score);
    }, 2000);

    return () => {
      if (healthIntervalRef.current) {
        clearInterval(healthIntervalRef.current);
        healthIntervalRef.current = null;
      }
    };
  }, [connectionStatus, connectionQuality, latency, currentBitrate]);

  // ── Export Session Stats ──
  const exportSessionStats = useCallback((): string => {
    const stats = {
      roomId,
      startTime: shareStartExportRef.current ? new Date(shareStartExportRef.current).toISOString() : null,
      endTime: new Date().toISOString(),
      totalViewers: viewers.length,
      approvedViewers: viewers.filter(v => v.approved).length,
      peakBitrate,
      currentBitrate,
      totalDataTransferred: estimatedDataTransferred,
      totalChatMessages,
      totalReactions,
      streamResolution,
      qualityPreset,
      shareMode,
      maxViewers,
      sessionDurationMs: elapsedTime,
    };
    return JSON.stringify(stats, null, 2);
  }, [roomId, viewers, peakBitrate, currentBitrate, estimatedDataTransferred, totalChatMessages, totalReactions, streamResolution, qualityPreset, shareMode, maxViewers, elapsedTime]);

  // ═══════════════════════════════════════════════════════════════════════
  // RETURN
  // ═══════════════════════════════════════════════════════════════════════

  return {
    // View
    currentView,
    setCurrentView,

    // Broadcaster
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

    // Viewer
    viewerInput,
    setViewerInput,
    isMuted,
    setIsMuted,
    isFullscreen,
    connectionQuality,

    // Shared
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

    // Per-Viewer Connection Quality
    viewerQualities,

    // Session Statistics
    peakBitrate,
    totalChatMessages,
    totalReactions,
    showStatsDashboard,
    setShowStatsDashboard,

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
  };
}

// ─── Formatting Helpers (module-scoped, not exported) ──────────────────────

function formatBitrateValue(bps: number): string {
  if (bps < 1000) return `${Math.round(bps)} bps`;
  if (bps < 1_000_000) return `${(bps / 1000).toFixed(0)} Kbps`;
  return `${(bps / 1_000_000).toFixed(1)} Mbps`;
}

function formatByteValue(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
