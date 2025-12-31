export type SvgTheme = "light" | "dark";

export function baseSvg({
  width,
  height,
  title,
  desc,
  bg,
  border,
  accent,
  theme,
  body,
}: {
  width: number;
  height: number;
  title: string;
  desc: string;
  bg: string;
  border: boolean;
  accent: string;
  theme: SvgTheme;
  body: string;
}) {
  const fg = theme === "dark" ? "#E5E7EB" : "#111827";
  const muted = theme === "dark" ? "#9CA3AF" : "#6B7280";
  const borderColor = theme === "dark" ? "#374151" : "#E5E7EB";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" role="img" aria-label="${escapeHtml(
    title
  )}" viewBox="0 0 ${width} ${height}">
  <title>${escapeHtml(title)}</title>
  <desc>${escapeHtml(desc)}</desc>

  <defs>
    <style>
      .t { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; }
      .fg { fill: ${fg}; }
      .muted { fill: ${muted}; }
      .accent { fill: ${accent}; }
    </style>
  </defs>

  <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="${bg}" />
  ${border ? `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="16" fill="none" stroke="${borderColor}" />` : ""}

  ${body}
</svg>`;
}

export function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
