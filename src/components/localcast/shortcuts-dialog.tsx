"use client";

// ─── ShortcutsDialog ─────────────────────────────────────────────────────
// Modal dialog showing keyboard shortcuts.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";

const shortcuts = [
  { key: "Esc", description: "Leave / Go Back" },
  { key: "F", description: "Toggle Fullscreen" },
  { key: "M", description: "Mute / Unmute" },
  { key: "C", description: "Toggle Chat Panel" },
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
        <div className="space-y-2.5 py-2">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between rounded-lg border px-4 py-3">
              <span className="text-sm">{description}</span>
              <kbd className="rounded-md border bg-muted px-2.5 py-0.5 text-xs font-mono font-semibold shadow-sm">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
