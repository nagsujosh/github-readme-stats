import { baseSvg, escapeHtml, SvgTheme } from "./svgBase";

export function renderMaturityCard({
  username,
  updatedAt,
  theme,
  accent,
  bg,
  border,
  score,
  strengths,
  gaps,
}: {
  username: string;
  updatedAt: string;
  theme: SvgTheme;
  accent: string;
  bg: string;
  border: boolean;

  score: number;
  strengths: string[];
  gaps: string[];
}) {
  const width = 640;
  const height = 220;

  const fg = theme === "dark" ? "#E5E7EB" : "#0F172A";
  const muted = theme === "dark" ? "#9CA3AF" : "#64748B";
  const soft = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(2,6,23,0.06)";

  const scorePct = Math.max(0, Math.min(1, score / 10));
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * scorePct;

  const verdict =
    score >= 7 ? "Production-ready"
    : score >= 4 ? "Developing"
    : "Early-stage";

  const verdictColor =
    score >= 7 ? "#22C55E"
    : score >= 4 ? "#F59E0B"
    : "#EF4444";

  const pill = (text: string, color: string, y: number) => `
    <g transform="translate(0,${y})">
      <rect width="320" height="28" rx="14" fill="${color}" opacity="0.12"/>
      <text x="14" y="19" font-size="12" fill="${color}" font-weight="600">
        ${escapeHtml(text)}
      </text>
    </g>
  `;

  const body = `
  <defs>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.4"/>
    </linearGradient>
  </defs>

  <!-- Hero -->
  <rect x="0" y="0" width="${width}" height="64" rx="16" fill="url(#heroGrad)"/>
  <text x="24" y="40" font-size="20" font-weight="900" fill="#ffffff">
    ${escapeHtml(username)} • Engineering Maturity
  </text>
  <text x="24" y="58" font-size="12" fill="rgba(255,255,255,0.85)">
    Updated ${escapeHtml(updatedAt)}
  </text>

  <!-- Score ring -->
  <g transform="translate(120, 128)">
    <circle r="${radius}" fill="none" stroke="${soft}" stroke-width="10"/>
    <circle
      r="${radius}"
      fill="none"
      stroke="${verdictColor}"
      stroke-width="10"
      stroke-dasharray="${dash} ${circumference - dash}"
      transform="rotate(-90)"
    />
    <text y="-2" text-anchor="middle" font-size="26" font-weight="900" fill="${fg}">
      ${score.toFixed(1)}
    </text>
    <text y="18" text-anchor="middle" font-size="11" fill="${muted}">
      / 10
    </text>
    <text y="44" text-anchor="middle" font-size="12" font-weight="700" fill="${verdictColor}">
      ${verdict}
    </text>
  </g>

  <!-- Insights -->
  <g transform="translate(260, 96)">
    <text font-size="13" font-weight="800" fill="#22C55E">Strengths</text>
    <g transform="translate(0, 12)">
      ${
        strengths.length
          ? strengths.slice(0, 2).map((s, i) => pill(s, "#22C55E", i * 34)).join("")
          : pill("No strong signals detected", muted, 0)
      }
    </g>

    <g transform="translate(0, 90)">
      <text font-size="13" font-weight="800" fill="#EF4444">Gaps</text>
      <g transform="translate(0, 12)">
        ${
          gaps.length
            ? gaps.slice(0, 2).map((g, i) => pill(g, "#EF4444", i * 34)).join("")
            : pill("No major gaps detected", muted, 0)
        }
      </g>
    </g>
  </g>

  <!-- Footer -->
  <text x="24" y="${height - 12}" font-size="10" fill="${muted}" opacity="0.6">
    Based on repo hygiene, maintenance, CI, and releases
  </text>
  `;

  return baseSvg({
    width,
    height,
    title: `${username} Engineering Maturity`,
    desc: `Engineering maturity assessment for ${username}.`,
    bg,
    border,
    accent,
    theme,
    body,
  });
}
