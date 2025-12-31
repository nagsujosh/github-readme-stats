import { baseSvg, escapeHtml, SvgTheme } from "./svgBase";

type Lang = { name: string; share: number };

const KPI_COLORS = {
  repos: "#6366F1",     // indigo
  stars: "#F59E0B",     // amber
  forks: "#22D3EE",     // cyan
  maturity: "#22C55E", // green
};

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
  archivedCount,
  forkedCount,
  languages,
  activityBins,
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
  archivedCount: number;
  forkedCount: number;

  languages: Lang[];
  activityBins: number[];
}) {
  const width = 720;
  const height = 240;

  const fg = theme === "dark" ? "#E5E7EB" : "#0F172A";
  const muted = theme === "dark" ? "#9CA3AF" : "#64748B";
  const soft = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(2,6,23,0.06)";

  const formatCompact = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  /* ---------------- KPI blocks ---------------- */

  const kpi = (x: number, label: string, value: string, color: string) => `
    <g transform="translate(${x},0)">
      <text class="t muted" font-size="12" y="14">${label}</text>
      <text class="t fg" font-size="28" font-weight="900" y="46">${value}</text>
      <rect x="0" y="54" width="140" height="6" rx="3" fill="${color}" opacity="0.9"/>
    </g>
  `;

  /* ---------------- Activity chart ---------------- */

  const maxActivity = Math.max(...activityBins, 1);
  const activityBars = activityBins.map((v, i) => {
    const barH = Math.round((v / maxActivity) * 48);
    const x = 12 + i * 44;
    const y = 48 - barH;
    const opacity = i <= 1 ? 0.9 : 0.4; // recent activity emphasis
    return `<rect x="${x}" y="${y}" width="28" height="${barH}" rx="6" fill="url(#activityGrad)" opacity="${opacity}"/>`;
  }).join("");

  /* ---------------- Language stacked bar ---------------- */

  let offset = 0;
  const langStack = languages.slice(0, 4).map((l) => {
    const w = Math.round(l.share * 360);
    const rect = `<rect x="${offset}" y="0" width="${w}" height="14" rx="7" fill="${accent}" opacity="0.85"/>`;
    offset += w;
    return rect;
  }).join("");

  const langLabels = languages.slice(0, 3)
    .map((l) => `${l.name} ${Math.round(l.share * 100)}%`)
    .join(" • ");

  /* ---------------- SVG Body ---------------- */

  const body = `
  <defs>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.55"/>
    </linearGradient>

    <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.4"/>
    </linearGradient>
  </defs>

  <!-- Hero -->
  <rect x="0" y="0" width="${width}" height="72" rx="16" fill="url(#heroGrad)"/>
  <text x="24" y="44" font-size="22" font-weight="900" fill="#ffffff">
    ${escapeHtml(username)}
  </text>
  <text x="24" y="64" font-size="13" fill="rgba(255,255,255,0.85)">
    Classic GitHub Board • Updated ${escapeHtml(updatedAt)}
  </text>

  <g transform="translate(${width - 220}, 18)">
    <rect width="196" height="36" rx="18" fill="rgba(255,255,255,0.18)"/>
    <text x="16" y="24" font-size="12" fill="#ffffff">
      forked <tspan font-weight="700">${forkedCount}</tspan> • archived <tspan font-weight="700">${archivedCount}</tspan>
    </text>
  </g>

  <!-- KPIs -->
  <g transform="translate(24, 98)">
    ${kpi(0, "Repos", String(repoCount), KPI_COLORS.repos)}
    ${kpi(176, "Stars", formatCompact(stars), KPI_COLORS.stars)}
    ${kpi(352, "Forks", formatCompact(forks), KPI_COLORS.forks)}
    ${kpi(528, "Maturity", maturityScore.toFixed(1), KPI_COLORS.maturity)}
  </g>

  <!-- Activity -->
  <g transform="translate(24, 176)">
    <text class="t fg" font-size="14" font-weight="700">Activity</text>
    <text class="t muted" font-size="11" y="16">Recent pushes by recency bucket</text>
    <g transform="translate(0,28)">
      <rect x="0" y="0" width="280" height="48" rx="12" fill="${soft}"/>
      ${activityBars}
    </g>
  </g>

  <!-- Languages -->
  <g transform="translate(336, 176)">
    <text class="t fg" font-size="14" font-weight="700">Languages</text>
    <text class="t muted" font-size="11" y="16">Repo share</text>
    <g transform="translate(0,28)">
      <rect width="360" height="14" rx="7" fill="${soft}"/>
      ${langStack}
    </g>
    <text class="t muted" font-size="11" y="62">${escapeHtml(langLabels || "No language data")}</text>
  </g>

  <!-- Footer -->
  <text x="24" y="${height - 12}" font-size="10" fill="${muted}" opacity="0.6">
    Built with Love ❤️ @nagsujosh
  </text>
  `;

  return baseSvg({
    width,
    height,
    title: `${username} GitHub Classic Board`,
    desc: `Repos, stars, forks, maturity, activity, and language distribution for ${username}.`,
    bg,
    border,
    accent,
    theme,
    body,
  });
}
