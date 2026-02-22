import { useState } from "react";
import ReactMarkdown from "react-markdown";

const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:4000"
    : "https://ai-travel-middleware.onrender.com";

export default function TripForm() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [vibe, setVibe] = useState("adventure");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");

    const payload = { destination, days, vibe };

    try {
      const res = await fetch(`${API_BASE}/api/plan-trip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.replace("data: ", "").trim();
          if (raw === "[DONE]") { setLoading(false); break; }
          try {
            const parsed = JSON.parse(raw);
            if (parsed.token) setResult((prev) => prev + parsed.token);
          } catch { /* ignore bad chunks */ }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 680 }}>

      {/* App Title */}
      <h1 style={titleStyle}>✈️ Your Travel Planner</h1>
      <p style={subtitleStyle}>Tell us where you want to go — we'll plan the rest.</p>

      {/* Form Card */}
      <div style={cardStyle}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Destination */}
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

          {/* Days Slider */}
          <div>
            <label style={labelStyle}>📅 Number of Days: <strong>{days}</strong></label>
            <input
              type="range"
              min={1}
              max={14}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={sliderStyle}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginTop: 4 }}>
              <span>1 day</span>
              <span>14 days</span>
            </div>
          </div>

          {/* Vibe Dropdown */}
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

          {/* Submit Button */}
          <button type="submit" disabled={loading} style={loading ? buttonLoadingStyle : buttonStyle}>
            {loading ? "✈️ Planning your trip..." : "Plan My Trip ✈️"}
          </button>

        </form>
      </div>

      {/* Error */}
      {error !== "" && (
        <div style={errorStyle}>❌ {error}</div>
      )}

      {/* Result Chat Bubble */}
      {result !== "" && (
        <div style={bubbleStyle}>
          <div style={bubbleHeaderStyle}>🗺️ Your Itinerary</div>
          <div style={bubbleBodyStyle}>
            <ReactMarkdown>{result}</ReactMarkdown>
            {/* Typing cursor shown while loading */}
            {loading && <span style={cursorStyle}>▋</span>}
          </div>
        </div>
      )}

      {/* Cursor shown before any result appears */}
      {loading && result === "" && (
        <div style={{ ...bubbleStyle }}>
          <div style={bubbleHeaderStyle}>🗺️ Your Itinerary</div>
          <div style={bubbleBodyStyle}>
            <span style={cursorStyle}>▋</span>
          </div>
        </div>
      )}

    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────── */

const titleStyle: React.CSSProperties = {
  fontSize: 42,
  fontWeight: 800,
  color: "#ffffff",
  textAlign: "center",
  marginBottom: 8,
  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
};

const subtitleStyle: React.CSSProperties = {
  textAlign: "center",
  color: "rgba(255,255,255,0.65)",
  fontSize: 16,
  marginBottom: 32,
};

const cardStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 20,
  padding: "36px 40px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
  marginBottom: 28,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "rgba(255,255,255,0.85)",
  fontSize: 14,
  fontWeight: 600,
  marginBottom: 8,
  letterSpacing: 0.3,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "12px 16px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.1)",
  color: "#ffffff",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const sliderStyle: React.CSSProperties = {
  width: "100%",
  accentColor: "#38bdf8",
  cursor: "pointer",
};

const buttonStyle: React.CSSProperties = {
  padding: "14px 20px",
  fontSize: 17,
  fontWeight: 700,
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(135deg, #38bdf8, #818cf8)",
  color: "white",
  cursor: "pointer",
  marginTop: 4,
  letterSpacing: 0.5,
  boxShadow: "0 4px 20px rgba(56,189,248,0.4)",
  transition: "opacity 0.2s",
};

const buttonLoadingStyle: React.CSSProperties = {
  ...buttonStyle,
  opacity: 0.6,
  cursor: "not-allowed",
};

const errorStyle: React.CSSProperties = {
  background: "rgba(255,80,80,0.15)",
  border: "1px solid rgba(255,80,80,0.3)",
  borderRadius: 12,
  padding: "14px 20px",
  color: "#ff8080",
  marginBottom: 20,
};

const bubbleStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 20,
  padding: "28px 32px",
  boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
  marginTop: 8,
};

const bubbleHeaderStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 700,
  color: "#38bdf8",
  marginBottom: 16,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  paddingBottom: 12,
};

const bubbleBodyStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.88)",
  fontSize: 15,
  lineHeight: 1.9,
  textAlign: "left",
};

const cursorStyle: React.CSSProperties = {
  display: "inline-block",
  color: "#38bdf8",
  fontWeight: 900,
  animation: "blink 1s step-start infinite",
  marginLeft: 2,
};
