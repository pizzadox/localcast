"use client";

// ─── ShareSetupView ───────────────────────────────────────────────────────
// Share setup screen displayed before the user starts screen sharing.
// Contains approval toggle and the start sharing button.

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
import { Switch } from "@/components/ui/switch";
import { AlertCircle, MonitorPlay, MonitorUp, ArrowLeft, Shield } from "lucide-react";

import { pageVariants } from "./types";

interface ShareSetupViewProps {
  onStartSharing: () => void;
  requireApproval: boolean;
  onToggleApproval: (v: boolean) => void;
  error: string | null;
  onBack: () => void;
}

export function ShareSetupView({
  onStartSharing,
  requireApproval,
  onToggleApproval,
  error,
  onBack,
}: ShareSetupViewProps) {
  return (
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
              onCheckedChange={onToggleApproval}
            />
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Button
            onClick={onStartSharing}
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
