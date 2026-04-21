"use client";

import { useEffect, useCallback } from "react";
import { useAnnotationStore } from "@/lib/store";
import TopToolbar from "@/components/editor/top-toolbar";
import LeftSidebar from "@/components/editor/left-sidebar";
import RightSidebar from "@/components/editor/right-sidebar";
import AnnotationCanvas from "@/components/editor/annotation-canvas";

export default function EditorPage() {
  const store = useAnnotationStore();

  // ── Keyboard event handler ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Delete / Backspace → remove selected annotation
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't intercept if user is typing in an input
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        store.deleteSelectedAnnotation();
        return;
      }

      // Number keys 1-8 → switch class label
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 8) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        const label = store.classLabels[num - 1];
        if (label) {
          store.setActiveClassLabel(label);
        }
        return;
      }

      // Arrow keys for navigation
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        store.nextImage();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        store.prevImage();
        return;
      }
    },
    [store]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Top Toolbar */}
      <TopToolbar />

      {/* Main content area: left sidebar, canvas, right sidebar */}
      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar />

        {/* Center canvas area */}
        <div className="flex-1 overflow-hidden relative">
          <AnnotationCanvas />
        </div>

        <RightSidebar />
      </div>
    </div>
  );
}
