"use client";

// ─── HomeView ────────────────────────────────────────────────────────────
// Landing page with hero, how-it-works steps, feature showcase, and action cards.

import { motion } from "framer-motion";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  MonitorPlay,
  MonitorUp,
  Eye,
  Shield,
  Users,
  Wifi,
  Zap,
  Globe,
  QrCode,
  ArrowRight,
  Sparkles,
  Lock,
  Clock,
} from "lucide-react";

import { pageVariants, staggerContainer, fadeInUp } from "./types";

interface HomeViewProps {
  onNavigate: (view: "share" | "join") => void;
  onClearError: () => void;
}

const steps = [
  {
    icon: MonitorUp,
    title: "Share Your Screen",
    description: "Click 'Start Sharing' and select your screen, window, or tab to share.",
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400",
  },
  {
    icon: QrCode,
    title: "Share the Code",
    description: "Give the 6-character room code or QR code to your viewers.",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-950/80 dark:text-teal-400",
  },
  {
    icon: Eye,
    title: "Watch in Real-Time",
    description: "Viewers join instantly — no installs, no sign-ups, no cloud.",
    color: "bg-violet-100 text-violet-600 dark:bg-violet-950/80 dark:text-violet-400",
  },
];

const features = [
  { icon: Wifi, label: "Local Network Only", desc: "Data never leaves your LAN" },
  { icon: Shield, label: "End-to-End Encrypted", desc: "WebRTC DTLS encryption" },
  { icon: Users, label: "Unlimited Viewers", desc: "No artificial limits" },
  { icon: Zap, label: "Ultra Low Latency", desc: "Peer-to-peer direct" },
  { icon: Lock, label: "Privacy First", desc: "No cloud storage at all" },
  { icon: Clock, label: "Instant Setup", desc: "Works in your browser" },
];

export function HomeView({ onNavigate, onClearError }: HomeViewProps) {
  return (
    <motion.div
      key="home"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="w-full max-w-5xl px-4 py-6 sm:py-10"
    >
      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <div className="hero-bg dark:hero-bg-dark relative mb-12 overflow-hidden rounded-3xl border bg-gradient-to-br from-emerald-50/50 via-transparent to-teal-50/30 dark:from-emerald-950/20 dark:via-transparent dark:to-teal-950/10 sm:rounded-[2rem] px-6 py-12 text-center sm:py-16">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative"
        >
          <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-3xl gradient-emerald shadow-xl shadow-emerald-500/30 sm:size-24">
            <Monitor className="size-10 text-white sm:size-12" />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl font-black tracking-tight sm:text-6xl"
          >
            <span className="text-gradient">LocalCast</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mt-3 max-w-lg mx-auto text-lg text-muted-foreground"
          >
            Share your screen instantly over your local network.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-1 text-sm text-muted-foreground/70"
          >
            No sign-up, no cloud, no delay. Just a room code away.
          </motion.p>
        </motion.div>
      </div>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="mb-12"
      >
        <div className="mb-6 flex items-center gap-2">
          <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold">How It Works</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              className="group relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-5 transition-all duration-300 hover:shadow-lg hover:border-emerald-200 dark:hover:border-emerald-800"
            >
              {/* Step number */}
              <div className="absolute -top-3 -left-3 flex size-6 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white shadow-md shadow-emerald-500/30">
                {i + 1}
              </div>
              <div className={`flex size-12 items-center justify-center rounded-2xl ${step.color} shadow-sm transition-transform duration-300 group-hover:scale-110`}>
                <step.icon className="size-6" />
              </div>
              <h3 className="text-sm font-bold">{step.title}</h3>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Action Cards ─────────────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="mb-12 grid gap-6 sm:grid-cols-2"
      >
        {/* Share Screen Card */}
        <motion.div variants={fadeInUp}>
          <Card className="group relative overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-2xl hover:shadow-emerald-500/15 hover:scale-[1.02] dark:hover:border-emerald-400/30 dark:hover:shadow-emerald-400/5">
            {/* Top accent gradient */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500" />
            <CardHeader className="pt-6">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 transition-all duration-300 group-hover:bg-emerald-200 group-hover:shadow-lg group-hover:shadow-emerald-500/20 dark:bg-emerald-950 dark:text-emerald-400 dark:group-hover:bg-emerald-900">
                <MonitorUp className="size-7" />
              </div>
              <CardTitle className="text-xl">Share Your Screen</CardTitle>
              <CardDescription className="mt-1.5 text-sm leading-relaxed">
                Start a session and share your screen or window. Choose quality settings,
                control who can view, and chat in real-time.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearError();
                  onNavigate("share");
                }}
                className="relative w-full overflow-hidden bg-emerald-600 text-white shadow-md shadow-emerald-500/25 hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-500/30 transition-all dark:bg-emerald-600 dark:hover:bg-emerald-700"
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
                <span className="relative">Start Sharing</span>
                <ArrowRight className="relative ml-1 size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* View Screen Card */}
        <motion.div variants={fadeInUp}>
          <Card className="group relative overflow-hidden cursor-pointer border-2 transition-all duration-300 hover:border-teal-500/50 hover:shadow-2xl hover:shadow-teal-500/15 hover:scale-[1.02] dark:hover:border-teal-400/30 dark:hover:shadow-teal-400/5">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500" />
            <CardHeader className="pt-6">
              <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 transition-all duration-300 group-hover:bg-teal-200 group-hover:shadow-lg group-hover:shadow-teal-500/20 dark:bg-teal-950 dark:text-teal-400 dark:group-hover:bg-teal-900">
                <Eye className="size-7" />
              </div>
              <CardTitle className="text-xl">Watch a Screen</CardTitle>
              <CardDescription className="mt-1.5 text-sm leading-relaxed">
                Enter a room code to watch someone else&apos;s screen in real-time.
                React with emojis and chat with participants.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearError();
                  onNavigate("join");
                }}
                className="relative w-full overflow-hidden bg-teal-600 text-white shadow-md shadow-teal-500/25 hover:bg-teal-700 hover:shadow-lg hover:shadow-teal-500/30 transition-all dark:bg-teal-600 dark:hover:bg-teal-700"
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
                <Monitor className="relative size-4" />
                <span className="relative">Join a Room</span>
                <ArrowRight className="relative ml-1 size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Feature Grid ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
          Why LocalCast?
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {features.map((feat, i) => (
            <motion.div
              key={feat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }}
              className="flex items-start gap-2.5 rounded-xl border bg-muted/20 p-3.5 transition-colors hover:bg-muted/40"
            >
              <feat.icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-semibold">{feat.label}</p>
                <p className="text-[11px] leading-tight text-muted-foreground/60">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
