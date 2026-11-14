"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, type ReactNode } from "react";
import { FLAME_SCIENCE, JOB_IDS, JOBS, type TagId } from "@/lib/jobs";

/** Position of a value on the design's slider track (thumb is 20 px wide). */
const at = (fraction: number) => `calc(10px + (100% - 20px) * ${Math.min(1, Math.max(0, fraction))})`;

/**
 * The design's slider: label, value with unit, ticked track, optional reference markers and hint.
 * `axis` places labels at their true values (for example "ISS air 21%"); without it the axis
 * shows the minimum and maximum.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  hint,
  marker,
  markers,
  axis,
  strongLabel = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  hint?: string;
  marker?: number;
  markers?: { value: number; color: string }[];
  axis?: { value: number; label: string }[];
  strongLabel?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const hintId = useId();
  const fraction = (value - min) / (max - min);
  const frac = (v: number) => (v - min) / (max - min);
  return (
    <div className="slider">
      <div className="top">
        <label className="h5" htmlFor={id} style={{ fontWeight: strongLabel ? 700 : 400 }}>
          {label}
        </label>
        <span className="val" aria-hidden="true">
          {format(value)}
        </span>
      </div>
      <div className="track">
        <span className="fill" style={{ left: 10, width: `calc((100% - 20px) * ${Math.min(1, Math.max(0, fraction))})` }} />
        <span className="ticks" />
        {marker !== undefined && <span className="marker" style={{ left: at(frac(marker)) }} />}
        {markers?.map((m) => (
          <span key={m.value} className="marker" style={{ left: at(frac(m.value)), width: 2, marginLeft: -1, background: m.color }} />
        ))}
        <input
          id={id}
          className="rng-in"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-valuetext={format(value)}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="thumb" style={{ left: at(fraction) }} />
      </div>
      {axis ? (
        <div className="axis axis-pos" aria-hidden="true">
          {axis.map((a) => {
            const f = frac(a.value);
            return (
              <span key={a.label} className={f <= 0.02 ? "start" : f >= 0.98 ? "end" : undefined} style={{ left: at(f) }}>
                {a.label}
              </span>
            );
          })}
        </div>
      ) : (
        <div className="axis" aria-hidden="true">
          <span>{format(min)}</span>
          <span>{format(max)}</span>
        </div>
      )}
      {hint && (
        <span className="hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}

/** Two-thumb range slider (lowest and highest value). */
export function RangeSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  hint,
  onChange,
}: {
  label: string;
  value: [number, number];
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  hint?: string;
  onChange: (value: [number, number]) => void;
}) {
  const hintId = useId();
  const [lo, hi] = value;
  const fl = (lo - min) / (max - min);
  const fh = (hi - min) / (max - min);
  // When both thumbs sit at the top end, keep the low thumb reachable.
  const loOnTop = lo > min + (max - min) / 2;
  return (
    <div className="slider dual" role="group" aria-label={label}>
      <div className="top">
        <span className="h5">{label}</span>
        <span className="val">
          {format(lo)}–{format(hi)}
        </span>
      </div>
      <div className="track">
        <span className="fill" style={{ left: at(fl), width: `calc((100% - 20px) * ${fh - fl})` }} />
        <span className="ticks" />
        <input
          className="rng-in"
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          aria-label={`${label}, lowest`}
          aria-valuetext={format(lo)}
          aria-describedby={hint ? hintId : undefined}
          style={{ zIndex: loOnTop ? 3 : 2 }}
          onChange={(event) => onChange([Math.min(Number(event.target.value), hi), hi])}
        />
        <span className="thumb" style={{ left: at(fl) }} />
        <input
          className="rng-in"
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          aria-label={`${label}, highest`}
          aria-valuetext={format(hi)}
          aria-describedby={hint ? hintId : undefined}
          style={{ zIndex: loOnTop ? 2 : 3 }}
          onChange={(event) => onChange([lo, Math.max(Number(event.target.value), lo)])}
        />
        <span className="thumb" style={{ left: at(fh) }} />
      </div>
      <div className="axis" aria-hidden="true">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      {hint && (
        <span className="hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
  count,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  count?: number;
}) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className={`box${checked ? " on" : ""}`} aria-hidden="true">
        {checked && <Check className="ic" />}
      </span>
      <span style={{ flex: 1 }}>{children}</span>
      {count !== undefined && <span className="num small muted">{count}</span>}
    </label>
  );
}

export function RadioRow({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
}) {
  return (
    <label className={`radio${checked ? " selected" : ""}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      <span className={`dot${checked ? " on" : ""}`} aria-hidden="true" />
      {children}
    </label>
  );
}

/** A native select in the design's input style, with a visible label above it. */
export function SelectBox({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  width,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  /** Keep the label for screen readers only (when the first option already says what it is). */
  hideLabel?: boolean;
  width?: number;
}) {
  const id = useId();
  return (
    <div className="stack g1" style={width ? { width, maxWidth: "100%" } : { flex: 1, minWidth: 0 }}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "small strong"}>
        {label}
      </label>
      <div className="select-wrap">
        <select id={id} className="input select" value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="ic sm" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * Filter chips for the three fire-safety jobs (in their job colors) plus the neutral
 * "Flame science" chip for studies with no job.
 */
export function TagFilterChips({ tags, onToggle }: { tags: TagId[]; onToggle: (tag: TagId) => void }) {
  const FlameIcon = FLAME_SCIENCE.icon;
  const flameSelected = tags.includes(FLAME_SCIENCE.id);
  return (
    <div className="stack g2">
      <div className="row g2 wrapx">
        {JOB_IDS.map((job) => {
          const info = JOBS[job];
          const Icon = info.icon;
          const selected = tags.includes(job);
          return (
            <button
              key={job}
              type="button"
              className={`chip filterchip ${info.cls}${selected ? " selected" : ""}`}
              aria-pressed={selected}
              onClick={() => onToggle(job)}
            >
              <Icon className="ic" aria-hidden="true" />
              {info.label}
            </button>
          );
        })}
        <button
          type="button"
          className={`chip filterchip${flameSelected ? " selected" : ""}`}
          aria-pressed={flameSelected}
          onClick={() => onToggle(FLAME_SCIENCE.id)}
        >
          <FlameIcon className="ic" aria-hidden="true" />
          {FLAME_SCIENCE.label}
        </button>
      </div>
      <p className="small muted">{FLAME_SCIENCE.blurb}</p>
    </div>
  );
}
