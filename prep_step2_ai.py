"""
Flame in Freefall: data prep, steps 3 to 5. Run AFTER prep_step1_clean.py.

Step 3  Text chunks for search: every PDF and transcript, split into labeled chunks.
        Scanned or image-only pages are read by Nemotron 3.5 Super VL.
Step 4  Saved AI answers, made once with ERNIE 5.5 Flash (fallback: Super VL):
          - one profile per study (summaries, key facts, results with sources, jobs, equipment, Earth uses, glossary)
          - mission rankings (scores computed in CODE, the AI only writes the one-line "why")
          - expert versions of the headline findings, the Earth-benefit stories, and the gap explanation
Step 5  Fact-check: every number in every AI answer is looked up in its source text; misses are flagged.

Usage (use the PAID OpenRouter key for this one-time run):
  pip install requests pymupdf
  python prep_step2_ai.py --data "data" --dry-run          # plan and document map, no API calls
  python prep_step2_ai.py --data "data"                    # full run (about 90 requests, 30-60 min)
  python prep_step2_ai.py --data "data" --only chunks,ocr  # parts: chunks, ocr, studies, rankings, findings, earth, gaps
  Add --force to redo parts that already have saved output (otherwise finished studies are skipped).

Reads prep_output/ from step 1 and writes into it:
  chunks.jsonl, ocr_cache/, ai/studies/<id>.json, ai/rankings.json, ai/findings.json,
  ai/earth_benefits.json, ai/gaps.json, ai_check_report.md
"""

import argparse
import base64
import datetime as dt
import json
import os
import re
import sys
import time
from pathlib import Path

import requests

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        sys.exit("Missing PyMuPDF. Run: pip install pymupdf")

API = "https://openrouter.ai/api/v1/chat/completions"
ERNIE = "baidu/ernie-5.5-flash-preview:free"
SUPERVL = "nvidia/nemotron-3.5-super-vl:free"
PAUSE = 3.2
CONTEXT_CHARS = 80_000           # cap on report text sent per study (smaller context = shorter "thinking" for ERNIE)
ERNIE_THINKING = 16_000          # extra tokens for ERNIE, which always "thinks" before answering
CHUNK, OVERLAP = 1200, 200

# ============================================================================ document map

# NTRS documents -> studies (ids from prep_step1_clean.py)
NTRS_MAP = {
    "20020090888": (["earth"], "Spinoff 1986: Space Technology for the Fire Department"),
    "20030099676": (["earth"], "Spinoff 2003: Smoke Mask"),
    "20040142397": (["flex", "flex-2"], "FLEX: Flammability and Extinction Investigations (2004 workshop)"),
    "20090014827": (["spice"], "Smoke Point In Co-flow Experiment (SPICE) description"),
    "20120015928": (["flex", "flex-2"], "FLEX: A Decisive Step Forward in NASA's Combustion Research Program"),
    "20130000422": (["same-r", "same"], "Particle Morphology and Size Results from SAME-2"),
    "20130014061": (["flex"], "Methanol Droplet Combustion in Oxygen-Inert Environments in Microgravity"),
    "20140006750": (["flex"], "Cool-Flame Extinction during n-Alkane Droplet Combustion in Microgravity"),
    "20140011099": (["bass"], "Thickness and Fuel Preheating Effects on Material Flammability (BASS)"),
    "20150003025": (["saffire-i", "saffire-ii", "saffire-iii"], "Saffire Offgas Testing Strategy"),
    "20150019858": (["bass-ii"], "On-Board CSA-CP and CDM Sensor Readings during BASS-II"),
    "20150021491": (["general"], "Evidence Report: Risk of Hypobaric Hypoxia from the Exploration Atmosphere"),
    "20150023456": (["flex"], "Detailed Results From the Flame Extinguishment Experiment (FLEX)"),
    "20160000593": (["bass-ii"], "Combustion of Solids in Microgravity: Results from the BASS-II Experiment"),
    "20170001636": (["saffire-i", "saffire-ii", "saffire-iii"], "The Spacecraft Fire Experiment (Saffire): Objectives, Development and Status"),
    "20180005168": (["saffire-i", "saffire-ii", "saffire-iii"], "Saffire: A Novel Approach to Study of Spacecraft Fire Safety"),
    "20250010653": (["general"], "Lunar Combustion Investigation (LUCI): Flammability Results from a Rotating Sounding Rocket"),
    "20130011664": (["earth"], "Development of the ISS Fine Water Mist Portable Fire Extinguisher"),
    "20210022143": (["earth", "same"], "NASA fire detection white paper (2021)"),
}
ACME = ["acme-bre", "acme-cld-flame", "acme-e-field", "acme-s-flame", "acme-flame-design", "acme-cfi-g"]
NAME_RULES = [  # (filename pattern, studies, title, kind)
    (r"PS-03403", ACME, "ACME on the ISS (poster, NTRS 20210015913)", "poster"),
    (r"PS-03790", ACME, "ACME: Advanced Combustion via Microgravity Experiments (poster, NTRS 20220015583)", "poster"),
    (r"Fire detection white paper", ["earth", "same"], "NASA fire detection white paper (2021)", "paper"),
    (r"mini ?book|combustion_in_reduced_gravity", ["general"], "A Researcher's Guide to ISS Combustion Science (2015)", "report"),
    (r"Apollo 13", ["history"], "Apollo 13 (NASA Safety Center)", "web"),
    (r"Apollo 1\b|Apollo 1\.", ["history"], "Apollo 1 (NASA Safety Center)", "web"),
    (r"Mir", ["history"], "25 Years Ago: Fire Aboard Space Station Mir (NASA)", "web"),
    (r"Fire Detector", ["earth"], "Spinoff: Fire Detector", "scan"),
    (r"Fireman", ["earth"], "Spinoff: Fireman's Air Tanks", "scan"),
    (r"Fire Attire", ["earth"], "Spinoff: New Technology for Fire Attire", "scan"),
    (r"ScienceCasts", ["general"], "NASA ScienceCasts: The Power of Studying Combustion on the ISS (transcript)", "transcript"),
    (r"FLARE", ["general"], "Flammability Limits at Reduced-g Experiment (FLARE), NASA", "web"),
    (r"FM2", ["general"], "Flammability of Materials on the Moon (FM2), NASA", "web"),
    (r"SoFIE", ["general"], "Solid Fuel Ignition and Extinction (SoFIE), NASA", "web"),
    (r"Fluids . Combustion Facility", ["general"], "Fluids and Combustion Facility, NASA", "web"),
    (r"Researcher.*Guide", ["general"], "A Researcher's Guide to Combustion Science (web page)", "web"),
]
FORCE_OCR = [r"PS-03403", r"PS-03790", r"20120015928", r"Fireman", r"Fire Detector"]
SKIP_FILES = [r"Space Resources Program"]       # known wrong page, if still present

