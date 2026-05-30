"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Monitor,
  MonitorPlay,
  Copy,
  QrCode,
  Users,
  Wifi,
  WifiOff,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  ArrowLeft,
  Shield,
  X,
  Check,
  AlertCircle,
  MonitorUp,
  Eye,
  Loader2,
  Sun,
  Moon,
  PictureInPicture2,
  HelpCircle,
  BarChart3,
  Activity,
  Timer,
  ChevronDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type View = "home" | "share" | "join" | "watching";

interface ViewerInfo {
  id: string;
  deviceName: string;
  os: string;
  browser: string;
  screenWidth?: number;
  screenHeight?: number;
  approved: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDeviceInfo(ua: string): { os: string; browser: string; deviceName: string } {
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

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
};

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// ─── Sub-Components ───────────────────────────────────────────────────────────

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

// ─── Main Component ─────────────────────────────────────────────────────────

export default function Home() {
  // ── Theme ──
  const { theme, setTheme } = useTheme();

  // ── View State ──
  const [currentView, setCurrentView] = useState<View>("home");

  // ── Broadcaster State ──
  const [roomId, setRoomId] = useState<string>("");
  const [isSharing, setIsSharing] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [hostId, setHostId] = useState<string>("");

  // ── Viewer State ──
  const [viewerInput, setViewerInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor">("good");

  // ── Shared State ──
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);

  // ── Feature: Session Timer State ──
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const shareStartRef = useRef<Date | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Feature: Connection Stats State ──
  const [statsOpen, setStatsOpen] = useState(false);
  const [streamResolution, setStreamResolution] = useState<string>("—");

  // ── Feature: Keyboard Shortcuts Dialog ──
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  // ── Refs ──
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(
    new Map()
  );
  const viewerPeerRef = useRef<RTCPeerConnection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Get or create socket ──
  const getSocket = useCallback((): Socket => {
    if (!socketRef.current) {
      socketRef.current = io("/?XTransformPort=3003");
    }
    return socketRef.current;
  }, []);

  // ── Remove all listeners from socket to prevent duplicates ──
  const removeAllListeners = useCallback((socket: Socket) => {
    const events = [
      "connect", "disconnect", "connect_error",
      "ROOM_CREATED", "VIEWER_JOINED", "WEBRTC_SIGNAL",
      "VIEWER_DISCONNECTED", "ERROR", "ROOM_JOINED",
      "VIEWER_APPROVED", "VIEWER_DENIED", "HOST_DISCONNECTED",
      "ROOM_NOT_FOUND", "KICKED", "ROOM_SETTINGS_UPDATED",
    ];
    events.forEach((e) => socket.removeAllListeners(e));
  }, []);

  // ── Cleanup resources ──
  const cleanupAll = useCallback(() => {
    // Close all peer connections
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    if (viewerPeerRef.current) {
      viewerPeerRef.current.close();
      viewerPeerRef.current = null;
    }

    pendingCandidatesRef.current.clear();

    // Stop local media stream
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

    // Reset viewer video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }

    setConnectionStatus("disconnected");
    setIsSharing(false);
    setRoomId("");
    setViewers([]);
    setError(null);
    setIsFullscreen(false);
    setConnectionQuality("good");
    setHostId("");
    setWaitingApproval(false);

    // Session timer cleanup
    shareStartRef.current = null;
    setElapsedTime(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stats cleanup
    setStreamResolution("—");
    setStatsOpen(false);
  }, [removeAllListeners]);

  // ── Feature: Session Timer effect ──
  useEffect(() => {
    if (isSharing && !shareStartRef.current) {
      shareStartRef.current = new Date();
      timerIntervalRef.current = setInterval(() => {
        if (shareStartRef.current) {
          setElapsedTime(Date.now() - shareStartRef.current.getTime());
        }
      }, 1000);
    } else if (!isSharing && shareStartRef.current) {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isSharing]);

  // ── Feature: Detect stream resolution ──
  useEffect(() => {
    if (isSharing && previewVideoRef.current) {
      const video = previewVideoRef.current;
      const updateResolution = () => {
        if (video.videoWidth && video.videoHeight) {
          setStreamResolution(`${video.videoWidth}×${video.videoHeight}`);
        }
      };
      video.addEventListener("loadedmetadata", updateResolution);
      // Also poll in case loadedmetadata already fired
      const poll = setInterval(() => {
        updateResolution();
      }, 2000);
      return () => {
        video.removeEventListener("loadedmetadata", updateResolution);
        clearInterval(poll);
      };
    }
  }, [isSharing]);

  // ── Copy room code ──
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

  // ── Broadcaster: Create Peer for Viewer ──
  const createBroadcasterPeer = useCallback(
    (viewerId: string, socket: Socket, stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_CONFIG);
      peersRef.current.set(viewerId, pc);

      // Initialize pending candidates for this viewer
      if (!pendingCandidatesRef.current.has(viewerId)) {
        pendingCandidatesRef.current.set(viewerId, []);
      }

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          // Send via signaling server — format must match server protocol
          socket.emit("WEBRTC_SIGNAL", {
            targetId: viewerId,
            signal: offer,
          });
        } catch (err) {
          console.error("Error creating offer:", err);
        }
      };

      // ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("WEBRTC_SIGNAL", {
            targetId: viewerId,
            signal: event.candidate.toJSON(),
          });
        }
      };

      // Connection state
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          setViewers((prev) => prev.filter((v) => v.id !== viewerId));
          pc.close();
          peersRef.current.delete(viewerId);
          pendingCandidatesRef.current.delete(viewerId);
          toast.info("A viewer disconnected");
        }
      };
    },
    []
  );

  // ── Broadcaster: Handle incoming signal from viewer ──
  // BUG FIX: Use getSocket() pattern for consistent socket access
  const handleBroadcasterSignal = useCallback(
    (data: { from: string; signal: unknown }) => {
      const socket = getSocket();
      const viewerId = data.from;
      const signal = data.signal;
      if (!viewerId || !signal) return;

      const pc = peersRef.current.get(viewerId);
      if (!pc) return;

      const sig = signal as RTCSessionDescriptionInit | RTCIceCandidateInit;

      // Check if it's an answer (has 'type' and 'sdp') or ICE candidate (has 'candidate')
      if ("type" in sig && sig.type === "answer") {
        pc.setRemoteDescription(new RTCSessionDescription(sig as RTCSessionDescriptionInit))
          .catch((err) => console.error("Error setting remote description:", err));
      } else if ("candidate" in sig) {
        const candidate = sig as RTCIceCandidateInit;
        if (pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch((err) =>
            console.error("Error adding ICE candidate:", err)
          );
        } else {
          // Queue candidates until remote description is set
          const pending = pendingCandidatesRef.current.get(viewerId) || [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(viewerId, pending);
        }
      }

      // Suppress unused variable warning
      void socket;
    },
    [getSocket]
  );

  // ── Broadcaster: Stop Sharing ──
  const stopSharing = useCallback(() => {
    cleanupAll();
    setCurrentView("home");
    toast.success("Screen sharing stopped");
  }, [cleanupAll]);

  // ── Broadcaster: Start Sharing ──
  const startSharing = useCallback(async () => {
    try {
      setConnectionStatus("connecting");
      setError(null);

      // 1. Get display media
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
        },
        audio: true,
      });
      localStreamRef.current = stream;

      // Handle stream ending (user clicks stop sharing in browser)
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopSharing();
      });

      // 2. Connect to signaling server
      const socket = getSocket();
      removeAllListeners(socket);

      socket.on("connect", () => {
        // 3. Create room
        socket.emit("CREATE_ROOM", {
          requireApproval,
        });

        socket.on("ROOM_CREATED", (data: { roomId: string; roomInfo: { hostId: string } }) => {
          setRoomId(data.roomId);
          setHostId(data.roomInfo?.hostId || socket.id);
          setIsSharing(true);
          setConnectionStatus("connected");
          setCurrentView("share");
          toast.success("Room created! Share the code with viewers.");
        });

        socket.on("VIEWER_JOINED", (data: { viewerId: string; viewerInfo: ViewerInfo }) => {
          const info = data.viewerInfo || {};
          const ua = info.deviceName || "";
          const parsed = parseDeviceInfo(ua);

          const newViewer: ViewerInfo = {
            id: data.viewerId,
            deviceName: parsed.deviceName,
            os: parsed.os,
            browser: parsed.browser,
            screenWidth: info.screenWidth,
            screenHeight: info.screenHeight,
            approved: info.approved ?? !requireApproval,
          };
          setViewers((prev) => {
            // Avoid duplicates
            if (prev.some((v) => v.id === data.viewerId)) return prev;
            return [...prev, newViewer];
          });
          toast.info(`${parsed.deviceName} joined`);

          // Create WebRTC peer connection for this viewer
          // If approval is required, only create peer when approved
          if (newViewer.approved) {
            createBroadcasterPeer(data.viewerId, socket, stream);
          }
        });

        socket.on("WEBRTC_SIGNAL", handleBroadcasterSignal);

        socket.on("VIEWER_DISCONNECTED", (data: { viewerId: string }) => {
          setViewers((prev) => prev.filter((v) => v.id !== data.viewerId));
          const pc = peersRef.current.get(data.viewerId);
          if (pc) {
            pc.close();
            peersRef.current.delete(data.viewerId);
          }
          pendingCandidatesRef.current.delete(data.viewerId);
          toast.info("A viewer left");
        });

        socket.on("ERROR", (data: { message: string }) => {
          toast.error(data.message);
          setError(data.message);
        });
      });

      socket.on("disconnect", () => {
        setConnectionStatus("disconnected");
      });

      socket.on("connect_error", () => {
        setConnectionStatus("disconnected");
        toast.error("Cannot connect to signaling server");
        setError("Cannot connect to signaling server. Make sure it's running on port 3003.");
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
  }, [getSocket, requireApproval, removeAllListeners, createBroadcasterPeer, handleBroadcasterSignal, stopSharing]);

  // ── Broadcaster: Approve Viewer ──
  const approveViewer = useCallback(
    (viewerId: string) => {
      const socket = getSocket();
      const stream = localStreamRef.current;
      if (socket && stream) {
        socket.emit("APPROVE_VIEWER", { viewerId });
        setViewers((prev) =>
          prev.map((v) => (v.id === viewerId ? { ...v, approved: true } : v))
        );
        createBroadcasterPeer(viewerId, socket, stream);
        toast.success("Viewer approved");
      }
    },
    [getSocket, createBroadcasterPeer]
  );

  // ── Broadcaster: Deny Viewer ──
  const denyViewer = useCallback(
    (viewerId: string) => {
      const socket = getSocket();
      socket.emit("DENY_VIEWER", { viewerId });
      setViewers((prev) => prev.filter((v) => v.id !== viewerId));
      const pc = peersRef.current.get(viewerId);
      if (pc) {
        pc.close();
        peersRef.current.delete(viewerId);
      }
      pendingCandidatesRef.current.delete(viewerId);
      toast.info("Viewer denied");
    },
    [getSocket]
  );

  // ── Broadcaster: Disconnect Viewer ──
  const disconnectViewer = useCallback(
    (viewerId: string) => {
      const socket = getSocket();
      socket.emit("DISCONNECT_VIEWER", { viewerId });
      setViewers((prev) => prev.filter((v) => v.id !== viewerId));
      const pc = peersRef.current.get(viewerId);
      if (pc) {
        pc.close();
        peersRef.current.delete(viewerId);
      }
      pendingCandidatesRef.current.delete(viewerId);
      toast.info("Viewer disconnected");
    },
    [getSocket]
  );

  // ── Viewer: Handle incoming signal from broadcaster ──
  // BUG FIX: Use getSocket() instead of socket parameter for stable access
  const handleViewerSignal = useCallback(
    (data: { from: string; signal: unknown }) => {
      const socket = getSocket();
      const broadcasterId = data.from;
      const signal = data.signal;
      if (!signal) return;

      const sig = signal as RTCSessionDescriptionInit | RTCIceCandidateInit;

      if ("type" in sig && sig.type === "offer") {
        const offer = sig as RTCSessionDescriptionInit;

        // Close existing peer if any
        if (viewerPeerRef.current) {
          viewerPeerRef.current.close();
        }

        const pc = new RTCPeerConnection(ICE_CONFIG);
        viewerPeerRef.current = pc;

        // Initialize pending candidates
        if (!pendingCandidatesRef.current.has(broadcasterId)) {
          pendingCandidatesRef.current.set(broadcasterId, []);
        }

        // Receive remote tracks
        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        // ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("WEBRTC_SIGNAL", {
              targetId: broadcasterId,
              signal: event.candidate.toJSON(),
            });
          }
        };

        // Connection quality monitoring
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") {
            setConnectionQuality("good");
          } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            setConnectionQuality("poor");
          }
        };

        pc.oniceconnectionstatechange = () => {
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

        // Set remote description and create answer
        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(async () => {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("WEBRTC_SIGNAL", {
              targetId: broadcasterId,
              signal: answer,
            });

            // Drain pending ICE candidates
            const pending = pendingCandidatesRef.current.get(broadcasterId) || [];
            for (const cand of pending) {
              await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {});
            }
            pendingCandidatesRef.current.delete(broadcasterId);
          })
          .catch((err) => {
            console.error("Error handling offer:", err);
            toast.error("Failed to establish connection");
          });
      } else if ("candidate" in sig) {
        const candidate = sig as RTCIceCandidateInit;

        if (viewerPeerRef.current && viewerPeerRef.current.remoteDescription) {
          viewerPeerRef.current
            .addIceCandidate(new RTCIceCandidate(candidate))
            .catch(() => {});
        } else {
          const pending = pendingCandidatesRef.current.get(broadcasterId) || [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(broadcasterId, pending);
        }
      }
    },
    [getSocket]
  );

  // ── Viewer: Join Room ──
  const joinRoom = useCallback(() => {
    const code = viewerInput.trim().toUpperCase();
    if (code.length !== 6) {
      toast.error("Please enter a valid 6-character room code");
      return;
    }

    setConnectionStatus("connecting");
    setError(null);

    const socket = getSocket();
    removeAllListeners(socket);

    const myDeviceInfo = parseDeviceInfo(navigator.userAgent);

    socket.on("connect", () => {
      socket.emit("JOIN_ROOM", { roomId: code });

      socket.on("ROOM_JOINED", (data: { roomId: string; hostId: string; approved: boolean }) => {
        setHostId(data.hostId);
        setRoomId(data.roomId);

        if (data.approved) {
          setConnectionStatus("connected");
          setCurrentView("watching");
          toast.success("Connected to room!");
        } else {
          setWaitingApproval(true);
          toast.info("Waiting for host approval...");
        }

        // Send device info to host
        socket.emit("DEVICE_INFO", {
          deviceName: myDeviceInfo.deviceName,
          os: myDeviceInfo.os,
          browser: myDeviceInfo.browser,
          screenWidth: screen.width,
          screenHeight: screen.height,
        });
      });

      socket.on("VIEWER_APPROVED", () => {
        setWaitingApproval(false);
        setConnectionStatus("connected");
        setCurrentView("watching");
        toast.success("Approved by host!");
      });

      socket.on("VIEWER_DENIED", () => {
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

      socket.on("KICKED", () => {
        toast.error("You were removed from the room");
        setError("You were removed from the room by the host.");
        cleanupAll();
        setCurrentView("home");
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

    socket.on("connect_error", () => {
      setConnectionStatus("disconnected");
      toast.error("Cannot connect to signaling server");
      setError("Cannot connect to signaling server. Make sure it's running on port 3003.");
    });
  }, [viewerInput, getSocket, cleanupAll, removeAllListeners, handleViewerSignal]);

  // ── Viewer: Leave Room ──
  const leaveRoom = useCallback(() => {
    cleanupAll();
    setViewerInput("");
    setCurrentView("home");
    toast.success("Left the room");
  }, [cleanupAll]);

  // ── Fullscreen Toggle ──
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        toast.error("Failed to enter fullscreen");
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      }).catch(() => {});
    }
  }, []);

  // ── Feature: Keyboard Shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
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
        default:
          break;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [currentView, isMuted, showShortcutsDialog, leaveRoom, toggleFullscreen, cleanupAll]);

  // ── Feature: Picture-in-Picture Toggle ──
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

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Set preview video source ──
  useEffect(() => {
    if (currentView === "share" && previewVideoRef.current && localStreamRef.current) {
      previewVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [currentView, isSharing]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      cleanupAll();
    };
  }, [cleanupAll]);

  // ── Feature: Derived stats for broadcaster ──
  const activePeerCount = viewers.filter((v) => v.approved).length;
  const estimatedBitrate = 2_500_000; // ~2.5 Mbps estimated
  const estimatedDataTransferred = elapsedTime > 0
    ? (elapsedTime / 1000) * (estimatedBitrate / 8) * activePeerCount
    : 0;

  // ── QR Code URL ──
  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}#${roomId}`
      : "";

  // ── Feature: PiP support check ──
  const pipSupported = typeof document !== "undefined" && !!document.pictureInPictureEnabled;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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
            <Monitor className="size-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-gradient text-lg font-bold">LocalCast</span>
          </button>

          <div className="flex items-center gap-3">
            {currentView !== "home" && currentView !== "join" && (
              <StatusDot status={connectionStatus} />
            )}
            {currentView === "share" && isSharing && (
              <>
                <Badge variant="secondary" className="gap-1.5">
                  <MonitorUp className="size-3" />
                  Sharing
                </Badge>
                {/* Session Timer */}
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
              <Badge variant="secondary" className="gap-1.5">
                <Eye className="size-3" />
                Watching
              </Badge>
            )}
            {/* Dark Mode Toggle */}
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
          {/* ─── VIEW 1: Home ────────────────────────────────────────── */}
          {currentView === "home" && (
            <motion.div
              key="home"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-4xl px-4 py-12"
            >
              {/* Hero with particle dot pattern background */}
              <div className="hero-bg dark:hero-bg-dark relative mb-12 overflow-hidden rounded-2xl px-6 py-12 text-center">
                {/* CSS dot pattern overlay */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.04]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative mb-6"
                >
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl gradient-emerald shadow-lg shadow-emerald-500/20">
                    <Monitor className="size-8 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                    <span className="text-gradient">LocalCast</span>
                  </h1>
                  <p className="mt-3 text-lg text-muted-foreground">
                    Share your screen instantly over your local network.
                    <br className="hidden sm:block" />
                    No sign-up, no cloud, no hassle.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="relative mx-auto flex max-w-md flex-wrap justify-center gap-2"
                >
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Wifi className="size-3" /> Local Network
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Shield className="size-3" /> No Cloud
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Users className="size-3" /> Unlimited Viewers
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Monitor className="size-3" /> WebRTC
                  </Badge>
                </motion.div>
              </div>

              {/* Action Cards with hover scale effect */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="grid gap-6 sm:grid-cols-2"
              >
                {/* Share Screen Card */}
                <motion.div variants={fadeInUp}>
                  <Card className="group cursor-pointer border-2 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-105 dark:hover:border-emerald-400/30 dark:hover:shadow-emerald-400/5">
                    <CardHeader>
                      <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:group-hover:bg-emerald-900">
                        <MonitorUp className="size-6" />
                      </div>
                      <CardTitle className="text-xl">Share Your Screen</CardTitle>
                      <CardDescription>
                        Start a session and share your screen or window with anyone on
                        your network.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        onClick={() => {
                          setError(null);
                          setCurrentView("share");
                        }}
                        className="relative w-full overflow-hidden bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                        size="lg"
                      >
                        {/* Shimmer effect */}
                        <span className="absolute inset-0 overflow-hidden rounded-md">
                          <span
                            className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite]"
                            style={{
                              background:
                                "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                            }}
                          />
                        </span>
                        <MonitorPlay className="relative size-4" />
                        <span className="relative">Start Sharing</span>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>

                {/* View Screen Card */}
                <motion.div variants={fadeInUp}>
                  <Card className="group cursor-pointer border-2 transition-all duration-300 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10 hover:scale-105 dark:hover:border-teal-400/30 dark:hover:shadow-teal-400/5">
                    <CardHeader>
                      <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600 transition-colors group-hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:group-hover:bg-teal-900">
                        <Eye className="size-6" />
                      </div>
                      <CardTitle className="text-xl">Watch a Screen</CardTitle>
                      <CardDescription>
                        Enter a room code to join and watch someone else&apos;s screen
                        in real-time.
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button
                        onClick={() => {
                          setError(null);
                          setCurrentView("join");
                        }}
                        className="relative w-full overflow-hidden bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
                        size="lg"
                      >
                        {/* Shimmer effect */}
                        <span className="absolute inset-0 overflow-hidden rounded-md">
                          <span
                            className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite]"
                            style={{
                              background:
                                "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                            }}
                          />
                        </span>
                        <Monitor className="relative size-4" />
                        <span className="relative">Join a Room</span>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* ─── VIEW 2: Share (Before starting) ──────────────────────── */}
          {currentView === "share" && !isSharing && (
            <motion.div
              key="share-setup"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-lg px-4"
            >
              <Card className="border-2">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl gradient-emerald shadow-lg shadow-emerald-500/20">
                    <MonitorUp className="size-7 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Share Your Screen</CardTitle>
                  <CardDescription>
                    Choose what to share and configure your session settings.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                      <AlertCircle className="size-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Approval toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="size-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Require Approval</p>
                        <p className="text-xs text-muted-foreground">
                          Viewers must be approved before they can see your screen
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={requireApproval}
                      onCheckedChange={setRequireApproval}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button
                    onClick={startSharing}
                    className="relative w-full overflow-hidden bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    size="lg"
                  >
                    {/* Shimmer effect */}
                    <span className="absolute inset-0 overflow-hidden rounded-md">
                      <span
                        className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite]"
                        style={{
                          background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                        }}
                      />
                    </span>
                    <MonitorPlay className="relative size-4" />
                    <span className="relative">Start Screen Sharing</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCurrentView("home");
                      setError(null);
                    }}
                    className="w-full"
                  >
                    <ArrowLeft className="size-4" />
                    Back to Home
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* ─── VIEW 2: Share (Active Sharing) ───────────────────────── */}
          {currentView === "share" && isSharing && (
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
                            <span className="text-3xl font-bold tracking-[0.3em] text-emerald-700 dark:text-emerald-300">
                              {roomId}
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={copyRoomCode}
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
                              onClick={() => setShowQrDialog(true)}
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
                        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
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
                                    onClick={() => approveViewer(viewer.id)}
                                    title="Approve"
                                  >
                                    <Check className="size-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                                    onClick={() => denyViewer(viewer.id)}
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
                                  onClick={() => disconnectViewer(viewer.id)}
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
                        onClick={stopSharing}
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
                            <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/30 p-3">
                              <Activity className="size-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs font-medium text-muted-foreground">Peers</span>
                              <span className="text-lg font-bold tabular-nums">{activePeerCount}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/30 p-3">
                              <Monitor className="size-4 text-teal-600 dark:text-teal-400" />
                              <span className="text-xs font-medium text-muted-foreground">Resolution</span>
                              <span className="text-xs font-bold tabular-nums leading-5">{streamResolution}</span>
                            </div>
                            <div className="flex flex-col items-center gap-1 rounded-lg border bg-muted/30 p-3">
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
          )}

          {/* ─── VIEW 3: Join Room ────────────────────────────────────── */}
          {currentView === "join" && (
            <motion.div
              key="join"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="w-full max-w-md px-4"
            >
              <Card className="border-2">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
                    <Eye className="size-7" />
                  </div>
                  <CardTitle className="text-2xl">Join a Room</CardTitle>
                  <CardDescription>
                    Enter the 6-character room code to start watching a shared
                    screen.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
                      <AlertCircle className="size-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  {waitingApproval && (
                    <div className="flex flex-col items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-center dark:border-yellow-800 dark:bg-yellow-950/50">
                      <Loader2 className="size-6 animate-spin text-yellow-600 dark:text-yellow-400" />
                      <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                        Waiting for host approval...
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="room-code" className="text-sm font-medium">
                      Room Code
                    </label>
                    <Input
                      id="room-code"
                      placeholder="e.g. ABC123"
                      value={viewerInput}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const val = e.target.value.toUpperCase().slice(0, 6);
                        setViewerInput(val);
                        setError(null);
                      }}
                      className="h-14 text-center text-2xl font-bold tracking-[0.3em]"
                      maxLength={6}
                      onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === "Enter" && viewerInput.length === 6) joinRoom();
                      }}
                      autoFocus
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex-col gap-2">
                  <Button
                    onClick={joinRoom}
                    disabled={viewerInput.length !== 6 || waitingApproval}
                    className="w-full bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
                    size="lg"
                  >
                    <Wifi className="size-4" />
                    {waitingApproval ? "Waiting..." : "Join Room"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setCurrentView("home");
                      setViewerInput("");
                      setError(null);
                      setWaitingApproval(false);
                    }}
                    className="w-full"
                  >
                    <ArrowLeft className="size-4" />
                    Back to Home
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          )}

          {/* ─── VIEW 4: Watching ──────────────────────────────────────── */}
          {currentView === "watching" && (
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
              <div className="mb-3 flex items-center justify-between rounded-xl border bg-background/60 p-2 backdrop-blur-lg">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={leaveRoom}
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
                    onClick={() => {
                      if (videoRef.current) {
                        videoRef.current.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
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
                      onClick={togglePiP}
                      title="Picture-in-Picture"
                    >
                      <PictureInPicture2 className="size-4" />
                    </Button>
                  )}

                  {/* Fullscreen */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleFullscreen}
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
                    <Button variant="outline" onClick={leaveRoom}>
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
                    <Button variant="outline" onClick={leaveRoom} className="mt-4">
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

              {/* Room info bar with frosted glass */}
              <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border bg-background/60 px-4 py-2 text-sm text-muted-foreground backdrop-blur-lg">
                <Monitor className="size-4" />
                <span>
                  Watching room{" "}
                  <span className="font-mono font-bold text-foreground">
                    {roomId}
                  </span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <Shield className="size-3" />
            <span>Peer-to-peer · No data leaves your network</span>
          </div>
          {/* Keyboard Shortcuts Help Button */}
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
      <Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to control your viewing experience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Leave / Go Back</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono font-medium">
                Esc
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Toggle Fullscreen</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono font-medium">
                F
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">Mute / Unmute</span>
              <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono font-medium">
                M
              </kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Inline Keyframes for Shimmer Effect ───────────────────────── */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
