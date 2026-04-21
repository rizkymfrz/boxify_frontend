export interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
}

export interface ImageItem {
  id: string;
  name: string;
  url: string;
  width: number;
  height: number;
}

export interface ClassLabel {
  name: string;
  color: string;
  shortcut: string;
}

export const CLASS_LABELS: ClassLabel[] = [
  { name: "Person", color: "#EF4444", shortcut: "1" },
  { name: "Car", color: "#3B82F6", shortcut: "2" },
  { name: "Dog", color: "#22C55E", shortcut: "3" },
  { name: "Cat", color: "#EAB308", shortcut: "4" },
  { name: "Bicycle", color: "#A855F7", shortcut: "5" },
  { name: "Traffic Light", color: "#F97316", shortcut: "6" },
  { name: "Truck", color: "#06B6D4", shortcut: "7" },
  { name: "Bus", color: "#EC4899", shortcut: "8" },
];

export const DUMMY_IMAGES: ImageItem[] = [
  { id: "img-1", name: "street_scene_001.jpg", url: "https://picsum.photos/seed/boxify1/1920/1080", width: 1920, height: 1080 },
  { id: "img-2", name: "parking_lot_002.jpg", url: "https://picsum.photos/seed/boxify2/1920/1080", width: 1920, height: 1080 },
  { id: "img-3", name: "intersection_003.jpg", url: "https://picsum.photos/seed/boxify3/1920/1080", width: 1920, height: 1080 },
  { id: "img-4", name: "highway_004.jpg", url: "https://picsum.photos/seed/boxify4/1920/1080", width: 1920, height: 1080 },
  { id: "img-5", name: "urban_005.jpg", url: "https://picsum.photos/seed/boxify5/1920/1080", width: 1920, height: 1080 },
];