MISSIONS = {   # pressure in atm; oxygen %; gravity in g. Rover and Mars air are stated assumptions.
    "spacecraft-iss": {"name": "Spacecraft / ISS", "o2_min": 21, "o2_max": 21, "p_max": 1.0, "p_min": 1.0, "g": 0.0,
                       "note": "ISS air: 21% oxygen, 14.7 psi, about 0 g"},
    "moon-base": {"name": "Moon base", "o2_min": 30, "o2_max": 100, "p_max": 0.694, "p_min": 0.0, "g": 0.17,
                  "note": "Problem statement: 30% oxygen or more, 10.2 psi or less, 1/6 g"},
    "mars-base": {"name": "Mars base", "o2_min": 34, "o2_max": 34, "p_max": 0.558, "p_min": 0.558, "g": 0.38,
                  "note": "NASA's recommended exploration atmosphere, 8.2 psi and 34% oxygen (NTRS 20150021491); Mars gravity about 0.38 g"},
    "rover": {"name": "Pressurized rover", "o2_min": 34, "o2_max": 34, "p_max": 0.558, "p_min": 0.558, "g": 0.17,
              "note": "NASA's recommended exploration atmosphere for exploration vehicles such as pressurized rovers, 8.2 psi and 34% oxygen (NTRS 20150021491), on the Moon at 1/6 g"},
}
JOB_HINTS = {   # main jobs from our own research; used only to flag disagreements for a human to check
    "bass": {"prevent", "put_out"}, "bass-ii": {"prevent"}, "saffire-i": {"prevent"}, "saffire-ii": {"prevent"},
    "saffire-iii": {"prevent"}, "same": {"detect"}, "same-r": {"detect"}, "daft": {"detect"}, "flex": {"put_out"},
    "flex-2": {"put_out"}, "acme-bre": {"prevent"},
}
FUEL_KIND = {"glovebox_air_tunnel": "solid", "cargo_ship_fires": "solid", "burning_droplets": "liquid",
             "acme_gas_flames": "gas", "smoke_and_dust_sensors": "sensor", "ground_study": "analysis"}
GAS_SOLIDS = {"spice": "gas", "slice": "gas", "acme-bre": "gas emulating solids"}

SYS = ("You are a careful assistant for NASA microgravity fire research. Use ONLY the sources given. "
       "If the sources don't say something, leave it out or use null. Never invent numbers. Keep units. "
       "Plain, active, sentence-case English.")


# ============================================================================ helpers

def find_docs(data: Path) -> list[dict]:
    docs = []
    for p in sorted(data.rglob("*")):
        if not p.is_file() or p.suffix.lower() not in (".pdf", ".txt", ".doc", ".docx"):
            continue
        if any(re.search(s, p.name, re.I) for s in SKIP_FILES):
            continue
        if p.suffix.lower() in (".doc", ".docx") and p.with_suffix(".pdf").exists():
            continue                      # the PDF copy is used instead
        rel = str(p.relative_to(data))
        psi = re.findall(r"PSI-\d+", rel)
        ntrs = re.search(r"(?<!\d)((?:19|20)\d{9})(?!\d)", p.name)
        studies, title, kind, url = ["general"], p.stem, "web", None
        if psi:
            studies, kind = [psi[-1]], "report"          # innermost PSI folder wins
            title = f"{psi[-1]} final report: {p.stem}"
        elif ntrs and ntrs.group(1) in NTRS_MAP:
            studies, title = NTRS_MAP[ntrs.group(1)]
            kind, url = "paper", f"https://ntrs.nasa.gov/citations/{ntrs.group(1)}"
        else:
            for pat, st, t, k in NAME_RULES:
                if re.search(pat, p.name, re.I):
                    studies, title, kind = st, t, k
                    break
            else:
                if "Earth benefits" in rel:
                    studies, kind = ["earth"], "web"
        docs.append({"path": p, "rel": rel, "studies": studies, "title": title, "kind": kind, "url": url,
                     "force_ocr": any(re.search(f, p.name, re.I) for f in FORCE_OCR)})
    return docs


