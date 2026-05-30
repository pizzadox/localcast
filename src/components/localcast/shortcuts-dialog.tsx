"use client";

// ─── ShortcutsDialog ─────────────────────────────────────────────────────
// Modal dialog showing keyboard shortcuts for the viewing experience.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HelpCircle } from "lucide-react";

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
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">Leave / Go Back</span>
            <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono font-medium">
              Esc
            </kbd>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">Toggle Fullscreen</span>
            <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono font-medium">
              F
            </kbd>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <span className="text-sm">Mute / Unmute</span>
            <kbd className="rounded border bg-muted px-2 py-0.5 text-xs font-mono font-medium">
              M
            </kbd>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
