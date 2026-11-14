const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-14" -> "November 14, 2026" (American English, no time-zone shifts). */
export function formatIsoDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** 1807 -> "1,807" */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** A measured value with at most `maxDecimals` decimals and no trailing zeros: 22.20 -> "22.2", 85.0 -> "85". */
export function fmtNum(n: number, maxDecimals = 1): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: maxDecimals, useGrouping: false });
}

/** [13.6, 22.2] -> "13.6–22.2"; [21, 21] -> "21". Uses an en dash. */
export function fmtRange(range: readonly [number, number], maxDecimals = 1): string {
  const a = fmtNum(range[0], maxDecimals);
  const b = fmtNum(range[1], maxDecimals);
  return a === b ? a : `${a}–${b}`;
}

/** "1 study" / "3 studies" */
export function plural(n: number, one: string, many: string): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`;
}

/** Joins a list in plain English: "a", "a and b", "a, b and c". */
export function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Rounds over-precise measurements inside text for display: at most 1 decimal before "%" or
 * "percent", and 2 before "atm". Ranges ("19.805–84.998%", "0.5 to 3.0001 atm") are rounded on
 * both ends. Numbers that already fit, like "22.2%" or "1.0 atm", are left exactly as written.
 * Downloads keep the full values.
 */
const MEASUREMENT = /(\d+(?:\.\d+)?)(\s*(?:–|-|to)\s*(\d+(?:\.\d+)?))?(\s*(%|percent\b|atm\b))/g;

export function roundMeasurements(text: string): string {
  return text.replace(MEASUREMENT, (_match, a: string, rangePart: string | undefined, b: string | undefined, unitPart: string, unit: string) => {
    const max = unit === "atm" ? 2 : 1;
    const round = (n: string) => (n.includes(".") && n.split(".")[1].length > max ? fmtNum(Number(n), max) : n);
    if (!rangePart || !b) return `${round(a)}${unitPart}`;
    return `${round(a)}${rangePart.replace(b, round(b))}${unitPart}`;
  });
}

/** Applies roundMeasurements to every string inside a JSON-like value. */
export function roundMeasurementsDeep<T>(value: T): T {
  if (typeof value === "string") return roundMeasurements(value) as T;
  if (Array.isArray(value)) return value.map(roundMeasurementsDeep) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, roundMeasurementsDeep(v)])) as T;
  }
  return value;
}

/** Capitalizes the first letter only (sentence case). */
export function sentenceCase(text: string): string {
  return text ? text[0].toUpperCase() + text.slice(1) : text;
}
