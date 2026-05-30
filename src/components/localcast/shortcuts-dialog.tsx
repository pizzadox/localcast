"use client";

// ─── ShortcutsDialog ─────────────────────────────────────────────────────
// Modal dialog showing keyboard shortcuts with icons and gradient kbd styling.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle, LogOut, Maximize, Volume2, MessageSquare } from "lucide-react";

const shortcuts = [
  { key: "Esc", description: "Leave / Go Back", icon: LogOut },
  { key: "F", description: "Toggle Fullscreen", icon: Maximize },
  { key: "M", description: "Mute / Unmute", icon: Volume2 },
  { key: "C", description: "Toggle Chat Panel", icon: MessageSquare },
];

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to control your viewing experience.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          {shortcuts.map(({ key, description, icon: Icon }, idx) => (
            <div
              key={key}
              className={`shortcut-row flex items-center justify-between rounded-lg border px-4 py-3 transition-all duration-200 ${
                idx % 2 === 0
                  ? "bg-muted/15 border-border/60"
                  : "bg-transparent border-border/40"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-md bg-muted/60">
                  <Icon className="size-3.5 text-muted-foreground" />
                </div>
                <span className="text-sm">{description}</span>
              </div>
              <kbd className="kbd-gradient">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
