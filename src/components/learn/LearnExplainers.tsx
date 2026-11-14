"use client";

import { ChevronLeft, ChevronRight, Cloud, Flame, Gauge, Orbit, Thermometer, Wind, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { AirflowExplainer } from "@/components/explainers/AirflowExplainer";
import { HiddenFlame } from "@/components/explainers/HiddenFlame";
import { OxygenExplainer } from "@/components/explainers/OxygenExplainer";
import { SmokePointPreview, SmokePointWidget } from "@/components/explainers/SmokePoint";
import { SmokeRace } from "@/components/explainers/SmokeRace";
import { FlameChamber } from "@/components/home/FlameChamber";
import { Dialog } from "@/components/ui/Dialog";
import { FlameSvg } from "@/components/ui/FlameSvg";
import { SourceLine } from "@/components/ui/SourceChip";
import type { AirflowData, ExplainerInfo, ExplainerKey, OxygenData } from "@/lib/explainer-types";
import { replaceQuery } from "@/lib/url";

const ICONS: Record<ExplainerKey, LucideIcon> = {
  gravity: Orbit,
  fan: Wind,
  oxygen: Gauge,
  "smoke-race": Cloud,
  "hidden-flame": Thermometer,
  "smoke-point": Flame,
};

/** A still track for the card previews (the real sliders are inside the explainers). */
function StillTrack({ fill }: { fill: number }) {
  return (
    <div className="slider" aria-hidden="true" style={{ width: 200 }}>
      <div className="track">
        <span className="fill" style={{ left: 10, width: `calc((100% - 20px) * ${fill})` }} />
        <span className="ticks" />
        <span className="thumb" style={{ left: `calc(10px + (100% - 20px) * ${fill})` }} />
      </div>
    </div>
  );
}

/** Decorative previews on the Learn cards (the card title and line describe each explainer). */
function Preview({ k }: { k: ExplainerKey }) {
  switch (k) {
    case "gravity":
      return (
        <div className="row" style={{ justifyContent: "center", gap: 24, alignItems: "flex-end" }}>
          <div style={{ width: 56 }}>
            <FlameSvg mode="earth" idPrefix="pv-g-e" />
          </div>
          <div style={{ width: 66 }}>
            <FlameSvg mode="space" idPrefix="pv-g-s" />
          </div>
        </div>
      );
    case "fan":
      return (
        <div className="stack g3" style={{ alignItems: "center" }}>
          <div className="row" style={{ justifyContent: "center", gap: 12, color: "#B5A59C" }}>
            <Wind className="ic xl" aria-hidden="true" />
            <div style={{ width: 60 }}>
              <FlameSvg mode="space" idPrefix="pv-f" />
            </div>
          </div>
          <StillTrack fill={0.3} />
        </div>
      );
    case "oxygen":
      return (
        <div className="stack g3" style={{ alignItems: "center" }}>
          <div style={{ width: 64 }}>
            <FlameSvg mode="space" idPrefix="pv-o" />
          </div>
          <StillTrack fill={0.55} />
        </div>
      );
    case "smoke-race":
      return (
        <div className="stack g3" style={{ width: "100%", padding: "0 20px" }}>
          {[
            ["Earth: smoke rises to the detector", 0.8],
            ["Space: smoke wanders", 0.35],
          ].map(([label, w]) => (
            <div key={label as string} className="stack g1">
              <span className="small" style={{ color: "#DCCFC7" }}>
                {label}
              </span>
              <div className="xp-mini-bar">
                <i style={{ width: `${(w as number) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      );
    case "hidden-flame":
      return (
        <div className="row" style={{ justifyContent: "center", gap: 24, alignItems: "center" }}>
          <div style={{ width: 60 }}>
            <FlameSvg mode="space" idPrefix="pv-h1" />
          </div>
          <div style={{ width: 60, opacity: 0.35, filter: "hue-rotate(40deg)" }}>
            <FlameSvg mode="space" idPrefix="pv-h2" />
          </div>
        </div>
      );
    case "smoke-point":
      return <SmokePointPreview />;
  }
}

function Widget({ k, oxygen, airflow }: { k: ExplainerKey; oxygen: OxygenData; airflow: AirflowData }) {
  switch (k) {
    case "gravity":
      return <FlameChamber compact idPrefix="learn-flame" />;
    case "fan":
      return <AirflowExplainer data={airflow} />;
    case "oxygen":
      return <OxygenExplainer data={oxygen} />;
    case "smoke-race":
      return <SmokeRace />;
    case "hidden-flame":
      return <HiddenFlame />;
    case "smoke-point":
      return <SmokePointWidget />;
  }
}

/** Learn: the explainer cards, each opening its interactive explainer in a dialog (?explainer=key). */
export function LearnExplainers({ explainers, oxygen, airflow }: { explainers: ExplainerInfo[]; oxygen: OxygenData; airflow: AirflowData }) {
  const [openKey, setOpenKey] = useState<ExplainerKey | null>(null);
  const [urlLoaded, setUrlLoaded] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const titleId = useId();

  // ?explainer=smoke-point opens that explainer; the URL then follows the dialog.
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get("explainer");
    const found = explainers.find((e) => e.key === key);
    if (found) setOpenKey(found.key);
    setUrlLoaded(true);
  }, [explainers]);

  useEffect(() => {
    if (!urlLoaded) return;
    const params = new URLSearchParams(window.location.search);
    if (openKey) params.set("explainer", openKey);
    else params.delete("explainer");
    replaceQuery(params);
  }, [openKey, urlLoaded]);

  // After Previous or Next, focus moves to the new explainer's title.
  useEffect(() => {
    if (moved.current && openKey) {
      moved.current = false;
      titleRef.current?.focus();
    }
  }, [openKey]);

  const close = useCallback(() => setOpenKey(null), []);
  const index = openKey ? explainers.findIndex((e) => e.key === openKey) : -1;
  const current = index >= 0 ? explainers[index] : null;
  const go = (i: number) => {
    moved.current = true;
    setOpenKey(explainers[i].key);
  };

  function onCardClick(event: MouseEvent<HTMLAnchorElement>, key: ExplainerKey) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setOpenKey(key);
  }

  return (
    <>
      <div className="xp-cards">
        {explainers.map((e) => {
          const Icon = ICONS[e.key];
          return (
            <a key={e.key} className="card xp-card" href={`/learn?explainer=${e.key}`} onClick={(event) => onCardClick(event, e.key)}>
              <div className="chamber xp-card-preview" data-theme="dark" aria-hidden="true">
                <Preview k={e.key} />
              </div>
              <div className="stack g2" style={{ padding: "18px 20px 20px" }}>
                <span className="row g2 h5">
                  <Icon className="ic" aria-hidden="true" />
                  {e.title}
                </span>
                <p className="small muted">{e.blurb}</p>
              </div>
            </a>
          );
        })}
      </div>

      <Dialog
        open={current !== null}
        onClose={close}
        labelledBy={titleId}
        closeLabel="Close explainer"
        heading={current ? `Explainer ${index + 1} of ${explainers.length}` : ""}
        actions={
          current && (
            <>
              {index > 0 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => go(index - 1)}>
                  <ChevronLeft className="ic sm" aria-hidden="true" />
                  Previous explainer
                </button>
              )}
              {index < explainers.length - 1 && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => go(index + 1)}>
                  Next explainer
                  <ChevronRight className="ic sm" aria-hidden="true" />
                </button>
              )}
            </>
          )
        }
      >
        {current && (
          <div className="xp-dialog" key={current.key}>
            <div className="xp-dialog-widget">
              <Widget k={current.key} oxygen={oxygen} airflow={airflow} />
            </div>
            <div className="stack g4 xp-dialog-text">
              <span className="row g2 small muted strong">
                {(() => {
                  const Icon = ICONS[current.key];
                  return <Icon className="ic sm" aria-hidden="true" />;
                })()}
                Explainer
              </span>
              <h2 id={titleId} ref={titleRef} tabIndex={-1} className="h3" style={{ outline: "none" }}>
                {current.title}
              </h2>
              <p className="body">{current.text}</p>
              <SourceLine sources={current.sources} />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}
