import { create } from "zustand";
import {
  type Annotation,
  type ImageItem,
  type ClassLabel,
  CLASS_LABELS,
  DUMMY_IMAGES,
} from "./types";

interface AnnotationState {
  // Data
  images: ImageItem[];
  currentImageIndex: number;
  annotations: Record<string, Annotation[]>; // keyed by image id
  selectedAnnotationId: string | null;
  activeClassLabel: ClassLabel;
  classLabels: ClassLabel[];

  // Actions
  nextImage: () => void;
  prevImage: () => void;
  goToImage: (index: number) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, changes: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  setSelectedAnnotation: (id: string | null) => void;
  setActiveClassLabel: (label: ClassLabel) => void;
  deleteSelectedAnnotation: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  images: DUMMY_IMAGES,
  currentImageIndex: 0,
  annotations: {},
  selectedAnnotationId: null,
  activeClassLabel: CLASS_LABELS[0],
  classLabels: CLASS_LABELS,

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

  setSelectedAnnotation: (id: string | null) => {
    const { annotations, currentImageIndex, images, classLabels } = get();
    set({ selectedAnnotationId: id });
    
    if (id) {
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
      get().updateAnnotation(selectedAnnotationId, { label: label.name, color: label.color });
    }
  },

  deleteSelectedAnnotation: () => {
    const { selectedAnnotationId } = get();
    if (selectedAnnotationId) {
      get().deleteAnnotation(selectedAnnotationId);
    }
  },
}));

// Selector: get current image
export const useCurrentImage = () =>
  useAnnotationStore((s) => s.images[s.currentImageIndex]);

const EMPTY_ANNOTATIONS: Annotation[] = [];

// Selector: get annotations for current image
export const useCurrentAnnotations = () =>
  useAnnotationStore((s) => {
    const imageId = s.images[s.currentImageIndex].id;
    return s.annotations[imageId] || EMPTY_ANNOTATIONS;
  });
