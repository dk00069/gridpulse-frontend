import React, { useState, useMemo, useEffect, useRef } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from "recharts";
import { Play, RotateCcw, Users } from "lucide-react";

const MINT = "#2DD4A7", CORAL = "#FF6B6B";

// Pick up to 6 stations. Prefers demo/backend stations (predictable ports) over live OCM ones.
function pickPool(ranked) {
  const own = ranked.filter((s) => !s.real && s.totalPorts > 0);
  return (own.length >= 3 ? own : ranked.filter((s) => s.totalPorts > 0)).slice(0, 6);
}

function simulate(pool, n) {
  const base = pool.map((s) => ({
    name: s.name, total: s.totalPorts, occupied: Math.max(0, s.totalPorts - s.availablePorts),
    renew: s.renewablePct, wait: s.waitingTimeMin, dist: s.distanceKm, score: s.matchScore,
  }));
  const order = base.map((_, i) => i).sort((a, b) => base[a].dist - base[b].dist);
  const naive = base.map(() => 0), smart = base.map(() => 0), seq = [];
  for (let i = 0; i < n; i++) {
    // Without balancing: drivers pick the nearest stations (60% / 30% / 10%).
    const r = i % 10;
    const pick = r < 6 ? order[0] : r < 9 ? order[Math.min(1, order.length - 1)] : order[Math.min(2, order.length - 1)];
    naive[pick]++;
    // With GridPulse: best match score, penalised by how full the station already is.
    let best = 0, bestCost = Infinity;
    base.forEach((b, j) => {
      const cost = ((b.occupied + smart[j]) / b.total) * 0.6 + (1 - b.score / 100) * 0.4;
      if (cost < bestCost) { bestCost = cost; best = j; }
    });
    smart[best]++;
    seq.push({ n: i + 1, from: pick, to: best });
  }
  return { base, naive, smart, seq };
}

function metrics(base, assigned, n) {
  const load = base.map((b, j) => ((b.occupied + assigned[j]) / b.total) * 100);
  const over = load.filter((l) => l > 100).length;
  let wait = 0, renew = 0;
  base.forEach((b, j) => {
    const overflow = Math.max(0, b.occupied + assigned[j] - b.total) / b.total;
    wait += assigned[j] * (b.wait + overflow * 30);
    renew += assigned[j] * b.renew;
  });
  return { peak: Math.round(Math.max(...load)), over, wait: n ? Math.round(wait / n) : 0, renew: n ? Math.round(renew / n) : 0 };
}

