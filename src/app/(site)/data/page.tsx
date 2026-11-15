import type { Metadata } from "next";
import { DataClient, type DataStudy } from "@/components/data/DataClient";
import { PredictionTool } from "@/components/data/PredictionTool";
import { DownloadLink } from "@/components/ui/DownloadLink";
import { PageReveal } from "@/components/ui/PageReveal";
import { PageHero } from "@/components/ui/PageHero";
import { getPredictionData } from "@/lib/data/prediction";
import { getDataSummary, getStudies, getStudyIndex } from "@/lib/data/server";
import { formatCount, plural } from "@/lib/format";

export const metadata: Metadata = { title: "Data" };

export default function DataPage() {
  const summary = getDataSummary();
  const index = new Map(getStudyIndex().map((s) => [s.id, s]));
  const withTables = getStudies().filter((s) => s.table_rows > 0);
  const studies: DataStudy[] = withTables.map((s) => ({
    id: s.id,
    shortName: s.short_name,
    psiId: s.psi_id,
    psiUrl: s.psi_url,
    fuelKind: index.get(s.id)!.fuelKind,
  }));
  const allSpace = withTables.every((s) => s.environment === "space");
  const groundCount = getStudies().filter((s) => s.environment === "ground").length;

  const stats = [
    { value: summary.tests, label: "tests" },
    { value: summary.studiesWithTables, label: "studies with a test table" },
    { value: summary.columns, label: "columns" },
    { value: summary.flaggedRows, label: "rows with a quality flag" },
  ];

  return (
    <>
      <PageReveal variant="data" />
      <PageHero
        badge="Data"
        title="Get the data"
        lead="Every test we extracted from NASA PSI and NTRS, cleaned, with units and quality flags."
        actions={
          <div id="download" className="row g3 wrapx" style={{ marginTop: 8, scrollMarginTop: 96 }}>
            <DownloadLink href="/downloads/vesta-tests.csv" fileName="vesta-tests.csv" label="Download CSV" done="CSV downloaded" variant="primary" />
            <DownloadLink href="/downloads/vesta-tests.json" fileName="vesta-tests.json" label="Download JSON" done="JSON downloaded" />
          </div>
        }
      />
      <section className="wrap stack g5 pb-16">
        <div className="statstrip">
          {stats.map((s) => (
            <div key={s.label}>
              <span className="bignum" style={{ fontSize: 33 }}>
                {formatCount(s.value)}
              </span>
              <span className="small muted">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="small muted">
          {formatCount(summary.rows)} rows in all: {formatCount(summary.tests)} tests, plus copies, planned tests, blank rows
          and flow-visualization rows, which are flagged and not counted as tests.
          {allSpace && ` Every row is from a test in space, at about 0 g. The ${plural(groundCount, "ground study has", "ground studies have")} no test tables.`}
        </p>
        <DataClient studies={studies} />
      </section>
      <PredictionTool data={getPredictionData()} />
    </>
  );
}
