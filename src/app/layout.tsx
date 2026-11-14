import type { Metadata, Viewport } from "next";
import { Archivo, Atkinson_Hyperlegible } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { SITE } from "@/lib/site";
import "./globals.css";

// Fonts from Google Fonts (SIL Open Font License), self-hosted by next/font at build time.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"], // expanded width (125%) for display type
  variable: "--font-archivo",
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-atkinson",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${SITE.name}: fire safety from NASA's microgravity fire experiments`, template: `%s | ${SITE.name}` },
  description: `${SITE.tagline} ${SITE.description}`,
  applicationName: SITE.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#140A07" },
    { media: "(prefers-color-scheme: light)", color: "#F1EFEA" },
  ],
};

/**
 * Sets data-theme on <html> before first paint: a saved choice ("vesta:theme") if there is one,
 * otherwise the system setting, which it keeps following.
 */
const themeScript = `(function(){try{var d=document.documentElement,s=localStorage.getItem("vesta:theme"),m=window.matchMedia("(prefers-color-scheme: light)");function a(){d.setAttribute("data-theme",s==="light"||s==="dark"?s:m.matches?"light":"dark")}a();m.addEventListener("change",a)}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US" className={`${archivo.variable} ${atkinson.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
