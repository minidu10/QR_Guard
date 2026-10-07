'use client';

import type { PaymentSummary } from '@qrguard/types';
import { useEffect, useRef, useState } from 'react';

const PLOT_H = 150;
const AXIS_H = 22;
const TOP = 8;
const LEFT = 28;
const RIGHT = 16; // room for the last hour label

// Clean tick step (1, 2, 5, 10, 20, 50...) for about 4 ticks.
function tickStep(max: number): number {
  const raw = Math.max(max, 1) / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
}

const hourLabel = (h: number) => `${h}:00`;

/**
 * Payments per hour today (columns) against the normal level for each hour
 * (a gray step line: the average of the last 7 days).
 */
export function PaymentsChart({
  hourly,
  currentHour,
}: {
  hourly: PaymentSummary['hourly'];
  currentHour: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Show the shop's open hours (any payments today or normally), plus the current hour.
  const busy = hourly.filter((h) => h.count > 0 || h.typical > 0).map((h) => h.hour);
  const first = Math.min(7, currentHour, ...busy);
  const last = Math.max(21, currentHour, ...busy);
  const rows = hourly.filter((h) => h.hour >= first && h.hour <= last);

  const maxVal = Math.max(1, ...rows.map((r) => Math.max(r.count, r.typical)));
  const step = tickStep(maxVal);
  const yMax = Math.ceil(maxVal / step) * step;
  const ticks = Array.from({ length: yMax / step + 1 }, (_, i) => i * step);
  const y = (v: number) => TOP + PLOT_H - (v / yMax) * PLOT_H;

  const band = (width - LEFT - RIGHT) / rows.length;
  const barW = Math.min(16, band * 0.6);
  const x = (i: number) => LEFT + i * band;

  // Step line for the normal level: flat across each hour band.
  const normalPath = rows
    .map((r, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(r.typical)} H${x(i + 1)}`)
    .join(' ');

  // Column with a 4px rounded top and a square base.
  const column = (cx: number, value: number) => {
    const top = y(value);
    const h = TOP + PLOT_H - top;
    const r = Math.min(4, h, barW / 2);
    const l = cx - barW / 2;
    const rr = cx + barW / 2;
    const base = TOP + PLOT_H;
    return `M${l},${base} V${top + r} Q${l},${top} ${l + r},${top} H${rr - r} Q${rr},${top} ${rr},${top + r} V${base} Z`;
  };

  const activeRow = rows.find((r) => r.hour === active);
  const activeIndex = activeRow ? rows.indexOf(activeRow) : -1;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-2.5 rounded-sm bg-[var(--chart-1)]" /> Today
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-4 rounded bg-[var(--chart-normal)]" /> Normal (7-day
          average)
        </span>
      </div>

      <div ref={box} className="relative">
        <svg
          width={width}
          height={TOP + PLOT_H + AXIS_H}
          role="img"
          aria-label="Payments per hour today compared with a normal day"
          className="block max-w-full"
        >
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={LEFT}
                x2={width - RIGHT}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
              />
              <text
                x={LEFT - 6}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}

          {activeIndex >= 0 && (
            <rect
              x={x(activeIndex)}
              y={TOP}
              width={band}
              height={PLOT_H}
              className="fill-muted"
              opacity={0.6}
            />
          )}

          {rows.map((r, i) =>
            r.hour <= currentHour && r.count > 0 ? (
              <path key={r.hour} d={column(x(i) + band / 2, r.count)} fill="var(--chart-1)" />
            ) : null,
          )}

          <path
            d={normalPath}
            fill="none"
            stroke="var(--chart-normal)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {rows.map((r, i) =>
            r.hour % 3 === 0 ? (
              <text
                key={r.hour}
                x={x(i) + band / 2}
                y={TOP + PLOT_H + 15}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                {hourLabel(r.hour)}
              </text>
            ) : null,
          )}

          {/* Hover / keyboard targets: the whole hour band. */}
          {rows.map((r, i) => (
            <rect
              key={r.hour}
              x={x(i)}
              y={TOP}
              width={band}
              height={PLOT_H}
              fill="transparent"
              tabIndex={0}
              aria-label={`${hourLabel(r.hour)}: ${r.count} today, normal ${r.typical}`}
              onPointerEnter={() => setActive(r.hour)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(r.hour)}
              onBlur={() => setActive(null)}
              className="outline-none"
            />
          ))}
        </svg>

        {activeRow && (
          <div
            role="tooltip"
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-md border bg-card px-3 py-2 text-xs shadow-md"
            style={{
              left: Math.min(Math.max(x(activeIndex) + band / 2, 70), width - 70),
            }}
          >
            <p className="mb-1 text-muted-foreground">
              {hourLabel(activeRow.hour)} – {hourLabel((activeRow.hour + 1) % 24)}
              {activeRow.hour === currentHour ? ' (so far)' : ''}
            </p>
            <p className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 bg-[var(--chart-1)]" />
              <span className="font-semibold">
                {activeRow.hour > currentHour ? '–' : activeRow.count}
              </span>{' '}
              <span className="text-muted-foreground">today</span>
            </p>
            <p className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-3 bg-[var(--chart-normal)]" />
              <span className="font-semibold">{activeRow.typical}</span>{' '}
              <span className="text-muted-foreground">normal</span>
            </p>
          </div>
        )}
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Show as a table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-medium">Hour</th>
              <th className="py-1 font-medium">Today</th>
              <th className="py-1 font-medium">Normal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.hour} className="border-t">
                <td className="py-1">{hourLabel(r.hour)}</td>
                <td className="py-1">{r.hour > currentHour ? '–' : r.count}</td>
                <td className="py-1">{r.typical}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
