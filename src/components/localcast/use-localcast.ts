"use client";

// ─── useLocalCast ─────────────────────────────────────────────────────────
// Custom hook encapsulating all LocalCast state management, WebRTC, and
// Socket.IO logic. Returns everything the UI layer needs.

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

import type { View, ViewerInfo, ChatMessage, Reaction, QualityPreset } from "./types";
import { ICE_CONFIG, parseDeviceInfo, QUALITY_PRESETS, generateId } from "./types";

// ─── Hook Return Type ────────────────────────────────────────────────────

export interface UseLocalCastReturn {
  // View state
  currentView: View;
  setCurrentView: (v: View) => void;

  // Broadcaster state
  roomId: string;
  isSharing: boolean;
  requireApproval: boolean;
  setRequireApproval: (v: boolean) => void;
  hostId: string;
  qualityPreset: QualityPreset;
  setQualityPreset: (v: QualityPreset) => void;

  // Viewer state
  viewerInput: string;
  setViewerInput: (v: string) => void;
  isMuted: boolean;
  setIsMuted: (v: boolean) => void;
  isFullscreen: boolean;
  connectionQuality: "good" | "fair" | "poor";

  // Shared state
  connectionStatus: "disconnected" | "connecting" | "connected";
  viewers: ViewerInfo[];
  error: string | null;
  setError: (e: string | null) => void;
  showQrDialog: boolean;
  setShowQrDialog: (v: boolean) => void;
  showShortcutsDialog: boolean;
  setShowShortcutsDialog: (v: boolean) => void;
  showChatPanel: boolean;
  setShowChatPanel: (v: boolean) => void;
  copied: boolean;
  elapsedDisplay: string;
  elapsedTime: number;
  waitingApproval: boolean;
  setWaitingApproval: (v: boolean) => void;
  pipSupported: boolean;
  activePeerCount: number;
  estimatedDataTransferred: number;
  qrUrl: string;
  streamResolution: string;
  latency: number;

  // Chat
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  sendChatMessage: () => void;
  unreadCount: number;

  // Reactions
  recentReactions: Reaction[];

  // Live stats
  currentBitrate: number;

  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  previewVideoRef: React.RefObject<HTMLVideoElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Actions
  startSharing: () => Promise<void>;
  stopSharing: () => void;
  approveViewer: (viewerId: string) => void;
  denyViewer: (viewerId: string) => void;
  disconnectViewer: (viewerId: string) => void;
  joinRoom: () => void;
  leaveRoom: () => void;
  toggleFullscreen: () => void;
  togglePiP: () => Promise<void>;
  copyRoomCode: () => Promise<void>;
  sendReaction: (emoji: string) => void;
  cleanupAll: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useLocalCast(): UseLocalCastReturn {
  // ── View State ──
  const [currentView, setCurrentView] = useState<View>("home");

  // ── Broadcaster State ──
  const [roomId, setRoomId] = useState<string>("");
  const [isSharing, setIsSharing] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);
  const [hostId, setHostId] = useState<string>("");
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("medium");

