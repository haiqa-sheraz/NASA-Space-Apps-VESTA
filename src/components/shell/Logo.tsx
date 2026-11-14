import Link from "next/link";
import { SITE } from "@/lib/site";

/** Logo: the small blue sphere (a flame in microgravity) and the name. */
export function Logo() {
  return (
    <Link className="logo" href="/">
      <span className="logo-mark" aria-hidden="true" />
      {SITE.name}
    </Link>
  );
}
