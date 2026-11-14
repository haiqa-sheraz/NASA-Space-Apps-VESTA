"use client";

import { Download } from "lucide-react";
import { useToast } from "@/lib/state/toast";

/** A direct file download, confirmed with a corner message ("CSV downloaded"). */
export function DownloadLink({
  href,
  fileName,
  label,
  done,
  variant = "secondary",
}: {
  href: string;
  fileName: string;
  label: string;
  /** Corner message after clicking, e.g. "CSV downloaded". */
  done: string;
  variant?: "primary" | "secondary";
}) {
  const toast = useToast();
  return (
    <a className={`btn btn-${variant}`} href={href} download={fileName} onClick={() => toast(done)}>
      <Download className="ic" aria-hidden="true" />
      {label}
    </a>
  );
}
