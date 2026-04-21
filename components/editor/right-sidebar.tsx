"use client";

import { useAnnotationStore, useCurrentImage, useCurrentAnnotations } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  IconFileInfo,
  IconPhoto,
  IconStack2,
} from "@tabler/icons-react";

export default function RightSidebar() {
  const images = useAnnotationStore((s) => s.images);
  const currentImageIndex = useAnnotationStore((s) => s.currentImageIndex);
  const annotations = useAnnotationStore((s) => s.annotations);
  const goToImage = useAnnotationStore((s) => s.goToImage);
  const currentImage = useCurrentImage();
  const currentAnnotations = useCurrentAnnotations();

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col shrink-0">
      {/* File Information */}
      <div className="px-4 py-3 flex items-center gap-2">
        <IconFileInfo className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          File Info
        </span>
      </div>
      <Separator />

      <div className="px-4 py-3 space-y-2.5 border-b border-border">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Filename
          </span>
          <span className="text-xs text-foreground font-medium truncate max-w-40 text-right">
            {currentImage.name}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Resolution
          </span>
          <span className="text-xs text-foreground tabular-nums">
            {currentImage.width} × {currentImage.height}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Annotations
          </span>
          <Badge variant="secondary" className="text-[10px] h-4 tabular-nums">
            {currentAnnotations.length}
          </Badge>
        </div>
      </div>

      {/* Image List */}
      <div className="px-4 py-3 flex items-center gap-2">
        <IconStack2 className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Image Batch
        </span>
        <Badge variant="outline" className="ml-auto text-[10px] h-4 tabular-nums">
          {images.length}
        </Badge>
      </div>
      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {images.map((image, index) => {
            const isCurrent = index === currentImageIndex;
            const imageAnnotations = annotations[image.id] || [];
            return (
              <button
                key={image.id}
                id={`image-item-${image.id}`}
                onClick={() => goToImage(index)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent/50",
                  isCurrent && "bg-accent text-accent-foreground"
                )}
              >
                <IconPhoto
                  className={cn(
                    "size-3.5 shrink-0",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs truncate",
                      isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {image.name}
                  </p>
                </div>
                {imageAnnotations.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-4 px-1.5 tabular-nums shrink-0"
                  >
                    {imageAnnotations.length}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
