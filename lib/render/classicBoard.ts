import { baseSvg, escapeHtml, SvgTheme } from "./svgBase";
import { donutSegmentsSvg, barsSvg } from "./charts";

/* =========================
   Types
========================= */

type Lang = { name: string; share: number };

type ClassicBoardOptions = {
  langCount?: number; // max visible languages
};

/* =========================
   Utils
========================= */

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

function gradeFromScore(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

/* =========================
   Small Components
========================= */

function kpiCard(
  x: number,
  y: number,
  w: number,
  label: string,
  value: string,
  accent: string,
  fg: string,
  muted: string,
  panel: string,
  stroke: string
) {
  return `
    <g transform="translate(${x},${y})">
      <rect width="${w}" height="56" rx="12" fill="${panel}" stroke="${stroke}" />
      <text x="14" y="20" font-size="11" fill="${muted}">
        ${escapeHtml(label)}
      </text>
      <text x="14" y="42" font-size="20" font-weight="800" fill="${accent}">
        ${escapeHtml(value)}
      </text>
    </g>
  `;
}

/* =========================
   Renderer
========================= */

export function renderClassicBoard({
  username,
  updatedAt,
  theme,
  accent,
  bg,
  border,

  repoCount,
  stars,
  forks,
  maturityScore,
  engineeringScore,

  languages,
  activityBins,
  options,
}: {
  username: string;
  updatedAt: string;
  theme: SvgTheme;
  accent: string;
  bg: string;
  border: boolean;

  repoCount: number;
  stars: number;
  forks: number;
  maturityScore: number;
  engineeringScore: number;

  languages: Lang[];
  activityBins: number[];
  options?: ClassicBoardOptions;
}) {
  const width = 720;
  const height = 240;
  const pad = 24;

  const isDark = theme === "dark";
  const fg = isDark ? "#E5E7EB" : "#515557";
  const muted = isDark ? "#9CA3AF" : "#64748B";
  const stroke = isDark ? "rgba(255,255,255,0.10)" : "rgba(2,6,23,0.12)";
  const panel = isDark ? "rgba(255,255,255,0.06)" : "rgba(2,6,23,0.05)";

  /* =========================
     Header
  ========================= */

  const header = `
    <text x="${pad}" y="34" font-size="18" font-weight="800" fill="${fg}">
      ${escapeHtml(username)}
    </text>
    <text x="${pad}" y="54" font-size="12" fill="${muted}">
      Updated ${escapeHtml(updatedAt)}
    </text>
  `;

  /* =========================
     KPI Row (boxed)
  ========================= */

  const kpiY = 68;
  const kpiW = 120;
  const kpiGap = 12;

  const kpis = `
    ${kpiCard(pad + 0 * (kpiW + kpiGap), kpiY, kpiW, "Repos", String(repoCount), accent, fg, muted, panel, stroke)}
    ${kpiCard(pad + 1 * (kpiW + kpiGap), kpiY, kpiW, "Stars", formatCompact(stars), accent, fg, muted, panel, stroke)}
    ${kpiCard(pad + 2 * (kpiW + kpiGap), kpiY, kpiW, "Forks", formatCompact(forks), accent, fg, muted, panel, stroke)}
    ${kpiCard(pad + 3 * (kpiW + kpiGap), kpiY, kpiW, "Maturity", String(Math.round(maturityScore)), accent, fg, muted, panel, stroke)}
  `;

  /* =========================
     Engineering (compact)
  ========================= */

  const engGrade = gradeFromScore(engineeringScore);

  const engineering = `
    <g transform="translate(${width - pad - 140},${kpiY})">
      <rect width="140" height="56" rx="12" fill="${panel}" stroke="${stroke}" />
      <text x="14" y="20" font-size="11" fill="${muted}">
        Engineering
      </text>
      <text x="14" y="42" font-size="22" font-weight="900" fill="${accent}">
        ${Math.round(engineeringScore)}
      </text>
      <text x="96" y="42" font-size="14" font-weight="700" fill="${muted}">
        ${engGrade}
      </text>
    </g>
  `;

  /* =========================
     Activity
  ========================= */

  const activity = `
    <g transform="translate(${pad},138)">
      <rect width="336" height="78" rx="14" fill="${panel}" stroke="${stroke}" />
      <text x="14" y="22" font-size="13" font-weight="700" fill="${fg}">
        Activity
      </text>
      <text x="14" y="38" font-size="10" fill="${muted}">
        Repo recency bins
      </text>

      <g transform="translate(14,48)">
        ${barsSvg({
          x: 0,
          y: 0,
          w: 308,
          h: 22,
          values: activityBins,
          fill: accent,
          gap: 4,
          radius: 3,
        })}
      </g>
    </g>
  `;

  /* =========================
     Languages (2 rows per column)
  ========================= */

  const maxLang = clamp(options?.langCount ?? 4, 2, 6);
  const top = languages.slice(0, maxLang);

  const used = top.reduce((s, l) => s + l.share, 0);
  const other = Math.max(0, 1 - used);

  const segments = [
    ...top.map((l, i) => ({
      value01: l.share,
      color: accent,
      opacity: 1 - i * 0.15,
    })),
    ...(other > 0
      ? [{ value01: other, color: accent, opacity: 0.25 }]
      : []),
  ];

  /* ---- legend layout ---- */
  const ROWS_PER_COL = 2;
  const COL_WIDTH = 110;
  const ROW_HEIGHT = 14;

  const legend = top
    .map((l, i) => {
      const col = Math.floor(i / ROWS_PER_COL);
      const row = i % ROWS_PER_COL;

      return `
        <text
          x="${col * COL_WIDTH}"
          y="${row * ROW_HEIGHT}"
          font-size="9"
          fill="${muted}"
        >
          ${escapeHtml(l.name)} ${Math.round(l.share * 100)}%
        </text>
      `;
    })
    .join("");

  const languagesBlock = `
    <g transform="translate(${pad + 360},138)">
      <rect width="312" height="78" rx="14" fill="${panel}" stroke="${stroke}" />
      <text x="14" y="22" font-size="13" font-weight="700" fill="${fg}">
        Languages
      </text>
      <text x="14" y="38" font-size="10" fill="${muted}">
        Repo share
      </text>

      <g transform="translate(14,52)">
        ${legend}
      </g>

      ${donutSegmentsSvg({
        cx: 252,
        cy: 50,
        r: 20,
        strokeWidth: 8,
        track: stroke,
        segments,
        gapFrac: 0.015,
      })}
    </g>
  `;

  /* =========================
     SVG
  ========================= */

  return baseSvg({
    width,
    height,
    title: `${username} GitHub Classic`,
    desc: `GitHub stats for ${username}`,
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
      ${kpis}
      ${engineering}
      ${activity}
      ${languagesBlock}
    `,
  });
}