def resolve_study_ids(docs, studies):
    by_psi = {s["psi_id"]: s["id"] for s in studies}
    for d in docs:
        d["studies"] = [by_psi.get(x, x) for x in d["studies"]]
        if d["kind"] == "report":
            sid = d["studies"][0]
            s = next((x for x in studies if x["id"] == sid), None)
            if s:
                d["url"] = s.get("psi_url")
                d["title"] = f"{s['short_name']} final report ({s['psi_id']})"


def clean_text(t: str) -> str:
    """Drop broken characters some PDFs produce (lone surrogates) so files can be saved as UTF-8."""
    return re.sub(r"[\ud800-\udfff]", "", t or "")


def page_texts(path: Path) -> list[str]:
    if path.suffix.lower() == ".txt":
        return [clean_text(path.read_text(encoding="utf-8", errors="replace"))]
    with fitz.open(path) as doc:
        return [clean_text(doc[i].get_text()) for i in range(len(doc))]


def page_image(path: Path, i: int, max_side=1800) -> str:
    with fitz.open(path) as doc:
        page = doc[i]
        z = max_side / max(page.rect.width, page.rect.height)
        pix = page.get_pixmap(matrix=fitz.Matrix(z, z))
        try:
            img, mime = pix.tobytes("jpg", jpg_quality=85), "image/jpeg"
        except Exception:
            img, mime = pix.tobytes("png"), "image/png"
    return f"data:{mime};base64," + base64.b64encode(img).decode()


def chunks_of(text: str):
    t = re.sub(r"\s+", " ", text).strip()
    out, start = [], 0
    while start < len(t):
        piece = t[start:start + CHUNK]
        if len(piece) > 60:
            out.append(piece)
        if start + CHUNK >= len(t):
            break
        start += CHUNK - OVERLAP
    return out


NUM_RE = re.compile(r"(?<![\w.])(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\w])")


def made_up_numbers(answer: str, source: str) -> list[str]:
    def norm(n):
        try:
            return format(float(n.replace(",", "")), "g")
        except ValueError:
            return n
    answer = re.sub(r"\bD\d+ p\d+\b", " ", answer)
    src = {norm(n) for n in NUM_RE.findall(source)}
    bad = set()
    for n in NUM_RE.findall(answer):
        v = norm(n)
        small = v.replace(".", "", 1).isdigit() and "." not in v and float(v) <= 10
        if v not in src and not small:
            bad.add(n)
    return sorted(bad)


def words(s) -> int:
    return len(str(s or "").split())


def call(key, model, messages, schema=None, name="result", max_tokens=2500):
    payload = {"model": model, "messages": messages, "temperature": 0.2, "max_tokens": max_tokens}
    if model == SUPERVL:
        payload["reasoning"] = {"enabled": False}
    else:
        payload["reasoning"] = {"effort": "low"}
        payload["max_tokens"] = max_tokens + ERNIE_THINKING
    if schema:
        payload["response_format"] = {"type": "json_schema", "json_schema": {"name": name, "strict": True, "schema": schema}}
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-Title": "Flame in Freefall data prep"}
    last = {"error": None}
    for attempt in range(1, 4):
        t0 = time.time()
        try:
            r = requests.post(API, headers=headers, json=payload, timeout=900)
        except requests.RequestException as exc:
            last = {"error": str(exc)[:300], "seconds": round(time.time() - t0, 1)}
            time.sleep(10 * attempt)
            continue
        secs = round(time.time() - t0, 1)
        if r.status_code == 200:
            choice = (r.json().get("choices") or [{}])[0]
            msg = choice.get("message") or {}
            content, finish = msg.get("content") or "", choice.get("finish_reason")
            if not content.strip() and finish == "length" and attempt == 1 and model == ERNIE:
                payload["max_tokens"] += ERNIE_THINKING          # ran out of room while thinking: try once with more
                continue
            return {"content": content, "seconds": secs, "model": model, "error": None, "finish": finish,
                    "thinking_chars": len(msg.get("reasoning") or "")}
        last = {"error": f"{r.status_code} {r.text[:300]}", "seconds": secs}
        if r.status_code == 400 and "response_format" in payload and re.search(r"schema|response_format", r.text, re.I):
            payload.pop("response_format")
            continue
        if r.status_code in (429, 500, 502, 503, 504):
            time.sleep(20 * attempt)
            continue
        break
    return {"content": "", "seconds": last.get("seconds"), "model": model, "error": last["error"]}


def parse_json(text):
    """Reads JSON even when it's wrapped in code fences or extra words, or has trailing commas."""
    t = re.sub(r"<think>.*?</think>", "", text or "", flags=re.S)
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t.strip())
    cands = [t]
    if "{" in t and "}" in t:
        cands.append(t[t.index("{"): t.rindex("}") + 1])
    for c in list(cands):
        cands.append(re.sub(r",\s*([}\]])", r"\1", c))
    for c in cands:
        try:
            return json.loads(c)
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
    return None


DEBUG_DIR = None   # set in main()


