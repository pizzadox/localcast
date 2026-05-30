"use client";

// ─── HomeView ────────────────────────────────────────────────────────────
// Landing page with hero section, feature badges, and two action cards.

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
} from "lucide-react";

import { pageVariants, staggerContainer, fadeInUp } from "./types";

interface HomeViewProps {
  onNavigate: (view: "share" | "join") => void;
  onClearError: () => void;
}

export function HomeView({ onNavigate, onClearError }: HomeViewProps) {
  return (
    <motion.div
      key="home"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="w-full max-w-4xl px-4 py-8 sm:py-12"
    >
      {/* Hero Section */}
      <div className="hero-bg dark:hero-bg-dark relative mb-10 overflow-hidden rounded-2xl px-6 py-10 text-center sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05] dark:opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, currentColor 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl gradient-emerald shadow-lg shadow-emerald-500/25 sm:size-18">
            <Monitor className="size-8 text-white sm:size-9" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            <span className="text-gradient">LocalCast</span>
          </h1>
          <p className="mt-2 text-base font-medium text-muted-foreground sm:text-lg sm:font-semibold">
            Share your screen instantly over your local network.
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            No sign-up, no cloud, no hassle. Just a room code away.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative mx-auto mt-6 flex max-w-lg flex-wrap justify-center gap-2"
        >
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Wifi className="size-3" /> Local Network
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Shield className="size-3" /> No Cloud
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Users className="size-3" /> Unlimited Viewers
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Zap className="size-3" /> WebRTC P2P
          </Badge>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <Globe className="size-3" /> Browser Only
          </Badge>
        </motion.div>
      </div>

      {/* Action Cards */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-6 sm:grid-cols-2"
      >
        {/* Share Screen Card */}
        <motion.div variants={fadeInUp}>
          <Card className="group cursor-pointer border-2 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/10 hover:scale-[1.02] dark:hover:border-emerald-400/30 dark:hover:shadow-emerald-400/5">
            <CardHeader>
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-all duration-300 group-hover:bg-emerald-200 group-hover:shadow-md group-hover:shadow-emerald-500/20 dark:bg-emerald-950 dark:text-emerald-400 dark:group-hover:bg-emerald-900">
                <MonitorUp className="size-6" />
              </div>
              <CardTitle className="text-xl">Share Your Screen</CardTitle>
              <CardDescription className="mt-1">
                Start a session and share your screen or window with anyone on
                your network. Choose quality settings and control who can view.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearError();
                  onNavigate("share");
                }}
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
                <span className="relative">Start Sharing</span>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* View Screen Card */}
        <motion.div variants={fadeInUp}>
          <Card className="group cursor-pointer border-2 transition-all duration-300 hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/10 hover:scale-[1.02] dark:hover:border-teal-400/30 dark:hover:shadow-teal-400/5">
            <CardHeader>
              <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600 transition-all duration-300 group-hover:bg-teal-200 group-hover:shadow-md group-hover:shadow-teal-500/20 dark:bg-teal-950 dark:text-teal-400 dark:group-hover:bg-teal-900">
                <Eye className="size-6" />
              </div>
              <CardTitle className="text-xl">Watch a Screen</CardTitle>
              <CardDescription className="mt-1">
                Enter a room code to join and watch someone else&apos;s screen
                in real-time. React with emojis and chat with participants.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearError();
                  onNavigate("join");
                }}
                className="relative w-full overflow-hidden bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
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
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
