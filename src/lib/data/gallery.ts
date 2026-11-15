import raw from "../../../data/gallery.json";

/** A NASA photo from a study's PSI record (made by prep_step3_gallery.py; copies in public/images/gallery/). */
export interface GalleryImage {
  id: string;
  studyId: string;
  studyName: string;
  psiId: string;
  psiUrl: string;
  /** Full size, at most 1600 px on its long side. */
  src: string;
  width: number;
  height: number;
  /** A small copy for the grids. */
  thumb: string;
  thumbWidth: number;
  thumbHeight: number;
  caption: string;
  alt: string;
  /** e.g. "NASA, ACME E-FIELD Flames (PSI-22)." */
  credit: string;
}

const IMAGES: GalleryImage[] = (raw as { images: GalleryImage[] }).images;

/** Every gallery image, in study order (the Learn page's Flame gallery). */
export function getGallery(): GalleryImage[] {
  return IMAGES;
}

/** One study's images (its study page). */
export function getStudyGallery(studyId: string): GalleryImage[] {
  return IMAGES.filter((image) => image.studyId === studyId);
}
