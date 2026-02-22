import { useState } from "react";
import ReactMarkdown from "react-markdown";

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
      const res = await fetch("http://localhost:4000/api/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      // ✅ Read the stream chunk by chunk
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the raw chunk into text
        const chunk = decoder.decode(value, { stream: true });

        // Each SSE message looks like: "data: {...}\n\n"
        // Split by newlines to handle multiple messages in one chunk
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const raw = line.replace("data: ", "").trim();

          if (raw === "[DONE]") {
            setLoading(false);
            break;
          }

          try {
            const parsed = JSON.parse(raw);
            if (parsed.token) {
              // ✅ Append each token to result as it arrives
              setResult((prev) => prev + parsed.token);
            }
          } catch {
            // Ignore malformed chunks
          }
        }
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif", padding: "0 16px" }}>
      <h1>🌍 AI Travel Planner</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <label>
          Destination
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Tokyo, Japan"
            required
            style={inputStyle}
          />
        </label>

        <label>
          Number of Days
          <input
            type="number"
            value={days}
            min={1}
            max={30}
            onChange={(e) => setDays(Number(e.target.value))}
            required
            style={inputStyle}
          />
        </label>

        <label>
          Travel Vibe
          <select
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            style={inputStyle}
          >
            <option value="adventure">🧗 Adventure</option>
            <option value="relaxation">🧘 Relaxation</option>
            <option value="culture">🏛️ Culture</option>
            <option value="food">🍜 Food & Drink</option>
            <option value="budget">💸 Budget</option>
            <option value="luxury">✨ Luxury</option>
          </select>
        </label>

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "✈️ Planning your trip..." : "Plan My Trip ✈️"}
        </button>

      </form>

      {error !== "" && (
        <p style={{ color: "red", marginTop: 16 }}>❌ {error}</p>
      )}

      {/* ✅ Show itinerary as it streams in */}
      {result !== "" && (
        <div style={itineraryStyle}>
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}

    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "8px 12px",
  marginTop: 4,
  borderRadius: 6,
  border: "1px solid #ccc",
  fontSize: 16,
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 20px",
  fontSize: 16,
  borderRadius: 6,
  border: "none",
  background: "#0070f3",
  color: "white",
  cursor: "pointer",
};

const itineraryStyle: React.CSSProperties = {
  marginTop: 32,
  padding: "24px 28px",
  background: "#f9f9f9",
  border: "1px solid #e0e0e0",
  borderRadius: 12,
  lineHeight: 1.8,
  fontSize: 15,
  textAlign: "left",
  color: "#111",
};
