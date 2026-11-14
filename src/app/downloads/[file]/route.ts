import { columnGuideCsv } from "@/lib/column-guide";
import { getStudies, getStudyCsv, getTestsCsv, getTestsJsonDownload } from "@/lib/data/server";

/**
 * Downloads, built once at build time:
 *   /downloads/vesta-tests.csv          every row of data/tests.csv, byte for byte
 *   /downloads/vesta-tests.json         the same rows as JSON, with the column guide included
 *   /downloads/vesta-column-guide.csv   what each column means, and its unit
 *   /downloads/{study}-tests.csv        one study's rows from data/tests.csv
 */
export const dynamic = "force-static";
export const dynamicParams = false;

const STUDY_SUFFIX = "-tests.csv";

type FileSpec = { body: () => string; type: string };

function files(): Record<string, FileSpec> {
  const csv = "text/csv; charset=utf-8";
  const registry: Record<string, FileSpec> = {
    "vesta-tests.csv": { body: getTestsCsv, type: csv },
    "vesta-tests.json": { body: getTestsJsonDownload, type: "application/json; charset=utf-8" },
    "vesta-column-guide.csv": { body: columnGuideCsv, type: csv },
  };
  for (const s of getStudies()) {
    if (s.table_rows > 0) registry[`${s.id}${STUDY_SUFFIX}`] = { body: () => getStudyCsv(s.id), type: csv };
  }
  return registry;
}

export function generateStaticParams() {
  return Object.keys(files()).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const spec = files()[file];
  if (!spec) return new Response("This file doesn't exist.", { status: 404 });
  const name = file.startsWith("vesta-") ? file : `vesta-${file}`;
  return new Response(spec.body(), {
    headers: { "Content-Type": spec.type, "Content-Disposition": `attachment; filename="${name}"` },
  });
}
