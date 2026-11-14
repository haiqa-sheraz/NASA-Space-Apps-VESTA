"use client";

import { Download } from "lucide-react";
import { useToast } from "@/lib/state/toast";

/** "Download CSV": a direct file link, confirmed with "CSV downloaded". */
export function DownloadCsvButton({ href, fileName }: { href: string; fileName: string }) {
  const toast = useToast();
  return (
    <a className="btn btn-secondary" href={href} download={fileName} onClick={() => toast("CSV downloaded")}>
      <Download className="ic" aria-hidden="true" />
      Download CSV
    </a>
  );
}
