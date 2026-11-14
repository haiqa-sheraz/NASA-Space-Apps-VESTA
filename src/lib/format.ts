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
