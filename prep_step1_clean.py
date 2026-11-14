"""
Flame in Freefall: data prep, steps 1 and 2.

Step 1  Clean every PSI experiment table into one tidy tests table (fixes the known data quirks).
Step 2  Compute the site's facts in code: key numbers, per-study summaries, oxygen coverage, gaps.

"""

import argparse
import csv
import datetime as dt
import html
import io
import json
import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

# ============================================================================ study list

STUDIES = [
    # id, short name, PSI ID, hardware family, where it ran
    ("bass", "BASS", "PSI-26", "glovebox_air_tunnel", "space"),
    ("bass-ii", "BASS-II", "PSI-25", "glovebox_air_tunnel", "space"),
    ("spice", "SPICE", "PSI-107", "glovebox_air_tunnel", "space"),
    ("slice", "SLICE", "PSI-106", "glovebox_air_tunnel", "space"),
    ("flex", "FLEX", "PSI-69", "burning_droplets", "space"),
    ("flex-2", "FLEX-2", "PSI-68", "burning_droplets", "space"),
    ("cfi", "CFI", "PSI-39", "burning_droplets", "space"),
    ("acme-bre", "ACME BRE", "PSI-20", "acme_gas_flames", "space"),
    ("acme-cld-flame", "ACME CLD Flame", "PSI-21", "acme_gas_flames", "space"),
    ("acme-e-field", "ACME E-FIELD Flames", "PSI-22", "acme_gas_flames", "space"),
    ("acme-s-flame", "ACME s-Flame", "PSI-23", "acme_gas_flames", "space"),
    ("acme-flame-design", "ACME Flame Design", "PSI-10", "acme_gas_flames", "space"),
    ("acme-cfi-g", "ACME CFI-G", "PSI-159", "acme_gas_flames", "space"),
    ("saffire-i", "Saffire-I", "PSI-98", "cargo_ship_fires", "space"),
    ("saffire-ii", "Saffire-II", "PSI-99", "cargo_ship_fires", "space"),
    ("saffire-iii", "Saffire-III", "PSI-100", "cargo_ship_fires", "space"),
    ("same", "SAME", "PSI-102", "smoke_and_dust_sensors", "space"),
    ("same-r", "SAME-R", "PSI-101", "smoke_and_dust_sensors", "space"),
    ("daft", "DAFT", "PSI-47", "smoke_and_dust_sensors", "space"),
    ("psi-60", "PSI-60", "PSI-60", "ground_study", "ground"),
    ("psi-62", "PSI-62", "PSI-62", "ground_study", "ground"),
    ("psi-115", "PSI-115", "PSI-115", "ground_study", "ground"),
    ("psi-117", "PSI-117", "PSI-117", "ground_study", "ground"),
    ("psi-142", "PSI-142", "PSI-142", "ground_study", "ground"),
]
BY_PSI = {s[2]: s for s in STUDIES}
FAMILY_NAMES = {
    "glovebox_air_tunnel": "Glovebox air tunnel", "burning_droplets": "Burning droplets",
    "acme_gas_flames": "Gas flames (ACME)", "cargo_ship_fires": "Big fires on a cargo ship",
    "smoke_and_dust_sensors": "Smoke and dust sensors", "ground_study": "Ground studies",
}
# Known table-vs-report disagreements (from our document review)
KNOWN_MISMATCHES = {
    "saffire-i": ["Burn time: table says 420 s for sample S1; NASA's 2018 Saffire talk (NTRS 20180005168) says 400 s."],
    "saffire-iii": ["Airflow: table says 30 cm/s; NASA's 2018 Saffire talk (NTRS 20180005168) says 25 cm/s."],
}
THIN_TABLES = {
    "bass": "Table lists samples only (no airflow, oxygen or results). Use the reports.",
    "slice": "Table lists test dates and fuels only. Use the reports.",
    "flex-2": "Table is the planned test matrix, not results.",
    "daft": "Table lists 2 test sessions only.",
    "same": "Table has 8 rows; samples 5 to 8 reuse the conditions of samples 1 to 4.",
    "saffire-iii": "Table has 2 rows.",
}

COLUMNS = ["study_id", "psi_id", "source_table", "source_row", "test_id", "date", "year", "fuel", "material",
           "sample_shape", "sample_size", "oxygen_pct_min", "oxygen_pct_max", "oxygen_final_pct",
           "pressure_atm_min", "pressure_atm_max", "airflow_cm_s_min", "airflow_cm_s_max", "diluent",
           "droplet_diameter_mm", "burn_time_s", "outcome", "is_test", "duplicate_of", "flags", "extra"]


# ============================================================================ small helpers

NUM = r"(?<![A-Za-z])[-+]?(?:\d+\.\d*|\.\d+|\d+)(?:[eE][-+]?\d+)?"   # skips digits inside formulas like O2, CH4


