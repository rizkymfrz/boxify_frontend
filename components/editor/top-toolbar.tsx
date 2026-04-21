"use client";

import {
  useAnnotationStore,
  useCurrentImage,
  useCurrentAnnotations,
} from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconChevronLeft,
  IconChevronRight,
  IconBox,
} from "@tabler/icons-react";

export default function TopToolbar() {
  const currentImageIndex = useAnnotationStore((s) => s.currentImageIndex);
  const images = useAnnotationStore((s) => s.images);
  const nextImage = useAnnotationStore((s) => s.nextImage);
  const prevImage = useAnnotationStore((s) => s.prevImage);
  const currentImage = useCurrentImage();
  const annotations = useCurrentAnnotations();

  const isFirst = currentImageIndex === 0;
  const isLast = currentImageIndex === images.length - 1;

  return (
    <div className="h-14 flex items-center justify-between border-b border-border bg-card px-4 shrink-0">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-8 bg-primary text-primary-foreground">
          <IconBox className="size-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          BOXIFY
        </span>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <span className="text-xs text-muted-foreground truncate max-w-48">
          {currentImage.name}
        </span>
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center gap-1.5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id="btn-prev-image"
                variant="outline"
                size="icon-sm"
                onClick={prevImage}
                disabled={isFirst}
              >
                <IconChevronLeft className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Previous image</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex items-center gap-1 px-3 min-w-[80px] justify-center">
          <span className="text-sm font-medium tabular-nums text-foreground">
            {currentImageIndex + 1}
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {images.length}
          </span>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                id="btn-next-image"
                variant="outline"
                size="icon-sm"
                onClick={nextImage}
                disabled={isLast}
              >
                <IconChevronRight className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next image</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right: Status */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="gap-1.5 tabular-nums">
          <span
            className="size-1.5 rounded-full inline-block"
            style={{
              backgroundColor:
                annotations.length > 0 ? "#22C55E" : "var(--muted-foreground)",
            }}
          />
          {annotations.length} annotation{annotations.length !== 1 ? "s" : ""}
        </Badge>
      </div>
    </div>
  );
}
