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

  // ── Local drawing state ──
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawingRect, setDrawingRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  // ── Refs ──
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // ── Image scale & offset calculation ──
  const { scale, offsetX, offsetY, imgW, imgH } = useMemo(() => {
    if (!loadedImage) return { scale: 1, offsetX: 0, offsetY: 0, imgW: 0, imgH: 0 };
    const w = loadedImage.naturalWidth || loadedImage.width;
    const h = loadedImage.naturalHeight || loadedImage.height;
    const scaleX = containerWidth / w;
    const scaleY = containerHeight / h;
    const s = Math.min(scaleX, scaleY) * 0.95; // 5% padding
    return {
      scale: s,
      offsetX: (containerWidth - w * s) / 2,
      offsetY: (containerHeight - h * s) / 2,
      imgW: w,
      imgH: h,
    };
  }, [loadedImage, containerWidth, containerHeight]);

  // ── Coordinate conversion: stage → image ──
  const stageToImage = useCallback(
    (stageX: number, stageY: number) => ({
      x: Math.max(0, Math.min((stageX - offsetX) / scale, imgW)),
      y: Math.max(0, Math.min((stageY - offsetY) / scale, imgH)),
    }),
    [offsetX, offsetY, scale, imgW, imgH]
  );

  // ── Image boundaries in stage coords (for crosshair clipping) ──
  const imgBounds = useMemo(
    () => ({
      left: offsetX,
      top: offsetY,
      right: offsetX + imgW * scale,
      bottom: offsetY + imgH * scale,
    }),
    [offsetX, offsetY, imgW, imgH, scale]
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

  // ── Reset drawing state on image change ──
  useEffect(() => {
    setIsDrawing(false);
    setDrawStart(null);
    setDrawingRect(null);
  }, [store.currentImageIndex]);

  // ── Mouse handlers ──
  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!loadedImage) return;

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
    [loadedImage, store, stageToImage]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
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
    [isDrawing, drawStart, stageToImage]
  );

  const handleMouseUp = useCallback(() => {
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
  }, [isDrawing, drawingRect, store]);

  const handleMouseLeave = useCallback(() => {
    setCrosshairPos(null);
  }, []);

  // ── Drag handler: constrain rect within image bounds ──
  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const newX = Math.max(0, Math.min(node.x(), imgW - node.width()));
      const newY = Math.max(0, Math.min(node.y(), imgH - node.height()));
      node.x(newX);
      node.y(newY);
    },
    [imgW, imgH]
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
      newX = Math.max(0, Math.min(newX, imgW - newW));
      newY = Math.max(0, Math.min(newY, imgH - newH));
      newW = Math.min(newW, imgW - newX);
      newH = Math.min(newH, imgH - newY);

      store.updateAnnotation(annotationId, {
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    },
    [store, imgW, imgH]
  );

  // ── Is crosshair within image bounds? ──
  const showCrosshair =
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
      style={{ cursor: showCrosshair ? "none" : "default" }}
    >
      <Layer>
        {/* Image + Annotations group (scaled & offset) */}
        <Group x={offsetX} y={offsetY} scaleX={scale} scaleY={scale}>
          {/* Background image */}
          {loadedImage && (
            <KonvaImage
              image={loadedImage}
              width={imgW}
              height={imgH}
              name="background-image"
            />
          )}

          {/* Existing annotations */}
          {annotations.map((ann) => (
            <AnnotationRect
              key={ann.id}
              annotation={ann}
              isSelected={ann.id === store.selectedAnnotationId}
              scale={scale}
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
              strokeWidth={2 / scale}
              dash={[6 / scale, 4 / scale]}
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
                text={`${Math.round(((crosshairPos.x - imgBounds.left) / scale))} , ${Math.round(((crosshairPos.y - imgBounds.top) / scale))}`}
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
  const strokeWidth = isSelected ? 2.5 / scale : 1.5 / scale;

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
        strokeWidth={strokeWidth}
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
