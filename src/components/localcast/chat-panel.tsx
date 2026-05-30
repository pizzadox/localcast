"use client";

// ─── ChatPanel ────────────────────────────────────────────────────────────
// Slide-in chat panel for host/viewer messaging during active sessions.

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, MonitorUp, MessageCircle } from "lucide-react";
import type { ChatMessage } from "./types";
import { formatElapsed } from "./types";

interface ChatPanelProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  isHost: boolean;
  onClose: () => void;
}

export function ChatPanel({
  messages,
  input,
  onInputChange,
  onSend,
  isHost,
  onClose,
}: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showTyping, setShowTyping] = useState(false);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Simulate typing indicator when someone is typing (hide after send)
  useEffect(() => {
    if (input.length > 0 && input.length < 20) {
      setShowTyping(true);
    } else {
      setShowTyping(false);
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed right-0 top-14 bottom-0 z-50 flex w-full max-w-sm flex-col border-l bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:bg-background/95 chat-border-glow"
        style={{ boxShadow: "-4px 0 24px rgba(0,0,0,0.08)" }}
      >
        {/* Header with gradient */}
        <div className="chat-header-gradient flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl gradient-emerald shadow-sm shadow-emerald-500/20">
              <MonitorUp className="size-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Session Chat</h3>
                <span className="online-dot" />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 hover:bg-muted transition-colors"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="relative">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/30 breathing">
                  <MessageCircle className="size-7 text-muted-foreground/30" />
                </div>
                <motion.div
                  animate={{ opacity: [0.2, 0.5, 0.2], scale: [0.95, 1, 0.95], y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50"
                >
                  <span className="size-2 rounded-full bg-emerald-400" />
                </motion.div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground/60">No messages yet</p>
                <p className="mt-0.5 text-xs text-muted-foreground/35">
                  Say hello to start the conversation
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => {
                const isOwn = (isHost && msg.senderType === "host") || (!isHost && msg.senderId === "self");
                return (
                  <motion.div
                    key={msg.id || `${msg.senderId}-${msg.timestamp}-${idx}`}
                    initial={{ opacity: 0, y: 12, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.35, type: "spring", stiffness: 500, damping: 28 }}
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                  >
                    {/* Show sender name only if different from previous */}
                    {(idx === 0 || messages[idx - 1]?.senderId !== msg.senderId) && (
                      <div className={`flex items-center gap-1.5 mb-1 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <span className="online-dot" />
                        {msg.senderType === "host" ? (
                          <span className="badge-gradient-host">Host</span>
                        ) : (
                          <span className="badge-gradient-viewer">{msg.senderName}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground/30">
                          {formatElapsed(Date.now() - msg.timestamp)} ago
                        </span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        isOwn
                          ? "msg-bubble-own rounded-br-sm"
                          : "msg-bubble-other rounded-bl-sm"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator */}
              <AnimatePresence>
                {showTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className={`flex items-center gap-2 ${isHost ? "justify-start" : "justify-end"}`}
                  >
                    <div className="msg-bubble-other rounded-2xl rounded-bl-sm px-3 py-2 skeleton-shine">
                      <div className="typing-indicator text-muted-foreground">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Gradient separator between messages and input */}
        <div className="gradient-message-separator" />

        {/* Input */}
        <div className="border-t bg-muted/10 p-3">
          <div className="focus-ring-animated flex items-center gap-2 rounded-xl border border-transparent">
            <div className="relative flex-1">
              <Input
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="glass-input flex-1 pr-10 rounded-xl h-10"
                maxLength={500}
                autoFocus
              />
            </div>
            <motion.div whileTap={{ scale: 0.92 }}>
              <Button
                size="icon"
                onClick={onSend}
                disabled={!input.trim()}
                className={`size-10 shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:shadow-none btn-3d ${input.trim() ? "send-active" : ""}`}
              >
                <Send className="size-4" />
              </Button>
            </motion.div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/30">
            Press Enter to send · Messages are local only
          </p>
        </div>
      </motion.div>
    </>
  );
}
