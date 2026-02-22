import { useState, useEffect, useRef } from "react";

const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://ai-travel-middleware.onrender.com";

// ─── Section color themes ───────────────────────────────
const getSectionTheme = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("day"))     return { bg: "rgba(56,189,248,0.1)",  border: "#38bdf8", icon: "📅", color: "#38bdf8" };
  if (t.includes("budget"))  return { bg: "rgba(34,197,94,0.1)",   border: "#22c55e", icon: "💰", color: "#22c55e" };
  if (t.includes("food") || t.includes("eat") || t.includes("restaurant"))
                             return { bg: "rgba(251,146,60,0.1)",   border: "#fb923c", icon: "🍜", color: "#fb923c" };
  if (t.includes("hotel") || t.includes("stay") || t.includes("accommodation"))
                             return { bg: "rgba(168,85,247,0.1)",   border: "#a855f7", icon: "🏨", color: "#a855f7" };
  if (t.includes("tip") || t.includes("advice") || t.includes("note"))
                             return { bg: "rgba(250,204,21,0.1)",   border: "#facc15", icon: "💡", color: "#facc15" };
  if (t.includes("weather")) return { bg: "rgba(20,184,166,0.1)",  border: "#14b8a6", icon: "🌤️", color: "#14b8a6" };
  if (t.includes("transport") || t.includes("getting"))
                             return { bg: "rgba(99,102,241,0.1)",   border: "#6366f1", icon: "🚌", color: "#6366f1" };
  return                            { bg: "rgba(255,255,255,0.05)", border: "#ffffff40", icon: "📌", color: "#ffffff" };
};

// ─── Parse markdown into sections ───────────────────────
interface Section {
  title: string;
  body: string;
}

const parseIntoSections = (text: string): Section[] => {
  const lines = text.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    if (line.startsWith("## ") || line.startsWith("# ")) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##?\s*/, "").trim(), body: "" };
    } else {
      if (current) current.body += line + "\n";
      else if (line.trim()) {
        current = { title: "", body: line + "\n" };
      }
    }
  }
  if (current) sections.push(current);
  return sections.filter(s => s.title || s.body.trim());
};

// ─── Render body text (bold, bullets) ───────────────────
const renderBody = (body: string) => {
  return body.split("\n").map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    // Bold **text**
    const parts = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      return (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <span style={{ color: "#38bdf8", marginTop: 2 }}>▸</span>
          <span>{parts.map((p, j) => <span key={j}>{p}</span>)}</span>
        </div>
      );
    }
    return <p key={i} style={{ margin: "4px 0" }}>{parts.map((p, j) => <span key={j}>{p}</span>)}</p>;
  });
};

// ─── Progress bar messages ───────────────────────────────
const PROGRESS_MESSAGES = [
  "Researching destinations...",
  "Planning daily activities...",
  "Finding best local spots...",
  "Calculating budget...",
  "Checking travel tips...",
  "Finalising your itinerary...",
];

