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
  Lock,
  Eye,
  EyeOff,
  Users,
  Palette,
  Zap,
  Loader2,
  CheckCircle2,
  XCircle,
  CircleDot,
} from "lucide-react";

import { pageVariants, QUALITY_PRESETS, SHARE_MODE_CONFIG, MAX_VIEWER_OPTIONS, SESSION_THEMES } from "./types";
import type { QualityPreset, ShareMode, SessionTheme, SpeedTestResult } from "./types";
import { useState } from "react";

interface ShareSetupViewProps {
  onStartSharing: () => void;
  requireApproval: boolean;
  onToggleApproval: (v: boolean) => void;
  qualityPreset: QualityPreset;
  onQualityChange: (v: QualityPreset) => void;
  shareMode: ShareMode;
  onShareModeChange: (v: ShareMode) => void;
  roomPassword: string;
  onRoomPasswordChange: (v: string) => void;
  maxViewers: number;
  onMaxViewersChange: (v: number) => void;
  roomTheme: SessionTheme;
  onRoomThemeChange: (v: SessionTheme) => void;
  speedTestResult: SpeedTestResult;
  onConnectionSpeedTest: () => Promise<void>;
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
  roomPassword,
  onRoomPasswordChange,
  maxViewers,
  onMaxViewersChange,
  roomTheme,
  onRoomThemeChange,
  speedTestResult,
  onConnectionSpeedTest,
  error,
  onBack,
}: ShareSetupViewProps) {
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
          {/* Step progress indicator */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${qualityPreset !== "low" ? "bg-emerald-500" : "bg-muted"}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${qualityPreset !== "low" ? "bg-emerald-400" : "bg-muted"}`} />
            <div className={`h-1.5 w-8 rounded-full transition-all duration-500 ${true ? "bg-emerald-500" : "bg-muted"}`} />
          </div>
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
                      className={`quality-card relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 micro-interaction ${
                        isSelected
                          ? "selected border-emerald-500"
                          : "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                      }`}
                    >
                      {/* Recommended badge on 720p */}
                      {key === "medium" && (
                        <div className="badge-recommended">Recommended</div>
                      )}
                      {/* Quality icon with tooltip hint */}
                      <div className="group/quality relative">
                        <div className={`flex size-8 items-center justify-center rounded-lg transition-all duration-200 ${
                          isSelected
                            ? "bg-emerald-100 dark:bg-emerald-950/80"
                            : "bg-muted/50"
                        }`}>
                          <Icon className={`size-4 ${qualityColors[key]}`} />
                        </div>
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/quality:block z-10">
                          <div className="tooltip-bounce rounded-lg border bg-background/95 px-2 py-1 text-[9px] font-medium text-muted-foreground shadow-lg whitespace-nowrap backdrop-blur-sm">
                            {key === "high" ? "Best for fast WiFi (1080p)" : key === "medium" ? "Balanced quality (720p)" : "Low bandwidth (480p)"}
                          </div>
                        </div>
                      </div>
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

                      {/* Quality hint */}
                      <p className="text-center text-[9px] leading-tight text-muted-foreground/50 px-1">
                        {key === "high" ? "Best for fast WiFi" : key === "medium" ? "Great for most networks" : "For limited bandwidth"}
                      </p>

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

          {/* Max Viewers */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Max Viewers</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MAX_VIEWER_OPTIONS.map((opt) => {
                const label = opt === 0 ? "Unlimited" : String(opt);
                const isSelected = maxViewers === opt;
                return (
                  <motion.button
                    key={opt}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onMaxViewersChange(opt)}
                    className={`rounded-lg border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                        : "border-transparent bg-background text-muted-foreground hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Section divider */}
          <div className="section-divider" />

          {/* Session Theme */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Palette className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Session Theme</span>
            </div>
            <div className="flex gap-3">
              {(Object.entries(SESSION_THEMES) as [SessionTheme, typeof SESSION_THEMES.default][]).map(([key, config]) => {
                const isSelected = roomTheme === key;
                return (
                  <motion.button
                    key={key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onRoomThemeChange(key)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3 transition-all duration-200 ${
                      isSelected
                        ? "border-current shadow-sm"
                        : "border-transparent bg-background hover:border-border hover:bg-muted/50"
                    }`}
                  >
                    <div className={`flex size-8 items-center justify-center rounded-full ${config.swatch}`} />
                    <span className={`text-xs font-medium ${isSelected ? config.accent : "text-muted-foreground"}`}>{config.label}</span>
                    {isSelected && (
                      <motion.div
                        layoutId="theme-indicator"
                        className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 shadow-sm"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Sparkles className="size-2.5 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Section divider */}
          <div className="section-divider" />

          {/* Connection Speed Test */}
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="size-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold">Connection Test</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={onConnectionSpeedTest}
                disabled={speedTestResult.quality === "testing"}
              >
                {speedTestResult.quality === "testing" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CircleDot className="size-3.5" />
                )}
                Test Connection
              </Button>
              {speedTestResult.quality !== "idle" && speedTestResult.quality !== "testing" && (
                <div className="flex items-center gap-1.5">
                  {speedTestResult.quality === "excellent" && <CheckCircle2 className="size-4 text-emerald-500" />}
                  {speedTestResult.quality === "good" && <CheckCircle2 className="size-4 text-emerald-500" />}
                  {speedTestResult.quality === "fair" && <CheckCircle2 className="size-4 text-amber-500" />}
                  {speedTestResult.quality === "poor" && <XCircle className="size-4 text-red-500" />}
                  <span className={`text-xs font-medium ${
                    speedTestResult.quality === "excellent" || speedTestResult.quality === "good"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : speedTestResult.quality === "fair"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                  }`}>
                    {speedTestResult.quality.charAt(0).toUpperCase() + speedTestResult.quality.slice(1)}
                    {speedTestResult.latencyMs > 0 && <span className="text-muted-foreground"> ({speedTestResult.latencyMs}ms)</span>}
                  </span>
                </div>
              )}
              {speedTestResult.quality === "testing" && (
                <span className="text-xs text-muted-foreground animate-pulse">Testing...</span>
              )}
            </div>
          </div>

          {/* Section divider */}
          <div className="section-divider" />

          {/* Password Protection toggle */}
          <div className="rounded-xl border bg-muted/20 p-4 transition-all duration-300 hover:bg-muted/30 toggle-smooth">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 transition-transform duration-200">
                  <Lock className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Password Protection</p>
                  <p className="text-xs text-muted-foreground">
                    Require a password for viewers to join
                  </p>
                </div>
              </div>
              <Switch
                checked={showPasswordField}
                onCheckedChange={(checked) => {
                  setShowPasswordField(checked);
                  if (!checked) onRoomPasswordChange("");
                }}
              />
            </div>
            {showPasswordField && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={roomPassword}
                    onChange={(e) => onRoomPasswordChange(e.target.value)}
                    placeholder="Enter room password"
                    className="glass-input w-full rounded-lg border px-3 py-2 pr-10 text-sm outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                    maxLength={32}
                    aria-label="Room password"
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
          </div>

          {/* Section divider */}
          <div className="section-divider" />

          {/* Approval toggle */}
          <div className={`approval-glow flex items-center justify-between rounded-xl border bg-muted/20 p-4 transition-all duration-300 hover:bg-muted/30 toggle-smooth ripple-effect ${requireApproval ? "active" : ""}`}>
            <div className="flex items-center gap-3">
              <div className={`flex size-9 items-center justify-center rounded-lg transition-all duration-300 ${requireApproval ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"}`}>
                <Shield className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Require Approval</p>
                <p className="text-xs text-muted-foreground">
                  Viewers must be approved before they can see your screen
                  {requireApproval && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400">· Enabled</span>
                  )}
                </p>
              </div>
            </div>
            <Switch
              checked={requireApproval}
              onCheckedChange={onToggleApproval}
            />
          </div>
        </CardContent>
        <CardFooter className="relative flex-col gap-2 pt-2">
          {/* Bottom gradient bar (mirrors top) */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 gradient-emerald opacity-40" />
          <Button
            onClick={onStartSharing}
            className="btn-press btn-shine btn-disabled-enhanced relative w-full overflow-hidden bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 transition-all dark:bg-emerald-600 dark:hover:bg-emerald-700 h-12 text-base font-semibold disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
            size="lg"
          >
            <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
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
