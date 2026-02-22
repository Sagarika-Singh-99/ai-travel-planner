import { useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";

const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://ai-travel-middleware.onrender.com";

// ─── Section color themes ───────────────────────────────
const getSectionTheme = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("day"))     return { bg: "rgba(56,189,248,0.12)",  border: "#38bdf8", icon: "📅", color: "#38bdf8" };
  if (t.includes("budget") || t.includes("estimated") || t.includes("cost"))
                             return { bg: "rgba(34,197,94,0.12)",   border: "#22c55e", icon: "💰", color: "#22c55e" };
  if (t.includes("food") || t.includes("eat") || t.includes("restaurant"))
                             return { bg: "rgba(251,146,60,0.12)",   border: "#fb923c", icon: "🍜", color: "#fb923c" };
  if (t.includes("hotel") || t.includes("stay") || t.includes("accommodation"))
                             return { bg: "rgba(168,85,247,0.12)",   border: "#a855f7", icon: "🏨", color: "#a855f7" };
  if (t.includes("tip") || t.includes("advice") || t.includes("note") || t.includes("practical"))
                             return { bg: "rgba(250,204,21,0.12)",   border: "#facc15", icon: "💡", color: "#facc15" };
  if (t.includes("weather") || t.includes("forecast") || t.includes("climate"))
                             return { bg: "rgba(20,184,166,0.12)",  border: "#14b8a6", icon: "🌤️", color: "#14b8a6" };
  if (t.includes("transport") || t.includes("getting") || t.includes("travel"))
                             return { bg: "rgba(99,102,241,0.12)",   border: "#6366f1", icon: "🚌", color: "#6366f1" };
  if (t.includes("activit") || t.includes("sightseeing") || t.includes("explore"))
                             return { bg: "rgba(244,63,94,0.12)",    border: "#f43f5e", icon: "🗺️", color: "#f43f5e" };
  return                            { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.2)", icon: "📌", color: "#ffffff" };
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
    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      if (current) sections.push(current);
      current = { title: line.replace(/^#+\s*/, "").trim(), body: "" };
    } else {
      if (current) current.body += line + "\n";
      else if (line.trim()) current = { title: "", body: line + "\n" };
    }
  }
  if (current) sections.push(current);
  return sections.filter(s => s.title || s.body.trim());
};

// ─── Render body text ────────────────────────────────────
const renderBody = (body: string) => {
  return body.split("\n").map((line, i) => {
    if (!line.trim()) return <br key={i} />;
    if (line.trim().startsWith("#")) return null;
    const parseBold = (text: string) =>
      text.split(/\*\*(.*?)\*\*/g).map((part, j) =>
        j % 2 === 1 ? <strong key={j} style={{ color: "#ffffff" }}>{part}</strong> : part
      );
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      const content = line.trim().replace(/^[-•]\s*/, "");
      return (
        <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
          <span style={{ color: "#38bdf8", fontSize: 18, lineHeight: 1.5, flexShrink: 0 }}>▸</span>
          <span style={{ lineHeight: 1.7 }}>{parseBold(content)}</span>
        </div>
      );
    }
    return <p key={i} style={{ margin: "4px 0", lineHeight: 1.8 }}>{parseBold(line)}</p>;
  });
};

// ─── Progress messages ───────────────────────────────────
const PROGRESS_MESSAGES = [
  "Researching destinations...",
  "Planning daily activities...",
  "Finding best local spots...",
  "Calculating budget...",
  "Checking travel tips...",
  "Finalising your itinerary...",
];

