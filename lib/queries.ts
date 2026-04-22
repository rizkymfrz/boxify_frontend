"use client";

import { useEffect, useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getImages, saveAnnotations, exportDataset, getAnnotations, API_BASE } from "./api";
import { useAnnotationStore } from "./store";
import type { ImageItem, AnnotationRequest } from "./types";

// ── Query: fetch image list from backend ──

export function useImagesQuery(projectId: string) {
  const setImages = useAnnotationStore((s) => s.setImages);

  const query = useQuery({
    queryKey: ["images", projectId],
    queryFn: async () => {
      const imageItems = await getImages(projectId);
      return imageItems.map(
        (item): ImageItem => ({
          id: item.filename,
          name: item.filename,
          // Update the static URL to serve from the project images endpoint
          url: `${API_BASE}/projects/${projectId}/images/${encodeURIComponent(item.filename)}`,
          width: 0, // resolved when canvas loads the image
          height: 0,
        })
      );
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Sync fetched data into Zustand
  useEffect(() => {
    if (query.data && query.data.length > 0) {
      setImages(query.data);
    }
  }, [query.data, setImages]);

  return query;
}

// ── Query: load existing annotations for an image ──

export function useAnnotationsQuery(projectId: string, filename?: string) {
  return useQuery({
    queryKey: ["annotations", projectId, filename],
    queryFn: async () => {
      if (!filename || !projectId) return null;
      return getAnnotations(projectId, filename);
    },
    enabled: !!filename && !!projectId,
    staleTime: 0, // Always fetch latest when navigating
  });
}

// ── Mutation: save annotations for a single image ──

export function useSaveAnnotationsMutation(projectId: string) {
  return useMutation({
    mutationFn: async ({
      filename,
      payload,
    }: {
      filename: string;
      payload: AnnotationRequest;
    }) => {
      return saveAnnotations(projectId, filename, payload);
    },
  });
}

// ── Hook: save current annotations then navigate ──

export function useSaveAndNavigate(projectId: string) {
  const saveMutation = useSaveAnnotationsMutation(projectId);

  const saveAndGo = useCallback(
    (targetIndex: number) => {
      const state = useAnnotationStore.getState();
      const currentImage = state.images[state.currentImageIndex];

      // If no current image or dimensions unknown, just navigate
      if (!currentImage || currentImage.width === 0 || currentImage.height === 0) {
        useAnnotationStore.getState().goToImage(targetIndex);
        return;
      }

      const currentAnnotations = state.annotations[currentImage.id] || [];

      const payload: AnnotationRequest = {
        image_width: currentImage.width,
        image_height: currentImage.height,
        boxes: currentAnnotations.map((a) => ({
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          label: a.label,
        })),
      };

      saveMutation.mutate(
        { filename: currentImage.name, payload },
        {
          onSettled: () => {
            useAnnotationStore.getState().goToImage(targetIndex);
          },
        }
      );
    },
    [saveMutation]
  );

  return { saveAndGo, isSaving: saveMutation.isPending };
}

// ── Hook: manual save without navigating ──

export function useManualSave(projectId: string) {
  const saveMutation = useSaveAnnotationsMutation(projectId);
  const [isJustSaved, setIsJustSaved] = useState(false);

  const handleManualSave = useCallback(() => {
    const state = useAnnotationStore.getState();
    const currentImage = state.images[state.currentImageIndex];

    if (!currentImage || currentImage.width === 0 || currentImage.height === 0) {
      return;
    }

    const currentAnnotations = state.annotations[currentImage.id] || [];

    const payload: AnnotationRequest = {
      image_width: currentImage.width,
      image_height: currentImage.height,
      boxes: currentAnnotations.map((a) => ({
        x: a.x,
        y: a.y,
        width: a.width,
        height: a.height,
        label: a.label,
      })),
    };

    saveMutation.mutate(
      { filename: currentImage.name, payload },
      {
        onSuccess: () => {
          setIsJustSaved(true);
          setTimeout(() => setIsJustSaved(false), 2000);
        },
      }
    );
  }, [saveMutation]);

  return { handleManualSave, isSaving: saveMutation.isPending, isJustSaved };
}

// ── Hook: export dataset as zip download ──

export function useExportDataset(projectId: string) {
  return useMutation({
    mutationFn: async () => {
      const blob = await exportDataset(projectId);
      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project_${projectId}_export.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  });
}
