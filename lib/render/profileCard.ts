import { baseSvg, escapeHtml, SvgTheme } from "./svgBase";

export function renderProfileCard({
  username,
  repoCount,
  stars,
  forks,
  topLanguages,
  archivedCount,
  forkedCount,
  maturityScore,
  updatedAt,
  theme,
  accent,
  bg,
  border,
}: {
  username: string;
  repoCount: number;
  stars: number;
  forks: number;
  topLanguages: Array<{ name: string; share: number }>;
  archivedCount: number;
  forkedCount: number;
  maturityScore: number;
  updatedAt: string;
  theme: SvgTheme;
  accent: string;
  bg: string;
  border: boolean;
}) {
  const width = 540;
  const height = 220;

  const langDisplay = topLanguages
    .slice(0, 4)
    .map((l) => `${l.name} (${Math.round(l.share * 100)}%)`)
    .join(", ") || "—";

  const body = `
  <text x="24" y="38" class="t fg" font-size="18" font-weight="700">${escapeHtml(username)} • Profile Overview</text>
  <text x="24" y="60" class="t muted" font-size="12">Last updated: ${escapeHtml(updatedAt)}</text>

  <g transform="translate(24, 80)">
    ${metricBlock(0, "Repos", String(repoCount), accent)}
    ${metricBlock(120, "Stars", formatNumber(stars), accent)}
    ${metricBlock(240, "Forks", formatNumber(forks), accent)}
    ${metricBlock(360, "Maturity", maturityScore.toFixed(1), accent)}
  </g>

  <g transform="translate(24, 150)">
    <text x="0" y="14" class="t muted" font-size="12">Archived: ${archivedCount} • Forked: ${forkedCount}</text>
    <text x="0" y="36" class="t muted" font-size="12">Languages: ${escapeHtml(langDisplay)}</text>
  </g>
  `;

  return baseSvg({
    width,
    height,
    title: `${username} Profile Overview`,
    desc: `GitHub profile statistics for ${username} including repos, stars, forks, and maturity score.`,
    bg,
    border,
    accent,
    theme,
    body,
  });
}

function metricBlock(x: number, label: string, value: string, accent: string) {
  return `
  <g transform="translate(${x},0)">
    <text x="0" y="14" class="t muted" font-size="12">${escapeHtml(label)}</text>
    <text x="0" y="38" class="t fg" font-size="22" font-weight="800">${escapeHtml(value)}</text>
    <rect x="0" y="46" width="90" height="4" rx="2" fill="${accent}" opacity="0.25" />
  </g>`;
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(n);
}

