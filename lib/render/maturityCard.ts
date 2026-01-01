import { baseSvg, escapeHtml, SvgTheme } from "./svgBase";
import { ringGaugeSvg, barsSvg } from "./charts";

/* =========================
   Types
========================= */

type MaturityInput = {
  score: number;
  subscores?: {
    docs?: number;
    maintenance?: number;
    repoHygiene?: number;
  };
};

type CoverageInput = {
  reposSampledPct: number;
  recentlyActivePct: number;
};

/* =========================
   Utils
========================= */

const clamp100 = (n: number) => Math.max(0, Math.min(100, n));
const safeText = (v: unknown) => escapeHtml(v == null ? "" : String(v));

/* =========================
   Renderer
========================= */

export function renderMaturityCard({
  username,
  maturity,
  coverage,
  theme,
  accent,
  bg,
  border,
}: {
  username: string;
  maturity: MaturityInput;
  coverage: CoverageInput;
  theme: SvgTheme;
  accent: string;
  bg: string;
  border: boolean;
}) {
  const width = 420;
  const height = 180;
  const pad = 20;

  const isDark = theme === "dark";
  const fg = isDark ? "#E5E7EB" : "#0F172A";
  const muted = isDark ? "#9CA3AF" : "#64748B";
  const stroke = isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.12)";
  const panel = isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.05)";

  const subs = maturity.subscores ?? {};

  /* =========================
     Header
  ========================= */

  const header = `
    <text x="${pad}" y="28" font-size="16" font-weight="800" fill="${fg}">
      ${safeText(username)}
    </text>
    <text x="${pad}" y="46" font-size="11" fill="${muted}">
      Maturity
    </text>
  `;

  /* =========================
     Score Ring
  ========================= */

  const ring = `
    <g transform="translate(${pad},62)">
      ${ringGaugeSvg({
        cx: 42,
        cy: 42,
        r: 30,
        value01: clamp100(maturity.score) / 100,
        track: stroke,
        fill: accent,
        strokeWidth: 8,
      })}
      <text
        x="42"
        y="48"
        text-anchor="middle"
        font-size="20"
        font-weight="900"
        fill="${fg}"
      >
        ${clamp100(maturity.score)}
      </text>
    </g>
  `;

  /* =========================
     Subscores
  ========================= */

  const bars = `
    <g transform="translate(${pad + 100},76)">
      ${barsSvg({
        x: 0,
        y: 0,
        w: 260,
        h: 18,
        values: [
          clamp100(subs.docs ?? 0),
          clamp100(subs.maintenance ?? 0),
          clamp100(subs.repoHygiene ?? 0),
        ],
        fill: accent,
        gap: 6,
        radius: 3,
      })}
    </g>
  `;

  /* =========================
     Coverage
  ========================= */

  const coverageBlock = `
    <g transform="translate(${pad + 100},118)">
      <rect width="260" height="44" rx="12" fill="${panel}" stroke="${stroke}" />
      <text x="12" y="18" font-size="10" fill="${muted}">
        Coverage
      </text>
      <text x="12" y="34" font-size="14" font-weight="700" fill="${fg}">
        ${clamp100(coverage.reposSampledPct)}%
      </text>
      <text x="54" y="34" font-size="10" fill="${muted}">
        sampled
      </text>
      <text x="120" y="34" font-size="10" fill="${muted}">
        ${clamp100(coverage.recentlyActivePct)}% active
      </text>
    </g>
  `;

  /* =========================
     SVG
  ========================= */

  return baseSvg({
    width,
    height,
    title: `${username} Maturity`,
    desc: `Maturity metrics for ${username}`,
    bg,
    border,
    accent,
    theme,
    body: `
      <defs>
        <style>
          text {
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
          }
        </style>
      </defs>

      ${header}
      ${ring}
      ${bars}
      ${coverageBlock}
    `,
  });
}