export default function TripForm() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [vibe, setVibe] = useState("adventure");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MESSAGES[0]);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Progress bar animation while loading
  useEffect(() => {
    if (loading) {
      setProgress(0);
      setProgressMsg(PROGRESS_MESSAGES[0]);
      let p = 0;
      let m = 0;
      progressRef.current = setInterval(() => {
        p += Math.random() * 3;
        if (p > 90) p = 90; // never reach 100 until done
        setProgress(Math.floor(p));
      }, 400);
      msgRef.current = setInterval(() => {
        m = (m + 1) % PROGRESS_MESSAGES.length;
        setProgressMsg(PROGRESS_MESSAGES[m]);
      }, 2500);
    } else {
      setProgress(100);
      if (progressRef.current) clearInterval(progressRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
      if (msgRef.current) clearInterval(msgRef.current);
    };
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch(`${API_BASE}/api/plan-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, days, vibe }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.replace("data: ", "").trim();
          if (raw === "[DONE]") { setLoading(false); break; }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.token) setResult((prev) => prev + parsed.token);
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const sections = parseIntoSections(result);

  return (
    <div style={{ width: "100%", maxWidth: 700 }}>

      {/* Title */}
      <h1 style={titleStyle}>✈️ Your Travel Planner</h1>
      <p style={subtitleStyle}>Tell us where you want to go — we'll plan the rest.</p>

      {/* Form Card */}
      <div style={cardStyle}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          <div>
            <label style={labelStyle}>🌍 Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Tokyo, Japan"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>📅 Number of Days: <strong style={{ color: "#38bdf8" }}>{days}</strong></label>
            <input
              type="range" min={1} max={30} value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={sliderStyle}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginTop: 4 }}>
              <span>1 day</span><span>30 days</span>
            </div>
          </div>

          <div>
            <label style={labelStyle}>🎭 Travel Vibe</label>
            <select value={vibe} onChange={(e) => setVibe(e.target.value)} style={inputStyle}>
              <option value="adventure">🧗 Adventure</option>
              <option value="relaxation">🧘 Relaxation</option>
              <option value="culture">🏛️ Culture</option>
              <option value="food">🍜 Food & Drink</option>
              <option value="budget">💸 Budget</option>
              <option value="luxury">✨ Luxury</option>
            </select>
          </div>

          <button type="submit" disabled={loading} style={loading ? { ...buttonStyle, opacity: 0.6, cursor: "not-allowed" } : buttonStyle}>
            {loading ? "✈️ Planning your trip..." : "Plan My Trip ✈️"}
          </button>

        </form>
      </div>

      {/* Error */}
      {error && <div style={errorStyle}>❌ {error}</div>}

      {/* Progress Bar */}
      {(loading || (progress > 0 && progress < 100)) && (
        <div style={progressContainerStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 13 }}>✈️ {progressMsg}</span>
            <span style={{ color: "#38bdf8", fontSize: 13, fontWeight: 700 }}>{progress}%</span>
          </div>
          <div style={progressTrackStyle}>
            <div style={{ ...progressFillStyle, width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Section Cards */}
      {sections.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          {sections.map((section, i) => {
            const theme = getSectionTheme(section.title);
            return (
              <div key={i} style={{ ...sectionCardStyle, background: theme.bg, borderLeft: `4px solid ${theme.border}` }}>
                {section.title && (
                  <div style={{ ...sectionTitleStyle, color: theme.color }}>
                    {theme.icon} {section.title}
                  </div>
                )}
                <div style={sectionBodyStyle}>
                  {renderBody(section.body)}
                </div>
              </div>
            );
          })}
          {/* Typing cursor at end while streaming */}
          {loading && (
            <span style={cursorStyle}>▋</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={footerStyle}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Built by Sagarika Singh</span>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="https://github.com/Sagarika-Singh-99" target="_blank" rel="noreferrer" style={footerLinkStyle}>
            GitHub
          </a>
          <a href="https://www.linkedin.com/in/sagarika-singh-938aa11bb/" target="_blank" rel="noreferrer" style={footerLinkStyle}>
            LinkedIn
          </a>
        </div>
      </div>

    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────── */

const titleStyle: React.CSSProperties = {
  fontSize: 42, fontWeight: 800, color: "#ffffff",
  textAlign: "center", marginBottom: 8,
  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
};
const subtitleStyle: React.CSSProperties = {
  textAlign: "center", color: "rgba(255,255,255,0.65)",
  fontSize: 16, marginBottom: 32,
};
const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 20, padding: "36px 40px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
  marginBottom: 28,
};
const labelStyle: React.CSSProperties = {
  display: "block", color: "rgba(255,255,255,0.85)",
  fontSize: 14, fontWeight: 600, marginBottom: 8, letterSpacing: 0.3,
};
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "12px 16px",
  borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.1)", color: "#ffffff",
  fontSize: 15, outline: "none", boxSizing: "border-box",
};
const sliderStyle: React.CSSProperties = {
  width: "100%", accentColor: "#38bdf8", cursor: "pointer",
};
const buttonStyle: React.CSSProperties = {
  padding: "14px 20px", fontSize: 17, fontWeight: 700,
  borderRadius: 12, border: "none",
  background: "linear-gradient(135deg, #38bdf8, #818cf8)",
  color: "white", cursor: "pointer", marginTop: 4,
  letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(56,189,248,0.4)",
  transition: "opacity 0.2s",
};
const errorStyle: React.CSSProperties = {
  background: "rgba(255,80,80,0.15)",
  border: "1px solid rgba(255,80,80,0.3)",
  borderRadius: 12, padding: "14px 20px",
  color: "#ff8080", marginBottom: 20,
};
const progressContainerStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12, padding: "16px 20px", marginBottom: 20,
};
const progressTrackStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.1)",
  borderRadius: 999, height: 8, overflow: "hidden",
};
const progressFillStyle: React.CSSProperties = {
  height: "100%", borderRadius: 999,
  background: "linear-gradient(90deg, #38bdf8, #818cf8)",
  transition: "width 0.4s ease",
};
const sectionCardStyle: React.CSSProperties = {
  borderRadius: 16, padding: "20px 24px",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 20, fontWeight: 800,
  marginBottom: 12, letterSpacing: 0.3,
};
const sectionBodyStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.82)", fontSize: 15, lineHeight: 1.9,
};
const cursorStyle: React.CSSProperties = {
  display: "inline-block", color: "#38bdf8", fontWeight: 900,
  animation: "blink 1s step-start infinite", marginLeft: 2,
};
const footerStyle: React.CSSProperties = {
  marginTop: 48, paddingTop: 20,
  borderTop: "1px solid rgba(255,255,255,0.1)",
  display: "flex", justifyContent: "space-between",
  alignItems: "center", flexWrap: "wrap", gap: 12,
};
const footerLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.55)", fontSize: 13,
  textDecoration: "none", transition: "color 0.2s",
};
