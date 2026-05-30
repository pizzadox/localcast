"use client";

// ─── ShareSetupView ───────────────────────────────────────────────────────
// Share setup screen displayed before the user starts screen sharing.

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
import { AlertCircle, MonitorPlay, MonitorUp, ArrowLeft, Shield, Settings2, Gauge } from "lucide-react";

import { pageVariants, QUALITY_PRESETS } from "./types";
import type { QualityPreset } from "./types";

interface ShareSetupViewProps {
  onStartSharing: () => void;
  requireApproval: boolean;
  onToggleApproval: (v: boolean) => void;
  qualityPreset: QualityPreset;
  onQualityChange: (v: QualityPreset) => void;
  error: string | null;
  onBack: () => void;
}

export function ShareSetupView({
  onStartSharing,
  requireApproval,
  onToggleApproval,
  qualityPreset,
  onQualityChange,
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
      <Card className="border-2 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl gradient-emerald shadow-lg shadow-emerald-500/25">
            <MonitorUp className="size-7 text-white" />
          </div>
          <CardTitle className="text-2xl">Share Your Screen</CardTitle>
          <CardDescription>
            Choose what to share and configure your session settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Quality Presets */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Stream Quality</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(QUALITY_PRESETS) as [QualityPreset, typeof QUALITY_PRESETS.high][]).map(
                ([key, config]) => (
                  <button
                    key={key}
                    onClick={() => onQualityChange(key)}
                    className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all ${
                      qualityPreset === key
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
                        : "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className={`text-lg font-bold ${qualityPreset === key ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                      {config.label}
                    </span>
                    <span className="text-[10px] leading-tight">
                      {config.frameRate.ideal}fps
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Approval toggle */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400">
                <Shield className="size-4" />
              </div>
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