def read_table(path: Path) -> tuple[list[dict], str]:
    raw = path.read_bytes()
    for enc in ("utf-8-sig", "cp1252"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    rows = list(csv.DictReader(io.StringIO(text)))
    clean = [{(k or "").strip(): (v or "").strip() for k, v in r.items() if k is not None} for r in rows]
    return clean, enc


def nums(s) -> list[float]:
    return [float(x) for x in re.findall(NUM, str(s or ""))]


def num(s):
    """First number in a cell, or None. '~ 21.5' -> 21.5, '.33 cm' -> 0.33, 'n/a' -> None."""
    v = nums(s)
    return v[0] if v else None


def approx(s) -> bool:
    return bool(re.search(r"[~≈]|about|approx", str(s or ""), re.I))


def pct(v):
    """Oxygen as percent: fractions (<= 1) become percent; '3400%'-style values become 34."""
    if v is None:
        return None
    if v <= 1:
        return round(v * 100, 3)
    if v > 100:
        return round(v / 100, 3)
    return round(v, 3)


def blank(s) -> bool:
    return str(s or "").strip().lower() in ("", "-", "n/a", "na", "none", "null")


MONTHS = {m: i for i, m in enumerate(["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], 1)}


def date_iso(y, m, d):
    try:
        return dt.date(int(y), int(m), int(d)).isoformat()
    except (TypeError, ValueError):
        return None


def parse_date(s):
    """Handles 3/30/2012, 9-Mar-17, 2012-FEB-09. Returns (iso or None, year or None, leftover note)."""
    s = str(s or "").strip()
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})", s)
    if m:
        y = int(m.group(3)); y += 2000 if y < 100 else 0
        return date_iso(y, m.group(1), m.group(2)), y, s[m.end():].strip()
    m = re.match(r"^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})", s)
    if m:
        y = int(m.group(3)); y += 2000 if y < 100 else 0
        return date_iso(y, MONTHS.get(m.group(2).lower()), m.group(1)), y, s[m.end():].strip()
    m = re.match(r"^(\d{4})-([A-Za-z]{3})-(\d{1,2})", s)
    if m:
        return date_iso(m.group(1), MONTHS.get(m.group(2).lower()), m.group(3)), int(m.group(1)), s[m.end():].strip()
    return None, None, s


def checked_date(date_cell, gmt_cell, rec_flags, hint_year=None):
    """Parse m/d/Y and fix impossible years. Candidates: the neighbouring rows' year first, then digit
    swaps of the typo (2103 -> 2013), and the GMT day-of-year column must agree."""
    if blank(date_cell):
        rec_flags.append("date missing in the table")
        return None
    cleaned = re.sub(r"[`'\u2019]", "", str(date_cell))
    if cleaned != str(date_cell):
        rec_flags.append(f"stray character removed from date '{date_cell}'")
        date_cell = cleaned
    iso, year, _ = parse_date(date_cell)
    if iso is None:
        rec_flags.append(f"date '{date_cell}' could not be read")
    if year and not (1990 <= year <= dt.date.today().year):
        gmt = num(gmt_cell)
        m = re.match(r"^(\d{1,2})/(\d{1,2})/", str(date_cell or ""))
        if gmt and m:
            from itertools import permutations
            swaps = sorted({int("".join(pp)) for pp in permutations(str(year))})
            cands = [y for y in ([hint_year, (hint_year or 0) + 1, (hint_year or 0) - 1] + swaps)
                     if y and 1990 <= y <= dt.date.today().year]
            for y in cands:
                try:
                    d = dt.date(y, int(m.group(1)), int(m.group(2)))
                except ValueError:
                    continue
                if d.timetuple().tm_yday == int(gmt):
                    rec_flags.append(f"year typo fixed: {year} -> {y} (matches GMT day {int(gmt)})")
                    return d.isoformat()
        rec_flags.append(f"date '{date_cell}' has an impossible year: left blank")
        return None
    return iso


def yyddd(code):
    """ACME test days like 17319 = year 2017, day 319."""
    m = re.match(r"^(\d{2})(\d{3})$", str(code or "").strip())
    if not m:
        return None, None
    y, d = 2000 + int(m.group(1)), int(m.group(2))
    try:
        return (dt.date(y, 1, 1) + dt.timedelta(days=d - 1)).isoformat(), y
    except ValueError:
        return None, y


MATERIALS = [("pmma", "PMMA"), ("sibal", "SIBAL (cotton-fiberglass)"), ("cotton-fiberglass", "SIBAL (cotton-fiberglass)"),
             ("nomex", "Nomex"), ("japan wax", "Wax candle"), ("candle", "Wax candle"), ("silicone", "Silicone"),
             ("kapton", "Kapton"), ("teflon", "Teflon"), ("lampwick", "Lampwick"), ("dibutyl phthalate", "Dibutyl phthalate"),
             ("pyrell", "Pyrell"), ("arizona road dust", "Arizona road dust"), ("rod", "PMMA")]
SHAPES = ["sphere", "rod", "film", "slab", "fabric", "candle", "flat", "plate", "cylinder"]


def parse_sample(s):
    """'1 cm wide 200 micron thick PMMA' -> (PMMA, film/slab?, '1 cm wide, 200 micron thick')."""
    t = re.sub(r"\s+", " ", str(s or "")).strip()
    low = t.lower()
    material = next((name for key, name in MATERIALS if key in low), None)
    shape = next((sh for sh in SHAPES if sh in low), None)
    if shape is None and material and "SIBAL" in material:
        shape = "fabric"
    if shape is None and "micron" in low:
        shape = "film"
    sizes = re.findall(r"\d+(?:\.\d+)?\s*(?:cm|mm|micron)(?:\s*(?:wide|thick))?|\d+/\d+\s*(?:\"|in)", t)
    return material, shape, ", ".join(sizes) or None, t


class Collector:
    def __init__(self):
        self.tests, self.notes = [], defaultdict(list)

    def note(self, study_id, msg):
        if msg not in self.notes[study_id]:
            self.notes[study_id].append(msg)

    def add(self, study, table, row, **f):
        sid, short, psi, fam, env = study
        rec = {c: None for c in COLUMNS}
        rec.update(study_id=sid, psi_id=psi, source_table=table, source_row=row, is_test=True, flags=[], extra={})
        rec.update({k: v for k, v in f.items() if k in rec})
        if f.get("oxygen_pct_min") is not None and rec["oxygen_pct_max"] is None:
            rec["oxygen_pct_max"] = rec["oxygen_pct_min"]
        if f.get("pressure_atm_min") is not None and rec["pressure_atm_max"] is None:
            rec["pressure_atm_max"] = rec["pressure_atm_min"]
        if f.get("airflow_cm_s_min") is not None and rec["airflow_cm_s_max"] is None:
            rec["airflow_cm_s_max"] = rec["airflow_cm_s_min"]
        if rec["date"] and not rec["year"]:
            rec["year"] = int(rec["date"][:4])
        self.tests.append(rec)
        return rec


def extra(row, used):
    return {k: v for k, v in row.items() if k not in used and not blank(v)}


# ============================================================================ table cleaners (one per study)

def clean_bass(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        mat, shape, size, raw = parse_sample(r.get("Fuel Sample Material"))
        fl = []
        rec = c.add(st, name, i, test_id=r.get("Test #"), date=checked_date(r.get("Date"), r.get("GMT"), fl, c.tests[-1]["year"] if c.tests and c.tests[-1]["study_id"] == st[0] else None), material=mat,
                    sample_shape=shape, sample_size=size, extra=extra(r, {"Test #", "Date", "Fuel Sample Material"}))
        rec["flags"] += fl
        rec["extra"]["sample_description"] = raw
        if mat is None:
            rec["flags"].append("material not stated in the table")
    c.note(st[0], "Normalized sample names (for example 'pmma 2 cm' and 'PMMA 2 cm' are the same).")


def clean_bass_ii(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        mat, shape, size, raw = parse_sample(r.get("Fuel Sample Material"))
        o_i, o_f = num(r.get("Calibrated  initial O2 % by vol") or r.get("Calibrated initial O2 % by vol")), num(r.get("Calibrated final O2 % by vol"))
        fl = []
        rec = c.add(st, name, i, test_id=r.get("Test #"), date=checked_date(r.get("Date"), r.get("GMT"), fl, c.tests[-1]["year"] if c.tests and c.tests[-1]["study_id"] == st[0] else None), material=mat,
                    sample_shape=shape, sample_size=size, oxygen_pct_min=o_i, oxygen_final_pct=o_f,
                    pressure_atm_min=None,
                    extra={"pi": r.get("PI"), "sample_description": raw,
                           "fan_display": r.get("Fan display") or None, "air_display": r.get("Air display") or None,
                           "air_display_values": nums(r.get("Air display")) or None,
                           "flow_restrictor": r.get("Flow restrictor") or None,
                           "co2_initial_pct": num(r.get("Initial CO2 % by vol")), "co2_final_pct": num(r.get("Final CO2 % by vol")),
                           "co_initial_ppm": num(r.get("Initial CO (ppm)")), "co_final_ppm": num(r.get("Final CO (ppm)")),
                           "frames": num(r.get("Total Frames Shot"))})
        rec["flags"] += fl
        if r.get("Air display") or r.get("Fan display"):
            rec["flags"].append("airflow given as display readings, not cm/s (convert with the BASS-II Summary Report)")
        if o_i is not None and o_f is not None and o_f < o_i - 5:
            rec["flags"].append(f"final O2 {o_f}% is far below initial {o_i}%: check against the report")
    c.note(st[0], "Airflow is stored as fan and air display readings, not cm/s. Kept as-is and flagged.")


def clean_spice(c, st, rows, name):
    seen = {}
    for i, r in enumerate(rows, 1):
        fuel = re.sub(r"(\d+)\s*%", r"\1%", r.get("Fuel", ""))
        key = tuple(sorted(r.items()))
        rec = c.add(st, name, i, test_id=f"GMT {r.get('GMT date')} {r.get('GMT ignition')}", fuel=fuel,
                    airflow_cm_s_min=num(r.get("Air Rate (cm/s)")),
                    extra={"gmt_day": num(r.get("GMT date")), "nozzle_mm": num(r.get("Nozzle (mm)")),
                           "fuel_rate_sccm": num(r.get("Fuel Rate (sccm)")), "fuel_rate_mg_s": num(r.get("Fuel Rate (mg/s)")),
                           "hc_fuel_rate_mg_s": num(r.get("HC Fuel Rate (mg/s)")),
                           "ignition_gmt": r.get("GMT ignition"), "flame_off_gmt": r.get("GMT  Flame Off") or r.get("GMT Flame Off")})
        rec["flags"].append("year not in the table (GMT day only)")
        # A few rows have an air rate below 0 cm/s, which can't be an air speed (the report gives
        # co-flow of 5.4 to 65 cm/s for the smoke points). Like FLEX's 0 pressure: treated as missing.
        if rec["airflow_cm_s_min"] is not None and rec["airflow_cm_s_min"] < 0:
            rec["flags"].append(f"air rate recorded as {r.get('Air Rate (cm/s)', '').strip()} cm/s (below 0): treated as missing")
            rec["airflow_cm_s_min"] = rec["airflow_cm_s_max"] = None
        if key in seen:
            rec["duplicate_of"] = seen[key]
            rec["is_test"] = False
        else:
            seen[key] = i
    c.note(st[0], "Fuel spelling unified ('75 % Propylene' = '75% Propylene').")
    c.note(st[0], "Exact duplicate rows marked (duplicate_of) and not counted as separate tests.")
    c.note(st[0], "Smoke points are in the SPICE final report (Table 1), not in this table.")


def clean_slice(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        iso, year, date_note = parse_date(r.get("Test Date"))
        fuel_cell = r.get("Fuel Type", "")
        m = re.match(r"^(\d+%\s*[A-Za-z0-9]+(?:\s*\(balance N2\))?)\s*(.*)$", fuel_cell)
        fuel, fuel_note = (m.group(1), m.group(2)) if m else (fuel_cell, "")
        rec = c.add(st, name, i, test_id=iso, date=iso, year=year, fuel=fuel,
                    extra={k: v for k, v in (("date_note", date_note), ("note", fuel_note)) if v})
        if date_note or fuel_note:
            rec["flags"].append("notes were mixed into the date or fuel cell; split out")


def clean_flex(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        p_mmhg = num(r.get("Ambient pressure; mmHg"))
        rec = c.add(st, name, i, test_id=r.get("FLEX Identifier") or r.get("FLEX Test #"),
                    date=parse_date(r.get("Test Date"))[0], fuel=r.get("Fuel"),
                    oxygen_pct_min=pct(num(r.get("O initial ambient composition; mole fraction"))),
                    pressure_atm_min=round(p_mmhg / 760, 4) if p_mmhg else None,
                    droplet_diameter_mm=num(r.get("Droplet initial diameter; mm")),
                    burn_time_s=num(r.get("Burn time; s")), outcome=(r.get("Test end") or "").lower() or None,
                    diluent="; ".join(f"{g} {pct(num(r.get(col)))}%" for g, col in
                                      (("CO2", "CO initial ambient composition; mole fraction"),
                                       ("He", "He initial ambient composition; mole fraction"))
                                      if (num(r.get(col)) or 0) > 0) or None,
                    extra={"flex_test_number": num(r.get("FLEX Test #")), "pressure_mmhg": p_mmhg,
                           "n2_pct": pct(num(r.get("N initial ambient composition; mole fraction"))),
                           "extinction_diameter_mm": num(r.get("Visible flame extinction diameter; mm")),
                           "burning_rate_mm2_s": num(r.get("Burning rate; mm"))})
        if p_mmhg == 0:
            rec["pressure_atm_min"] = rec["pressure_atm_max"] = None
            rec["flags"].append("pressure recorded as 0 mmHg: treated as missing")
    c.note(st[0], "Column names fixed: 'O' = O2, 'N' = N2, 'CO' = CO2 (not carbon monoxide), 'He' = helium.")
    c.note(st[0], "Burning rate unit fixed to mm²/s. File read as Windows-1252 text.")


def clean_flex_2(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        o2 = [pct(v) for v in nums(r.get("Oxygen Mole Fraction"))]
        p = nums(r.get("Ambient Pressure (atm)"))
        flow = nums(r.get("Flow Velocity (cm/s)"))
        d = nums(r.get("Initial Droplet Diameter (mm)"))
        rec = c.add(st, name, i, test_id=f"planned {i}", fuel=r.get("Sample (Fuel Type)"),
                    oxygen_pct_min=min(o2) if o2 else None, oxygen_pct_max=max(o2) if o2 else None,
                    pressure_atm_min=min(p) if p else None, pressure_atm_max=max(p) if p else None,
                    airflow_cm_s_min=min(flow) if flow else None, airflow_cm_s_max=max(flow) if flow else None,
                    diluent=r.get("Ambient Gas Mixture"), is_test=False,
                    extra={"oxygen_pct_values": o2, "pressure_atm_values": p, "droplet_diameter_mm_range": d,
                           "ambient_temperature_c": num(r.get("Ambient Temperature (C)"))})
        rec["flags"].append("planned test matrix, not a result")


def clean_cfi(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        fuel = r.get("Fuel", "")
        m = re.match(r"\[([\d.]+)\]/\[([\d.]+)\]\s*C12H26/iso-dodecane", fuel)
        fuel_name = (f"{round(float(m.group(1)) * 100)}/{round(float(m.group(2)) * 100)} n-dodecane/iso-dodecane"
                     if m else ("n-dodecane" if fuel == "C12H26" else fuel))
        he = num(r.get("Helium")) or 0
        c.add(st, name, i, test_id=r.get("CIR") or r.get("Flex Number"), date=parse_date(r.get("Test Date"))[0],
              fuel=fuel_name, oxygen_pct_min=pct(num(r.get("Oxygen"))), pressure_atm_min=num(r.get("Pressure")),
              diluent="; ".join(x for x in (f"N2 {pct(num(r.get('Nitrogen')))}%" if num(r.get("Nitrogen")) else "",
                                            f"He {pct(he)}%" if he else "") if x) or None,
              extra={"flex_number": r.get("Flex Number"), "fiber_supported": r.get("Fiber"), "fuel_formula": fuel,
                     "local_time": r.get("Local Time")})
    c.note(st[0], "Results (flame behavior) are in the report's figures, not in this table.")


def acme_common(r):
    return {"flames_ignited": num(r.get("Flames Ignited") or r.get("Flames Ignited*")), "notes": r.get("Notes") or None}


def clean_bre(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        raw = r.get("Oxygen Conc (percent)", "")
        o2 = []
        for tok in re.split(r"[;,]", raw):
            v = num(tok)
            if v is not None:
                o2.append(pct(v / 100 if "%" in tok and v > 100 else v))
        month = MONTHS.get(str(r.get("Month", ""))[:3].lower())
        rec = c.add(st, name, i, test_id=f"{r.get('Year')}-{r.get('Month')}-{r.get('Date')}",
                    date=date_iso(r.get("Year"), month, r.get("Date")),
                    fuel=re.sub(r"(\d)%(?=\S)", r"\1% ", r.get("Fuel Bottle")) if r.get("Fuel Bottle") else r.get("Fuel Bottle"),
                    oxygen_pct_min=min(o2) if o2 else None, oxygen_pct_max=max(o2) if o2 else None,
                    extra={**acme_common(r), "burner_mm": num(r.get("Burner Size (mm)")), "oxygen_pct_values": o2})
        if re.search(r"\d{4,}\s*%", raw):
            bad = re.search(r"(\d{4,})\s*%", raw).group(1)
            rec["flags"].append(f"spreadsheet error: '{bad}%' read as {float(bad) / 100:g}%")
    c.note(st[0], "Each row is a test day; oxygen cells list several levels. Imitates burning solids with a gas burner.")
    c.note(st[0], "Fuel spelling unified ('100%C2H4' = '100% C2H4').")


AUTOINC_CH = re.compile(r"\bCH(1[0-9]|[5-9])\b")
# Same typo for ethylene: the rows say "Ethylene based test" but count up C2H5, C2H6 ... C2H11.
AUTOINC_C2H = re.compile(r"\bC2H(1[0-9]|[5-9])\b")
AUTOINC_N = re.compile(r"\bN([3-9])\b")


def clean_cld(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        iso, year = yyddd(r.get("Test Day"))
        bottle = r.get("Fuel Bottle", "")
        fixed = AUTOINC_C2H.sub("C2H4", AUTOINC_CH.sub("CH4", bottle))
        rec = c.add(st, name, i, test_id=r.get("Test Day"), date=iso, year=year, fuel=fixed,
                    extra={**acme_common(r), "test_type": r.get("Test Type"), "fuel_conc_range": r.get("Fuel conc. Range"),
                           "fuel_mfc": num(r.get("Fuel MFC")), "n2_mfc": num(r.get("N2 MFC"))})
        if fixed != bottle:
            rec["flags"].append(f"fixed spreadsheet auto-increment typo: '{bottle}' -> '{fixed}'")
    c.note(st[0], "Fuel bottle names had spreadsheet auto-increment typos ('40% CH5' ... 'CH14', '100% C2H5' ... 'C2H11'); fixed to CH4 and C2H4.")


def clean_efield(c, st, rows, name):
    last_bottle = None
    for i, r in enumerate(rows, 1):
        month = num(r.get("Month"))
        bottle = r.get("Fuel Bottle") or None
        rec = c.add(st, name, i, test_id=r.get("Test Day"), date=date_iso(r.get("Year"), month, r.get("Date")) or yyddd(r.get("Test Day"))[0],
                    fuel=bottle or last_bottle,
                    extra={**acme_common(r), "test_type": r.get("Test Type"), "mesh_polarity": r.get("Mesh Polarity"),
                           "fuel_conc": r.get("Fuel Conc")})
        if bottle is None and last_bottle:
            rec["flags"].append("fuel bottle blank in the table; assumed same as the row above")
        last_bottle = bottle or last_bottle


def clean_sflame(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        atm_raw, fuel_raw = r.get("Atmosphere*", ""), r.get("Fuel Bottle", "")
        atm, fuel = AUTOINC_N.sub("N2", atm_raw), AUTOINC_N.sub("N2", fuel_raw)
        o2 = [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)\s*%", atm)]
        month = MONTHS.get(str(r.get("Month", ""))[:3].lower()) or num(r.get("Month"))
        rec = c.add(st, name, i, test_id=r.get("Test Day*"), date=date_iso(r.get("Year"), month, r.get("Date")) or yyddd(r.get("Test Day*"))[0],
                    fuel=fuel, oxygen_pct_min=min(o2) if o2 else None, oxygen_pct_max=max(o2) if o2 else None,
                    diluent="He" if "He" in atm else ("N2" if "N2" in atm else None), pressure_atm_min=1.0,
                    extra={**acme_common(r), "atmosphere": atm, "test_type": r.get("Test Type")})
        rec["flags"].append("oxygen and pressure are approximate (~)")
        if atm != atm_raw or fuel != fuel_raw:
            rec["flags"].append("fixed spreadsheet auto-increment typo (N3, N4... -> N2)")
    c.note(st[0], "Diluent names had auto-increment typos ('with N3' ... 'N6'); fixed to N2.")


def clean_flame_design(c, st, rows, name):
    kind = "inverse" if "Inverse" in name else "normal"
    for i, r in enumerate(rows, 1):
        o_init = r.get("XO2") if kind == "inverse" else r.get("XO2 (init)")
        ramped = [k for k, v in r.items() if str(v).strip().upper() in ("RAMPED", "RAMP")]
        low_o2 = [k for k, v in r.items() if str(v).strip().upper() == "LOW O2"]
        rec = c.add(st, name, i, test_id=r.get("Test"), fuel=r.get("Fuel") or ("C2H4 (fuel side, inverse flame)" if kind == "inverse" else None),
                    oxygen_pct_min=pct(num(o_init)),
                    oxygen_final_pct=pct(num(r.get("XO2 (final)"))) if kind == "normal" else None,
                    pressure_atm_min=num(r.get("pmean (atm)")),
                    extra={"flame_type": kind, "day": r.get("Day"), "zst": num(r.get("mean Zst")), "tad_k": num(r.get("Tad (K)")),
                           **({"xc2h4_initial": num(r.get("XC2H4 initial"))} if kind == "inverse" else {"xfuel": r.get("Xfuel")})})
        if kind == "inverse":
            rec["flags"].append("inside-out flame: oxygen flows from the burner, not cabin air")
        if ramped:
            rec["flags"].append(f"ramped test: {len(ramped)} columns have no single value")
        if low_o2:
            rec["flags"].append("marked 'LOW O2' in the table: oxygen and flow columns have no single value")
    c.note(st[0], f"{kind.title()} flame table cleaned. Oxygen converted from mole fraction to percent.")


def clean_cfi_g(c, st, rows, name):
    outcome = {"SE": "self-extinguished", "FT": "flow terminated"}
    for i, r in enumerate(rows, 1):
        bar = num(r.get("approx p (bar)"))
        rec = c.add(st, name, i, test_id=re.sub(r"\s+", "", r.get("Test", "")), fuel=r.get("Fuel"),
                    oxygen_pct_min=pct(num(r.get("XO2 before test"))), oxygen_final_pct=pct(num(r.get("XO2  after test") or r.get("XO2 after test"))),
                    pressure_atm_min=round(bar * 0.986923, 4) if bar else None, burn_time_s=num(r.get("burn time (sec)")),
                    outcome=outcome.get(r.get("Self-ext or flow term", "").strip()),
                    extra={"day": r.get("Day"), "cool_flame_note": r.get("Cool flame?") or None, "hot_ignition": r.get("Hot ignition") or None,
                           "tfp": r.get("TFP") or None, "fuel_mass_rate_mg_s": num(r.get("mHC (mg/s)")), "zst": num(r.get("Zst")),
                           "tad_k": num(r.get("Tad (K)")), "peak_burner_c": num(r.get("Peak burner T (C )")), "comments": r.get("Comments") or None})
        rec["flags"].append("pressure is approximate (table says 'approx p')")
    c.note(st[0], "Only normal flames are in this table; inside-out flames (up to 85% oxygen) are only in the report.")


def clean_saffire(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        g = lambda *keys: next((r[k] for k in keys if k in r and not blank(r[k])), None)
        mat_raw = g("Material") or ""
        is_flowvis = "flow visulation" in mat_raw.lower() or "flow visualization" in mat_raw.lower()
        mat, shape, _, _ = parse_sample(mat_raw)
        cm = lambda v: (v if v is None or re.search(r"[a-z]", str(v)) else f"{v} cm")
        o2_raw = g("Percent O2", "Percent O2 (Note 1)")
        o2 = [pct(v) for v in nums(o2_raw)]
        rec = c.add(st, name, i, test_id=g("Sample Number"), material=mat or (mat_raw or None), sample_shape=shape or ("fabric" if mat and "SIBAL" in mat else None),
                    sample_size=", ".join(x for x in (f"{cm(g('Sample Thickness (cm)', 'Samle Thickness', 'Sample Thickness'))} thick" if g('Sample Thickness (cm)', 'Samle Thickness', 'Sample Thickness') else "",
                                                       f"{cm(g('Sample Length (cm)', 'Sample Length'))} long" if g('Sample Length (cm)', 'Sample Length') else "",
                                                       f"{cm(g('Sample Width (cm)', 'Sample Width'))} wide" if g('Sample Width (cm)', 'Sample Width') else "") if x) or None,
                    airflow_cm_s_min=num(g("Air Flow (cm/s)", "Air Flow")), oxygen_pct_min=min(o2) if o2 else None, oxygen_pct_max=max(o2) if o2 else None,
                    burn_time_s=num(g("Burn Time (s)")),
                    is_test=not is_flowvis and bool(mat_raw),
                    extra={k2: g(k1) for k1, k2 in (("Flow Direction", "flow_direction"), ("Direction", "flow_direction"),
                                                    ("Ignition Power (W)", "ignition_power_w"), ("Ignition Time (s)", "ignition_time_s"),
                                                    ("?-g Burn Length", "microgravity_burn_length"), ("?-g Spread Length", "microgravity_spread_length"),
                                                    ("1-g Burn Length", "earth_burn_length"), ("1-g Spread Rate", "earth_spread_rate"))
                           if g(k1)})
        if approx(o2_raw):
            rec["flags"].append("oxygen is approximate (~)")
        if is_flowvis:
            rec["flags"].append("flow visualization row, not a burn")
        if not mat_raw:
            rec["flags"].append("blank row in the table")
        if str(g("Burn Time (s)") or "").lower() == "insignificant":
            rec["flags"].append("burn time listed as 'Insignificant'")
    if st[0] == "saffire-ii":
        c.note(st[0], "Column names fixed: '?-g' = microgravity (μg), 'Samle' = Sample. Units split from numbers ('20 cm/s' -> 20).")


def clean_same(c, st, rows, name):
    base = [r for r in rows if "same conditions" not in r.get("Sample Material", "").lower()]
    for i, r in enumerate(rows, 1):
        mat_cell = r.get("Sample Material", "")
        if "same conditions as 1-4" in mat_cell.lower():
            mat = mat_cell.split(":")[0].strip()
            for j, b in enumerate(base, 1):
                rec = c.add(st, name, i, test_id=f"{r.get('Sample #')}.{j}", material=mat,
                            airflow_cm_s_min=num(b.get("Air Flow (cm/s)")),
                            extra={"weight_loss_mg_min": num(b.get("Weight loss rate (mg/min)")), "aging_min": num(b.get("Aging Duration (minutes)"))})
                rec["flags"].append(f"expanded from 'same conditions as 1-4' (uses sample {j}'s conditions)")
        else:
            c.add(st, name, i, test_id=r.get("Sample #"), material=mat_cell, airflow_cm_s_min=num(r.get("Air Flow (cm/s)")),
                  extra={"weight_loss_mg_min": num(r.get("Weight loss rate (mg/min)")), "aging_min": num(r.get("Aging Duration (minutes)"))})
    c.note(st[0], "Samples 5 to 8 said 'same conditions as 1-4'; expanded into one row per condition.")


def clean_same_r(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        rec = c.add(st, name, i, test_id=r.get("SAME Test #"), material=r.get("Sample Type"),
                    airflow_cm_s_min=num(r.get("Inlet velocity (cm/s)")),
                    extra={"date_no_year": r.get("Date") or None, "description": r.get("Description") or None,
                           "rt_r0": num(r.get("Rt/R0")), "duration_s": num(r.get("Duration (sec)")),
                           "net_aging_s": num(r.get("Net aging time (sec)"))})
        rec["flags"].append("date has no year in the table")


def clean_daft(c, st, rows, name):
    for i, r in enumerate(rows, 1):
        m = re.search(r"GMT\s*(\d+)\s*\((\d{4})\)", r.get("Actual Day", ""))
        iso = (dt.date(int(m.group(2)), 1, 1) + dt.timedelta(days=int(m.group(1)) - 1)).isoformat() if m else None
        full = r.get("Sample Material") or ""
        c.add(st, name, i, test_id=r.get("Session Name"), date=iso, material=full.split(" in combination")[0].strip() or None,
              extra={"sample_description": full, "hardware": r.get("Hardware Description"), "sampled_location": r.get("Sampled Location")})


CLEANERS = {"PSI-26": clean_bass, "PSI-25": clean_bass_ii, "PSI-107": clean_spice, "PSI-106": clean_slice,
            "PSI-69": clean_flex, "PSI-68": clean_flex_2, "PSI-39": clean_cfi, "PSI-20": clean_bre,
            "PSI-21": clean_cld, "PSI-22": clean_efield, "PSI-23": clean_sflame, "PSI-10": clean_flame_design,
            "PSI-159": clean_cfi_g, "PSI-98": clean_saffire, "PSI-99": clean_saffire, "PSI-100": clean_saffire,
            "PSI-102": clean_same, "PSI-101": clean_same_r, "PSI-47": clean_daft}


# ============================================================================ citations (optional)

def read_citations(path: Path) -> dict:
    """Reads the RIS and BibTeX PSI entries from the citations Word file."""
    if not path or not path.exists():
        return {}
    xml = zipfile.ZipFile(path).read("word/document.xml").decode("utf8")
    paras = [html.unescape("".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", p, re.S)))
             for p in re.findall(r"<w:p[ >].*?</w:p>|<w:p/>", xml, re.S)]
    out, cur, bib = {}, None, None
    for p in paras:
        p = p.strip()
        m = re.match(r"^([A-Z][A-Z0-9])\s+-\s*(.*)$", p)
        if p.startswith("@"):
            bib = {"authors": []}
            m2 = re.search(r"(PSI-\d+)", p)
            bib["psi_id"] = m2.group(1) if m2 else None
            continue
        if bib is not None:
            m3 = re.match(r"^(\w+)\s*=\s*\{(.*)\},?$", p)
            if m3:
                k, v = m3.group(1).lower(), m3.group(2)
                if k == "author":
                    bib["authors"] = [a.strip() for a in re.split(r";| and ", v) if a.strip()]
                else:
                    bib[{"year": "year", "title": "title", "doi": "doi", "url": "url"}.get(k, k)] = v
            if p == "}":
                if bib.get("psi_id"):
                    out[bib["psi_id"]] = bib
                bib = None
            continue
        if m:
            tag, val = m.group(1), m.group(2).strip()
            if tag == "TY":
                if cur and cur.get("psi_id"):
                    out[cur["psi_id"]] = cur
                cur = {"authors": []}
            elif cur is not None:
                if tag == "AU":
                    cur["authors"].append(val)
                elif tag == "AN":
                    cur["psi_id"] = val if val.startswith("PSI-") else None
                elif tag == "PY":
                    cur["year"] = val
                elif tag == "T1":
                    cur["title"] = val
                elif tag == "DO":
                    cur["doi"] = val
                elif tag == "UR":
                    cur["url"] = val
    if cur and cur.get("psi_id"):
        out[cur["psi_id"]] = cur
    for v in out.values():
        if v.get("title"):
            v["title"] = re.sub(r"(\S)\(", r"\1 (", v["title"]).strip()
            v["full_name"] = re.sub(r"\s*\([^()]*\)\s*$", "", v["title"]).strip()
    return out


# ============================================================================ main

def rng(values):
    v = [x for x in values if isinstance(x, (int, float))]
    return [min(v), max(v)] if v else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data")
    ap.add_argument("--citations", default="")
    ap.add_argument("--out", default="prep_output")
    args = ap.parse_args()
    data, out = Path(args.data).expanduser(), Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    cites = read_citations(Path(args.citations)) if args.citations else {}

    c, table_info = Collector(), defaultdict(list)
    for psi, fn in CLEANERS.items():
        st = BY_PSI[psi]
        paths = sorted(p for p in data.rglob("*Experimental table*.csv") if re.search(rf"\b{psi}_", p.name))
        if not paths:
            c.note(st[0], "No experiment table found in the data folder.")
            continue
        for p in paths:
            rows, enc = read_table(p)
            before = len(c.tests)
            fn(c, st, rows, p.name)
            table_info[st[0]].append({"file": p.name, "encoding": enc, "rows": len(rows), "records": len(c.tests) - before})

    # ---------------- studies.json
    studies = []
    for sid, short, psi, fam, env in STUDIES:
        ts = [t for t in c.tests if t["study_id"] == sid]
        real = [t for t in ts if t["is_test"]]
        cite = cites.get(psi, {})
        years = sorted({t["year"] for t in ts if t["year"]})
        studies.append({
            "id": sid, "short_name": short, "psi_id": psi, "full_name": cite.get("full_name"),
            "hardware_family": fam, "hardware_family_name": FAMILY_NAMES[fam], "environment": env,
            "gravity": "about 0 g" if env == "space" else "1 g",
            "doi": cite.get("doi"), "psi_url": cite.get("url") or f"https://psi.nasa.gov/physci/repo/data/investigations/{psi}",
            "authors": cite.get("authors"), "citation_year": cite.get("year"),
            "tables": table_info.get(sid, []), "table_rows": len(ts), "tests": len(real),
            "years": [years[0], years[-1]] if years else None,
            "oxygen_pct_range": rng([t["oxygen_pct_min"] for t in real] + [t["oxygen_pct_max"] for t in real]),
            "pressure_atm_range": rng([t["pressure_atm_min"] for t in real] + [t["pressure_atm_max"] for t in real]),
            "airflow_cm_s_range": rng([t["airflow_cm_s_min"] for t in real] + [t["airflow_cm_s_max"] for t in real]),
            "fuels": [f for f, _ in Counter(t["fuel"] for t in real if t["fuel"]).most_common(12)],
            "materials": [m for m, _ in Counter(t["material"] for t in real if t["material"]).most_common(12)],
            "outcomes": dict(Counter(t["outcome"] for t in real if t["outcome"])),
            "flames_ignited": sum((t["extra"].get("flames_ignited") or 0) for t in real) or None,
            "thin_table": THIN_TABLES.get(sid), "known_mismatches": KNOWN_MISMATCHES.get(sid, []),
            "notes": c.notes.get(sid, []),
        })

    # ---------------- facts.json (all computed here, never typed in)
    real = [t for t in c.tests if t["is_test"]]
    coverage = []
    for s in studies:
        ts = [t for t in real if t["study_id"] == s["id"] and t["oxygen_pct_max"] is not None]
        if ts:
            coverage.append({"study_id": s["id"], "short_name": s["short_name"], "tests_with_oxygen": len(ts),
                             "highest_oxygen_pct": round(max(t["oxygen_pct_max"] for t in ts), 1),
                             "tests_at_30pct_or_more": sum(t["oxygen_pct_max"] >= 30 for t in ts)})
    solids = {"bass-ii", "saffire-i", "saffire-ii", "saffire-iii"}
    facts = {
        "generated": dt.datetime.now().isoformat(timespec="seconds"),
        "key_numbers": {
            "studies": len(STUDIES), "studies_in_space": sum(s[4] == "space" for s in STUDIES),
            "studies_on_ground": sum(s[4] == "ground" for s in STUDIES), "hardware_families": len(FAMILY_NAMES),
            "fire_safety_jobs": 3, "tests_in_tables": len(real), "table_rows": len(c.tests),
            "acme_flames_in_day_tables": sum(s["flames_ignited"] or 0 for s in studies if s["hardware_family"] == "acme_gas_flames"),
            "acme_flames_total": sum(s["flames_ignited"] or 0 for s in studies if s["hardware_family"] == "acme_gas_flames")
                                 + sum(s["tests"] for s in studies if s["id"] in ("acme-flame-design", "acme-cfi-g")),
            "studies_with_tables": sum(1 for s in studies if s["tables"]),
        },
        "tests_per_study": {s["id"]: s["tests"] for s in studies if s["tables"]},
        "oxygen_coverage": coverage,
        "highest_oxygen_solid_materials_pct": max((x["highest_oxygen_pct"] for x in coverage if x["study_id"] in solids), default=None),
        "highest_oxygen_bre_pct": next((x["highest_oxygen_pct"] for x in coverage if x["study_id"] == "acme-bre"), None),
        "studies_by_gravity": {"about 0 g": sum(s[4] == "space" for s in STUDIES), "1 g": sum(s[4] == "ground" for s in STUDIES),
                             "partial gravity": 0},
        "gaps": [
            "No partial-gravity (Moon or Mars) fire data in PSI.",
            "Solid materials (BASS-II, Saffire) only go up to about {:.1f}% oxygen.".format(
                max((x["highest_oxygen_pct"] for x in coverage if x["study_id"] in solids), default=0)),
            "FLEX-2 has only a planned test matrix, not results.",
        ],
    }

    # ---------------- write files
    def flat(t):
        r = dict(t)
        r["flags"] = "; ".join(t["flags"])
        r["extra"] = json.dumps(t["extra"], ensure_ascii=False)
        return r
    with open(out / "tests.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        for t in c.tests:
            w.writerow(flat(t))
    (out / "tests.json").write_text(json.dumps(c.tests, indent=1, ensure_ascii=False), encoding="utf-8")
    (out / "studies.json").write_text(json.dumps(studies, indent=2, ensure_ascii=False), encoding="utf-8")
    (out / "facts.json").write_text(json.dumps(facts, indent=2, ensure_ascii=False), encoding="utf-8")

    L = ["# Data prep quality report", "", f"Generated {facts['generated']}", "",
         f"- Studies: {len(STUDIES)} ({facts['key_numbers']['studies_with_tables']} with tables)",
         f"- Table rows: {len(c.tests)}; counted as tests: {len(real)} (duplicates, planned and flow-visualization rows excluded)",
         f"- Citations file used: {'yes' if cites else 'no'} ({len(cites)} PSI entries found)", ""]
    for s in studies:
        ts = [t for t in c.tests if t["study_id"] == s["id"]]
        flags = Counter(fl for t in ts for fl in t["flags"])
        L += [f"## {s['short_name']} ({s['psi_id']})", ""]
        if s["tables"]:
            L += [f"- Tables: " + "; ".join(f"{x['file']} ({x['rows']} rows, {x['encoding']})" for x in s["tables"])]
        L += [f"- Tests counted: {s['tests']} of {s['table_rows']} rows"]
        for n in s["notes"]:
            L.append(f"- Fix/note: {n}")
        if s["thin_table"]:
            L.append(f"- Thin table: {s['thin_table']}")
        for m in s["known_mismatches"]:
            L.append(f"- Table vs report: {m}")
        for fl, n in flags.most_common():
            L.append(f"- Flag ({n} rows): {fl}")
        L.append("")
    (out / "quality_report.md").write_text("\n".join(L), encoding="utf-8")

    print(f"Done. {len(c.tests)} rows ({len(real)} tests) from {sum(1 for s in studies if s['tables'])} studies.")
    print(f"Citations matched: {len(cites)}. Files written to {out.resolve()}")
    for x in coverage:
        print(f"  {x['short_name']:<20} highest O2 {x['highest_oxygen_pct']:>6}%   {x['tests_at_30pct_or_more']:>4} tests at 30%+")


if __name__ == "__main__":
    main()