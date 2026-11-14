import { getStudies, getStudyCsv } from "@/lib/data/server";

/**
 * Per-study CSV downloads, e.g. /downloads/bass-ii-tests.csv: that study's rows from
 * data/tests.csv, byte for byte, with the same header. Built once at build time.
 */
export const dynamic = "force-static";
export const dynamicParams = false;

const SUFFIX = "-tests.csv";

export function generateStaticParams() {
  return getStudies()
    .filter((s) => s.table_rows > 0)
    .map((s) => ({ file: `${s.id}${SUFFIX}` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const id = file.endsWith(SUFFIX) ? file.slice(0, -SUFFIX.length) : "";
  const study = getStudies().find((s) => s.id === id && s.table_rows > 0);
  if (!study) return new Response("No test table for this study.", { status: 404 });
  return new Response(getStudyCsv(study.id), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vesta-${study.id}${SUFFIX}"`,
    },
  });
}
