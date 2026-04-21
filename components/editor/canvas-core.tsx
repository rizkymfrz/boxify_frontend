"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Stage, Layer, Rect, Image as KonvaImage, Line, Transformer, Label, Tag, Text, Group } from "react-konva";
import type Konva from "konva";
import { useAnnotationStore, useCurrentImage, useCurrentAnnotations } from "@/lib/store";
import type { Annotation } from "@/lib/types";

// ── Custom useImage hook (no react-konva-utils dependency) ──
function useImage(url: string): [HTMLImageElement | null, "loading" | "loaded" | "error"] {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  useEffect(() => {
    setImage(null);
    setStatus("loading");
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    img.onload = () => {
      setImage(img);
      setStatus("loaded");
    };
    img.onerror = () => setStatus("error");
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [url]);

  return [image, status];
}

// ── Props ──
interface CanvasCoreProps {
  containerWidth: number;
  containerHeight: number;
}

export default function CanvasCore({ containerWidth, containerHeight }: CanvasCoreProps) {
  const store = useAnnotationStore();
  const currentImage = useCurrentImage();
  const annotations = useCurrentAnnotations();
  const [loadedImage, imageStatus] = useImage(currentImage.url);

  // ── View State (Zoom & Pan) ──
  const [viewState, setViewState] = useState({ scale: 1, x: 0, y: 0 });
  const [imgDim, setImgDim] = useState({ w: 0, h: 0 });

  // Initialize view state when image loads or container changes
  useEffect(() => {
    if (!loadedImage || containerWidth === 0 || containerHeight === 0) return;
    const w = loadedImage.naturalWidth || loadedImage.width;
    const h = loadedImage.naturalHeight || loadedImage.height;
    const scaleX = containerWidth / w;
    const scaleY = containerHeight / h;
    const s = Math.min(scaleX, scaleY) * 0.95; // 5% padding
    
    setViewState({
      scale: s,
      x: (containerWidth - w * s) / 2,
      y: (containerHeight - h * s) / 2,
    });
    setImgDim({ w, h });
  }, [loadedImage, containerWidth, containerHeight, currentImage.url]);

  // ── Local drawing & panning state ──
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingRect, setDrawingRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setIsSpaceDown(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceDown(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // ── Refs ──
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // ── Coordinate conversion: stage → image ──
  const stageToImage = useCallback(
    (stageX: number, stageY: number) => ({
      x: Math.max(0, Math.min((stageX - viewState.x) / viewState.scale, imgDim.w)),
      y: Math.max(0, Math.min((stageY - viewState.y) / viewState.scale, imgDim.h)),
    }),
    [viewState.x, viewState.y, viewState.scale, imgDim.w, imgDim.h]
  );

  // ── Image boundaries in stage coords (for crosshair clipping) ──
  const imgBounds = useMemo(
    () => ({
      left: viewState.x,
      top: viewState.y,
      right: viewState.x + imgDim.w * viewState.scale,
      bottom: viewState.y + imgDim.h * viewState.scale,
    }),
    [viewState.x, viewState.y, viewState.scale, imgDim.w, imgDim.h]
  );

  // ── Attach transformer to selected node ──
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const stage = tr.getStage();
    if (store.selectedAnnotationId && stage) {
      const node = stage.findOne(`#${store.selectedAnnotationId}`);
      if (node) {
        tr.nodes([node]);
      } else {
        tr.nodes([]);
      }
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [store.selectedAnnotationId, annotations]);

  // ── Reset states on image change ──
  useEffect(() => {
    setIsDrawing(false);
    setDrawStart(null);
    setDrawingRect(null);
    setIsPanning(false);
  }, [store.currentImageIndex]);

  // ── Wheel Zoom Handler ──
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = viewState.scale;
    const mousePointTo = {
      x: (pointer.x - viewState.x) / oldScale,
      y: (pointer.y - viewState.y) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? Math.max(oldScale / scaleBy, 0.1) : Math.min(oldScale * scaleBy, 10);

    setViewState({
      scale: newScale,
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }, [viewState]);

  // ── Mouse handlers ──
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!loadedImage) return;

      // Handle panning (middle or right click, or space + left click)
      if (e.evt.button === 1 || e.evt.button === 2 || (e.evt.button === 0 && isSpaceDown)) {
        setIsPanning(true);
        setPanStart({ x: e.evt.clientX - viewState.x, y: e.evt.clientY - viewState.y });
        return;
      }

      // Only left click for drawing/selecting
      if (e.evt.button !== 0) return;

      // Don't interfere with transformer interactions
      const target = e.target;
      const parent = target.getParent();
      if (parent && parent.className === "Transformer") return;

      // Clicked on an annotation rect → select it
      if (target.name() === "annotation-rect") {
        store.setSelectedAnnotation(target.id());
        return;
      }

      // Clicked on empty space → deselect and start drawing
      store.setSelectedAnnotation(null);
      const pointer = e.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      const imgPos = stageToImage(pointer.x, pointer.y);
      setDrawStart(imgPos);
      setDrawingRect({ x: imgPos.x, y: imgPos.y, width: 0, height: 0 });
      setIsDrawing(true);
    },
    [loadedImage, store, stageToImage, viewState.x, viewState.y, isSpaceDown]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanning && panStart) {
        setViewState((prev) => ({
          ...prev,
          x: e.evt.clientX - panStart.x,
          y: e.evt.clientY - panStart.y,
        }));
        return;
      }

      const pointer = e.target.getStage()?.getPointerPosition();
      if (!pointer) return;

      // Update crosshair (in stage coordinates)
      setCrosshairPos({ x: pointer.x, y: pointer.y });

      // Update drawing rect
      if (isDrawing && drawStart) {
        const imgPos = stageToImage(pointer.x, pointer.y);
        setDrawingRect({
          x: Math.min(drawStart.x, imgPos.x),
          y: Math.min(drawStart.y, imgPos.y),
          width: Math.abs(imgPos.x - drawStart.x),
          height: Math.abs(imgPos.y - drawStart.y),
        });
      }
    },
    [isDrawing, drawStart, stageToImage, isPanning, panStart]
  );

  const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      return;
    }

    if (isDrawing && drawingRect) {
      // Only finalize if box is large enough (> 5px in image coords)
      if (drawingRect.width > 5 && drawingRect.height > 5) {
        const newAnnotation: Annotation = {
          id: crypto.randomUUID(),
          x: drawingRect.x,
          y: drawingRect.y,
          width: drawingRect.width,
          height: drawingRect.height,
          label: store.activeClassLabel.name,
          color: store.activeClassLabel.color,
        };
        store.addAnnotation(newAnnotation);
      }
    }
    setIsDrawing(false);
    setDrawStart(null);
    setDrawingRect(null);
  }, [isDrawing, drawingRect, store, isPanning]);

  const handleMouseLeave = useCallback(() => {
    setCrosshairPos(null);
    setIsPanning(false);
    setPanStart(null);
  }, []);

  // ── Drag handler: constrain rect within image bounds ──
  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const newX = Math.max(0, Math.min(node.x(), imgDim.w - node.width()));
      const newY = Math.max(0, Math.min(node.y(), imgDim.h - node.height()));
      node.x(newX);
      node.y(newY);
    },
    [imgDim.w, imgDim.h]
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>, annotationId: string) => {
      const node = e.target;
      store.updateAnnotation(annotationId, { x: node.x(), y: node.y() });
    },
    [store]
  );

  // ── Transform end: apply scale to width/height ──
  const handleTransformEnd = useCallback(
    (e: Konva.KonvaEventObject<Event>, annotationId: string) => {
      const node = e.target as Konva.Rect;
      const sx = node.scaleX();
      const sy = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      let newW = Math.max(5, node.width() * sx);
      let newH = Math.max(5, node.height() * sy);
      let newX = node.x();
      let newY = node.y();

      // Clamp to image
      newX = Math.max(0, Math.min(newX, imgDim.w - newW));
      newY = Math.max(0, Math.min(newY, imgDim.h - newH));
      newW = Math.min(newW, imgDim.w - newX);
      newH = Math.min(newH, imgDim.h - newY);

      store.updateAnnotation(annotationId, {
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    },
    [store, imgDim.w, imgDim.h]
  );

  // ── Is crosshair within image bounds? ──
  const showCrosshair =
    !isPanning &&
    !isSpaceDown &&
    crosshairPos &&
    crosshairPos.x >= imgBounds.left &&
    crosshairPos.x <= imgBounds.right &&
    crosshairPos.y >= imgBounds.top &&
    crosshairPos.y <= imgBounds.bottom;

  // ── Loading / Error states ──
  if (imageStatus === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-muted-foreground">Loading image…</span>
        </div>
      </div>
    );
  }

  if (imageStatus === "error") {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-xs text-destructive">Failed to load image</span>
      </div>
    );
  }

  return (
    <Stage
      ref={stageRef}
      width={containerWidth}
      height={containerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onContextMenu={(e) => e.evt.preventDefault()}
      style={{ cursor: isPanning ? "grabbing" : isSpaceDown ? "grab" : showCrosshair ? "none" : "default" }}
    >
      <Layer>
        {/* Image + Annotations group (scaled & offset) */}
        <Group x={viewState.x} y={viewState.y} scaleX={viewState.scale} scaleY={viewState.scale}>
          {/* Background image */}
          {loadedImage && (
            <KonvaImage
              image={loadedImage}
              width={imgDim.w}
              height={imgDim.h}
              name="background-image"
            />
          )}

          {/* Existing annotations */}
          {annotations.map((ann) => (
            <AnnotationRect
              key={ann.id}
              annotation={ann}
              isSelected={ann.id === store.selectedAnnotationId}
              scale={viewState.scale}
              onDragMove={handleDragMove}
              onDragEnd={(e) => handleDragEnd(e, ann.id)}
              onTransformEnd={(e) => handleTransformEnd(e, ann.id)}
              onSelect={() => store.setSelectedAnnotation(ann.id)}
            />
          ))}

          {/* Drawing-in-progress rect */}
          {isDrawing && drawingRect && drawingRect.width > 0 && drawingRect.height > 0 && (
            <Rect
              x={drawingRect.x}
              y={drawingRect.y}
              width={drawingRect.width}
              height={drawingRect.height}
              fill={store.activeClassLabel.color + "26"}
              stroke={store.activeClassLabel.color}
              strokeWidth={2}
              strokeScaleEnabled={false}
              dash={[6 / viewState.scale, 4 / viewState.scale]}
            />
          )}

          {/* Transformer */}
          <Transformer
            ref={transformerRef}
            flipEnabled={false}
            rotateEnabled={false}
            borderStroke="#fff"
            borderStrokeWidth={1}
            anchorFill="#fff"
            anchorStroke="#333"
            anchorSize={8}
            anchorCornerRadius={0}
            padding={0}
          />
        </Group>

        {/* Crosshair (stage coordinates, clipped to image bounds) */}
        {showCrosshair && (
          <>
            {/* Vertical line */}
            <Line
              points={[crosshairPos.x, imgBounds.top, crosshairPos.x, imgBounds.bottom]}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
            {/* Horizontal line */}
            <Line
              points={[imgBounds.left, crosshairPos.y, imgBounds.right, crosshairPos.y]}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
            {/* Coordinate label */}
            <Label x={crosshairPos.x + 12} y={crosshairPos.y + 12} listening={false}>
              <Tag fill="rgba(0,0,0,0.75)" />
              <Text
                text={`${Math.round(((crosshairPos.x - imgBounds.left) / viewState.scale))} , ${Math.round(((crosshairPos.y - imgBounds.top) / viewState.scale))}`}
                fontSize={10}
                fill="#fff"
                fontFamily="monospace"
                padding={3}
              />
            </Label>
          </>
        )}
      </Layer>
    </Stage>
  );
}

// ── Sub-component: Annotation Rectangle with label ──
interface AnnotationRectProps {
  annotation: Annotation;
  isSelected: boolean;
  scale: number;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  onSelect: () => void;
}

function AnnotationRect({
  annotation: ann,
  isSelected,
  scale,
  onDragMove,
  onDragEnd,
  onTransformEnd,
  onSelect,
}: AnnotationRectProps) {
  const labelFontSize = Math.max(10, 12 / scale);
  const labelPadding = 3 / scale;

  return (
    <>
      {/* Label background + text */}
      <Label x={ann.x} y={ann.y - (labelFontSize + labelPadding * 2 + 2 / scale)} listening={false}>
        <Tag fill={ann.color} />
        <Text
          text={ann.label}
          fontSize={labelFontSize}
          fill="#fff"
          fontFamily="monospace"
          padding={labelPadding}
        />
      </Label>

      {/* Box rect */}
      <Rect
        id={ann.id}
        name="annotation-rect"
        x={ann.x}
        y={ann.y}
        width={ann.width}
        height={ann.height}
        fill={ann.color + (isSelected ? "33" : "1A")}
        stroke={ann.color}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeScaleEnabled={false}
        draggable={isSelected}
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      />
    </>
  );
}
