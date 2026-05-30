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
  QrCode,
  ArrowRight,
  Sparkles,
  Lock,
  Clock,
  Globe,
} from "lucide-react";

import { pageVariants, staggerContainer, fadeInUp } from "./types";
import { useState, useEffect } from "react";

// Typing text animation component
function TypingText({ text, delay = 50 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), 800);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) return;
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [displayed, started, text, delay]);
  return (
    <span>
      {displayed}
      {displayed.length < text.length && started && (
        <span className="inline-block w-0.5 h-4 bg-emerald-500/60 animate-pulse ml-0.5 align-middle" style={{ animationDuration: "0.8s" }} />
      )}
    </span>
  );
}

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
    color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400",
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

// Generate deterministic particle positions
const particles = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  left: `${(i * 5.8 + 2) % 95}%`,
  top: `${(i * 7.3 + 5) % 90}%`,
  size: 3 + (i % 4),
  delay: -(i * 0.8),
  duration: 6 + (i % 5) * 2,
}));

export function HomeView({ onNavigate, onClearError }: HomeViewProps) {
  return (
    <motion.div
      key="home"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="w-full max-w-5xl px-3 py-4 sm:px-4 sm:py-6 md:py-10"
    >
      {/* ── Hero Section ──────────────────────────────────────────────────── */}
      <div className="gradient-shift relative mb-12 overflow-hidden rounded-2xl sm:rounded-[2rem]">
        {/* Gradient overlay */}
        <div className="absolute inset-0 hero-bg dark:hero-bg-dark" />

        {/* Animated mesh grid pattern */}
        <div className="absolute inset-0 mesh-grid opacity-60" />

        {/* Noise texture overlay */}
        <div className="absolute inset-0 noise-overlay" />

        {/* Floating particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle-dot"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}

        {/* Dot grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Inner border glow */}
        <div className="absolute inset-0 rounded-2xl sm:rounded-[2rem] border border-white/20 dark:border-white/5 pointer-events-none" />

        <div className="relative px-4 py-8 text-center sm:py-12 sm:px-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative"
          >
            {/* Logo with float animation */}
            <div className="mx-auto mb-4 sm:mb-6 flex size-16 sm:size-20 md:size-24 items-center justify-center rounded-2xl sm:rounded-3xl gradient-emerald shadow-xl shadow-emerald-500/30 float-animation">
              <Monitor className="size-8 text-white sm:size-10 md:size-12" />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-3xl font-black tracking-tight sm:text-4xl md:text-6xl text-shadow-sm"
            >
              <span className="text-gradient-animate text-shadow-emerald glow-text">LocalCast</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-2 sm:mt-3 max-w-lg mx-auto text-base sm:text-lg text-muted-foreground"
            >
              <TypingText text="Share your screen instantly over your local network." delay={40} />
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="mt-1 text-sm text-muted-foreground/70"
            >
              No sign-up, no cloud, no delay. Just a room code away.
            </motion.p>

            {/* "Version 1.0" badge with sparkle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45, duration: 0.4 }}
              className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-3 py-1 dark:border-emerald-800/40 dark:bg-emerald-950/40"
            >
              <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Version 1.0.2
              </span>
            </motion.div>

            {/* "Made for local networks" badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50/80 px-3 py-1 dark:border-emerald-800/40 dark:bg-emerald-950/40"
            >
              <Globe className="size-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                Made for local networks
              </span>
            </motion.div>
            {/* Animated SVG Wave Decoration at bottom of hero */}
            <div className="wave-decoration">
              <svg viewBox="0 0 240 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M0,20 Q30,10 60,20 T120,20 T180,20 T240,20 L240,40 L0,40 Z"
                  fill="rgba(5, 150, 105, 0.06)"
                />
                <path
                  d="M0,24 Q30,14 60,24 T120,24 T180,24 T240,24 L240,40 L0,40 Z"
                  fill="rgba(13, 148, 136, 0.04)"
                />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Gradient Divider ────────────────────────────────────────────── */}
      <div className="section-divider mb-12" />

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
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
              className={`group relative flex flex-col items-center gap-3 rounded-2xl border bg-card p-4 sm:p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-300 dark:hover:border-emerald-700 hover-glow-emerald ${i < 2 ? "progress-flow" : ""}`}
            >
              {/* Step number with pulsing ring */}
              <div className="absolute -top-2.5 -left-2.5 sm:-top-3 sm:-left-3">
                <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative flex size-5 sm:size-6 items-center justify-center rounded-full bg-emerald-600 text-[10px] sm:text-[11px] font-bold text-white shadow-md shadow-emerald-500/30">
                  {i + 1}
                </div>
              </div>
              <div className={`flex size-10 sm:size-12 items-center justify-center rounded-xl sm:rounded-2xl ${step.color} shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                <step.icon className="size-6 icon-spin-hover" />
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
          <Card className="glass-card corner-decoration shimmer-card morph-card group relative overflow-hidden cursor-pointer border-2 transition-transform duration-300 hover:scale-[1.01]">
            {/* Top accent gradient */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 opacity-80 transition-opacity group-hover:opacity-100" />
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
                className="btn-press relative w-full overflow-hidden bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-500/30 transition-all dark:bg-emerald-600 dark:hover:bg-emerald-700"
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
                <MonitorPlay className="relative size-4" />
                <span className="relative">Start Sharing</span>
                <ArrowRight className="relative ml-1 size-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* View Screen Card */}
        <motion.div variants={fadeInUp}>
          <Card className="glass-card corner-decoration shimmer-card morph-card group relative overflow-hidden cursor-pointer border-2 transition-transform duration-300 hover:scale-[1.01]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500 opacity-80 transition-opacity group-hover:opacity-100" />
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
                className="btn-press relative w-full overflow-hidden bg-teal-600 text-white shadow-lg shadow-teal-500/25 hover:bg-teal-700 hover:shadow-xl hover:shadow-teal-500/30 transition-all dark:bg-teal-600 dark:hover:bg-teal-700"
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
                <Monitor className="relative size-4" />
                <span className="relative">Join a Room</span>
                <ArrowRight className="relative ml-1 size-4 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Gradient Divider ────────────────────────────────────────────── */}
      <div className="section-divider mb-12" />

      {/* ── Feature Grid ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h2 className="mb-3 sm:mb-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground/60">
          Why LocalCast?
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-3">
          {features.map((feat, i) => (
            <motion.div
              key={feat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }}
              className="group flex items-start gap-2 sm:gap-2.5 rounded-lg sm:rounded-xl border bg-muted/20 p-2.5 sm:p-3.5 transition-all duration-200 hover:bg-muted/40 hover:shadow-sm hover:border-emerald-200/50 dark:hover:border-emerald-800/30"
            >
              <feat.icon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400 icon-spin-hover" />
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