def ask_json(key, messages, schema, name, max_tokens=2500, log=None):
    """ERNIE first, Super VL as fallback. Returns (data, info)."""
    for model in (ERNIE, SUPERVL):
        res = call(key, model, messages, schema, name, max_tokens)
        time.sleep(PAUSE)
        data = parse_json(res["content"])
        if data is not None:
            return data, res
        if log is not None:
            log.append(f"{name}: {model} gave no valid JSON ({res['error'] or 'bad JSON'}; finish={res.get('finish')}, "
                       f"answer {len(res.get('content') or '')} chars, thinking {res.get('thinking_chars', 0)} chars)")
        if DEBUG_DIR:
            DEBUG_DIR.mkdir(parents=True, exist_ok=True)
            f = DEBUG_DIR / f"{name}_{model.split('/')[1].split(':')[0]}_{int(time.time())}.txt"
            f.write_text(f"finish={res.get('finish')} error={res.get('error')}\n\n{res.get('content') or ''}", encoding="utf-8")
    return None, res


# ============================================================================ schemas

STUDY_SCHEMA = {
    "type": "object", "additionalProperties": False,
    "required": ["summary_simple", "summary_expert", "experiment_goal", "key_facts", "results", "jobs",
                 "equipment", "earth_uses", "glossary", "open_questions"],
    "properties": {
        "summary_simple": {"type": "string"}, "summary_expert": {"type": "string"}, "experiment_goal": {"type": "string"},
        "key_facts": {"type": "object", "additionalProperties": False,
                      "required": ["fuels", "sample_shapes", "oxygen", "pressure", "airflow", "gravity", "what_changed", "sensors", "number_of_tests"],
                      "properties": {"fuels": {"type": "array", "items": {"type": "string"}},
                                     "sample_shapes": {"type": "array", "items": {"type": "string"}},
                                     "oxygen": {"type": ["string", "null"]}, "pressure": {"type": ["string", "null"]},
                                     "airflow": {"type": ["string", "null"]}, "gravity": {"type": ["string", "null"]},
                                     "what_changed": {"type": "array", "items": {"type": "string"}},
                                     "sensors": {"type": "array", "items": {"type": "string"}},
                                     "number_of_tests": {"type": ["string", "null"]}}},
        "results": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                                               "required": ["result_simple", "result_expert", "safety_meaning", "job", "source"],
                                               "properties": {"result_simple": {"type": "string"}, "result_expert": {"type": "string"},
                                                              "safety_meaning": {"type": "string"},
                                                              "job": {"type": "string", "enum": ["prevent", "detect", "put_out", "none"]},
                                                              "source": {"type": "string"}}}},
        "jobs": {"type": "array", "items": {"type": "string", "enum": ["prevent", "detect", "put_out"]}},
        "equipment": {"type": "array", "items": {"type": "object", "additionalProperties": False, "required": ["area", "note"],
                                                 "properties": {"area": {"type": "string", "enum": ["detectors", "extinguishers", "materials", "ventilation", "other"]},
                                                                "note": {"type": "string"}}}},
        "earth_uses": {"type": "array", "items": {"type": "string"}},
        "glossary": {"type": "array", "items": {"type": "object", "additionalProperties": False, "required": ["term", "definition"],
                                                "properties": {"term": {"type": "string"}, "definition": {"type": "string"}}}},
        "open_questions": {"type": "array", "items": {"type": "string"}},
    },
}
STUDY_INSTRUCTIONS = """Write a profile of this NASA study for the Flame in Freefall website. Return JSON only.
- summary_simple: <= 80 words, plain English for students.
- summary_expert: <= 150 words, with conditions and units.
- experiment_goal: one sentence on what the study set out to learn.
- key_facts: fuels, sample_shapes, oxygen, pressure, airflow, gravity (each with units, or null if not in the sources),
  what_changed (what varied between tests), sensors, number_of_tests (null if not stated).
- results: 3 to 5 main findings. result_simple <= 30 words, result_expert <= 50 words, safety_meaning <= 30 words
  (what it means for crew fire safety), job (prevent, detect, put_out, or none), source = the label of the passage it
  came from, like "D2 p14" or "T" for the table facts.
- jobs: the 1 or 2 MAIN fire-safety jobs this study helps. Don't add a job just because one result touches it.
  Basic flame-science studies may have an empty list.
- equipment: 1 to 3 ways the results inform detectors, extinguishers, material choices or ventilation (most fire
  studies inform at least one). Each note <= 20 words. Empty list only if the study is truly unrelated.
- earth_uses: uses on Earth that the sources state (empty list if none).
- glossary: up to 4 terms a student might not know, each defined in <= 20 words.
- open_questions: what the sources say is still unknown (empty list if none).
Every number you write must appear in the sources."""

WHY_SCHEMA = {"type": "object", "additionalProperties": False, "required": ["reasons"],
              "properties": {"reasons": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                                                                    "required": ["study_id", "why"],
                                                                    "properties": {"study_id": {"type": "string"}, "why": {"type": "string"}}}}}}
FINDINGS = [
    ("f1", "A plastic rod kept burning at 13.6% oxygen in space but stopped at 16% on Earth.", "prevent", "bass-ii", ["20160000593"]),
    ("f2", "For thin plastic sheets, flames died out below about 2 cm/s of airflow and blew out near 40 cm/s.", "prevent", "bass-ii", ["20160000593"]),
    ("f3", "The station's smoke detector missed Kapton smoke in half the SAME tests.", "detect", "same", ["Fire detection white paper"]),
    ("f4", "Large fuel drops kept burning with an invisible cool flame after the visible flame went out.", "put_out", "flex", ["20140006750"]),
    ("f5", "No solid material in PSI was tested above about 22% oxygen, but a Moon base may use 30% or more.", "prevent", None, []),
]


