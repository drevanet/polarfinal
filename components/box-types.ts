export type FaceKey =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom";

export type FaceImages = Record<FaceKey, string | null>;

export const EMPTY_IMAGES: FaceImages = {
  front: null,
  back: null,
  left: null,
  right: null,
  top: null,
  bottom: null,
};

export const FACE_OPTIONS: {
  key: FaceKey;
  label: string;
}[] = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
  { key: "top", label: "Top" },
  { key: "bottom", label: "Bottom" },
];