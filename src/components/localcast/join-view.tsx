"use client";

// ─── JoinView ────────────────────────────────────────────────────────────
// Join Room screen where viewers enter a 6-character room code.

import { type ChangeEvent } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  Loader2,
  Wifi,
} from "lucide-react";

import { pageVariants } from "./types";

interface JoinViewProps {
  viewerInput: string;
  onViewerInputChange: (v: string) => void;
  onJoinRoom: () => void;
  onClearError: () => void;
  error: string | null;
  waitingApproval: boolean;
  onBack: () => void;
}

export function JoinView({
  viewerInput,
  onViewerInputChange,
  onJoinRoom,
  onClearError,
  error,
  waitingApproval,
  onBack,
}: JoinViewProps) {
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
                onViewerInputChange(val);
                onClearError();
              }}
              className="h-14 text-center text-2xl font-bold tracking-[0.3em]"
              maxLength={6}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter" && viewerInput.length === 6) onJoinRoom();
              }}
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            onClick={onJoinRoom}
            disabled={viewerInput.length !== 6 || waitingApproval}
            className="w-full bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
            size="lg"
          >
            <Wifi className="size-4" />
            {waitingApproval ? "Waiting..." : "Join Room"}
          </Button>
          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full"
          >
            <ArrowLeft className="size-4" />
            Back to Home
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
