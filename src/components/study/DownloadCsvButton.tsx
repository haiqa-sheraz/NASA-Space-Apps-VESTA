"use client";

import { DownloadLink } from "@/components/ui/DownloadLink";

/** "Download CSV" for one study's rows, confirmed with "CSV downloaded". */
export function DownloadCsvButton({ href, fileName }: { href: string; fileName: string }) {
  return <DownloadLink href={href} fileName={fileName} label="Download CSV" done="CSV downloaded" />;
}
