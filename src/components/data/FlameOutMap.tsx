"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import type { FlexOutcome } from "@/lib/explainer-types";
import { chanceOut, oxygenDropPlane, OUTCOME_SHORT, testConditions, testHref, type FireModel, type FlameInput, type FlexTest } from "@/lib/fire-model";
import { fmtNum } from "@/lib/format";

/* The map: oxygen across, drop size up, both over the model's input ranges. */
const COLS = 96;
const ROWS = 64;
/** How strongly the shading shows at 0% and 100% (it fades to the plain surface at 50%). */
const SHADE = 0.5;
const OUTCOME_ORDER: FlexOutcome[] = ["extinction", "completion", "disruption"];
const OUTCOME_COLOR: Record<FlexOutcome, string> = { extinction: "var(--fm-out)", completion: "var(--fm-burn)", disruption: "var(--fm-broke)" };

/** The outcome's marker shape, centered on (x, y): circle, triangle or diamond. */
export function OutcomeShape({ outcome, x, y, size = 5, className, style }: { outcome: FlexOutcome; x: number; y: number; size?: number; className?: string; style?: CSSProperties }) {
  const fill = OUTCOME_COLOR[outcome];
  if (outcome === "extinction") return <circle className={className} cx={x} cy={y} r={size} fill={fill} style={style} />;
  const d =
    outcome === "completion"
      ? `M${x} ${y - size * 1.2} L${x + size * 1.1} ${y + size * 0.8} L${x - size * 1.1} ${y + size * 0.8} Z`
      : `M${x} ${y - size * 1.25} L${x + size * 1.15} ${y} L${x} ${y + size * 1.25} L${x - size * 1.15} ${y} Z`;
  return <path className={className} d={d} fill={fill} style={style} />;
}

/** A small swatch of an outcome's marker, for legends and lists. */
export function OutcomeKey({ outcome }: { outcome: FlexOutcome }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ flex: "none" }}>
      <OutcomeShape outcome={outcome} x={7} y={7} size={5} />
    </svg>
  );
}

/** A CSS color (a custom property such as var(--fm-out)) as [r, g, b], read from the page. */
function resolveRgb(host: HTMLElement, color: string): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.color = color;
  probe.style.display = "none";
  host.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/\d+(\.\d+)?/g) ?? ["0", "0", "0"];
  probe.remove();
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}

/** Ticks inside [min, max] at a round step. */
const ticks = (min: number, max: number, step: number) => {
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
};