  // ── Viewer State ──
  const [viewerInput, setViewerInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<"good" | "fair" | "poor">("good");
  const [latency, setLatency] = useState(0);

  // ── Shared State ──
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [waitingApproval, setWaitingApproval] = useState(false);

  // ── Chat State ──
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Reactions State ──
  const [recentReactions, setRecentReactions] = useState<Reaction[]>([]);

  // ── Feature: Session Timer State ──
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const shareStartRef = useRef<Date | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Feature: Connection Stats State ──
  const [streamResolution, setStreamResolution] = useState<string>("—");
  const [currentBitrate, setCurrentBitrate] = useState(0);

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

  // ── Reconnection state ──
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intentionalDisconnectRef = useRef(false);
  const lastPingRef = useRef<number>(0);

  // ── Stats tracking refs ──
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevBytesSentRef = useRef<Map<string, number>>(new Map());

  // ── Get or create socket with auto-reconnection ──
  const getSocket = useCallback((): Socket => {
    if (!socketRef.current) {
      intentionalDisconnectRef.current = false;
      const socket = io("/?XTransformPort=3003", {
        reconnection: false,
        timeout: 10000,
      });

      socket.on("connect", () => {
        reconnectAttemptRef.current = 0;
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      });

      socket.on("disconnect", (reason) => {
        if (
          !intentionalDisconnectRef.current &&
          (isSharing || currentView === "watching" || currentView === "join")
        ) {
          const attempt = reconnectAttemptRef.current;
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          reconnectAttemptRef.current = attempt + 1;

          toast.warning(
            `Connection lost. Reconnecting in ${Math.round(delay / 1000)}s...`,
            { id: "reconnect" }
          );

          reconnectTimerRef.current = setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              socketRef.current.connect();
            }
          }, delay);
        }
      });

      socketRef.current = socket;
    }
    return socketRef.current;
  }, [isSharing, currentView]);

  // ── Remove all listeners from socket to prevent duplicates ──
  const removeAllListeners = useCallback((socket: Socket) => {
    const events = [
      "connect", "disconnect", "connect_error",
      "ROOM_CREATED", "VIEWER_JOINED", "WEBRTC_SIGNAL",
      "VIEWER_DISCONNECTED", "ERROR", "ROOM_JOINED",
      "VIEWER_APPROVED", "VIEWER_DENIED", "HOST_DISCONNECTED",
      "ROOM_NOT_FOUND", "KICKED", "ROOM_SETTINGS_UPDATED",
      "CHAT_MESSAGE", "REACTION", "VIEWER_COUNT_UPDATE",
    ];
    events.forEach((e) => socket.removeAllListeners(e));
  }, []);

  // ── Cleanup resources ──
  const cleanupAll = useCallback(() => {
    intentionalDisconnectRef.current = true;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
    toast.dismiss("reconnect");

    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();

    if (viewerPeerRef.current) {
      viewerPeerRef.current.close();
      viewerPeerRef.current = null;
    }

    pendingCandidatesRef.current.clear();

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (socketRef.current) {
      removeAllListeners(socketRef.current);
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }

    // Stats interval cleanup
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    prevBytesSentRef.current.clear();

    setConnectionStatus("disconnected");
    setIsSharing(false);
    setRoomId("");
    setViewers([]);
    setError(null);
    setIsFullscreen(false);
    setConnectionQuality("good");
    setHostId("");
    setWaitingApproval(false);
    setChatMessages([]);
    setChatInput("");
    setShowChatPanel(false);
    setUnreadCount(0);
    setRecentReactions([]);
    setCurrentBitrate(0);

    shareStartRef.current = null;
    setElapsedTime(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    setStreamResolution("—");
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
      const poll = setInterval(() => {
        updateResolution();
      }, 2000);
      return () => {
        video.removeEventListener("loadedmetadata", updateResolution);
        clearInterval(poll);
      };
    }
  }, [isSharing]);

  // ── Feature: Live bitrate stats for broadcaster ──
  useEffect(() => {
    if (!isSharing || peersRef.current.size === 0) return;

    statsIntervalRef.current = setInterval(() => {
      peersRef.current.forEach((pc) => {
        const stats = pc.getStats();
        stats.then((report) => {
          report.forEach((value) => {
            if (value.type === "outbound-rtp" && value.kind === "video") {
              const bytes = value.bytesSent ?? 0;
              const prev = prevBytesSentRef.current.get(pc.id) ?? 0;
              const delta = bytes - prev;
              const bitrate = (delta * 8) / 3;
              setCurrentBitrate(bitrate);
              prevBytesSentRef.current.set(pc.id, bytes);
            }
          });
        });
      });
    }, 3000);
    return () => {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
    };
  }, [isSharing, viewers.length]);

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

  // ── Send Chat Message ──
  const sendChatMessage = useCallback(() => {
    const msg = chatInput.trim();
    if (!msg || !socketRef.current?.connected || !roomId) return;

    const socket = socketRef.current;
    const senderType = isSharing ? "host" : "viewer";
    const senderName = isSharing ? "Host" : parseDeviceInfo(navigator.userAgent).browser;

    socket.emit("CHAT_MESSAGE", {
      roomId,
      message: msg,
      senderName,
      senderType,
    });
    setChatInput("");
  }, [chatInput, roomId, isSharing]);

  // ── Send Reaction (viewer only) ──
  const sendReaction = useCallback((emoji: string) => {
    if (!socketRef.current?.connected || !roomId) return;
    socketRef.current.emit("REACTION", {
      roomId,
      emoji,
    });
  }, [roomId]);

  // ── Broadcaster: Create Peer for Viewer ──
  const createBroadcasterPeer = useCallback(
    (viewerId: string, socket: Socket, stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_CONFIG);
      peersRef.current.set(viewerId, pc);

      if (!pendingCandidatesRef.current.has(viewerId)) {
        pendingCandidatesRef.current.set(viewerId, []);
      }

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Set bitrate on sender
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          // Set bitrate constraint on video sender
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
          console.error("Error creating offer:", err);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("WEBRTC_SIGNAL", {
            targetId: viewerId,
            signal: event.candidate.toJSON(),
          });
        }
      };

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
    [qualityPreset]
  );

  // ── Broadcaster: Handle incoming signal from viewer ──
  const handleBroadcasterSignal = useCallback(
    (data: { from: string; signal: unknown }) => {
      const viewerId = data.from;
      const signal = data.signal;
      if (!viewerId || !signal) return;

      const pc = peersRef.current.get(viewerId);
      if (!pc) return;

      const sig = signal as RTCSessionDescriptionInit | RTCIceCandidateInit;

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
          const pending = pendingCandidatesRef.current.get(viewerId) || [];
          pending.push(candidate);
          pendingCandidatesRef.current.set(viewerId, pending);
        }
      }
    },
    []
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

      const preset = QUALITY_PRESETS[qualityPreset];

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          width: preset.width,
          height: preset.height,
          frameRate: preset.frameRate,
        },
        audio: true,
      });
      localStreamRef.current = stream;

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        stopSharing();
      });

      const socket = getSocket();
      removeAllListeners(socket);

      socket.on("connect", () => {
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
            if (prev.some((v) => v.id === data.viewerId)) return prev;
            return [...prev, newViewer];
          });
          toast.info(`${parsed.deviceName} joined`);

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

        socket.on("CHAT_MESSAGE", (data: ChatMessage) => {
          setChatMessages((prev) => [...prev.slice(-99), { ...data, id: data.id || generateId() }]);
          if (!showChatPanel) {
            setUnreadCount((c) => c + 1);
          }
        });

        socket.on("REACTION", (data: Reaction) => {
          const reaction: Reaction = { ...data, id: generateId() };
          setRecentReactions((prev) => [...prev.slice(-19), reaction]);
          // Auto-remove after 5s
          setTimeout(() => {
            setRecentReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }, 5000);
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
  }, [getSocket, qualityPreset, requireApproval, removeAllListeners, createBroadcasterPeer, handleBroadcasterSignal, stopSharing, showChatPanel]);

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
  const handleViewerSignal = useCallback(
    (data: { from: string; signal: unknown }) => {
      const socket = getSocket();
      const broadcasterId = data.from;
      const signal = data.signal;
      if (!signal) return;

      const sig = signal as RTCSessionDescriptionInit | RTCIceCandidateInit;

      if ("type" in sig && sig.type === "offer") {
        const offer = sig as RTCSessionDescriptionInit;

        if (viewerPeerRef.current) {
          viewerPeerRef.current.close();
        }

        const pc = new RTCPeerConnection(ICE_CONFIG);
        viewerPeerRef.current = pc;

        if (!pendingCandidatesRef.current.has(broadcasterId)) {
          pendingCandidatesRef.current.set(broadcasterId, []);
        }

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("WEBRTC_SIGNAL", {
              targetId: broadcasterId,
              signal: event.candidate.toJSON(),
            });
          }
        };

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

        pc.setRemoteDescription(new RTCSessionDescription(offer))
          .then(async () => {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit("WEBRTC_SIGNAL", {
              targetId: broadcasterId,
              signal: answer,
            });

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

      void socket;
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

      socket.on("CHAT_MESSAGE", (data: ChatMessage) => {
        setChatMessages((prev) => [...prev.slice(-99), { ...data, id: data.id || generateId() }]);
        if (!showChatPanel) {
          setUnreadCount((c) => c + 1);
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

    socket.on("connect_error", () => {
      setConnectionStatus("disconnected");
      toast.error("Cannot connect to signaling server");
      setError("Cannot connect to signaling server. Make sure it's running on port 3003.");
    });
  }, [viewerInput, getSocket, cleanupAll, removeAllListeners, handleViewerSignal, showChatPanel]);

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
  }, [currentView, isMuted, showShortcutsDialog, showChatPanel, leaveRoom, toggleFullscreen, cleanupAll]);

  // ── Picture-in-Picture Toggle ──
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

  // ── Derived stats ──
  const activePeerCount = viewers.filter((v) => v.approved).length;
  const estimatedBitrate = currentBitrate > 0 ? currentBitrate : QUALITY_PRESETS[qualityPreset].bitrate;
  const estimatedDataTransferred = elapsedTime > 0
    ? (elapsedTime / 1000) * (estimatedBitrate / 8) * activePeerCount
    : 0;

  // ── QR Code URL ──
  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${window.location.pathname}#${roomId}`
      : "";

  // ── PiP support ──
  const pipSupported = typeof document !== "undefined" && !!document.pictureInPictureEnabled;

  // ── Latency measurement ──
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

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const handler = () => {
      if (lastPingRef.current > 0) {
        const rtt = Date.now() - lastPingRef.current;
        setLatency(rtt);
        lastPingRef.current = 0;
      }
    };

    socket.on("PONG", handler);
    return () => { socket.off("PONG", handler); };
  }, []);

  // ── Format elapsed ──
  const elapsedDisplay = formatElapsedDisplay(elapsedTime);

  return {
    currentView,
    setCurrentView,
    roomId,
    isSharing,
    requireApproval,
    setRequireApproval,
    hostId,
    qualityPreset,
    setQualityPreset,
    viewerInput,
    setViewerInput,
    isMuted,
    setIsMuted,
    isFullscreen,
    connectionQuality,
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
    elapsedDisplay,
    elapsedTime,
    waitingApproval,
    setWaitingApproval,
    pipSupported,
    activePeerCount,
    estimatedDataTransferred,
    qrUrl,
    streamResolution,
    latency,
    chatMessages,
    chatInput,
    setChatInput,
    sendChatMessage,
    unreadCount,
    recentReactions,
    currentBitrate,
    videoRef,
    previewVideoRef,
    containerRef,
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
  };
}

function formatElapsedDisplay(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
