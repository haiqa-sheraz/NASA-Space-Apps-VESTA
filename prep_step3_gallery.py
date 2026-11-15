"""
Vesta data prep, step 3: the flame gallery.

Takes the NASA images from the PSI records in raw_data/ (not in the repo), and writes:
  public/images/gallery/<id>.webp        the image, at most 1600 px on its long side
  public/images/gallery/<id>-thumb.webp  a small copy for the grids, at most 640 px wide
  data/gallery.json                      what the site shows: study, size, alt text, caption, credit

Every image was checked by eye first. Two were left out because they show people and insignia:
Flame Design's "CIR support on ISS" (an astronaut, with a logo on their shirt) and DAFT's image
(an astronaut, with a mission patch and a pennant).

Run from the project root:  python prep_step3_gallery.py   (needs Pillow)
"""

import io
import json
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
RAW = ROOT / "raw_data" / "PSI"
OUT = ROOT / "public" / "images" / "gallery"
DATA = ROOT / "data" / "gallery.json"

FULL_MAX = 1600
THUMB_WIDTH = 640

FLAME_DESIGN_ZIP = RAW / "ACME Flame Design PSI-10" / "download.zip"

# id, study id, where the file is, crop box (left, top, right, bottom) or None, caption, alt text.
# The E-FIELD images were saved with gray bands from a screen capture; the crop removes them.
IMAGES = [
    ("acme-e-field-dome-flame", "acme-e-field", ("file", RAW / "ACME E-Field PSI-22" / "1.png"), (17, 0, 875, 607),
     "A low, dome-shaped blue flame",
     "A dim blue gas flame shaped like a low, wide dome, from the ACME E-FIELD Flames study."),
    ("acme-e-field-tipped-flame", "acme-e-field", ("file", RAW / "ACME E-Field PSI-22" / "2.png"), (0, 0, 667, 518),
     "An egg-shaped flame with a yellow tip",
     "A dim blue, egg-shaped gas flame with a bright yellow tip, from the ACME E-FIELD Flames study."),
    ("acme-e-field-round-flame", "acme-e-field", ("file", RAW / "ACME E-Field PSI-22" / "3.png"), (0, 0, 687, 576),
     "A large, round blue flame",
     "A large, round blue gas flame above a small burner, from the ACME E-FIELD Flames study."),
    ("acme-flame-design-hardware", "acme-flame-design", ("zip", "PSI-10_Representative Image(s)_ACME Flame Design Hardware.jpg"), None,
     "The Flame Design hardware",
     "Close-up of the ACME Flame Design hardware: a small ball on a thin tube, surrounded by cables and fittings."),
    ("acme-flame-design-flame-stages", "acme-flame-design", ("zip", "PSI-10_Representative Image(s)_Flame Design_Flame Stages.jpg"), None,
     "Flame stages, from dim blue to bright yellow",
     "Nine round flames from ACME Flame Design: some dim and blue, others bright yellow with glowing specks."),
    ("acme-flame-design-flame-in-space", "acme-flame-design", ("zip", "PSI-10_Representative Image(s)_Flame Design_In Space flame.jpg"), None,
     "A Flame Design flame in space",
     "A faint blue glow around a small ball-shaped burner in space, with bright yellow streaks beside it, from ACME Flame Design."),
    ("acme-cfi-g-spherical-flame", "acme-cfi-g", ("file", RAW / "ACME CFI-G PSI-159" / "PSI-159_Representative Image(s)_CFI-G_Observation of non-premixed quasi-steady spherical cool flames on porous burners.jpg"), None,
     "A spherical flame on a porous burner",
     "A round flame around a ball-shaped porous burner, glowing white and yellow on top and dim blue below, from ACME CFI-G."),
]


def load(source):
    kind, where = source
    if kind == "file":
        return Image.open(where)
    with zipfile.ZipFile(FLAME_DESIGN_ZIP) as z:
        return Image.open(io.BytesIO(z.read(where)))


def fit(im, max_w, max_h):
    scale = min(1.0, max_w / im.width, max_h / im.height)
    if scale < 1:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    return im


def main():
    studies = {s["id"]: s for s in json.loads((ROOT / "data" / "studies.json").read_text(encoding="utf-8"))}
    OUT.mkdir(parents=True, exist_ok=True)
    out = []
    for image_id, study_id, source, crop, caption, alt in IMAGES:
        study = studies[study_id]
        im = load(source).convert("RGB")
        if crop:
            im = im.crop(crop)
        full = fit(im, FULL_MAX, FULL_MAX)
        thumb = fit(im, THUMB_WIDTH, THUMB_WIDTH * 4)
        full.save(OUT / f"{image_id}.webp", "WEBP", quality=82, method=6)
        thumb.save(OUT / f"{image_id}-thumb.webp", "WEBP", quality=78, method=6)
        out.append({
            "id": image_id,
            "studyId": study_id,
            "studyName": study["short_name"],
            "psiId": study["psi_id"],
            "psiUrl": study["psi_url"],
            "src": f"/images/gallery/{image_id}.webp",
            "width": full.width,
            "height": full.height,
            "thumb": f"/images/gallery/{image_id}-thumb.webp",
            "thumbWidth": thumb.width,
            "thumbHeight": thumb.height,
            "caption": caption,
            "alt": alt,
            "credit": f"NASA, {study['short_name']} ({study['psi_id']}).",
        })
        print(f"{image_id}: {full.width}x{full.height}, {(OUT / f'{image_id}.webp').stat().st_size // 1024} KB; thumb {thumb.width}x{thumb.height}")
    DATA.write_text(json.dumps({"images": out}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(out)} images and {DATA.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
