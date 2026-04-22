import { create } from "zustand";
import {
  type Annotation,
  type ImageItem,
  type ClassLabel,
  CLASS_LABELS,
} from "./types";

interface AnnotationState {
  // Data
  images: ImageItem[];
  currentImageIndex: number;
  annotations: Record<string, Annotation[]>; // keyed by image id (filename)
  selectedAnnotationId: string | null;
  activeClassLabel: ClassLabel;
  classLabels: ClassLabel[];
  hiddenClasses: string[];

  // Actions
  setImages: (images: ImageItem[]) => void;
  setCurrentImageDimensions: (width: number, height: number) => void;
  nextImage: () => void;
  prevImage: () => void;
  goToImage: (index: number) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, changes: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  setAnnotations: (imageId: string, annotations: Annotation[]) => void;
  clearAnnotations: () => void;
  setSelectedAnnotation: (id: string | null) => void;
  setActiveClassLabel: (label: ClassLabel) => void;
  deleteSelectedAnnotation: () => void;
  toggleVisibility: (className: string) => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  images: [],
  currentImageIndex: 0,
  annotations: {},
  selectedAnnotationId: null,
  activeClassLabel: CLASS_LABELS[0],
  classLabels: CLASS_LABELS,
  hiddenClasses: [],

  setImages: (images: ImageItem[]) => {
    set({ images, currentImageIndex: 0, selectedAnnotationId: null });
  },

  setCurrentImageDimensions: (width: number, height: number) => {
    const { images, currentImageIndex } = get();
    if (images.length === 0 || currentImageIndex >= images.length) return;
    // Only update if dimensions changed (avoid unnecessary re-renders)
    const current = images[currentImageIndex];
    if (current.width === width && current.height === height) return;
    const updated = [...images];
    updated[currentImageIndex] = { ...current, width, height };
    set({ images: updated });
  },

  nextImage: () => {
    const { currentImageIndex, images } = get();
    if (currentImageIndex < images.length - 1) {
      set({ currentImageIndex: currentImageIndex + 1, selectedAnnotationId: null });
    }
  },

  prevImage: () => {
    const { currentImageIndex } = get();
    if (currentImageIndex > 0) {
      set({ currentImageIndex: currentImageIndex - 1, selectedAnnotationId: null });
    }
  },

  goToImage: (index: number) => {
    const { images } = get();
    if (index >= 0 && index < images.length) {
      set({ currentImageIndex: index, selectedAnnotationId: null });
    }
  },

  addAnnotation: (annotation: Annotation) => {
    const { images, currentImageIndex, annotations } = get();
    if (images.length === 0) return;
    const imageId = images[currentImageIndex].id;
    const existing = annotations[imageId] || [];
    set({
      annotations: {
        ...annotations,
        [imageId]: [...existing, annotation],
      },
    });
  },

  updateAnnotation: (id: string, changes: Partial<Annotation>) => {
    const { images, currentImageIndex, annotations } = get();
    if (images.length === 0) return;
    const imageId = images[currentImageIndex].id;
    const existing = annotations[imageId] || [];
    set({
      annotations: {
        ...annotations,
        [imageId]: existing.map((a) => (a.id === id ? { ...a, ...changes } : a)),
      },
    });
  },

  deleteAnnotation: (id: string) => {
    const { images, currentImageIndex, annotations } = get();
    if (images.length === 0) return;
    const imageId = images[currentImageIndex].id;
    const existing = annotations[imageId] || [];
    set({
      annotations: {
        ...annotations,
        [imageId]: existing.filter((a) => a.id !== id),
      },
      selectedAnnotationId: null,
    });
  },

  setAnnotations: (imageId: string, newAnnotations: Annotation[]) => {
    set((state) => ({
      annotations: {
        ...state.annotations,
        [imageId]: newAnnotations,
      },
    }));
  },

  clearAnnotations: () => {
    const { images, currentImageIndex, annotations } = get();
    if (images.length === 0) return;
    const imageId = images[currentImageIndex].id;
    set({
      annotations: {
        ...annotations,
        [imageId]: [],
      },
      selectedAnnotationId: null,
    });
  },

  setSelectedAnnotation: (id: string | null) => {
    const { annotations, currentImageIndex, images, classLabels } = get();
    set({ selectedAnnotationId: id });

    if (id && images.length > 0) {
      const imageId = images[currentImageIndex].id;
      const existing = annotations[imageId] || [];
      const ann = existing.find((a) => a.id === id);
      if (ann) {
        const labelObj = classLabels.find((c) => c.name === ann.label);
        if (labelObj) {
          set({ activeClassLabel: labelObj });
        }
      }
    }
  },

  setActiveClassLabel: (label: ClassLabel) => {
    const { selectedAnnotationId } = get();
    set({ activeClassLabel: label });

    if (selectedAnnotationId) {
      get().updateAnnotation(selectedAnnotationId, {
        label: label.name,
        color: label.color,
      });
    }
  },

  deleteSelectedAnnotation: () => {
    const { selectedAnnotationId } = get();
    if (selectedAnnotationId) {
      get().deleteAnnotation(selectedAnnotationId);
    }
  },

  toggleVisibility: (className: string) => {
    const { hiddenClasses } = get();
    if (hiddenClasses.includes(className)) {
      set({ hiddenClasses: hiddenClasses.filter((c) => c !== className) });
    } else {
      set({ hiddenClasses: [...hiddenClasses, className] });
    }
  },
}));

// Selector: get current image (returns undefined if no images loaded)
export const useCurrentImage = () =>
  useAnnotationStore((s) =>
    s.images.length > 0 ? s.images[s.currentImageIndex] : undefined
  );

const EMPTY_ANNOTATIONS: Annotation[] = [];

// Selector: get annotations for current image
export const useCurrentAnnotations = () =>
  useAnnotationStore((s) => {
    if (s.images.length === 0) return EMPTY_ANNOTATIONS;
    const imageId = s.images[s.currentImageIndex].id;
    return s.annotations[imageId] || EMPTY_ANNOTATIONS;
  });
