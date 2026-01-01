import { baseSvg, escapeHtml, SvgTheme } from "./svgBase";
import { ringGaugeSvg, barsSvg } from "./charts";

/* =========================
   Types
========================= */

type ProfileInput = {
  score: number;
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

export function renderProfileCard({
  username,
  theme,
  accent,
  bg,
  border,

  engineering,
  maturity,
  coverage,
}: {
  username: string;
  theme: SvgTheme;
  accent: string;
  bg: string;
  border: boolean;

  engineering: ProfileInput;
  maturity: ProfileInput;
  coverage: CoverageInput;
}) {
  const width = 420;
  const height = 220;
  const pad = 20;

  const isDark = theme === "dark";
  const fg = isDark ? "#E5E7EB" : "#0F172A";
  const muted = isDark ? "#9CA3AF" : "#64748B";
  const panel = isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.05)";
  const stroke = isDark ? "rgba(255,255,255,0.12)" : "rgba(2,6,23,0.12)";

  /* =========================
     Header
  ========================= */

  const header = `
    <text x="${pad}" y="28" font-size="16" font-weight="800" fill="${fg}">
      ${safeText(username)}
    </text>
    <text x="${pad}" y="46" font-size="11" fill="${muted}">
      Profile
    </text>
  `;

  /* =========================
     Score Rings
  ========================= */

  const rings = `
    <g transform="translate(${pad},64)">
      ${ringGaugeSvg({
        cx: 42,
        cy: 42,
        r: 30,
        value01: clamp100(engineering.score) / 100,
        track: stroke,
        fill: accent,
        strokeWidth: 8,
      })}
      <text x="42" y="48" text-anchor="middle" font-size="18" font-weight="900" fill="${fg}">
        ${clamp100(engineering.score)}
      </text>
      <text x="42" y="64" text-anchor="middle" font-size="9" fill="${muted}">
        ENG
      </text>

      ${ringGaugeSvg({
        cx: 120,
        cy: 42,
        r: 30,
        value01: clamp100(maturity.score) / 100,
        track: stroke,
        fill: accent,
        strokeWidth: 8,
      })}
      <text x="120" y="48" text-anchor="middle" font-size="18" font-weight="900" fill="${fg}">
        ${clamp100(maturity.score)}
      </text>
      <text x="120" y="64" text-anchor="middle" font-size="9" fill="${muted}">
        MAT
      </text>
    </g>
  `;

  /* =========================
     Coverage
  ========================= */

  const coverageBlock = `
    <g transform="translate(${pad + 200},72)">
      <rect width="180" height="54" rx="12" fill="${panel}" stroke="${stroke}" />
      <text x="12" y="18" font-size="10" fill="${muted}">
        Coverage
      </text>
      <text x="12" y="36" font-size="16" font-weight="700" fill="${fg}">
        ${clamp100(coverage.reposSampledPct)}%
      </text>
      <text x="56" y="36" font-size="10" fill="${muted}">
        sampled
      </text>
      <text x="12" y="50" font-size="10" fill="${muted}">
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
    title: `${username} Profile`,
    desc: `Profile metrics for ${username}`,
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
      ${rings}
      ${coverageBlock}
    `,
  });
}
