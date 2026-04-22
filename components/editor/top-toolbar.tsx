"use client";

import Image from "next/image";
import Link from "next/link";
import { useAnnotationStore, useCurrentAnnotations } from "@/lib/store";
import { useExportDataset, useManualSave } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconLoader2,
  IconDeviceFloppy,
  IconCheck,
  IconArrowLeft,
  IconKeyboard,
} from "@tabler/icons-react";

interface TopToolbarProps {
  saveAndGo: (targetIndex: number) => void;
  isSaving: boolean;
  projectId: string;
}

export default function TopToolbar({
  saveAndGo,
  isSaving,
  projectId,
}: TopToolbarProps) {
  const store = useAnnotationStore();
  const currentImageIndex = store.currentImageIndex;
  const images = store.images;
  const annotations = useCurrentAnnotations();
  const exportMutation = useExportDataset(projectId);
  const {
    handleManualSave,
    isSaving: isManualSaving,
    isJustSaved,
  } = useManualSave(projectId);

  const isFirst = currentImageIndex === 0;
  const isLast = currentImageIndex === images.length - 1;

  const handlePrev = () => {
    if (!isFirst && !isSaving) {
      saveAndGo(currentImageIndex - 1);
    }
  };

  const handleNext = () => {
    if (!isLast && !isSaving) {
      saveAndGo(currentImageIndex + 1);
    }
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleClearAll = () => {
    store.clearAnnotations();
  };

  return (
    <div className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
      {/* Left: Logo & Back */}
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href="/dashboard">
                <IconArrowLeft className="size-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to Dashboard</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2.5">
          <Image
            src="/boxify.svg"
            alt="Boxify"
            width={32}
            height={32}
            className="size-8"
          />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            BOXIFY
          </span>
        </div>
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="btn-prev-image"
              variant="outline"
              size="icon-sm"
              onClick={handlePrev}
              disabled={isFirst || isSaving}
            >
              <IconChevronLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous image (saves current)</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-1 px-3 min-w-[80px] justify-center">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {currentImageIndex + 1}
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {images.length}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="btn-next-image"
              variant="outline"
              size="icon-sm"
              onClick={handleNext}
              disabled={isLast || isSaving}
            >
              <IconChevronRight className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next image (saves current)</TooltipContent>
        </Tooltip>
      </div>

      {/* Right: Status + Clear All + Export */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1.5 tabular-nums mr-2 hidden sm:inline-flex"
        >
          <span
            className="size-1.5 rounded-full inline-block"
            style={{
              backgroundColor:
                annotations.length > 0 ? "#22C55E" : "var(--muted-foreground)",
            }}
          />
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
        </Badge>

        <Dialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <IconKeyboard className="size-3.5" />
                  <span className="hidden md:inline">Shortcuts</span>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>View keyboard shortcuts</TooltipContent>
          </Tooltip>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Action
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  Shortcut
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Select Class Label</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                    1
                  </kbd>
                  <span className="text-muted-foreground text-xs my-auto">
                    -
                  </span>
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                    8
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Delete Selected Box</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                    Del
                  </kbd>
                  <span className="text-muted-foreground text-xs my-auto">
                    /
                  </span>
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                    Backspace
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Previous Image</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                    ←
                  </kbd>
                  <span className="text-muted-foreground text-xs my-auto">
                    /
                  </span>
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                    ↑
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Next Image</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                    →
                  </kbd>
                  <span className="text-muted-foreground text-xs my-auto">
                    /
                  </span>
                  <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                    ↓
                  </kbd>
                </div>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Pan Canvas</span>
                <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                  Space + Drag
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Zoom In/Out</span>
                <kbd className="px-2 py-1 bg-muted rounded text-[10px] font-mono font-semibold border border-border">
                  Scroll Wheel
                </kbd>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="btn-clear-all"
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={annotations.length === 0 || isSaving}
            >
              Clear All
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete all annotations on this image</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="btn-manual-save"
              variant="outline"
              size="sm"
              onClick={handleManualSave}
              disabled={isManualSaving || isSaving || isJustSaved}
              className={cn(
                "gap-1.5 transition-all w-24",
                isJustSaved && "border-green-500 text-green-500",
              )}
            >
              {isManualSaving ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : isJustSaved ? (
                <IconCheck className="size-3.5" />
              ) : (
                <IconDeviceFloppy className="size-3.5" />
              )}
              {isManualSaving ? "Saving" : isJustSaved ? "Saved!" : "Save"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save annotations without navigating</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id="btn-export-dataset"
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="gap-1.5"
            >
              {exportMutation.isPending ? (
                <IconLoader2 className="size-3.5 animate-spin" />
              ) : (
                <IconDownload className="size-3.5" />
              )}
              Export
            </Button>
          </TooltipTrigger>
          <TooltipContent>Download dataset as .zip</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
