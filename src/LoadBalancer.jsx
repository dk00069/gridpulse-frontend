import React, { useState, useMemo, useEffect, useRef } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend } from "recharts";
import { Play, RotateCcw, Users } from "lucide-react";

const GOOD = "#3FB68B", BAD = "#E0705F", AXIS = "#8C82A0";

// Prefer demo/backend stations (predictable ports) over live OCM ones; max 6.
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

function Kpis({ title, tone, m }) {
  const c = `var(--${tone})`;
  return (
    <div className="card pad">
      <div style={{ fontWeight: 700, color: c, marginBottom: 6 }}>{title}</div>
      <div className="kv"><span className="muted">Peak station load</span><b style={{ color: m.peak > 100 ? "var(--bad)" : c }}>{m.peak}%</b></div>
      <div className="kv"><span className="muted">Stations over capacity</span><b style={{ color: m.over ? "var(--bad)" : c }}>{m.over}</b></div>
      <div className="kv"><span className="muted">Avg wait</span><b>{m.wait} min</b></div>
      <div className="kv"><span className="muted">Renewable share</span><b>{m.renew}%</b></div>
    </div>
  );
}

export default function LoadBalancer({ stations }) {
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

  return (
    <div className="stack">
      <div className="card pad row" style={{ gap: 18, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px" }}>
          <div className="display" style={{ fontSize: 22 }}>Peak traffic simulator</div>
          <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            Send a wave of EVs at the same stations twice: once the way drivers choose today, once through the GridPulse balancer.
          </div>
        </div>
        <label className="row muted" style={{ fontSize: 13 }}>
          <Users size={15} /> {count} EVs
          <input type="range" min="6" max="36" value={count} onChange={(e) => { setCount(+e.target.value); reset(); }} style={{ accentColor: "#5B45A0" }} />
        </label>
        <button className="btn btn-primary" onClick={run}><Play size={14} /> Simulate peak traffic</button>
        <button className="btn btn-icon" onClick={reset} aria-label="Reset simulation"><RotateCcw size={14} /></button>
      </div>

      <div className="bal">
        <div className="card pad">
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Station load, % of ports in use ({arrived} of {count} EVs arrived)</div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="rgba(130,110,170,.2)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: AXIS, fontSize: 11 }} interval={0} />
                <YAxis tick={{ fill: AXIS, fontSize: 11 }} domain={[0, (m) => Math.max(120, Math.ceil(m / 20) * 20)]} unit="%" />
                <Tooltip contentStyle={{ background: "var(--solid)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={100} stroke={AXIS} strokeDasharray="4 4" label={{ value: "capacity", fill: AXIS, fontSize: 11, position: "insideTopRight" }} />
                <Bar dataKey="Without balancing" fill={BAD} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="With GridPulse" fill={GOOD} radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="stack">
          <Kpis title="Without balancing" tone="bad" m={without} />
          <Kpis title="With GridPulse" tone="good" m={withGp} />
        </div>
      </div>

      <div className="card pad">
        <b>Routing decisions</b>
        {feed.length === 0 && <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>Press "Simulate peak traffic" to watch drivers get routed.</div>}
        {feed.map((e) => (
          <div key={e.n} style={{ fontSize: 13, padding: "5px 0" }}>
            <span className="muted">EV #{e.n}</span>{" "}
            {e.from !== e.to
              ? <>would have gone to {sim.base[e.from].name}; GridPulse sent it to <b style={{ color: "var(--good)" }}>{sim.base[e.to].name}</b></>
              : <>goes to <b>{sim.base[e.to].name}</b>, already the best match</>}
          </div>
        ))}
      </div>
    </div>
  );
}

// Summary strip for the top of the locator view.
export function StatsRow({ stations }) {
  const free = stations.reduce((a, s) => a + s.availablePorts, 0);
  const total = stations.reduce((a, s) => a + s.totalPorts, 0);
  const renew = stations.length ? Math.round(stations.reduce((a, s) => a + s.renewablePct, 0) / stations.length) : 0;
  const best = stations[0];
  const items = [
    ["Stations nearby", stations.length], ["Free ports", `${free} of ${total}`],
    ["Avg renewable share", `${renew}%`], ["Best match now", best ? best.name : "-"],
  ];
  return (
    <div className="card stats">
      {items.map(([k, v]) => (
        <div key={k}>
          <div className="muted" style={{ fontSize: 12 }}>{k}</div>
          <div className="display v">{v}</div>
        </div>
      ))}
    </div>
  );
}
