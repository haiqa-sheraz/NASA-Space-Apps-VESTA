"use client";

import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { GalleryImage } from "@/lib/data/gallery";
import { Dialog } from "./Dialog";

/**
 * NASA photos as a grid of small copies (lazy-loaded); select one to enlarge it in a lightbox.
 * The lightbox is the site's dialog: Escape or the close button closes it, focus stays inside and
 * goes back to the photo afterward, and Left and Right move between photos. `linkStudy` adds a
 * link to each photo's study page (not wanted on that study's own page). The enlarged photo is
 * sized to the screen, so the photo and its caption always show without scrolling.
 */
export function Gallery({ images, linkStudy = true, compact = false }: { images: GalleryImage[]; linkStudy?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const titleId = useId();
  const close = useCallback(() => setOpen(null), []);
  const step = useCallback((by: number) => setOpen((i) => (i === null ? null : (i + by + images.length) % images.length)), [images.length]);

  useEffect(() => {
    if (open === null || images.length < 2) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length, step]);

  const current = open === null ? null : images[open];
  const figureRef = useRef<HTMLElement>(null);

  // The photo gets the height the dialog has left after its header, padding and caption.
  useLayoutEffect(() => {
    const figure = figureRef.current;
    const body = figure?.parentElement;
    const dialog = figure?.closest<HTMLElement>(".dialog");
    const img = figure?.querySelector("img");
    const caption = figure?.querySelector("figcaption");
    if (!figure || !body || !dialog || !img || !caption) return;
    let frame = 0;
    const fit = () => {
      const header = dialog.querySelector<HTMLElement>(":scope > header");
      const dialogStyle = getComputedStyle(dialog);
      const bodyStyle = getComputedStyle(body);
      const figureStyle = getComputedStyle(figure);
      // On short screens the caption sits beside the photo, so it takes no height.
      const below = figureStyle.flexDirection !== "row";
      const limit = parseFloat(dialogStyle.maxHeight) || window.innerHeight;
      const room =
        limit -
        parseFloat(dialogStyle.borderTopWidth) -
        parseFloat(dialogStyle.borderBottomWidth) -
        parseFloat(dialogStyle.paddingTop) -
        parseFloat(dialogStyle.paddingBottom) -
        (header?.offsetHeight ?? 0) -
        parseFloat(bodyStyle.paddingTop) -
        parseFloat(bodyStyle.paddingBottom) -
        (below ? caption.offsetHeight + (parseFloat(figureStyle.rowGap) || 0) : 0);
      img.style.maxHeight = `${Math.max(80, Math.floor(room))}px`;
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();
    const observer = new ResizeObserver(later);
    observer.observe(caption);
    window.addEventListener("resize", later);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", later);
      cancelAnimationFrame(frame);
    };
  }, [current]);

  return (
    <>
      <ul className={`gallery-grid${compact ? " compact" : ""}`}>
        {images.map((image, i) => (
          <li key={image.id}>
            <figure className="gallery-item">
              <button type="button" className="gallery-thumb" onClick={() => setOpen(i)}>
                <span className="sr-only">Enlarge: </span>
                {/* Small WebP copies made ahead of time, so no image service is needed. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.thumb} width={image.thumbWidth} height={image.thumbHeight} alt={image.alt} loading="lazy" decoding="async" />
                <span className="gallery-zoom" aria-hidden="true">
                  <Maximize2 className="ic sm" />
                </span>
              </button>
              <figcaption className="stack g1">
                <span className="small strong">{image.caption}</span>
                <span className="small muted">{image.credit}</span>
                {linkStudy && (
                  <Link className="small self-start" href={`/study/${image.studyId}`}>
                    Open {image.studyName}
                  </Link>
                )}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      <Dialog
        open={current !== null}
        onClose={close}
        labelledBy={titleId}
        heading={open === null ? "" : `Photo ${open + 1} of ${images.length}`}
        closeLabel="Close photo"
        actions={
          images.length > 1 ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => step(-1)}>
                <ChevronLeft className="ic sm" aria-hidden="true" />
                Previous
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => step(1)}>
                Next
                <ChevronRight className="ic sm" aria-hidden="true" />
              </button>
            </>
          ) : undefined
        }
      >
        {current && (
          <figure ref={figureRef} className="lightbox">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={current.id} src={current.src} width={current.width} height={current.height} alt={current.alt} decoding="async" />
            <figcaption className="stack g1">
              <span id={titleId} className="h4">
                {current.caption}
              </span>
              <span className="small muted">{current.credit}</span>
              {linkStudy && (
                <Link className="small self-start" href={`/study/${current.studyId}`} onClick={close}>
                  Open {current.studyName}
                </Link>
              )}
            </figcaption>
          </figure>
        )}
      </Dialog>
    </>
  );
}
