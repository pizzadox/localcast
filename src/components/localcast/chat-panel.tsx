"use client";

// ─── ChatPanel ────────────────────────────────────────────────────────────
// Slide-in chat panel for host/viewer messaging during active sessions.

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, MonitorUp, Eye } from "lucide-react";

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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

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
        className="fixed right-0 top-14 bottom-0 z-50 flex w-full max-w-sm flex-col border-l bg-background shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <MonitorUp className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Session Chat</h3>
              <p className="text-[11px] text-muted-foreground">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-3"
        >
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <MonitorUp className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <p className="text-xs text-muted-foreground/60">
                Say hello to start the conversation
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg, idx) => {
                const isOwn = (isHost && msg.senderType === "host") || (!isHost && msg.senderId === "self");
                return (
                  <motion.div
                    key={msg.id || `${msg.senderId}-${msg.timestamp}-${idx}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}
                  >
                    {/* Show sender name only if different from previous */}
                    {(idx === 0 || messages[idx - 1]?.senderId !== msg.senderId) && (
                      <div className={`flex items-center gap-1 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
                        <span className={`text-[11px] font-medium ${
                          msg.senderType === "host"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-teal-600 dark:text-teal-400"
                        }`}>
                          {msg.senderType === "host" ? "📹 Host" : msg.senderName}
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {formatElapsed(Date.now() - msg.timestamp)} ago
                        </span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        isOwn
                          ? "rounded-br-md bg-emerald-600 text-white dark:bg-emerald-700"
                          : "rounded-bl-md bg-muted"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1"
              maxLength={500}
              autoFocus
            />
            <Button
              size="icon"
              onClick={onSend}
              disabled={!input.trim()}
              className="size-9 shrink-0 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              <Send className="size-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
            Press Enter to send · Messages are local only
          </p>
        </div>
      </motion.div>
    </>
  );
}
