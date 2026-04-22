"use client";

import { useAnnotationStore, useCurrentAnnotations } from "@/lib/store";
import type { ClassLabel } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { IconPointer, IconBrush, IconEye, IconEyeOff } from "@tabler/icons-react";

export default function LeftSidebar() {
  const classLabels = useAnnotationStore((s) => s.classLabels);
  const activeClassLabel = useAnnotationStore((s) => s.activeClassLabel);
  const setActiveClassLabel = useAnnotationStore((s) => s.setActiveClassLabel);
  const hiddenClasses = useAnnotationStore((s) => s.hiddenClasses);
  const toggleVisibility = useAnnotationStore((s) => s.toggleVisibility);
  
  const annotations = useCurrentAnnotations();
  const classCounts = annotations.reduce((acc, ann) => {
    acc[ann.label] = (acc[ann.label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleClassClick = (label: ClassLabel) => {
    setActiveClassLabel(label);
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-2">
        <IconBrush className="size-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Classes
        </span>
      </div>
      <Separator />

      {/* Active class indicator */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
          Active
        </p>
        <div className="flex items-center gap-2">
          <span
            className="size-3 shrink-0 border border-white/20"
            style={{ backgroundColor: activeClassLabel.color }}
          />
          <span className="text-sm font-medium text-foreground">
            {activeClassLabel.name}
          </span>
        </div>
      </div>

      {/* Class list */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-2 space-y-0.5">
          {classLabels.map((label) => {
            const isActive = activeClassLabel.name === label.name;
            const isHidden = hiddenClasses.includes(label.name);
            return (
              <button
                key={label.name}
                id={`class-label-${label.name.toLowerCase().replace(/\s+/g, "-")}`}
                onClick={() => handleClassClick(label)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors",
                  "hover:bg-accent/50",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                {/* Color dot */}
                <span
                  className="size-3 shrink-0 border border-white/20"
                  style={{ backgroundColor: label.color }}
                />

                {/* Name & Count */}
                <div className="flex-1 flex items-center justify-between min-w-0 pr-1">
                  <span
                    className={cn(
                      "text-sm truncate",
                      isActive ? "font-medium text-foreground" : "text-muted-foreground",
                      isHidden && "opacity-50 line-through"
                    )}
                  >
                    {label.name}
                  </span>
                  {(classCounts[label.name] || 0) > 0 && (
                    <Badge variant="secondary" className={cn("text-[10px] h-4 px-1.5 tabular-nums", isHidden && "opacity-50")}>
                      {classCounts[label.name]}
                    </Badge>
                  )}
                </div>

                {/* Shortcut key */}
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 h-4 tabular-nums shrink-0",
                    isActive
                      ? "border-foreground/30 text-foreground"
                      : "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {label.shortcut}
                </Badge>

                {/* Visibility Toggle */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(label.name);
                  }}
                  className={cn(
                    "p-1 -mr-1 rounded-md transition-colors cursor-pointer shrink-0",
                    isHidden ? "text-muted-foreground hover:text-foreground" : "text-foreground/70 hover:text-foreground"
                  )}
                >
                  {isHidden ? <IconEyeOff className="size-3.5" /> : <IconEye className="size-3.5" />}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer hint */}
      <Separator />
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <IconPointer className="size-3" />
          <span className="text-[10px]">
            Press <kbd className="font-mono font-bold">1</kbd>–
            <kbd className="font-mono font-bold">8</kbd> to switch class
          </span>
        </div>
      </div>
    </div>
  );
}
