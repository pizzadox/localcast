"use client";

// ─── JoinView ────────────────────────────────────────────────────────────
// Join Room screen where viewers enter a 6-character room code.

import { useRef, useEffect, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Loader2,
  ShieldAlert,
  Lock,
  Clipboard,
  CircleCheck,
} from "lucide-react";

import { pageVariants } from "./types";
import { useState } from "react";

interface JoinViewProps {
  viewerInput: string;
  onViewerInputChange: (v: string) => void;
  onJoinRoom: () => void;
  onClearError: () => void;
  error: string | null;
  waitingApproval: boolean;
  roomRequiresPassword: boolean;
  joinPassword: string;
  onJoinPasswordChange: (v: string) => void;
  onBack: () => void;
}

export function JoinView({
  viewerInput,
  onViewerInputChange,
  onJoinRoom,
  onClearError,
  error,
  waitingApproval,
  roomRequiresPassword,
  joinPassword,
  onJoinPasswordChange,
  onBack,
}: JoinViewProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Focus the correct input box
  useEffect(() => {
    const idx = Math.min(viewerInput.length, 5);
    inputRefs.current[idx]?.focus();
  }, [viewerInput.length]);

  const handleChange = (index: number, value: string) => {
    if (waitingApproval) return;
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length === 0) return;

    // Build new value: everything before index + cleaned[0]
    const newVal = viewerInput.slice(0, index) + cleaned[0];
    onViewerInputChange(newVal);
    onClearError();

    // Auto-advance to next box
    if (newVal.length < 6) {
      inputRefs.current[newVal.length]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (waitingApproval) return;

    if (e.key === "Backspace") {
      if (viewerInput[index]) {
        // Clear current char
        const newVal = viewerInput.slice(0, index) + viewerInput.slice(index + 1);
        onViewerInputChange(newVal);
      } else if (index > 0) {
        // Go back to previous box and clear
        const newVal = viewerInput.slice(0, index - 1);
        onViewerInputChange(newVal);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Enter" && viewerInput.length === 6) {
      onJoinRoom();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (waitingApproval) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (pasted.length > 0) {
      onViewerInputChange(pasted);
      onClearError();
      const nextIdx = Math.min(pasted.length, 5);
      inputRefs.current[nextIdx]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    // Select text in the box for easy replacement
    inputRefs.current[index]?.select();
  };

  return (
    <motion.div
      key="join"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="w-full max-w-md px-4"
    >
      <Card className="glass-card relative overflow-hidden border-2 shadow-lg">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500" />

        {/* Connection status indicator (top-right corner) */}
        <div className="absolute top-4 right-4 z-10">
          <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all duration-300 ${
            viewerInput.length === 6
              ? "border-emerald-300 bg-emerald-50 text-emerald-600 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "border-border/60 bg-muted/40 text-muted-foreground"
          }`}>
            {viewerInput.length === 6 ? (
              <>
                <CircleCheck className="size-3" />
                <span>Ready</span>
              </>
            ) : (
              <>
                <span className={`size-1.5 rounded-full ${viewerInput.length > 0 ? "bg-amber-400" : "bg-muted-foreground/40"}`} />
                <span>{viewerInput.length}/6</span>
              </>
            )}
          </div>
        </div>

        <CardHeader className="text-center">
          <motion.div
            className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400 float-animation"
          >
            <Eye className="size-7" />
          </motion.div>
          <CardTitle className="text-2xl">Join a Room</CardTitle>
          <CardDescription>
            Enter the 6-character room code to start watching a shared
            screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
            >
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {waitingApproval ? (
              <motion.div
                key="approval-waiting"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center gap-4 rounded-xl border border-yellow-200/80 bg-yellow-50/80 p-6 text-center dark:border-yellow-800/60 dark:bg-yellow-950/30"
              >
                {/* Pulsing approval animation */}
                <div className="relative flex size-16 items-center justify-center">
                  <span className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping" />
                  <span className="absolute inset-2 rounded-full bg-yellow-400/10 animate-pulse" />
                  <span className="absolute inset-4 rounded-full border-2 border-dashed border-yellow-400/30 animate-spin" style={{ animationDuration: "4s" }} />
                  <div className="relative flex size-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/60">
                    <ShieldAlert className="size-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">
                    Waiting for host approval...
                  </p>
                  <p className="mt-1 text-xs text-yellow-600/60 dark:text-yellow-400/60">
                    The host will review your request shortly
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="code-input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <label className="block text-center text-sm font-medium">
                  Room Code
                </label>

                {/* Segmented character inputs */}
                <div className="segmented-input">
                  {Array.from({ length: 6 }, (_, i) => (
                    <motion.input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      maxLength={1}
                      inputMode="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="characters"
                      value={viewerInput[i] || ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(i, e.target.value)}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(i, e)}
                      onPaste={handlePaste}
                      onFocus={() => handleFocus(i)}
                      className={`seg-char ${viewerInput[i] ? "filled" : ""} ${i === viewerInput.length ? "active" : ""}`}
                      aria-label={`Character ${i + 1} of room code`}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <p className="text-center text-xs text-muted-foreground/50">
                    Paste or type 6 characters
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.readText().then((text) => {
                        const pasted = text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                        if (pasted.length > 0) {
                          onViewerInputChange(pasted);
                          onClearError();
                          const nextIdx = Math.min(pasted.length, 5);
                          inputRefs.current[nextIdx]?.focus();
                        }
                      });
                    }}
                    className="flex items-center gap-1 rounded-md border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:border-border hover:text-foreground"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="size-3" />
                    Paste
                  </button>
                </div>

                {/* Password input (shown when room requires password) */}
                <AnimatePresence>
                  {roomRequiresPassword && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <Lock className="size-4" />
                        <label className="text-sm font-medium">Room Password</label>
                      </div>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={joinPassword}
                          onChange={(e) => {
                            onJoinPasswordChange(e.target.value);
                            onClearError();
                          }}
                          placeholder="Enter room password"
                          className="glass-input w-full rounded-lg border border-amber-300/60 bg-amber-50/30 px-3 py-2.5 pr-10 text-sm outline-none transition-all focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 dark:border-amber-800/60 dark:bg-amber-950/30"
                          maxLength={32}
                          aria-label="Room password"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && joinPassword.length > 0) {
                              onJoinRoom();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="w-full"
          >
            <Button
              onClick={onJoinRoom}
              disabled={viewerInput.length !== 6 || waitingApproval}
              className={`btn-disabled-enhanced relative w-full overflow-hidden bg-teal-600 text-white shadow-lg shadow-teal-500/25 hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-500/30 transition-all dark:bg-teal-600 dark:hover:bg-teal-700 h-12 text-base font-semibold disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed ${viewerInput.length === 6 && !waitingApproval ? "animate-border-glow" : ""}`}
              size="lg"
            >
              <span className="absolute inset-0 overflow-hidden rounded-md">
                <span
                  className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
                  }}
                />
              </span>
              {waitingApproval ? (
                <>
                  <Loader2 className="relative size-4 animate-spin" />
                  <span className="relative">Waiting for Approval...</span>
                </>
              ) : (
                <>
                  <Wifi className="relative size-4" />
                  <span className="relative">Join Room</span>
                </>
              )}
            </Button>
          </motion.div>
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