export function FlameOutMap({
  model,
  tests,
  input,
  chance,
  picked,
  onPick,
  onSelectTest,
  onOpenTest,
}: {
  model: FireModel;
  tests: FlexTest[];
  input: FlameInput;
  chance: number;
  /** The real test chosen on the map, if any (its dot keeps a ring). */
  picked: FlexTest | null;
  onPick: (oxygen: number, drop: number) => void;
  /** Choosing a dot: the tool takes that test's conditions and shows how it really ended. */
  onSelectTest: (test: FlexTest) => void;
  onOpenTest: (test: FlexTest) => void;
}) {
  const [ox0, ox1] = model.ranges.oxygen_pct;
  const [d0, d1] = model.ranges.drop_mm;
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(640);
  const [shading, setShading] = useState<string | null>(null);
  const [themeTick, setThemeTick] = useState(0);
  const [active, setActive] = useState<{ index: number; by: "pointer" | "keyboard" } | null>(null);
  const [dragging, setDragging] = useState(false);
  const hideTimer = useRef<number | undefined>(undefined);

  // The chart is drawn at its real size, so its text stays readable on phones.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Redraw the shading when the theme changes (its colors are the theme's).
  useEffect(() => {
    const mo = new MutationObserver(() => setThemeTick((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  const narrow = width < 520;
  const M = narrow ? { l: 44, r: 10, t: 12, b: 44 } : { l: 58, r: 16, t: 14, b: 50 };
  const H = Math.round(Math.min(460, Math.max(300, width * 0.62)));
  const PW = width - M.l - M.r;
  const PH = H - M.t - M.b;
  const sx = (ox: number) => M.l + ((ox - ox0) / (ox1 - ox0)) * PW;
  const sy = (d: number) => M.t + PH - ((d - d0) / (d1 - d0)) * PH;

  // The shading: the model's chance on a grid, for the current fuel, pressure, CO₂ and helium.
  const { fuel, pressure, co2, he } = input;
  useEffect(() => {
    const host = wrapRef.current;
    if (!host) return;
    const out = resolveRgb(host, "var(--fm-out)");
    const burn = resolveRgb(host, "var(--fm-burn)");
    const surface = resolveRgb(host, "var(--surface)");
    const canvas = document.createElement("canvas");
    canvas.width = COLS;
    canvas.height = ROWS;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const image = ctx.createImageData(COLS, ROWS);
    for (let r = 0; r < ROWS; r++) {
      const drop = d1 - ((r + 0.5) / ROWS) * (d1 - d0);
      for (let c = 0; c < COLS; c++) {
        const oxygen = ox0 + ((c + 0.5) / COLS) * (ox1 - ox0);
        const p = chanceOut(model, { fuel, pressure, co2, he, oxygen, drop });
        const k = Math.min(1, Math.abs(p - 0.5) * 2) * SHADE;
        const pole = p >= 0.5 ? out : burn;
        const i = (r * COLS + c) * 4;
        for (let j = 0; j < 3; j++) image.data[i + j] = Math.round(surface[j] + (pole[j] - surface[j]) * k);
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    setShading(canvas.toDataURL());
  }, [model, fuel, pressure, co2, he, ox0, ox1, d0, d1, themeTick]);

  // The 50% line: where the score is 0. It is straight (see oxygenDropPlane), so two ends suffice.
  const line = useMemo(() => {
    const { a, b, c } = oxygenDropPlane(model, input);
    const pts: [number, number][] = [];
    const inBox = (ox: number, d: number) => ox >= ox0 - 1e-9 && ox <= ox1 + 1e-9 && d >= d0 - 1e-9 && d <= d1 + 1e-9;
    if (b !== 0) for (const ox of [ox0, ox1]) { const d = -(a * ox + c) / b; if (inBox(ox, d)) pts.push([ox, d]); }
    if (a !== 0) for (const d of [d0, d1]) { const ox = -(b * d + c) / a; if (inBox(ox, d)) pts.push([ox, d]); }
    const uniq = pts.filter((p, i) => pts.findIndex((q) => Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6) === i);
    if (uniq.length < 2) return null;
    uniq.sort((p, q) => p[0] - q[0]);
    return { from: uniq[0], to: uniq[uniq.length - 1], a, b };
    // input's oxygen and drop don't move the line; only fuel, pressure and gases do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, fuel, pressure, co2, he, ox0, ox1, d0, d1]);

  // Keyboard order: across by oxygen, then up by drop size.
  const order = useMemo(() => tests.map((t, i) => ({ t, i })).sort((p, q) => p.t.oxygen - q.t.oxygen || p.t.drop - q.t.drop).map((x) => x.i), [tests]);
  const sameFuel = (t: FlexTest) => t.fuel === input.fuel;

  // Clicking or dragging on the map sets oxygen and drop size.
  const pickAt = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const box = svg.getBoundingClientRect();
      const x = ((clientX - box.left) / box.width) * width;
      const y = ((clientY - box.top) / box.height) * H;
      const ox = ox0 + ((x - M.l) / PW) * (ox1 - ox0);
      const d = d0 + ((M.t + PH - y) / PH) * (d1 - d0);
      onPick(Math.min(ox1, Math.max(ox0, ox)), Math.min(d1, Math.max(d0, d)));
    },
    [width, H, M.l, M.t, PW, PH, ox0, ox1, d0, d1, onPick],
  );
  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    setActive(null);
    pickAt(event.clientX, event.clientY);
  }
  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (dragging) pickAt(event.clientX, event.clientY);
  }
  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }

  // Hover: the tooltip stays while the pointer is on the dot or on the tooltip itself.
  const show = (index: number) => {
    window.clearTimeout(hideTimer.current);
    if (!dragging) setActive({ index, by: "pointer" });
  };
  const hideSoon = () => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setActive((a) => (a?.by === "pointer" ? null : a)), 250);
  };
  useEffect(() => () => window.clearTimeout(hideTimer.current), []);

  // Keyboard: the map is one stop; the arrow keys step through the tests, Enter opens one.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const pos = active ? order.indexOf(active.index) : -1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = pos < 0 ? 0 : Math.min(order.length - 1, pos + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = pos < 0 ? 0 : Math.max(0, pos - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = order.length - 1;
    else if (event.key === "Enter" && active) {
      event.preventDefault();
      onSelectTest(tests[active.index]);
      return;
    } else if (event.key === "Escape") {
      setActive(null);
      return;
    }
    if (next === null) return;
    event.preventDefault();
    setActive({ index: order[next], by: "keyboard" });
  }

  const current = active ? tests[active.index] : null;
  const userX = sx(input.oxygen);
  const userY = sy(input.drop);
  const tip = current && { x: sx(current.oxygen), y: sy(current.drop) };
  const xTicks = ticks(ox0, ox1, narrow ? 4 : 2);
  const yTicks = ticks(d0, d1, 0.5);
  const lineLabel = line && { x: sx(line.to[0]), y: sy(line.to[1]) };

  const onTipLink = (event: MouseEvent<HTMLAnchorElement>, test: FlexTest) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onOpenTest(test);
  };

  // One sentence for screen readers: what the chart shows and where the user's point sits.
  const gasText = input.co2 ? `, ${fmtNum(input.co2)}% CO₂` : input.he ? `, ${fmtNum(input.he)}% helium` : "";
  const dirText = line
    ? ` The 50% line runs from ${fmtNum(line.from[0], 1)}% oxygen at ${fmtNum(line.from[1], 2)} mm to ${fmtNum(line.to[0], 1)}% at ${fmtNum(line.to[1], 2)} mm; going out is more likely ${line.a < 0 ? "with less oxygen" : "with more oxygen"} and ${line.b > 0 ? "a bigger drop" : "a smaller drop"}.`
    : ` On this whole map the chance stays ${chanceOut(model, { ...input, oxygen: (ox0 + ox1) / 2, drop: (d0 + d1) / 2 }) >= 0.5 ? "above" : "below"} 50%.`;
  const summary = `Map of ${tests.length} real FLEX tests by oxygen (${ox0} to ${ox1}%) and drop size (${d0} to ${d1} mm), shaded by the model's chance that a ${input.fuel.toLowerCase()} flame goes out on its own at ${fmtNum(input.pressure, 2)} atm${gasText}.${dirText} Your conditions, ${fmtNum(input.oxygen, 1)}% oxygen and a ${fmtNum(input.drop, 2)} mm drop, give ${Math.round(chance * 100)}%.`;

  return (
    <div className="stack g3">
      <p className="sr-only">{summary}</p>
      <div
        ref={wrapRef}
        className="fm-plot"
        tabIndex={0}
        role="group"
        aria-label="Real FLEX tests on the map. Arrow keys step through them; Enter shows how the selected test ended, in the flame."
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setActive((a) => (a?.by === "keyboard" ? null : a));
        }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          className="fm-svg"
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <rect x={M.l} y={M.t} width={PW} height={PH} fill="var(--surface)" />
          {shading && <image href={shading} x={M.l} y={M.t} width={PW} height={PH} preserveAspectRatio="none" />}
          {xTicks.map((v) => (
            <g key={`x${v}`}>
              <line x1={sx(v)} x2={sx(v)} y1={M.t} y2={M.t + PH} stroke="var(--rule)" strokeWidth="1" opacity="0.6" />
              <text x={sx(v)} y={M.t + PH + 18} textAnchor="middle" className="fm-tick">
                {v}
              </text>
            </g>
          ))}
          {yTicks.map((v) => (
            <g key={`y${v}`}>
              <line x1={M.l} x2={M.l + PW} y1={sy(v)} y2={sy(v)} stroke="var(--rule)" strokeWidth="1" opacity="0.6" />
              <text x={M.l - 8} y={sy(v) + 4} textAnchor="end" className="fm-tick">
                {fmtNum(v, 1)}
              </text>
            </g>
          ))}
          <rect x={M.l} y={M.t} width={PW} height={PH} fill="none" stroke="var(--rule-input)" strokeWidth="1" />
          <text x={M.l + PW / 2} y={H - 8} textAnchor="middle" className="fm-axis">
            Oxygen in the air (%)
          </text>
          <text transform={`translate(${narrow ? 12 : 16} ${M.t + PH / 2}) rotate(-90)`} textAnchor="middle" className="fm-axis">
            Drop size (mm)
          </text>

          {line && (
            <>
              <line x1={sx(line.from[0])} y1={sy(line.from[1])} x2={sx(line.to[0])} y2={sy(line.to[1])} stroke="var(--text)" strokeWidth="1.5" />
              {lineLabel && (
                <text
                  x={Math.min(lineLabel.x + 6, M.l + PW - 4)}
                  y={Math.max(lineLabel.y + (lineLabel.y <= M.t + 4 ? 14 : -6), M.t + 12)}
                  textAnchor={lineLabel.x + 40 > M.l + PW ? "end" : "start"}
                  className="fm-line-label"
                >
                  50%
                </text>
              )}
            </>
          )}

          {/* Real tests: the other fuel faded underneath, this fuel on top. */}
          {[false, true].map((top) =>
            tests.map((t, i) =>
              sameFuel(t) === top ? (
                <g
                  key={`${t.id}-${t.row}`}
                  opacity={top ? 1 : 0.22}
                  className="fm-pick"
                  onPointerEnter={() => show(i)}
                  onPointerLeave={hideSoon}
                  onPointerDown={(event) => {
                    // A dot chooses that real test (not a point on the map).
                    if (event.button !== 0) return;
                    event.stopPropagation();
                    onSelectTest(t);
                  }}
                >
                  <OutcomeShape outcome={t.outcome} x={sx(t.oxygen)} y={sy(t.drop)} size={narrow ? 3.6 : 4.4} className="fm-dot" />
                  <circle cx={sx(t.oxygen)} cy={sy(t.drop)} r={9} fill="transparent" />
                </g>
              ) : null,
            ),
          )}
          {current && tip && <circle cx={tip.x} cy={tip.y} r={9} fill="none" stroke="var(--text)" strokeWidth="2" pointerEvents="none" />}
          {picked && (
            <g className="fm-picked" pointerEvents="none">
              <circle cx={sx(picked.oxygen)} cy={sy(picked.drop)} r={15} fill="none" stroke="var(--surface)" strokeWidth="4" />
              <circle cx={sx(picked.oxygen)} cy={sy(picked.drop)} r={15} fill="none" stroke="var(--text)" strokeWidth="1.5" />
            </g>
          )}

          {/* The user's conditions: a clear ring. */}
          <circle cx={userX} cy={userY} r={11} fill="none" stroke="var(--surface)" strokeWidth="5" pointerEvents="none" />
          <circle cx={userX} cy={userY} r={11} fill="none" stroke="var(--text)" strokeWidth="2.5" pointerEvents="none" className="fm-you" />
        </svg>

        {current && tip && (
          <div
            className="fm-tip"
            role="status"
            style={{
              left: tip.x,
              top: tip.y,
              transform: `translate(${tip.x > width / 2 ? "calc(-100% - 14px)" : "14px"}, ${tip.y > H / 2 ? "calc(-100% + 8px)" : "-8px"})`,
            }}
            onPointerEnter={() => window.clearTimeout(hideTimer.current)}
            onPointerLeave={hideSoon}
          >
            <span className="row g2 strong">
              <OutcomeKey outcome={current.outcome} />
              {OUTCOME_SHORT[current.outcome]}
            </span>
            <span className="small">
              Test {current.id}: {testConditions(current)}.
            </span>
            <a className="small" href={testHref(current)} onClick={(event) => onTipLink(event, current)}>
              Show it in the data table
            </a>
          </div>
        )}
      </div>

      <div className="fm-legend" aria-hidden="true">
        <div className="stack g1 fm-scale-key">
          <span className="small strong">Model&apos;s chance it goes out</span>
          <span className="fm-scale" />
          <span className="fm-scale-labels small muted">
            <span>0%, keeps burning</span>
            <span>50%</span>
            <span>100%, goes out</span>
          </span>
        </div>
        <div className="stack g1">
          <span className="small strong">How each real test ended</span>
          <span className="row g4 wrapx small">
            {OUTCOME_ORDER.map((o) => (
              <span key={o} className="row g2">
                <OutcomeKey outcome={o} />
                {OUTCOME_SHORT[o]} ({tests.filter((t) => t.outcome === o).length})
              </span>
            ))}
          </span>
          <span className="small muted">
            Faded: tests with {input.fuel === "Methanol" ? "heptane" : "methanol"}. Ring: your conditions. Line: 50%.
          </span>
        </div>
      </div>
    </div>
  );
}