function Kpi({ label, value, tone, theme }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${theme.border}`, fontSize: 12.5 }}>
      <span style={{ color: theme.muted }}>{label}</span>
      <b style={{ color: tone, fontFamily: "'JetBrains Mono', monospace" }}>{value}</b>
    </div>
  );
}

export default function LoadBalancer({ stations, theme }) {
  const pool = useMemo(() => pickPool(stations), [stations]);
  const [count, setCount] = useState(16);
  const [arrived, setArrived] = useState(0);
  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);

  const run = () => {
    clearInterval(timer.current);
    setArrived(0);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      setArrived(i);
      if (i >= count) clearInterval(timer.current);
    }, 130);
  };
  const reset = () => { clearInterval(timer.current); setArrived(0); };

  const sim = useMemo(() => simulate(pool, arrived), [pool, arrived]);
  const without = metrics(sim.base, sim.naive, arrived);
  const withGp = metrics(sim.base, sim.smart, arrived);
  const data = sim.base.map((b, j) => ({
    name: b.name.length > 14 ? b.name.slice(0, 13) + "…" : b.name,
    "Without balancing": Math.round(((b.occupied + sim.naive[j]) / b.total) * 100),
    "With GridPulse": Math.round(((b.occupied + sim.smart[j]) / b.total) * 100),
  }));
  const feed = sim.seq.slice(-7).reverse();
  const panel = { background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...panel, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16 }}>Peak traffic simulator</div>
          <div style={{ fontSize: 12.5, color: theme.muted, marginTop: 3 }}>
            Send a wave of EVs at the same stations twice: once the way drivers choose today, once through the GridPulse balancer.
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: theme.muted }}>
          <Users size={15} /> {count} EVs
          <input type="range" min="6" max="36" value={count} onChange={(e) => { setCount(+e.target.value); reset(); }} style={{ accentColor: MINT }} />
        </label>
        <button onClick={run} style={{ display: "flex", alignItems: "center", gap: 6, background: "#0E2A24", color: MINT, border: "1px solid #1C4A3E", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          <Play size={14} /> Simulate peak traffic
        </button>
        <button onClick={reset} aria-label="Reset simulation" style={{ background: "transparent", color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "9px 10px", cursor: "pointer" }}>
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="gp-bal">
        <div style={panel}>
          <div style={{ fontSize: 12.5, color: theme.muted, marginBottom: 8 }}>Station load (% of ports in use, {arrived} of {count} EVs arrived)</div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.border} vertical={false} />
                <XAxis dataKey="name" tick={{ fill: theme.muted, fontSize: 11 }} interval={0} />
                <YAxis tick={{ fill: theme.muted, fontSize: 11 }} domain={[0, (m) => Math.max(120, Math.ceil(m / 20) * 20)]} unit="%" />
                <Tooltip contentStyle={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={100} stroke={theme.muted} strokeDasharray="4 4" label={{ value: "capacity", fill: theme.muted, fontSize: 11, position: "insideTopRight" }} />
                <Bar dataKey="Without balancing" fill={CORAL} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="With GridPulse" fill={MINT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={panel}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: CORAL, marginBottom: 4 }}>Without balancing</div>
            <Kpi label="Peak station load" value={`${without.peak}%`} tone={without.peak > 100 ? CORAL : theme.ink} theme={theme} />
            <Kpi label="Stations over capacity" value={without.over} tone={without.over ? CORAL : theme.ink} theme={theme} />
            <Kpi label="Avg wait" value={`${without.wait} min`} tone={theme.ink} theme={theme} />
            <Kpi label="Renewable share" value={`${without.renew}%`} tone={theme.ink} theme={theme} />
          </div>
          <div style={panel}>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: MINT, marginBottom: 4 }}>With GridPulse</div>
            <Kpi label="Peak station load" value={`${withGp.peak}%`} tone={withGp.peak > 100 ? CORAL : MINT} theme={theme} />
            <Kpi label="Stations over capacity" value={withGp.over} tone={withGp.over ? CORAL : MINT} theme={theme} />
            <Kpi label="Avg wait" value={`${withGp.wait} min`} tone={MINT} theme={theme} />
            <Kpi label="Renewable share" value={`${withGp.renew}%`} tone={MINT} theme={theme} />
          </div>
        </div>
      </div>

      <div style={panel}>
        <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>Routing decisions</div>
        {feed.length === 0 && <div style={{ fontSize: 12.5, color: theme.muted }}>Press "Simulate peak traffic" to watch drivers get routed.</div>}
        {feed.map((e) => {
          const moved = e.from !== e.to;
          return (
            <div key={e.n} style={{ fontSize: 12.5, padding: "4px 0", color: theme.ink }}>
              <span style={{ color: theme.muted }}>EV #{e.n}</span>{" "}
              {moved
                ? <>would have gone to {sim.base[e.from].name}; GridPulse sent it to <b style={{ color: MINT }}>{sim.base[e.to].name}</b></>
                : <>goes to <b>{sim.base[e.to].name}</b>, already the best match</>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Summary strip for the top of the locator view.
export function StatsRow({ stations, theme }) {
  const free = stations.reduce((a, s) => a + s.availablePorts, 0);
  const total = stations.reduce((a, s) => a + s.totalPorts, 0);
  const renew = stations.length ? Math.round(stations.reduce((a, s) => a + s.renewablePct, 0) / stations.length) : 0;
  const best = stations[0];
  const items = [
    ["Stations nearby", stations.length], ["Free ports", `${free} of ${total}`],
    ["Avg renewable share", `${renew}%`], ["Best match now", best ? best.name : "-"],
  ];
  return (
    <div className="gp-stats" style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, marginBottom: 16 }}>
      {items.map(([k, v]) => (
        <div key={k} style={{ padding: "12px 18px", minWidth: 0 }}>
          <div style={{ fontSize: 11.5, color: theme.muted }}>{k}</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 19, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}
