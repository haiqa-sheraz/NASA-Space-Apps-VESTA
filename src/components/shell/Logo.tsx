import Link from "next/link";
import { VestaIcon } from "@/components/ui/VestaLogo";
import { SITE } from "@/lib/site";

/** Logo: Vesta's mark (it follows the theme) and the name. Each copy needs its own idPrefix. */
export function Logo({ idPrefix }: { idPrefix: string }) {
  return (
    <Link className="logo" href="/">
      <VestaIcon idPrefix={idPrefix} className="logo-mark" />
      {SITE.name}
    </Link>
  );
}
