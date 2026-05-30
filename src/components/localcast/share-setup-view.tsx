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
import {
  AlertCircle,
  MonitorPlay,
  MonitorUp,
  ArrowLeft,
  Shield,
  Gauge,
  Sparkles,
  Maximize2,
  Monitor,
  Smartphone,
  LayoutGrid,
  AppWindow,
  Globe,
} from "lucide-react";

import { pageVariants, QUALITY_PRESETS, SHARE_MODE_CONFIG } from "./types";
import type { QualityPreset, ShareMode } from "./types";

interface ShareSetupViewProps {
  onStartSharing: () => void;
  requireApproval: boolean;
  onToggleApproval: (v: boolean) => void;
  qualityPreset: QualityPreset;
  onQualityChange: (v: QualityPreset) => void;
  shareMode: ShareMode;
  onShareModeChange: (v: ShareMode) => void;
  error: string | null;
  onBack: () => void;
}

const qualityIcons: Record<QualityPreset, typeof Maximize2> = {
  high: Maximize2,
  medium: Monitor,
  low: Smartphone,
};

const qualityColors: Record<QualityPreset, string> = {
  high: "text-emerald-600 dark:text-emerald-400",
  medium: "text-teal-600 dark:text-teal-400",
  low: "text-amber-600 dark:text-amber-400",
};

const shareModeIcons: Record<ShareMode, typeof Monitor> = {
  screen: Monitor,
  window: AppWindow,
  tab: Globe,
};

const shareModeColors: Record<ShareMode, string> = {
  screen: "text-emerald-600 dark:text-emerald-400",
  window: "text-teal-600 dark:text-teal-400",
  tab: "text-cyan-600 dark:text-cyan-400",
};

export function ShareSetupView({
  onStartSharing,
  requireApproval,
  onToggleApproval,
  qualityPreset,
  onQualityChange,
  shareMode,
  onShareModeChange,
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
      <Card className="glass-card overflow-hidden border-2 shadow-lg">
        {/* Top gradient bar */}
        <div className="h-1 gradient-emerald" />

        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl gradient-emerald shadow-lg shadow-emerald-500/25 float-animation">
            <MonitorUp className="size-7 text-white" />
          </div>
          <CardTitle className="text-2xl">Share Your Screen</CardTitle>
          <CardDescription>
            Choose what to share and configure your session settings.
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

          {/* Share Mode Selector */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Share Mode</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(SHARE_MODE_CONFIG) as [ShareMode, typeof SHARE_MODE_CONFIG.screen][]).map(
                ([key, config]) => {
                  const Icon = shareModeIcons[key];
                  const isSelected = shareMode === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onShareModeChange(key)}
                      className={`quality-card relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 ${
                        isSelected
                          ? "selected border-emerald-500"
                          : "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className={`flex size-8 items-center justify-center rounded-lg transition-all duration-200 ${
                        isSelected
                          ? "bg-emerald-100 dark:bg-emerald-950/80"
                          : "bg-muted/50"
                      }`}>
                        <Icon className={`size-4 ${shareModeColors[key]}`} />
                      </div>
                      <span className={`text-xs font-bold leading-none ${isSelected ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        {config.label.split(" ")[0]}
                      </span>
                      <span className={`text-[10px] leading-tight text-center ${isSelected ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                        {config.label.split(" ").slice(1).join(" ")}
                      </span>
                      {isSelected && (
                        <motion.div
                          layoutId="share-mode-indicator"
                          className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 shadow-sm"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Sparkles className="size-2.5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                }
              )}
            </div>
          </div>

          {/* Section divider */}
          <div className="section-divider" />

          {/* Quality Presets */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Stream Quality</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(QUALITY_PRESETS) as [QualityPreset, typeof QUALITY_PRESETS.high][]).map(
                ([key, config]) => {
                  const Icon = qualityIcons[key];
                  const isSelected = qualityPreset === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onQualityChange(key)}
                      className={`quality-card relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 ${
                        isSelected
                          ? "selected border-emerald-500"
                          : "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      {/* Recommended badge on 720p */}
                      {key === "medium" && (
                        <div className="badge-recommended">Recommended</div>
                      )}
                      {/* Quality icon */}
                      <div className={`flex size-8 items-center justify-center rounded-lg transition-all duration-200 ${
                        isSelected
                          ? "bg-emerald-100 dark:bg-emerald-950/80"
                          : "bg-muted/50"
                      }`}>
                        <Icon className={`size-4 ${qualityColors[key]}`} />
                      </div>

                      {/* Quality label */}
                      <span className={`text-lg font-bold leading-none ${isSelected ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                        {config.label}
                      </span>

                      {/* Quality details */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {config.width.ideal}×{config.height.ideal}
                        </span>
                        <span className="text-[10px] text-muted-foreground/60">
                          {config.frameRate.ideal}fps
                        </span>
                      </div>

                      {/* Selected indicator dot */}
                      {isSelected && (
                        <motion.div
                          layoutId="quality-indicator"
                          className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 shadow-sm"
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <Sparkles className="size-2.5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                }
              )}
            </div>
          </div>

          {/* Section divider with fade-out edges */}
          <div className="section-divider" />

          {/* Approval toggle */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 transition-all duration-300 hover:bg-muted/30 toggle-smooth">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 transition-transform duration-200">
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
        <CardFooter className="flex-col gap-2 pt-2">
          <Button
            onClick={onStartSharing}
            className="btn-press btn-shine relative w-full overflow-hidden bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 transition-all dark:bg-emerald-600 dark:hover:bg-emerald-700 h-12 text-base font-semibold"
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
            <MonitorPlay className="relative size-5" />
            <span className="relative">Start Screen Sharing</span>
          </Button>
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
