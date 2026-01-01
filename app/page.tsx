"use client";

import { useState, useMemo, useCallback, useEffect } from "react";

/* =======================
   Types
======================= */

type CardType = "classic" | "maturity" | "profile";
type Theme = "light" | "dark";
type DetailLevel = "low" | "high";

interface CardConfig {
  username: string; // debounced / active username
  cardType: CardType;
  theme: Theme;
  accent: string;
  bg: string;
  border: boolean;
  details: DetailLevel;
}

/* =======================
   Constants
======================= */

const CARD_INFO: Record<CardType, { title: string; description: string; path: string }> = {
  classic: {
    title: "Classic",
    description: "Complete stats overview with languages, activity, and metrics",
    path: "/stats/classic",
  },
  maturity: {
    title: "Maturity Card",
    description: "Engineering maturity score with strengths and gaps analysis",
    path: "/stats/maturity",
  },
  profile: {
    title: "Profile Card",
    description: "Compact profile summary with key statistics",
    path: "/stats/profile",
  },
};

const PRESET_COLORS = [
  { name: "Cyan", value: "00d9ff" },
  { name: "Indigo", value: "6366f1" },
  { name: "Emerald", value: "10b981" },
  { name: "Rose", value: "f43f5e" },
  { name: "Amber", value: "f59e0b" },
  { name: "Violet", value: "8b5cf6" },
];

const BG_PRESETS = {
  light: [
    { name: "White", value: "ffffff" },
    { name: "Slate", value: "f8fafc" },
    { name: "Warm", value: "fffbeb" },
  ],
  dark: [
    { name: "Midnight", value: "0B1220" },
    { name: "Charcoal", value: "1a1a2e" },
    { name: "Deep", value: "0f0f23" },
  ],
};

/* =======================
   Component
======================= */

