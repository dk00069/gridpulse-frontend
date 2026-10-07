import React, { useEffect, useState } from "react";
import { Zap, Clock, Leaf, EyeOff } from "lucide-react";

const C = { bg: "#0A0F1A", panel: "#111A2B", line: "#1E2C47", ink: "#EAF0FB", muted: "#8896B8",
  mint: "#2DD4A7", amber: "#F5A623", coral: "#FF6B6B", sky: "#4FC3F7" };
const barColor = (v) => (v > 100 ? C.coral : v > 80 ? C.amber : C.mint);
const head = { fontFamily: "'Space Grotesk', sans-serif", color: C.ink, margin: 0 };

// The one animated moment on the page: the same five stations, before and after balancing.
function HeroStrip() {
  const [balanced, setBalanced] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setBalanced((b) => !b), 3200);
    return () => clearInterval(t);
  }, []);
  const names = ["Bypass", "Solar Hub", "Wind Node", "Ring Rd", "Old Town"];
  const vals = balanced ? [82, 78, 74, 70, 66] : [150, 105, 45, 30, 20];
  const MAX = 160;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 20 }}
      role="img" aria-label="Station load before and after balancing">
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: balanced ? C.mint : C.coral, minHeight: 22 }}>
        {balanced ? "With GridPulse: load is spread, nothing is over capacity" : "Without it: everyone drives to the nearest station"}
      </div>
      <div style={{ position: "relative", height: 190, marginTop: 14, display: "flex", alignItems: "flex-end", gap: 14 }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: `${(100 / MAX) * 100}%`, borderTop: `1px dashed ${C.muted}` }}>
          <span style={{ position: "absolute", right: 0, top: -17, fontSize: 11, color: C.muted }}>capacity</span>
        </div>
        {vals.map((v, i) => (
          <div key={names[i]} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ fontSize: 11.5, color: C.ink, textAlign: "center", marginBottom: 3 }}>{v}%</div>
            <div className="gp-bar" style={{ height: `${(Math.min(v, MAX) / MAX) * 100}%`, background: barColor(v), borderRadius: "5px 5px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        {names.map((n) => <div key={n} style={{ flex: 1, textAlign: "center", fontSize: 11, color: C.muted }}>{n}</div>)}
      </div>
    </div>
  );
}

const PROBLEMS = [
  { icon: <Clock size={18} color={C.coral} />, title: "Queues at the nearest charger",
    body: "Drivers all pick the closest station. At peak hours one station is full with a 35 minute wait while another a few km away sits half empty." },
  { icon: <EyeOff size={18} color={C.amber} />, title: "No live view of free ports",
    body: "Most apps show where chargers are, not how busy they are or what the wait will cost you in time." },
  { icon: <Leaf size={18} color={C.mint} />, title: "Clean energy goes unused",
    body: "Solar and wind stations are often underused while coal-heavy grid points get the traffic, so each charge is dirtier than it needs to be." },
];

const STEPS = [
  ["Collect station data", "Real stations from Open Charge Map plus admin-managed stations in MongoDB: ports, price, wait time, renewable share."],
  ["Score every station", "Match score = distance 40%, waiting time 25%, cost 20%, renewable share 15%."],
  ["Balance the load", "Each new driver is sent to the best match that still has room, so queues stay short everywhere."],
  ["Book a slot", "The driver sees ETA, battery on arrival and estimated cost, then reserves a port."],
];

const STACK = [
  ["React + Vite", "frontend on Vercel"], ["Node + Express", "REST API on Render"],
  ["MongoDB Atlas", "stations, users, bookings"], ["Leaflet + Open Charge Map", "real map and station data"],
];

export default function Landing({ onStart }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', sans-serif",
      backgroundImage: "radial-gradient(900px 420px at 85% -10%, rgba(45,212,167,.14), transparent), radial-gradient(700px 420px at -5% 15%, rgba(79,195,247,.10), transparent)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');`}</style>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px" }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "22px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0E2A24", border: "1px solid #1C4A3E", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={18} color={C.mint} />
            </div>
            <span style={{ ...head, fontWeight: 700, fontSize: 19 }}>GridPulse</span>
          </div>
          <button onClick={onStart} className="gp-lift" style={{ background: "transparent", color: C.ink, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13.5 }}>
            Open the demo
          </button>
        </nav>

        <header className="gp-hero" style={{ padding: "56px 0 72px" }}>
          <div>
            <h1 style={{ ...head, fontWeight: 700, fontSize: "clamp(34px, 5vw, 54px)", lineHeight: 1.08, letterSpacing: -0.5 }}>
              Send every EV to the charger that has room.
            </h1>
            <p style={{ color: C.muted, fontSize: 17, lineHeight: 1.6, maxWidth: 480, margin: "18px 0 28px" }}>
              GridPulse ranks charging stations by distance, queue, price and renewable share, then spreads drivers across the grid so no single station is overloaded.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={onStart} className="gp-lift" style={{ background: C.mint, color: "#06241C", border: "none", borderRadius: 9, padding: "12px 22px", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}>
                Open the demo
              </button>
              <a href="#how" style={{ color: C.ink, border: `1px solid ${C.line}`, borderRadius: 9, padding: "12px 22px", fontSize: 14.5, textDecoration: "none" }}>
                See how it works
              </a>
            </div>
          </div>
          <HeroStrip />
        </header>

        <section style={{ padding: "8px 0 72px" }}>
          <h2 style={{ ...head, fontSize: 26, marginBottom: 24 }}>The problem</h2>
          <div className="gp-three" style={{ border: `1px solid ${C.line}`, borderRadius: 14, background: C.panel }}>
            {PROBLEMS.map((p) => (
              <div key={p.title} style={{ padding: 24 }}>
                {p.icon}
                <h3 style={{ ...head, fontSize: 16.5, margin: "12px 0 8px" }}>{p.title}</h3>
                <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" style={{ padding: "0 0 72px" }}>
          <h2 style={{ ...head, fontSize: 26, marginBottom: 24 }}>How GridPulse solves it</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, maxWidth: 720 }}>
            {STEPS.map(([t, d], i) => (
              <li key={t} style={{ display: "flex", gap: 18, padding: "16px 0", borderTop: `1px solid ${C.line}` }}>
                <span style={{ ...head, color: C.mint, fontWeight: 700, fontSize: 20, width: 28 }}>{i + 1}</span>
                <div>
                  <div style={{ ...head, fontSize: 16.5, fontWeight: 600 }}>{t}</div>
                  <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ padding: "0 0 72px" }}>
          <h2 style={{ ...head, fontSize: 26, marginBottom: 24 }}>Built with</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {STACK.map(([n, d]) => (
              <div key={n} style={{ border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", background: C.panel }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{n}</div>
                <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2 }}>{d}</div>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ borderTop: `1px solid ${C.line}`, padding: "40px 0 64px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ ...head, fontSize: 20 }}>See it run on live station data.</div>
          <button onClick={onStart} className="gp-lift" style={{ background: C.mint, color: "#06241C", border: "none", borderRadius: 9, padding: "12px 22px", fontWeight: 600, fontSize: 14.5, cursor: "pointer" }}>
            Open the demo
          </button>
        </footer>
      </div>
    </div>
  );
}
