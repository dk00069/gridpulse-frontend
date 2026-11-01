import React, { useEffect, useState } from "react";
import { Zap, Clock, Leaf, EyeOff } from "lucide-react";

// The one animated moment: the same five stations, before and after balancing.
function HeroStrip() {
  const [balanced, setBalanced] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setBalanced((b) => !b), 3200);
    return () => clearInterval(t);
  }, []);
  const names = ["Bypass", "Solar Hub", "Wind Node", "Ring Rd", "Old Town"];
  const vals = balanced ? [82, 78, 74, 70, 66] : [150, 105, 45, 30, 20];
  const MAX = 160;
  const color = (v) => (v > 100 ? "var(--bad)" : v > 80 ? "var(--warn)" : "var(--good)");
  return (
    <div className="card pad" role="img" aria-label="Station load before and after balancing">
      <div className="display" style={{ fontSize: 18, color: balanced ? "var(--good)" : "var(--bad)", minHeight: 24 }}>
        {balanced ? "With GridPulse: load is spread, nothing is over capacity" : "Without it: everyone drives to the nearest station"}
      </div>
      <div style={{ position: "relative", height: 190, marginTop: 16, display: "flex", alignItems: "flex-end", gap: 14 }}>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: `${(100 / MAX) * 100}%`, borderTop: "1px dashed var(--muted)" }}>
          <span className="muted" style={{ position: "absolute", right: 0, top: -17, fontSize: 11 }}>capacity</span>
        </div>
        {vals.map((v, i) => (
          <div key={names[i]} style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ fontSize: 12, fontWeight: 600, textAlign: "center", marginBottom: 3 }}>{v}%</div>
            <div className="gp-bar" style={{ height: `${(Math.min(v, MAX) / MAX) * 100}%`, background: color(v), borderRadius: "8px 8px 0 0" }} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
        {names.map((n) => <div key={n} className="muted" style={{ flex: 1, textAlign: "center", fontSize: 11 }}>{n}</div>)}
      </div>
    </div>
  );
}

const PROBLEMS = [
  { icon: <Clock size={20} color="var(--bad)" />, title: "Queues at the nearest charger",
    body: "Drivers all pick the closest station. At peak hours one station is full with a 35 minute wait while another a few km away sits half empty." },
  { icon: <EyeOff size={20} color="var(--warn)" />, title: "No live view of free ports",
    body: "Most apps show where chargers are, not how busy they are or what the wait will cost you in time." },
  { icon: <Leaf size={20} color="var(--good)" />, title: "Clean energy goes unused",
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
    <div className="gp-app land" data-theme="light">
      <div className="orb" style={{ width: 420, height: 420, left: -120, top: -100, background: "#F2C3A0" }} />
      <div className="orb" style={{ width: 480, height: 480, right: -140, top: 20, background: "#B7A8F0" }} />
      <div className="shell" style={{ position: "relative" }}>
        <nav className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
          <div className="row">
            <div className="logo"><Zap size={20} /></div>
            <span className="display" style={{ fontSize: 22 }}>GridPulse</span>
          </div>
          <button className="btn" onClick={onStart}>Open the demo</button>
        </nav>

        <header className="hero">
          <div>
            <span className="chip">Renewable-aware EV charging</span>
            <h1 className="display" style={{ fontSize: "clamp(36px,5.2vw,58px)", lineHeight: 1.06, margin: "18px 0" }}>
              Send every EV to the charger that has room.
            </h1>
            <p className="muted" style={{ fontSize: 17, lineHeight: 1.6, maxWidth: 480, margin: "0 0 28px" }}>
              GridPulse ranks charging stations by distance, queue, price and renewable share, then spreads drivers across the grid so no single station is overloaded.
            </p>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ padding: "13px 24px", fontSize: 15 }} onClick={onStart}>Open the demo</button>
              <a className="btn" style={{ padding: "13px 24px", fontSize: 15 }} href="#how">See how it works</a>
            </div>
          </div>
          <HeroStrip />
        </header>

        <section style={{ paddingBottom: 72 }}>
          <h2 className="display" style={{ fontSize: 30, margin: "0 0 20px" }}>The problem</h2>
          <div className="card three">
            {PROBLEMS.map((p) => (
              <div key={p.title}>
                {p.icon}
                <h3 style={{ fontSize: 17, margin: "12px 0 8px" }}>{p.title}</h3>
                <p className="muted" style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" style={{ paddingBottom: 72 }}>
          <h2 className="display" style={{ fontSize: 30, margin: "0 0 20px" }}>How GridPulse solves it</h2>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, maxWidth: 720 }}>
            {STEPS.map(([t, d], i) => (
              <li key={t} className="row" style={{ alignItems: "flex-start", gap: 18, padding: "16px 0", borderTop: "1px solid var(--border)" }}>
                <span className="display" style={{ color: "var(--accent)", fontSize: 24, width: 28 }}>{i + 1}</span>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{t}</div>
                  <div className="muted" style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>{d}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section style={{ paddingBottom: 72 }}>
          <h2 className="display" style={{ fontSize: 30, margin: "0 0 20px" }}>Built with</h2>
          <div className="row" style={{ flexWrap: "wrap", gap: 12 }}>
            {STACK.map(([n, d]) => (
              <div key={n} className="card" style={{ padding: "12px 16px", borderRadius: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{n}</div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>{d}</div>
              </div>
            ))}
          </div>
        </section>

        <footer className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", borderTop: "1px solid var(--border)", padding: "36px 0 56px" }}>
          <div className="display" style={{ fontSize: 24 }}>See it run on live station data.</div>
          <button className="btn btn-primary" style={{ padding: "13px 24px", fontSize: 15 }} onClick={onStart}>Open the demo</button>
        </footer>
      </div>
    </div>
  );
}