export default function Home() {
  /** RAW input (changes every keystroke) */
  const [inputUsername, setInputUsername] = useState("");

  /** ACTIVE config (network-safe) */
  const [config, setConfig] = useState<CardConfig>({
    username: "",
    cardType: "classic",
    theme: "dark",
    accent: "6366f1",
    bg: "0B1220",
    border: true,
    details: "low",
  });

  const [copied, setCopied] = useState<"url" | "markdown" | null>(null);

  /* -----------------------
     Helpers
  ------------------------ */

  const updateConfig = useCallback(
    <K extends keyof CardConfig>(key: K, value: CardConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /* -----------------------
     Debounce username
     (CORE FIX)
  ------------------------ */

  useEffect(() => {
    const trimmed = inputUsername.trim();

    // guard: ignore junk / short input
    if (trimmed.length < 2) {
      if (config.username !== "") {
        updateConfig("username", "");
      }
      return;
    }

    // avoid redundant updates
    if (trimmed === config.username) return;

    const id = setTimeout(() => {
      updateConfig("username", trimmed);
    }, 350);

    return () => clearTimeout(id);
  }, [inputUsername, config.username, updateConfig]);

  /* -----------------------
     URL generation
  ------------------------ */

  const generatedUrl = useMemo(() => {
    if (!config.username.trim()) return "";

    const base = typeof window !== "undefined" ? window.location.origin : "";
    const path = CARD_INFO[config.cardType].path;
    const params = new URLSearchParams();

    if (config.accent !== "6366f1") params.set("accent", config.accent);
    if (config.bg !== (config.theme === "dark" ? "0B1220" : "ffffff")) {
      params.set("bg", config.bg);
    }
    if (!config.border) params.set("border", "false");
    if (config.cardType === "maturity" && config.details === "high") {
      params.set("details", "high");
    }
    if (config.cardType === "profile") {
      params.set("format", "svg");
    }

    const query = params.toString();
    return `${base}${path}/${config.username}${query ? `?${query}` : ""}`;
  }, [config]);

  const markdownSnippet = useMemo(() => {
    if (!generatedUrl) return "";
    return `![GitHub Stats](${generatedUrl})`;
  }, [generatedUrl]);

  /* -----------------------
     Clipboard
  ------------------------ */

  const handleCopy = useCallback(
    async (type: "url" | "markdown") => {
      const text = type === "url" ? generatedUrl : markdownSnippet;
      if (!text) return;

      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    },
    [generatedUrl, markdownSnippet]
  );

  /* =======================
     Render
  ======================= */

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoArea}>
            <div style={styles.logoIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span style={styles.logoText}>
              readme<span style={styles.logoAccent}>.stats</span>
            </span>
          </div>
          <a
            href="https://github.com/nagsujosh/github-readme-stats"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.headerLink}
          >
            View on GitHub →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>
          Beautiful stats for your
          <br />
          <span style={styles.heroGradient}>GitHub README</span>
        </h1>
        <p style={styles.heroSubtitle}>
          Generate stunning, customizable SVG cards to showcase your GitHub activity.
          <br />
          Just enter your username and configure your style.
        </p>
      </section>

      {/* Builder */}
      <main style={styles.main}>
        <div style={styles.builderGrid} className="builderGrid">
          {/* Left: Config */}
          <div style={styles.configPanel}>
            <div style={styles.section}>
              <label style={styles.label}>GitHub Username</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputPrefix}>@</span>
                <input
                  type="text"
                  value={inputUsername}
                  onChange={(e) => setInputUsername(e.target.value)}
                  placeholder="nagsujosh"
                  spellCheck={false}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Card type */}
            <div style={styles.section}>
              <label style={styles.label}>Card Type</label>
              <div style={styles.cardTypeGrid}>
                {(Object.keys(CARD_INFO) as CardType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateConfig("cardType", type)}
                    style={{
                      ...styles.cardTypeBtn,
                      ...(config.cardType === type ? styles.cardTypeBtnActive : {}),
                    }}
                  >
                    <span style={styles.cardTypeTitle}>{CARD_INFO[type].title}</span>
                    <span style={styles.cardTypeDesc}>{CARD_INFO[type].description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div style={styles.section}>
              <label style={styles.label}>Theme</label>
              <div style={styles.segmentedControl}>
                {(["light", "dark"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      updateConfig("theme", t);
                      updateConfig("bg", t === "dark" ? "0B1220" : "ffffff");
                    }}
                    style={{
                      ...styles.segment,
                      ...(config.theme === t ? styles.segmentActive : {}),
                    }}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div style={styles.row}>
              <div style={styles.halfSection}>
                <label style={styles.label}>Accent Color</label>
                <div style={styles.colorPicker}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateConfig("accent", c.value)}
                      title={c.name}
                      style={{
                        ...styles.colorSwatch,
                        backgroundColor: `#${c.value}`,
                        ...(config.accent === c.value ? styles.colorSwatchActive : {}),
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={styles.halfSection}>
                <label style={styles.label}>Background</label>
                <div style={styles.colorPicker}>
                  {BG_PRESETS[config.theme === "dark" ? "dark" : "light"].map((c) => (
                    <button
                      key={c.value}
                      onClick={() => updateConfig("bg", c.value)}
                      title={c.name}
                      style={{
                        ...styles.colorSwatch,
                        backgroundColor: `#${c.value}`,
                        border:
                          c.value === "ffffff" || c.value === "fffbeb" || c.value === "f8fafc"
                            ? "1px solid var(--border)"
                            : "none",
                        ...(config.bg === c.value ? styles.colorSwatchActive : {}),
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Border + Details */}
            <div style={styles.row}>
              <div style={styles.halfSection}>
                <label style={styles.label}>Border</label>
                <div style={styles.segmentedControl}>
                  <button
                    onClick={() => updateConfig("border", true)}
                    style={{ ...styles.segment, ...(config.border ? styles.segmentActive : {}) }}
                  >
                    Show
                  </button>
                  <button
                    onClick={() => updateConfig("border", false)}
                    style={{ ...styles.segment, ...(!config.border ? styles.segmentActive : {}) }}
                  >
                    Hide
                  </button>
                </div>
              </div>

              {config.cardType === "maturity" && (
                <div style={styles.halfSection}>
                  <label style={styles.label}>Detail Level</label>
                  <div style={styles.segmentedControl}>
                    <button
                      onClick={() => updateConfig("details", "low")}
                      style={{ ...styles.segment, ...(config.details === "low" ? styles.segmentActive : {}) }}
                    >
                      Low
                    </button>
                    <button
                      onClick={() => updateConfig("details", "high")}
                      style={{ ...styles.segment, ...(config.details === "high" ? styles.segmentActive : {}) }}
                    >
                      High
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          <div style={styles.previewPanel}>
            <div style={styles.section}>
              <label style={styles.label}>Preview</label>
              <div style={styles.previewContainer}>
                {config.username ? (
                  <img src={generatedUrl} alt="GitHub Stats Preview" style={styles.previewImg} />
                ) : (
                  <div style={styles.previewPlaceholder}>
                    <span>Enter a username to see preview</span>
                  </div>
                )}
              </div>
            </div>

            <div style={styles.section}>
              <label style={styles.label}>Generated URL</label>
              <div style={styles.outputBox}>
                <code style={styles.outputCode}>{generatedUrl || "Enter a username to generate URL"}</code>
                <button onClick={() => handleCopy("url")} disabled={!generatedUrl} style={styles.copyBtn}>
                  {copied === "url" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <div style={styles.section}>
              <label style={styles.label}>Markdown</label>
              <div style={styles.outputBox}>
                <code style={styles.outputCode}>{markdownSnippet || "![GitHub Stats](...)"}</code>
                <button onClick={() => handleCopy("markdown")} disabled={!markdownSnippet} style={styles.copyBtn}>
                  {copied === "markdown" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer style={styles.footer}>
        <p>Built with Love ❤️ @nagsujosh</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(10, 12, 16, 0.8)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border)",
  },
  headerContent: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logoIcon: {
    color: "var(--accent)",
  },
  logoText: {
    fontSize: 20,
    fontWeight: 600,
    fontFamily: "var(--font-mono)",
    letterSpacing: "-0.02em",
  },
  logoAccent: {
    color: "var(--accent)",
  },
  headerLink: {
    fontSize: 14,
    fontWeight: 500,
    color: "var(--text-secondary)",
    transition: "color 0.2s",
  },
  hero: {
    textAlign: "center" as const,
    padding: "80px 24px 60px",
    maxWidth: 800,
    margin: "0 auto",
  },
  heroTitle: {
    fontSize: "clamp(36px, 6vw, 56px)",
    fontWeight: 700,
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
    marginBottom: 24,
  },
  heroGradient: {
    background: "linear-gradient(135deg, var(--accent) 0%, #00ff88 50%, var(--accent-secondary) 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSubtitle: {
    fontSize: 18,
    color: "var(--text-secondary)",
    lineHeight: 1.7,
  },
  main: {
    flex: 1,
    padding: "0 24px 80px",
    maxWidth: 1200,
    margin: "0 auto",
    width: "100%",
  },
  builderGrid: {
    display: "grid",
    gap: 32
  },
  configPanel: {
    minWidth: 0,
    background: "var(--bg-secondary)",
    borderRadius: "var(--radius-lg)",
    padding: 32,
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },  
  previewPanel: {
    minWidth: 0,
    background: "var(--bg-secondary)",
    borderRadius: "var(--radius-lg)",
    padding: 32,
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: 28,
    position: "sticky" as const,
    top: 100,
  },  
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  halfSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  row: {
    display: "flex",
    gap: 24,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "var(--text-tertiary)",
  },
  inputWrapper: {
    display: "flex",
    alignItems: "center",
    background: "var(--bg-tertiary)",
    borderRadius: "var(--radius-md)",
    border: "1px solid var(--border)",
    overflow: "hidden",
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  inputPrefix: {
    padding: "0 0 0 16px",
    color: "var(--text-tertiary)",
    fontFamily: "var(--font-mono)",
    fontSize: 16,
  },
  input: {
    flex: 1,
    padding: "14px 16px 14px 8px",
    background: "transparent",
    border: "none",
    color: "var(--text-primary)",
    fontSize: 16,
    fontFamily: "var(--font-mono)",
    outline: "none",
  },
  cardTypeGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  cardTypeBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 4,
    padding: "14px 16px",
    background: "var(--bg-tertiary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "left" as const,
  },
  cardTypeBtnActive: {
    border: "1px solid var(--accent)",
    background: "var(--accent-glow)",
  },
  cardTypeTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  cardTypeDesc: {
    fontSize: 12,
    color: "var(--text-tertiary)",
  },
  segmentedControl: {
    display: "flex",
    background: "var(--bg-tertiary)",
    borderRadius: "var(--radius-md)",
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-secondary)",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  segmentActive: {
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
  },
  colorPicker: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: "var(--radius-sm)",
    border: "none",
    cursor: "pointer",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  colorSwatchActive: {
    transform: "scale(1.1)",
    boxShadow: "0 0 0 2px var(--bg-secondary), 0 0 0 4px var(--accent)",
  },
  previewContainer: {
    background: "var(--bg-tertiary)",
    borderRadius: "var(--radius-md)",
    padding: 16,
    minHeight: 200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImg: {
    maxWidth: "100%",
    height: "auto",
    borderRadius: "var(--radius-sm)",
  },
  previewPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    color: "var(--text-tertiary)",
    fontSize: 14,
  },
  outputBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "var(--bg-tertiary)",
    borderRadius: "var(--radius-md)",
    padding: "12px 16px",
    border: "1px solid var(--border)",
  },
  outputCode: {
    flex: 1,
    minWidth: 0,
    fontFamily: "var(--font-mono)",
    fontSize: 13,
    color: "var(--text-secondary)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },  
  copyBtn: {
    padding: "8px 16px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },  
  copyBtnSuccess: {
    background: "var(--accent)",
    borderColor: "var(--accent)",
    color: "var(--bg-primary)",
  },
  footer: {
    padding: "32px 24px",
    textAlign: "center" as const,
    color: "var(--text-tertiary)",
    fontSize: 14,
    borderTop: "1px solid var(--border)",
  }
};