# ============================================================================ main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    ap.add_argument("--prep", default="prep_output", help="Folder written by prep_step1_clean.py")
    ap.add_argument("--only", default="chunks,ocr,studies,rankings,findings,earth,gaps")
    ap.add_argument("--force", action="store_true", help="Redo AI answers that already exist")
    ap.add_argument("--redo-ocr", action="store_true", help="Read scanned pages again even if cached")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    parts = {x.strip() for x in args.only.split(",")}
    data, prep = Path(args.data).expanduser(), Path(args.prep)
    if not (prep / "studies.json").exists():
        sys.exit("Run prep_step1_clean.py first (prep_output/studies.json not found).")
    key = os.environ.get("OPENROUTER_API_KEY", "")
    if not key and not args.dry_run and parts - {"chunks"}:
        sys.exit("Set OPENROUTER_API_KEY (the paid key) first.")
    studies = json.loads((prep / "studies.json").read_text(encoding="utf-8"))
    facts = json.loads((prep / "facts.json").read_text(encoding="utf-8"))
    ai_dir, ocr_dir = prep / "ai", prep / "ocr_cache"
    (ai_dir / "studies").mkdir(parents=True, exist_ok=True)
    ocr_dir.mkdir(exist_ok=True)
    docs = find_docs(data)
    resolve_study_ids(docs, studies)
    log, checks = [], []
    global DEBUG_DIR
    DEBUG_DIR = prep / "debug"

    # ---------------------------------------------------------------- step 3: text (+ OCR)
    print("== Reading documents")
    skipped = []
    for d in docs:
        if d["path"].suffix.lower() in (".doc", ".docx"):
            d["pages"] = []
            skipped.append(d["rel"])
            continue
        d["pages"] = page_texts(d["path"])
        short = [i for i, t in enumerate(d["pages"]) if len(t.strip()) < 150]
        image_only = d["pages"] and len(short) / len(d["pages"]) > 0.5      # most pages have no text layer
        if d["path"].suffix.lower() != ".pdf":
            d["ocr_pages"] = []
        elif d["force_ocr"]:
            d["ocr_pages"] = list(range(len(d["pages"])))[:60]
        else:
            d["ocr_pages"] = short[:60] if image_only else []
    n_ocr = sum(len(d["ocr_pages"]) for d in docs if d.get("ocr_pages"))
    print(f"  {len(docs)} documents, {sum(len(d['pages']) for d in docs)} pages, {n_ocr} pages to read with Super VL")
    if skipped:
        print("  Skipped (save as PDF to include):", "; ".join(skipped))

    if args.dry_run:
        for d in docs:
            print(f"  {d['kind']:<10} {','.join(d['studies']):<38} {len(d['pages']):>4} p  ocr {len(d.get('ocr_pages') or []):>3}  {d['title'][:70]}")
        ctx_sizes = {s["id"]: sum(len(t) for d in docs if s["id"] in d["studies"] for t in d["pages"]) for s in studies}
        print("\n  Report text per study (chars, before the cap):", {k: v for k, v in ctx_sizes.items() if v})
        print("  No report text:", [k for k, v in ctx_sizes.items() if not v])
        print(f"\n  Planned requests: OCR {n_ocr} + studies {len([s for s in studies if s['environment'] == 'space'])} "
              f"+ rankings {len(MISSIONS)} + findings 1 + earth 1 + gaps 1")
        return

    if "ocr" in parts and n_ocr:
        print(f"== Reading {n_ocr} scanned pages with Super VL")
        for d in docs:
            for i in d.get("ocr_pages") or []:
                cache = ocr_dir / f"{re.sub(r'[^A-Za-z0-9]+', '_', d['path'].stem)}_p{i + 1}.txt"
                if cache.exists() and not args.redo_ocr:
                    d["pages"][i] = cache.read_text(encoding="utf-8")
                    continue
                res = call(key, SUPERVL, [{"role": "user", "content": [
                    {"type": "text", "text": "Transcribe all the text on this scanned page, in reading order. The page may be "
                                             "rotated: read it correctly. Plain text only, no commentary."},
                    {"type": "image_url", "image_url": {"url": page_image(d["path"], i)}}]}], max_tokens=3000)
                time.sleep(PAUSE)
                if not res["content"]:                                  # one retry with a smaller image
                    res = call(key, SUPERVL, [{"role": "user", "content": [
                        {"type": "text", "text": "Transcribe all the text on this page. Plain text only."},
                        {"type": "image_url", "image_url": {"url": page_image(d["path"], i, 1300)}}]}], max_tokens=4000)
                    time.sleep(PAUSE)
                if res["content"]:
                    res["content"] = clean_text(res["content"])
                    d["pages"][i] = res["content"]
                    cache.write_text(res["content"], encoding="utf-8")
                else:
                    log.append(f"OCR failed: {d['rel']} page {i + 1}: {res['error']}")
                print(f"  {d['rel']} p{i + 1}: {'ok' if res['content'] else 'failed'}")
    else:
        for d in docs:   # use any cached OCR text
            for i in d.get("ocr_pages") or []:
                cache = ocr_dir / f"{re.sub(r'[^A-Za-z0-9]+', '_', d['path'].stem)}_p{i + 1}.txt"
                if cache.exists():
                    d["pages"][i] = cache.read_text(encoding="utf-8")

    if "chunks" in parts:
        n = 0
        with open(prep / "chunks.jsonl", "w", encoding="utf-8") as f:
            for di, d in enumerate(docs):
                for pi, text in enumerate(d["pages"]):
                    for ci, piece in enumerate(chunks_of(text)):
                        f.write(json.dumps({"id": f"d{di}-p{pi + 1}-c{ci}", "doc_title": d["title"], "doc_file": d["rel"],
                                            "kind": d["kind"], "url": d["url"], "page": pi + 1, "study_ids": d["studies"],
                                            "ocr": pi in (d.get("ocr_pages") or []), "text": piece}, ensure_ascii=False) + "\n")
                        n += 1
        print(f"== Wrote {n} search chunks to chunks.jsonl")

    # ---------------------------------------------------------------- step 4a: study profiles
    def context_for(s):
        own = [d for d in docs if s["id"] in d["studies"] and d["pages"]]
        own.sort(key=lambda d: (d["kind"] != "report", d["kind"] != "paper"))
        labels, parts_txt, used = [], [], 0
        for n, d in enumerate(own, 1):
            labels.append({"label": f"D{n}", "title": d["title"], "url": d["url"], "file": d["rel"]})
            for pi, t in enumerate(d["pages"]):
                t = re.sub(r"\s+", " ", t).strip()
                if not t or used > CONTEXT_CHARS:
                    continue
                parts_txt.append(f"[D{n} p{pi + 1}] {t}")
                used += len(t)
        # passages from general documents that mention this study by name
        name = re.escape(s["short_name"].replace("ACME ", ""))
        extra_n = len(own) + 1
        gen = [d for d in docs if set(d["studies"]) & {"general"} and d["pages"]]
        hits = 0
        for d in gen:
            for pi, t in enumerate(d["pages"]):
                if re.search(rf"\b{name}\b", t) and hits < 12:
                    if not any(l["file"] == d["rel"] for l in labels):
                        labels.append({"label": f"D{extra_n}", "title": d["title"], "url": d["url"], "file": d["rel"]})
                        extra_n += 1
                    lab = next(l["label"] for l in labels if l["file"] == d["rel"])
                    parts_txt.append(f"[{lab} p{pi + 1}] " + re.sub(r"\s+", " ", t).strip()[:3000])
                    hits += 1
        table = {k: s.get(k) for k in ("short_name", "full_name", "tests", "years", "oxygen_pct_range", "pressure_atm_range",
                                       "airflow_cm_s_range", "fuels", "materials", "outcomes", "thin_table", "known_mismatches")}
        parts_txt.insert(0, "[T] Table facts computed from the PSI data table: " + json.dumps(table, ensure_ascii=False))
        return "\n\n".join(parts_txt), labels

    if "studies" in parts:
        print("== Study profiles (ERNIE)")
        for s in studies:
            if s["environment"] != "space":
                continue
            out = ai_dir / "studies" / f"{s['id']}.json"
            if out.exists() and not args.force:
                print(f"  {s['short_name']}: already done (use --force to redo)")
                continue
            ctx, labels = context_for(s)
            msgs = [{"role": "system", "content": SYS},
                    {"role": "user", "content": f"{STUDY_INSTRUCTIONS}\n\nSTUDY: {s['short_name']} ({s['psi_id']}), "
                                                f"{s.get('full_name') or ''}\n\nSOURCES:\n{ctx}"}]
            data, info = ask_json(key, msgs, STUDY_SCHEMA, "study_profile", 3500, log)
            if data is None:
                log.append(f"Study {s['id']}: no answer ({info['error']})")
                print(f"  {s['short_name']}: FAILED")
                continue
            data.setdefault("key_facts", {})["number_of_tests"] = str(s["tests"]) if s["tests"] else None   # from the table, not the AI
            flags = made_up_numbers(json.dumps(data, ensure_ascii=False), ctx)   # check the AI text only
            for r in data.get("results", []):
                m = re.match(r"(D\d+)\s*p(\d+)", r.get("source", ""))
                lab = next((l for l in labels if m and l["label"] == m.group(1)), None)
                r["source_detail"] = {"title": lab["title"], "url": lab["url"], "page": int(m.group(2))} if lab else \
                    ({"title": "PSI data table", "url": s.get("psi_url"), "page": None} if r.get("source", "").strip() == "T" else None)
            lengths = {"summary_simple": words(data.get("summary_simple")), "summary_expert": words(data.get("summary_expert"))}
            hint = JOB_HINTS.get(s["id"])
            ai_jobs = list(dict.fromkeys(data.get("jobs") or []))
            data["ai_jobs"] = ai_jobs
            if hint:
                data["jobs"], data["jobs_source"] = sorted(hint), "our research"
                if set(ai_jobs) != hint:
                    log.append(f"Jobs for {s['short_name']}: used our research {sorted(hint)} (AI said {ai_jobs})")
            else:
                data["jobs"], data["jobs_source"] = ai_jobs[:2], "AI (top 2)"
            record = {"study_id": s["id"], "model": info["model"], "seconds": info["seconds"],
                      "generated": dt.datetime.now().isoformat(timespec="seconds"), "sources": labels,
                      "numbers_not_in_sources": flags, "word_counts": lengths, "profile": data}
            out.write_text(json.dumps(record, indent=2, ensure_ascii=False), encoding="utf-8")
            checks.append((f"study {s['short_name']}", info["model"], info["seconds"], flags,
                           [k for k, v in lengths.items() if v > (90 if k == "summary_simple" else 170)]))
            print(f"  {s['short_name']}: done in {info['seconds']} s ({info['model'].split('/')[1]}), "
                  f"{len(flags)} numbers to check")

    profiles = {}
    for p in (ai_dir / "studies").glob("*.json"):
        rec = json.loads(p.read_text(encoding="utf-8"))
        profiles[rec["study_id"]] = rec["profile"]

    # ---------------------------------------------------------------- step 4b: mission rankings (scores in code)
    def match(s, m):
        o2 = s.get("oxygen_pct_range") or [21, 21]
        o2_assumed = not s.get("oxygen_pct_range")
        p = s.get("pressure_atm_range") or [1.0, 1.0]
        p_assumed = not s.get("pressure_atm_range")
        if o2[1] >= m["o2_min"] and o2[0] <= m["o2_max"]:
            oxy = "yes"
        elif o2[1] >= m["o2_min"] - 5:
            oxy = "partial"
        else:
            oxy = "no"
        if p[0] <= m["p_max"] + 1e-6 and p[1] >= m["p_min"] - 1e-6:
            pres = "yes"
        elif p[0] <= m["p_max"] + 0.2:
            pres = "partial"
        else:
            pres = "no"
        if m["g"] == 0:
            grav = "yes" if s["environment"] == "space" else "no"
        else:
            grav = "partial"     # PSI has 0 g and 1 g data only: they bound the Moon and Mars
        kind = GAS_SOLIDS.get(s["id"], FUEL_KIND[s["hardware_family"]])
        fuel = "yes" if kind == "solid" else ("partial" if kind in ("gas emulating solids", "gas", "liquid", "sensor") else "no")
        val = {"yes": 1, "partial": 0.5, "no": 0}
        score = round(35 * val[oxy] + 25 * val[pres] + 15 * val[grav] + 25 * val[fuel])
        return {"oxygen": oxy, "pressure": pres, "gravity": grav, "fuel": fuel, "score": score,
                "assumed": [x for x, a in (("oxygen 21% (cabin air)", o2_assumed), ("pressure about 1 atm", p_assumed)) if a]}

    if "rankings" in parts:
        print("== Mission rankings")
        flight = [s for s in studies if s["environment"] == "space" and s["tests"]]
        rankings = {}
        for mid, m in MISSIONS.items():
            rows = []
            for s in flight:
                mt = match(s, m)
                rows.append({"study_id": s["id"], "short_name": s["short_name"], **mt})
            rows.sort(key=lambda r: (-r["score"], -next(s["tests"] for s in flight if s["id"] == r["study_id"])))
            brief = [{"study_id": r["study_id"], "name": r["short_name"], "matches": {k: r[k] for k in ("oxygen", "pressure", "gravity", "fuel")},
                      "assumed": r["assumed"],
                      "facts": {k: next(s for s in flight if s["id"] == r["study_id"]).get(k) for k in ("oxygen_pct_range", "pressure_atm_range", "materials", "fuels")}}
                     for r in rows]
            msgs = [{"role": "system", "content": SYS},
                    {"role": "user", "content": f"Mission: {m['name']} ({m['note']}). For each study below, write 'why': one sentence "
                                                f"(<= 25 words) explaining its match to this mission, using ONLY the given matches and facts. "
                                                f"Mention assumed values as assumed. Return JSON only.\n\n{json.dumps(brief, ensure_ascii=False)}"}]
            data, info = ask_json(key, msgs, WHY_SCHEMA, "ranking_reasons", 3000, log)
            whys = {x["study_id"]: x["why"] for x in (data or {}).get("reasons", [])}
            for r in rows:
                r["why"] = whys.get(r["study_id"])
            rankings[mid] = {"mission": m, "studies": rows, "model": info["model"] if data else None}
            flags = made_up_numbers(json.dumps(whys), json.dumps(brief) + m["note"])
            checks.append((f"ranking {m['name']}", info["model"], info["seconds"], flags, []))
            print(f"  {m['name']}: top 3 = {[r['short_name'] for r in rows[:3]]}")
        (ai_dir / "rankings.json").write_text(json.dumps({"generated": dt.datetime.now().isoformat(timespec="seconds"),
                                                          "scoring": "35 oxygen + 25 pressure + 15 gravity + 25 fuel type; yes=1, partial=0.5, no=0",
                                                          "missions": rankings}, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------------------------------------------------------------- step 4c: headline findings (simple = verified text)
    if "findings" in parts:
        print("== Headline findings")
        srcs, items = [], []
        for fid, simple, job, sid, doc_keys in FINDINGS:
            text = ""
            for d in docs:
                if any(k in d["rel"] for k in doc_keys) and d["pages"]:
                    text += " ".join(re.sub(r"\s+", " ", t) for t in d["pages"])[:20000]
            if fid == "f5":
                text = json.dumps(facts["oxygen_coverage"]) + " Moon base air: 30% oxygen or more (problem statement)."
            srcs.append(text)
            items.append({"id": fid, "simple": simple, "source_text": text[:20000]})
        schema = {"type": "object", "additionalProperties": False, "required": ["findings"],
                  "properties": {"findings": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                                                                         "required": ["id", "expert"],
                                                                         "properties": {"id": {"type": "string"}, "expert": {"type": "string"}}}}}}
        msgs = [{"role": "system", "content": SYS},
                {"role": "user", "content": "For each finding, write an expert version (<= 40 words) with the conditions and units "
                                            "from its source text. Keep the same meaning. Return JSON only.\n\n" + json.dumps(items, ensure_ascii=False)}]
        data, info = ask_json(key, msgs, schema, "findings", 2000, log)
        expert = {x["id"]: x["expert"] for x in (data or {}).get("findings", [])}
        out = []
        for (fid, simple, job, sid, doc_keys), text in zip(FINDINGS, srcs):
            fl = made_up_numbers(expert.get(fid, ""), text + " " + simple)
            out.append({"id": fid, "simple": simple, "expert": expert.get(fid), "job": job, "study_id": sid,
                        "sources": [f"NTRS {k}" if k.isdigit() else k for k in doc_keys] or ["computed from PSI tables"],
                        "numbers_not_in_sources": fl})
            checks.append((f"finding {fid}", info["model"], info["seconds"], fl, []))
        (ai_dir / "findings.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------------------------------------------------------------- step 4d: Earth benefits
    if "earth" in parts:
        print("== Earth benefits")
        edocs = [d for d in docs if "earth" in d["studies"] and d["pages"]]
        labels = [{"label": f"E{n}", "title": d["title"], "url": d["url"], "file": d["rel"]} for n, d in enumerate(edocs, 1)]
        ctx = "\n\n".join(f"[E{n}] {d['title']}: " + re.sub(r"\s+", " ", " ".join(d["pages"]))[:12000] for n, d in enumerate(edocs, 1))
        schema = {"type": "object", "additionalProperties": False, "required": ["stories"],
                  "properties": {"stories": {"type": "array", "items": {"type": "object", "additionalProperties": False,
                                                                        "required": ["topic", "in_space", "on_earth", "key_facts", "sources"],
                                                                        "properties": {"topic": {"type": "string", "enum": ["water mist", "smoke detection", "firefighter gear"]},
                                                                                       "in_space": {"type": "string"}, "on_earth": {"type": "string"},
                                                                                       "key_facts": {"type": "array", "items": {"type": "string"}},
                                                                                       "sources": {"type": "array", "items": {"type": "string"}}}}}}}
        msgs = [{"role": "system", "content": SYS + " Never say NASA invented the smoke detector."},
                {"role": "user", "content": "Write three stories for the Earth benefits page: water mist, smoke detection, firefighter gear. "
                                            "in_space and on_earth: <= 35 words each. key_facts: 2 to 3 facts with numbers and units from the "
                                            "sources. sources: the passage labels used, like E3. Return JSON only.\n\n" + ctx}]
        data, info = ask_json(key, msgs, schema, "earth_benefits", 2500, log)
        fl = made_up_numbers(json.dumps(data or {}), ctx)
        (ai_dir / "earth_benefits.json").write_text(json.dumps({"stories": (data or {}).get("stories", []), "sources": labels,
                                                                "numbers_not_in_sources": fl}, indent=2, ensure_ascii=False), encoding="utf-8")
        checks.append(("earth benefits", info["model"], info["seconds"], fl, []))

    # ---------------------------------------------------------------- step 4e: gaps
    if "gaps" in parts:
        print("== Gap explanation")
        src = json.dumps({"oxygen_coverage": facts["oxygen_coverage"], "gaps": facts["gaps"],
                          "studies_by_gravity": facts.get("studies_by_gravity") or facts.get("gravity_coverage")}, ensure_ascii=False) + \
            " Moon base air may be 30% oxygen or more at 10.2 psi or less (problem statement). LUCI simulated Moon gravity on a spinning rocket; FM2 is planned."
        schema = {"type": "object", "additionalProperties": False, "required": ["simple", "expert"],
                  "properties": {"simple": {"type": "string"}, "expert": {"type": "string"}}}
        msgs = [{"role": "system", "content": SYS},
                {"role": "user", "content": "Explain what NASA's fire data doesn't cover yet and why it matters for a Moon base. "
                                            "simple: <= 80 words. expert: <= 150 words. Use only numbers in the facts. Return JSON only.\n\n" + src}]
        data, info = ask_json(key, msgs, schema, "gaps", 1500, log)
        fl = made_up_numbers(json.dumps(data or {}), src)
        (ai_dir / "gaps.json").write_text(json.dumps({**(data or {}), "numbers_not_in_sources": fl}, indent=2, ensure_ascii=False), encoding="utf-8")
        checks.append(("gaps", info["model"], info["seconds"], fl, []))

    # ---------------------------------------------------------------- step 5: report
    L = ["# AI answers check report", "", f"Generated {dt.datetime.now().isoformat(timespec='seconds')}", "",
         "Numbers listed below were not found in the source text. Most are rounding or unit conversions, but check each one.", "",
         "| Item | Model | Seconds | Numbers to check | Too long |", "|---|---|---|---|---|"]
    for item, model, secs, flags, long_ in checks:
        L.append(f"| {item} | {(model or '-').split('/')[-1]} | {secs} | {', '.join(flags) or 'none'} | {', '.join(long_) or '-'} |")
    if skipped:
        L += ["", "## Skipped files (save as PDF to include)", ""] + [f"- {s}" for s in skipped]
    if log:
        L += ["", "## Problems", ""] + [f"- {x}" for x in log]
    (prep / "ai_check_report.md").write_text("\n".join(L), encoding="utf-8")
    print(f"\nDone. Read {prep / 'ai_check_report.md'}")


if __name__ == "__main__":
    main()