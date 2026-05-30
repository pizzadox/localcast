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
      className="w-full max-w-4xl px-4 py-12"
    >
      {/* Hero with particle dot pattern background */}
      <div className="hero-bg dark:hero-bg-dark relative mb-12 overflow-hidden rounded-2xl px-6 py-12 text-center">
        {/* CSS dot pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.04]"
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
          className="relative mb-6"
        >
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl gradient-emerald shadow-lg shadow-emerald-500/20">
            <Monitor className="size-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            <span className="text-gradient">LocalCast</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Share your screen instantly over your local network.
            <br className="hidden sm:block" />
            No sign-up, no cloud, no hassle.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative mx-auto flex max-w-md flex-wrap justify-center gap-2"
        >
          <Badge variant="outline" className="gap-1 text-xs">
            <Wifi className="size-3" /> Local Network
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Shield className="size-3" /> No Cloud
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Users className="size-3" /> Unlimited Viewers
          </Badge>
          <Badge variant="outline" className="gap-1 text-xs">
            <Monitor className="size-3" /> WebRTC
          </Badge>
        </motion.div>
      </div>

      {/* Action Cards with hover scale effect */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid gap-6 sm:grid-cols-2"
      >
        {/* Share Screen Card */}
        <motion.div variants={fadeInUp}>
          <Card className="group cursor-pointer border-2 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 hover:scale-105 dark:hover:border-emerald-400/30 dark:hover:shadow-emerald-400/5">
            <CardHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:group-hover:bg-emerald-900">
                <MonitorUp className="size-6" />
              </div>
              <CardTitle className="text-xl">Share Your Screen</CardTitle>
              <CardDescription>
                Start a session and share your screen or window with anyone on
                your network.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={() => {
                  onClearError();
                  onNavigate("share");
                }}
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
                <span className="relative">Start Sharing</span>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>

        {/* View Screen Card */}
        <motion.div variants={fadeInUp}>
          <Card className="group cursor-pointer border-2 transition-all duration-300 hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/10 hover:scale-105 dark:hover:border-teal-400/30 dark:hover:shadow-teal-400/5">
            <CardHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600 transition-colors group-hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:group-hover:bg-teal-900">
                <Eye className="size-6" />
              </div>
              <CardTitle className="text-xl">Watch a Screen</CardTitle>
              <CardDescription>
                Enter a room code to join and watch someone else&apos;s screen
                in real-time.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button
                onClick={() => {
                  onClearError();
                  onNavigate("join");
                }}
                className="relative w-full overflow-hidden bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
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
