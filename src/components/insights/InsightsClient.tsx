"use client";

import { CircleQuestionMark, Cloud, Droplet, Shield, Wrench } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import { replaceQuery } from "@/lib/url";

export const INSIGHT_TABS = ["prevent", "detect", "put-out", "equipment", "gaps"] as const;
export type InsightTab = (typeof INSIGHT_TABS)[number];

const isTab = (value: unknown): value is InsightTab => typeof value === "string" && (INSIGHT_TABS as readonly string[]).includes(value);

const ITEMS = [
  { id: "prevent" as const, className: "prevent", label: "Prevent", icon: Shield },
  { id: "detect" as const, className: "detect", label: "Detect", icon: Cloud },
  { id: "put-out" as const, className: "putout", label: "Put out", icon: Droplet },
  { id: "equipment" as const, className: "", label: "Equipment", icon: Wrench },
  { id: "gaps" as const, className: "gaps", label: "Gaps and gravity", icon: CircleQuestionMark },
];

/** Insights tabs. ?tab=prevent|detect|put-out|equipment|gaps opens a tab, and the URL follows the choice. */
export function InsightsClient({ panels }: { panels: Record<InsightTab, ReactNode> }) {
  const [tab, setTab] = useState<InsightTab>("prevent");
  const [urlLoaded, setUrlLoaded] = useState(false);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("tab");
    if (isTab(fromUrl)) setTab(fromUrl);
    setUrlLoaded(true);
  }, []);

  useEffect(() => {
    if (!urlLoaded) return;
    const params = new URLSearchParams(window.location.search);
    params.set("tab", tab);
    replaceQuery(params);
  }, [urlLoaded, tab]);

  return (
    <section className="wrap stack g6 pb-16">
      <Tabs
        idBase="insights"
        label="Insight topics"
        active={tab}
        onChange={setTab}
        items={ITEMS.map((item) => {
          const Icon = item.icon;
          return {
            id: item.id,
            className: item.className,
            label: (
              <>
                <Icon className="ic" aria-hidden="true" />
                {item.label}
              </>
            ),
          };
        })}
      />
      {INSIGHT_TABS.map((id) => (
        <TabPanel key={id} idBase="insights" id={id} active={tab === id}>
          {panels[id]}
        </TabPanel>
      ))}
    </section>
  );
}