// ─── Main Component ──────────────────────────────────────
export default function TripForm() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [vibe, setVibe] = useState("adventure");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState(PROGRESS_MESSAGES[0]);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      setProgressMsg(PROGRESS_MESSAGES[0]);
      let p = 0; let m = 0;
      progressRef.current = setInterval(() => {
        p += Math.random() * 3;
        if (p > 90) p = 90;
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

  // ─── Scroll to top ──────────────────────────────────────
  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // ─── Copy itinerary ─────────────────────────────────────
  const copyItinerary = () => {
    const clean = result.replace(/#{1,3}\s/g, "").replace(/\*\*/g, "");
    navigator.clipboard.writeText(clean);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Copy website link ──────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText("https://ai-travel-planner-snowy.vercel.app/");
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ─── Download PDF ───────────────────────────────────────
  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    const addLine = (text: string, fontSize: number, bold = false, gap = 7) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += gap;
      });
    };

    // Header
    doc.setFillColor(15, 32, 39);
    doc.rect(0, 0, pageWidth, 40, "F");
    doc.setTextColor(255, 255, 255);
    addLine("✈️ Your Travel Planner", 22, true, 8);
    doc.setTextColor(56, 189, 248);
    addLine(`${destination} · ${days} Days · ${vibe.charAt(0).toUpperCase() + vibe.slice(1)}`, 13, false, 6);
    y = 50;
    doc.setTextColor(30, 30, 30);

    // Content
    const lines = result.split("\n");
    for (const line of lines) {
      if (!line.trim()) { y += 3; continue; }
      if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
        y += 4;
        doc.setDrawColor(56, 189, 248);
        doc.setLineWidth(0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
        addLine(line.replace(/^#+\s*/, ""), 14, true, 8);
      } else if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
        addLine("• " + line.trim().replace(/^[-•]\s*/, ""), 11, false, 6);
      } else {
        addLine(line.replace(/\*\*/g, ""), 11, false, 6);
      }
    }

    // Footer
    y += 10;
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.text("Built by Sagarika Singh", margin, y);
    doc.text("https://ai-travel-planner-snowy.vercel.app/", pageWidth - margin, y, { align: "right" });

    doc.save(`travel-plan-${destination.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  };

  const sections = parseIntoSections(result);
  const vibeLabel = vibe.charAt(0).toUpperCase() + vibe.slice(1);

  return (
    <div style={{ width: "100%", maxWidth: 700 }}>

      {/* Top anchor */}
      <div ref={topRef} />

      {/* Title */}
      <h1 style={titleStyle}>✈️ Your Travel Planner</h1>
      <p style={subtitleStyle}>Tell us where you want to go — we'll plan the rest.</p>

      {/* Form Card */}
      <div style={cardStyle}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={labelStyle}>🌍 Destination</label>
            <input
              type="text" value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Tokyo, Japan" required style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              📅 Number of Days: <strong style={{ color: "#38bdf8" }}>{days}</strong>
            </label>
            <input type="range" min={1} max={30} value={days}
              onChange={(e) => setDays(Number(e.target.value))} style={sliderStyle} />
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
          <button type="submit" disabled={loading}
            style={loading ? { ...buttonStyle, opacity: 0.6, cursor: "not-allowed" } : buttonStyle}>
            {loading ? "✈️ Planning your trip..." : "Plan My Trip ✈️"}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && <div style={errorStyle}>❌ {error}</div>}

      {/* Progress Bar */}
      {loading && (
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
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 8 }}>
          {sections.map((section, i) => {
            const theme = getSectionTheme(section.title);
            return (
              <div key={i} style={{
                borderRadius: 18, padding: "24px 28px",
                background: theme.bg,
                border: `1px solid ${theme.border}40`,
                borderLeftWidth: 5, borderLeftColor: theme.border, borderLeftStyle: "solid",
                boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${theme.border}20`,
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              }}>
                {section.title && (
                  <div style={{
                    fontSize: 20, fontWeight: 800, color: theme.color,
                    marginBottom: 14, paddingBottom: 12,
                    borderBottom: `1px solid ${theme.border}30`,
                    letterSpacing: 0.3, display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 22 }}>{theme.icon}</span>
                    <span>{section.title}</span>
                  </div>
                )}
                <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, lineHeight: 1.9 }}>
                  {renderBody(section.body)}
                </div>
              </div>
            );
          })}

          {loading && <span style={cursorStyle}>▋</span>}

          {/* Action Buttons — shown after streaming done */}
          {!loading && result && (
            <div style={actionRowStyle}>
              <button onClick={scrollToTop} style={actionBtnStyle} title="Scroll to top">
                ⬆️ Back to Top
              </button>
              <button onClick={downloadPDF} style={actionBtnStyle} title="Download as PDF">
                📄 Download PDF
              </button>
              <button onClick={copyItinerary} style={copied ? { ...actionBtnStyle, ...actionBtnActiveStyle } : actionBtnStyle}>
                {copied ? "✅ Copied!" : "📋 Copy Itinerary"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={footerStyle}>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Built by Sagarika Singh</span>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={copyLink} style={footerBtnStyle}>
            {linkCopied ? "✅ Link Copied!" : "🔗 Share App"}
          </button>
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
  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 20, padding: "36px 40px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.4)", marginBottom: 28,
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
const cursorStyle: React.CSSProperties = {
  display: "inline-block", color: "#38bdf8", fontWeight: 900,
  animation: "blink 1s step-start infinite", marginLeft: 2,
};
const actionRowStyle: React.CSSProperties = {
  display: "flex", gap: 12, flexWrap: "wrap",
  justifyContent: "center", marginTop: 8, marginBottom: 8,
};
const actionBtnStyle: React.CSSProperties = {
  padding: "12px 22px", fontSize: 14, fontWeight: 600,
  borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)", color: "#ffffff",
  cursor: "pointer", backdropFilter: "blur(8px)",
  transition: "all 0.2s",
};
const actionBtnActiveStyle: React.CSSProperties = {
  background: "rgba(34,197,94,0.2)",
  border: "1px solid #22c55e", color: "#22c55e",
};
const footerStyle: React.CSSProperties = {
  marginTop: 48, paddingTop: 20,
  borderTop: "1px solid rgba(255,255,255,0.1)",
  display: "flex", justifyContent: "space-between",
  alignItems: "center", flexWrap: "wrap", gap: 12,
};
const footerLinkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.55)", fontSize: 13,
  textDecoration: "none",
};
const footerBtnStyle: React.CSSProperties = {
  padding: "6px 14px", fontSize: 13, fontWeight: 600,
  borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)",
  cursor: "pointer",
};
