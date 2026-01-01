type StrokeCap = "butt" | "round" | "square";

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const fmt = (n: number) => (Number.isFinite(n) ? String(n) : "0");

export function ringGaugeSvg(opts: {
  cx: number;
  cy: number;
  r: number;
  value01: number; // 0..1
  track: string;
  fill: string;
  strokeWidth: number;
  cap?: StrokeCap;
  rotateDeg?: number; // default -90
}) {
  const cap = opts.cap ?? "round";
  const rot = opts.rotateDeg ?? -90;
  const v = clamp01(opts.value01);

  const C = 2 * Math.PI * opts.r;
  const dash = v * C;

  return `
    <g transform="translate(${fmt(opts.cx)},${fmt(opts.cy)})">
      <circle r="${fmt(opts.r)}" fill="none" stroke="${opts.track}" stroke-width="${fmt(
    opts.strokeWidth
  )}" />
      <circle r="${fmt(opts.r)}" fill="none" stroke="${opts.fill}" stroke-width="${fmt(
    opts.strokeWidth
  )}"
        stroke-dasharray="${fmt(dash)} ${fmt(C)}"
        stroke-linecap="${cap}"
        transform="rotate(${fmt(rot)})" />
    </g>
  `;
}

/**
 * Multi-segment donut using circle dasharray + dashoffset.
 * Deterministic and SVG-safe.
 */
export function donutSegmentsSvg(opts: {
  cx: number;
  cy: number;
  r: number;
  strokeWidth: number;
  track: string;
  segments: Array<{ value01: number; color: string; opacity?: number }>; // sum <= 1
  rotateDeg?: number; // default -90
  gapFrac?: number; // 0..0.05 (fraction of circumference)
}) {
  const rot = opts.rotateDeg ?? -90;
  const C = 2 * Math.PI * opts.r;
  const gap = Math.max(0, Math.min(0.05, opts.gapFrac ?? 0));

  let out = `
    <g transform="translate(${fmt(opts.cx)},${fmt(opts.cy)}) rotate(${fmt(rot)})">
      <circle r="${fmt(opts.r)}" fill="none" stroke="${opts.track}" stroke-width="${fmt(
    opts.strokeWidth
  )}" />
  `;

  let offsetFrac = 0;
  for (const seg of opts.segments) {
    const v = clamp01(seg.value01);
    if (v <= 0) continue;

    const v2 = Math.max(0, v - gap);
    const dash = v2 * C;
    const dashOffset = -offsetFrac * C;

    out += `
      <circle r="${fmt(opts.r)}" fill="none"
        stroke="${seg.color}"
        stroke-opacity="${fmt(seg.opacity ?? 1)}"
        stroke-width="${fmt(opts.strokeWidth)}"
        stroke-dasharray="${fmt(dash)} ${fmt(C)}"
        stroke-dashoffset="${fmt(dashOffset)}"
        stroke-linecap="butt" />
    `;

    offsetFrac += v;
    if (offsetFrac >= 1) break;
  }

  out += `</g>`;
  return out;
}

export function barsSvg(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  values: number[]; // >=0
  fill: string;
  track?: string;
  radius?: number;
  gap?: number;
}) {
  const gap = opts.gap ?? 2;
  const n = Math.max(1, opts.values.length);
  const maxV = Math.max(1, ...opts.values.map((v) => Math.max(0, v)));

  const bw = (opts.w - gap * (n - 1)) / n;
  const rx = opts.radius ?? Math.min(4, bw / 2);

  let out = "";
  if (opts.track) {
    out += `<rect x="${fmt(opts.x)}" y="${fmt(opts.y)}" width="${fmt(opts.w)}" height="${fmt(
      opts.h
    )}" rx="10" fill="${opts.track}" />`;
  }

  for (let i = 0; i < n; i++) {
    const v = Math.max(0, opts.values[i] ?? 0);
    const vh = (v / maxV) * opts.h;
    const bx = opts.x + i * (bw + gap);
    const by = opts.y + (opts.h - vh);
    out += `<rect x="${fmt(bx)}" y="${fmt(by)}" width="${fmt(bw)}" height="${fmt(
      vh
    )}" rx="${fmt(rx)}" fill="${opts.fill}" />`;
  }
  return out;
}
