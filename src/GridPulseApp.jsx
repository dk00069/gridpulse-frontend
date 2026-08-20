import React, { useState, useMemo, useEffect } from "react";
import { PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import {
  Zap, MapPin, Battery, Clock, Leaf, IndianRupee, Route, Star,
  Settings, Sun, CloudSun, Plug, Trash2, Plus, X, ChevronRight,
  Gauge, Utensils, Moon, SunMedium, LogOut, Mail, Lock, User, UserPlus
} from "lucide-react";

const FONT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
`;

// Point this at your running GridPulse backend (see the /gridpulse-backend README).
// The app falls back to built-in demo data whenever this can't be reached, so it
// still works standalone if the API isn't running.
const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "http://localhost:5000/api";
const USER_LAT = 15.505;
const USER_LNG = 80.05;

async function apiCall(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

const api = {
  register: (body) => apiCall("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => apiCall("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  getStations: () => apiCall(`/stations?lat=${USER_LAT}&lng=${USER_LNG}`),
  createStation: (token, body) =>
    apiCall("/stations", { method: "POST", headers: authHeader(token), body: JSON.stringify(body) }),
  updateStation: (token, id, body) =>
    apiCall(`/stations/${id}`, { method: "PUT", headers: authHeader(token), body: JSON.stringify(body) }),
  deleteStation: (token, id) =>
    apiCall(`/stations/${id}`, { method: "DELETE", headers: authHeader(token) }),
  toggleFavorite: (token, id) =>
    apiCall(`/stations/${id}/favorite`, { method: "POST", headers: authHeader(token) }),
  createBooking: (token, stationId) =>
    apiCall("/bookings", { method: "POST", headers: authHeader(token), body: JSON.stringify({ stationId }) }),
};

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Maps a Mongo station doc (real lat/lng, _id) onto the shape the UI already
// renders (id, x/y schematic position, camelCase fields).
function normalizeStations(docs) {
  if (!docs.length) return [];
  const lats = docs.map((d) => d.latitude);
  const lngs = docs.map((d) => d.longitude);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const spanLat = maxLat - minLat || 1;
  const spanLng = maxLng - minLng || 1;

  return docs.map((d) => ({
    id: d._id,
    name: d.stationName,
    x: 15 + ((d.longitude - minLng) / spanLng) * 70,
    y: 15 + ((maxLat - d.latitude) / spanLat) * 70,
    distanceKm: d.distanceKm ?? 0,
    totalPorts: d.totalPorts,
    availablePorts: d.availablePorts,
    waitingTimeMin: d.waitingTime,
    pricePerKWh: d.pricePerKWh,
    renewablePct: d.renewablePercentage,
    chargerType: d.chargerType,
    restaurants: d.restaurants || [],
  }));
}

const RENEWABLE_TREND = [
  { t: "6a", v: 22 }, { t: "8a", v: 31 }, { t: "10a", v: 48 }, { t: "12p", v: 63 },
  { t: "2p", v: 71 }, { t: "4p", v: 68 }, { t: "6p", v: 52 }, { t: "8p", v: 34 },
  { t: "10p", v: 26 }, { t: "12a", v: 21 }, { t: "2a", v: 19 }, { t: "4a", v: 20 },
];

const INITIAL_STATIONS = [
  { id: "S1", name: "Kurnool Rd Solar Hub", x: 62, y: 30, distanceKm: 2.1, totalPorts: 6, availablePorts: 4, waitingTimeMin: 5, pricePerKWh: 11.5, renewablePct: 82, chargerType: "Fast (DC)", restaurants: ["Sri Annapurna Mess", "Cafe Coffee Day"] },
  { id: "S2", name: "Ongole Bypass Grid Point", x: 38, y: 58, distanceKm: 3.4, totalPorts: 4, availablePorts: 0, waitingTimeMin: 35, pricePerKWh: 9.2, renewablePct: 28, chargerType: "Fast (DC)", restaurants: ["Highway King Dhaba"] },
  { id: "S3", name: "Prakasam Wind Node", x: 78, y: 62, distanceKm: 5.6, totalPorts: 8, availablePorts: 5, waitingTimeMin: 8, pricePerKWh: 10.0, renewablePct: 91, chargerType: "Fast (DC)", restaurants: ["Green Leaf Restaurant", "Tea Junction"] },
  { id: "S4", name: "Market St Slow Charge", x: 22, y: 22, distanceKm: 1.4, totalPorts: 10, availablePorts: 6, waitingTimeMin: 3, pricePerKWh: 7.8, renewablePct: 45, chargerType: "Slow (AC)", restaurants: ["Udupi Grand"] },
  { id: "S5", name: "Ring Rd Hybrid Station", x: 55, y: 78, distanceKm: 6.9, totalPorts: 6, availablePorts: 1, waitingTimeMin: 22, pricePerKWh: 10.7, renewablePct: 64, chargerType: "Fast (DC)", restaurants: ["Spice Route", "Bakers Corner"] },
  { id: "S6", name: "Old Town Grid Charge", x: 15, y: 68, distanceKm: 4.8, totalPorts: 4, availablePorts: 2, waitingTimeMin: 14, pricePerKWh: 8.9, renewablePct: 36, chargerType: "Slow (AC)", restaurants: ["Bismillah Biryani"] },
];

const VEHICLES = [
  { id: "v1", name: "Tata Nexon EV", capacityKWh: 40.5 },
  { id: "v2", name: "MG Comet EV", capacityKWh: 17.3 },
  { id: "v3", name: "Ola S1 Pro (scooter)", capacityKWh: 4.0 },
  { id: "v4", name: "Ather 450X (scooter)", capacityKWh: 3.7 },
];

function clamp01(n) { return Math.max(0, Math.min(1, n)); }

function useMatchScore(stations) {
  return useMemo(() => {
    const maxD = Math.max(...stations.map(s => s.distanceKm));
    const maxW = Math.max(...stations.map(s => s.waitingTimeMin));
    const maxC = Math.max(...stations.map(s => s.pricePerKWh));
    return stations.map(s => {
      const normD = clamp01(s.distanceKm / maxD);
      const normW = clamp01(s.waitingTimeMin / maxW);
      const normC = clamp01(s.pricePerKWh / maxC);
      const normR = clamp01(s.renewablePct / 100);
      const penalty = 0.40 * normD + 0.25 * normW + 0.20 * normC + 0.15 * (1 - normR);
      const matchScore = Math.round((1 - penalty) * 100);
      return { ...s, matchScore, breakdown: { distance: normD, waiting: normW, cost: normC, renewable: normR } };
    }).sort((a, b) => b.matchScore - a.matchScore);
  }, [stations]);
}

function renewColor(pct) {
  if (pct >= 65) return "#2DD4A7";
  if (pct >= 40) return "#F5A623";
  return "#FF6B6B";
}

function Chip({ children, tone = "default" }) {
  const tones = {
    default: { bg: "#16223A", fg: "#9FB0D0", bd: "#243456" },
    good: { bg: "#0E2A24", fg: "#2DD4A7", bd: "#1C4A3E" },
    warn: { bg: "#2B2210", fg: "#F5A623", bd: "#4A3A18" },
    bad: { bg: "#2E1616", fg: "#FF6B6B", bd: "#4A2222" },
  };
  const t = tones[tone];
  return (
    <span style={{
      background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500,
      padding: "3px 8px", borderRadius: 5, letterSpacing: 0.3, whiteSpace: "nowrap"
    }}>{children}</span>
  );
}

function CircuitMap({ stations, selectedId, onSelect }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", height: 320, display: "block" }}>
      <defs>
        <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="#16223A" strokeWidth="0.3" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#grid)" />
      {stations.map(s => (
        <line key={"l" + s.id} x1="50" y1="50" x2={s.x} y2={s.y}
          stroke={s.id === selectedId ? "#4FC3F7" : "#243456"}
          strokeWidth={s.id === selectedId ? 0.6 : 0.4} strokeDasharray="1.5,1.2" />
      ))}
      <circle cx="50" cy="50" r="3.4" fill="#0A0F1A" stroke="#4FC3F7" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="1.3" fill="#4FC3F7" />
      <text x="50" y="57" textAnchor="middle" fill="#7C8AAE" fontSize="3.4" fontFamily="'JetBrains Mono', monospace">YOU</text>
      {stations.map(s => {
        const col = renewColor(s.renewablePct);
        const isSel = s.id === selectedId;
        const busy = s.availablePorts === 0;
        return (
          <g key={s.id} onClick={() => onSelect(s.id)} style={{ cursor: "pointer" }}>
            <circle cx={s.x} cy={s.y} r={isSel ? 4.6 : 3.6} fill="none" stroke={col} strokeWidth="0.4" opacity="0.5">
              {!busy && <animate attributeName="r" values={`${isSel ? 4.6 : 3.6};${isSel ? 7.5 : 6.2};${isSel ? 4.6 : 3.6}`} dur="2.4s" repeatCount="indefinite" />}
              {!busy && <animate attributeName="opacity" values="0.5;0;0.5" dur="2.4s" repeatCount="indefinite" />}
            </circle>
            <circle cx={s.x} cy={s.y} r={isSel ? 2.6 : 2.1} fill={busy ? "#1A1F2E" : "#0A0F1A"} stroke={col} strokeWidth={isSel ? 0.9 : 0.6} />
            <circle cx={s.x} cy={s.y} r="0.7" fill={col} />
            <text x={s.x} y={s.y - (isSel ? 6.5 : 5)} textAnchor="middle" fill={isSel ? "#EAF0FB" : "#7C8AAE"}
              fontSize={isSel ? 3.0 : 2.6} fontFamily="'Space Grotesk', sans-serif" fontWeight="600">
              {s.name.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ScoreBar({ label, value, invert }) {
  const pct = Math.round((invert ? (1 - value) : value) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#7C8AAE", width: 64 }}>{label}</span>
      <div style={{ flex: 1, height: 5, background: "#16223A", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#4FC3F7", borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: "#EAF0FB", width: 28, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function StationCard({ s, rank, selected, favorite, onSelect, onFav }) {
  const busy = s.availablePorts === 0;
  return (
    <div onClick={() => onSelect(s.id)} style={{
      background: selected ? "#16223A" : "#111A2B",
      border: `1px solid ${selected ? "#4FC3F7" : "#1E2C47"}`,
      borderRadius: 10, padding: "12px 14px", cursor: "pointer", marginBottom: 8,
      transition: "border-color 120ms"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: rank === 1 ? "#2DD4A7" : "#7C8AAE",
            border: `1px solid ${rank === 1 ? "#2DD4A7" : "#243456"}`, borderRadius: 4, padding: "1px 5px"
          }}>#{rank}</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14.5, color: "#EAF0FB" }}>{s.name}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onFav(s.id); }} style={{
          background: "none", border: "none", cursor: "pointer", padding: 2, color: favorite ? "#F5A623" : "#3C4A6B"
        }} aria-label="favorite">
          <Star size={16} fill={favorite ? "#F5A623" : "none"} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        <Chip tone={busy ? "bad" : "good"}>{busy ? "Full" : `${s.availablePorts}/${s.totalPorts} ports`}</Chip>
        <Chip tone={s.waitingTimeMin > 20 ? "bad" : s.waitingTimeMin > 10 ? "warn" : "good"}>{s.waitingTimeMin} min wait</Chip>
        <Chip tone={s.renewablePct >= 65 ? "good" : s.renewablePct >= 40 ? "warn" : "bad"}>{s.renewablePct}% renewable</Chip>
        <Chip>₹{s.pricePerKWh}/kWh</Chip>
        <Chip>{s.distanceKm} km</Chip>
      </div>
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: "#16223A", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${s.matchScore}%`, height: "100%", background: renewColor(s.renewablePct), borderRadius: 4 }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: "#EAF0FB" }}>{s.matchScore} match</span>
      </div>
    </div>
  );
}

function AdminPanel({ stations, setStations, token }) {
  const update = async (id, field, value) => {
    setStations(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (!token) return;
    const fieldMap = { renewablePct: "renewablePercentage", waitingTimeMin: "waitingTime", name: "stationName" };
    try {
      await api.updateStation(token, id, { [fieldMap[field] || field]: value });
    } catch (err) { /* local state already updated; surface nothing disruptive for a single-field edit */ }
  };
  const remove = async (id) => {
    setStations(prev => prev.filter(s => s.id !== id));
    if (token) {
      try { await api.deleteStation(token, id); } catch (err) { /* already removed locally */ }
    }
  };
  const add = async () => {
    const draft = {
      stationName: "New Station", latitude: USER_LAT + (Math.random() - 0.5) * 0.05, longitude: USER_LNG + (Math.random() - 0.5) * 0.05,
      totalPorts: 4, availablePorts: 4, waitingTime: 5, pricePerKWh: 10, renewablePercentage: 50,
      chargerType: "Fast (DC)", restaurants: [],
    };
    if (token) {
      try {
        const { station } = await api.createStation(token, draft);
        setStations(prev => [...prev, {
          id: station._id, name: station.stationName, x: 50, y: 50, distanceKm: 0,
          totalPorts: station.totalPorts, availablePorts: station.availablePorts, waitingTimeMin: station.waitingTime,
          pricePerKWh: station.pricePerKWh, renewablePct: station.renewablePercentage, chargerType: station.chargerType, restaurants: [],
        }]);
        return;
      } catch (err) { /* fall through to local-only add */ }
    }
    const nid = "S" + (stations.length + 1) + Math.floor(Math.random() * 100);
    setStations(prev => [...prev, {
      id: nid, name: "New Station", x: 50 + Math.random() * 20 - 10, y: 50 + Math.random() * 20 - 10,
      distanceKm: 3.0, totalPorts: 4, availablePorts: 4, waitingTimeMin: 5, pricePerKWh: 10, renewablePct: 50,
      chargerType: "Fast (DC)", restaurants: []
    }]);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: "#EAF0FB" }}>Station registry</span>
          {!token && <div style={{ fontSize: 11, color: "#F5A623", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>Demo mode — changes are local only until you log in against the live backend as an admin.</div>}
        </div>
        <button onClick={add} style={{
          display: "flex", alignItems: "center", gap: 6, background: "#0E2A24", color: "#2DD4A7",
          border: "1px solid #1C4A3E", borderRadius: 7, padding: "6px 12px", fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, cursor: "pointer"
        }}><Plus size={14} /> Add station</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "#7C8AAE", textAlign: "left", borderBottom: "1px solid #1E2C47" }}>
              <th style={{ padding: "6px 8px" }}>Name</th>
              <th style={{ padding: "6px 8px" }}>Ports (avail/total)</th>
              <th style={{ padding: "6px 8px" }}>₹/kWh</th>
              <th style={{ padding: "6px 8px" }}>Renewable %</th>
              <th style={{ padding: "6px 8px" }}>Wait (min)</th>
              <th style={{ padding: "6px 8px" }}></th>
            </tr>
          </thead>
          <tbody>
            {stations.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid #16223A" }}>
                <td style={{ padding: "6px 8px" }}>
                  <input value={s.name} onChange={e => update(s.id, "name", e.target.value)}
                    style={inputStyle} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input type="number" value={s.availablePorts} onChange={e => update(s.id, "availablePorts", Math.max(0, Math.min(s.totalPorts, +e.target.value)))}
                    style={{ ...inputStyle, width: 44 }} /> / <input type="number" value={s.totalPorts} onChange={e => update(s.id, "totalPorts", +e.target.value)}
                    style={{ ...inputStyle, width: 44 }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input type="number" value={s.pricePerKWh} onChange={e => update(s.id, "pricePerKWh", +e.target.value)} style={{ ...inputStyle, width: 56 }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input type="number" value={s.renewablePct} onChange={e => update(s.id, "renewablePct", Math.max(0, Math.min(100, +e.target.value)))} style={{ ...inputStyle, width: 52 }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input type="number" value={s.waitingTimeMin} onChange={e => update(s.id, "waitingTimeMin", +e.target.value)} style={{ ...inputStyle, width: 52 }} />
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <button onClick={() => remove(s.id)} style={{ background: "none", border: "none", color: "#FF6B6B", cursor: "pointer" }} aria-label="delete">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "#0A0F1A", border: "1px solid #243456", borderRadius: 5, color: "#EAF0FB",
  padding: "4px 6px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, width: 130
};

function LoginPanel({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [vehicle, setVehicle] = useState(VEHICLES[0].id);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoNotice, setDemoNotice] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      setError("Fill in every field to continue.");
      return;
    }
    if (password.length < 4) {
      setError("Password needs at least 4 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const payload =
        mode === "register"
          ? await api.register({ name: name.trim(), email: email.trim(), password, vehicle })
          : await api.login({ email: email.trim(), password });
      onAuth({ ...payload.user, vehicle: payload.user.vehicle || vehicle, token: payload.token });
    } catch (err) {
      if (err.message === "Failed to fetch") {
        // Backend not running — fall back to a local demo session.
        setDemoNotice(true);
        onAuth({ name: mode === "register" ? name.trim() : email.split("@")[0], email: email.trim(), vehicle, token: null });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0F1A", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "'Inter', sans-serif", padding: 20
    }}>
      <style>{FONT_CSS}</style>
      <div style={{ width: 380, background: "#111A2B", border: "1px solid #1E2C47", borderRadius: 14, padding: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0E2A24", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #1C4A3E" }}>
            <Zap size={18} color="#2DD4A7" />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 18, color: "#EAF0FB" }}>GRIDPULSE</div>
            <div style={{ fontSize: 11, color: "#7C8AAE", fontFamily: "'JetBrains Mono', monospace" }}>sign in to find your charge</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "#0A0F1A", border: "1px solid #1E2C47", borderRadius: 8, padding: 4 }}>
          {["login", "register"].map(m => (
            <button key={m} type="button" onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "7px 0", borderRadius: 6, border: "none", cursor: "pointer",
              background: mode === m ? "#16223A" : "transparent",
              color: mode === m ? "#EAF0FB" : "#7C8AAE",
              fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500
            }}>{m === "login" ? "Log in" : "Register"}</button>
          ))}
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <Field icon={<User size={14} />} label="Full name">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Asha Rao" style={authInput} />
            </Field>
          )}
          <Field icon={<Mail size={14} />} label="Email">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="asha@example.com" style={authInput} />
          </Field>
          <Field icon={<Lock size={14} />} label="Password">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={authInput} />
          </Field>
          {mode === "register" && (
            <Field icon={<Zap size={14} />} label="Vehicle model">
              <select value={vehicle} onChange={e => setVehicle(e.target.value)} style={authInput}>
                {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
          )}

          {error && <div style={{ color: "#FF6B6B", fontSize: 12, marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>}

          <button type="submit" disabled={loading} style={{
            width: "100%", background: "#0E2A24", color: "#2DD4A7", border: "1px solid #1C4A3E",
            borderRadius: 8, padding: "10px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 13,
            fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}>
            <UserPlus size={15} /> {loading ? "Connecting..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div style={{ fontSize: 10.5, color: "#4A5A80", fontFamily: "'JetBrains Mono', monospace", marginTop: 14, textAlign: "center" }}>
          {demoNotice
            ? "Backend unreachable — continuing in local demo mode."
            : `Talks to ${API_BASE_URL}`}
        </div>
      </div>
    </div>
  );
}

function Field({ icon, label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 11, color: "#7C8AAE", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        {icon}{label}
      </label>
      {children}
    </div>
  );
}

const authInput = {
  width: "100%", background: "#0A0F1A", border: "1px solid #243456", borderRadius: 7,
  color: "#EAF0FB", padding: "9px 10px", fontFamily: "'Inter', sans-serif", fontSize: 13
};

export default function GridPulseApp() {
  const [rawStations, setRawStations] = useState(INITIAL_STATIONS);
  const ranked = useMatchScore(rawStations);
  const [selectedId, setSelectedId] = useState(ranked[0]?.id);
  const [battery, setBattery] = useState(28);
  const [vehicle, setVehicle] = useState(VEHICLES[0].id);
  const [favorites, setFavorites] = useState(new Set());
  const [view, setView] = useState("locator");
  const [favOnly, setFavOnly] = useState(false);
  const [dark, setDark] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [bookingStatus, setBookingStatus] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.getStations()
      .then(({ stations }) => {
        if (cancelled || !stations?.length) return;
        setRawStations(normalizeStations(stations));
        setApiOnline(true);
      })
      .catch(() => setApiOnline(false));
    return () => { cancelled = true; };
  }, [currentUser]);

  const selected = ranked.find(s => s.id === selectedId) || ranked[0];
  const vehicleObj = VEHICLES.find(v => v.id === vehicle);
  const kWhNeeded = useMemo(() => Math.max(0, (0.85 - battery / 100) * vehicleObj.capacityKWh), [battery, vehicleObj]);
  const cost = selected ? (kWhNeeded * selected.pricePerKWh) : 0;
  const etaMin = selected ? Math.round(selected.distanceKm * 2.6 + 4) : 0;
  const batteryOnArrival = selected ? Math.max(2, Math.round(battery - selected.distanceKm * 1.1)) : battery;

  const list = (favOnly ? ranked.filter(s => favorites.has(s.id)) : ranked);

  if (!currentUser) {
    return <LoginPanel onAuth={(u) => { setCurrentUser(u); setToken(u.token || null); if (u.vehicle) setVehicle(u.vehicle); }} />;
  }

  const theme = dark
    ? { bg: "#0A0F1A", panel: "#111A2B", border: "#1E2C47", ink: "#EAF0FB", muted: "#7C8AAE" }
    : { bg: "#F4F6FB", panel: "#FFFFFF", border: "#DCE3F2", ink: "#101828", muted: "#5B6478" };

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif", background: theme.bg, color: theme.ink,
      minHeight: "100vh", padding: "20px 24px 48px", transition: "background 150ms"
    }}>
      <style>{FONT_CSS}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "#0E2A24", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #1C4A3E" }}>
            <Zap size={18} color="#2DD4A7" />
          </div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: 0.3, color: theme.ink }}>GRIDPULSE</div>
            <div style={{ fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>renewable-aware EV charge routing</div>
          </div>
          <span style={{
            marginLeft: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, padding: "3px 8px", borderRadius: 5,
            background: apiOnline ? "#0E2A24" : "#2B2210", color: apiOnline ? "#2DD4A7" : "#F5A623",
            border: `1px solid ${apiOnline ? "#1C4A3E" : "#4A3A18"}`
          }}>{apiOnline ? "● live backend" : "○ demo data"}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px" }}>
            <span style={{ fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>GRID RENEWABLE %</span>
            <div style={{ width: 100, height: 28 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={RENEWABLE_TREND}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2DD4A7" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#2DD4A7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#2DD4A7" strokeWidth={1.5} fill="url(#rg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "#2DD4A7" }}>63%</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: theme.muted }}>
            <CloudSun size={15} color="#F5A623" /> Ongole · 31°C
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: theme.ink }}>
            <User size={14} color="#4FC3F7" />
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{currentUser.name}</span>
          </div>
          <button onClick={() => setCurrentUser(null)} style={{
            background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "7px 9px", cursor: "pointer", color: theme.ink
          }} aria-label="log out">
            <LogOut size={15} />
          </button>

          <button onClick={() => setDark(d => !d)} style={{
            background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "7px 9px", cursor: "pointer", color: theme.ink
          }} aria-label="toggle theme">
            {dark ? <SunMedium size={15} /> : <Moon size={15} />}
          </button>

          <button onClick={() => setView(v => v === "locator" ? "admin" : "locator")} style={{
            display: "flex", alignItems: "center", gap: 6, background: view === "admin" ? "#16223A" : theme.panel,
            border: `1px solid ${theme.border}`, borderRadius: 8, padding: "7px 12px", cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: theme.ink
          }}><Settings size={14} /> {view === "locator" ? "Admin" : "Back to locator"}</button>
        </div>
      </div>

      {view === "admin" ? (
        <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 18 }}>
          <AdminPanel stations={rawStations} setStations={setRawStations} token={token} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "230px 1fr 340px", gap: 16 }}>
          {/* Left: inputs */}
          <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, height: "fit-content" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <MapPin size={14} color="#4FC3F7" />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13 }}>Trip setup</span>
            </div>

            <label style={{ fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>VEHICLE</label>
            <select value={vehicle} onChange={e => setVehicle(e.target.value)} style={{
              width: "100%", marginTop: 4, marginBottom: 14, background: theme.bg, color: theme.ink,
              border: `1px solid ${theme.border}`, borderRadius: 7, padding: "8px 8px", fontSize: 12.5
            }}>
              {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>

            <label style={{ fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>BATTERY: {battery}%</label>
            <input type="range" min="2" max="95" step="1" value={battery} onChange={e => setBattery(+e.target.value)}
              style={{ width: "100%", marginTop: 6, marginBottom: 14, accentColor: "#2DD4A7" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.muted, marginBottom: 14 }}>
              <Battery size={14} color={battery < 20 ? "#FF6B6B" : "#2DD4A7"} />
              {battery < 20 ? "Low battery — charging recommended" : "Battery healthy"}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.ink, cursor: "pointer", marginTop: 4 }}>
              <input type="checkbox" checked={favOnly} onChange={e => setFavOnly(e.target.checked)} />
              Favorites only
            </label>

            <div style={{ marginTop: 18, borderTop: `1px solid ${theme.border}`, paddingTop: 14 }}>
              <span style={{ fontSize: 11, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>MATCH SCORE WEIGHTS</span>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                {[["Distance", 40], ["Waiting time", 25], ["Cost", 20], ["Renewable %", 15]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: theme.muted, fontFamily: "'JetBrains Mono', monospace" }}>
                    <span>{k}</span><span style={{ color: theme.ink }}>{v}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center: map + list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 12 }}>
              <CircuitMap stations={ranked} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
            <div>
              {list.length === 0 ? (
                <div style={{ color: theme.muted, fontSize: 13, textAlign: "center", padding: 30 }}>No favorites yet — star a station to pin it here.</div>
              ) : list.map((s, i) => (
                <StationCard key={s.id} s={s} rank={i + 1} selected={s.id === selectedId}
                  favorite={favorites.has(s.id)}
                  onSelect={setSelectedId}
                  onFav={(id) => {
                    setFavorites(prev => {
                      const next = new Set(prev);
                      next.has(id) ? next.delete(id) : next.add(id);
                      return next;
                    });
                    if (token) api.toggleFavorite(token, id).catch(() => {});
                  }} />
              ))}
            </div>
          </div>

          {/* Right: station detail */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {selected && (
              <>
                <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{selected.name}</div>
                  <div style={{ fontSize: 11.5, color: theme.muted, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>{selected.chargerType} · {selected.distanceKm} km away</div>

                  <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 12 }}>
                    <div style={{ width: 72, height: 72 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ n: "Renewable", v: selected.renewablePct }, { n: "Grid", v: 100 - selected.renewablePct }]}
                            dataKey="v" innerRadius={22} outerRadius={34} startAngle={90} endAngle={-270} stroke="none">
                            <Cell fill="#2DD4A7" />
                            <Cell fill="#243456" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginBottom: 4 }}>
                        <Leaf size={13} color="#2DD4A7" /> Solar/wind: <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selected.renewablePct}%</b>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: theme.muted }}>
                        <Gauge size={13} /> Grid power: <b style={{ fontFamily: "'JetBrains Mono', monospace" }}>{100 - selected.renewablePct}%</b>
                      </div>
                    </div>
                  </div>

                  <ScoreBar label="Distance" value={selected.breakdown.distance} invert />
                  <ScoreBar label="Wait time" value={selected.breakdown.waiting} invert />
                  <ScoreBar label="Cost" value={selected.breakdown.cost} invert />
                  <ScoreBar label="Renewable" value={selected.breakdown.renewable} />
                </div>

                <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Route size={14} color="#4FC3F7" />
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13 }}>Route & cost</span>
                  </div>
                  <Row label="ETA" value={`${etaMin} min`} theme={theme} />
                  <Row label="Battery on arrival" value={`${batteryOnArrival}%`} theme={theme} />
                  <Row label="Energy needed" value={`${kWhNeeded.toFixed(1)} kWh`} theme={theme} />
                  <Row label="Est. charging cost" value={`₹${cost.toFixed(0)}`} theme={theme} icon={<IndianRupee size={12} />} />
                  <button
                    disabled={selected.availablePorts === 0}
                    onClick={async () => {
                      setBookingStatus("Booking...");
                      if (token) {
                        try {
                          await api.createBooking(token, selected.id);
                          setRawStations(prev => prev.map(s => s.id === selected.id ? { ...s, availablePorts: s.availablePorts - 1 } : s));
                          setBookingStatus("Slot booked and confirmed.");
                          return;
                        } catch (err) {
                          setBookingStatus(err.message);
                          return;
                        }
                      }
                      setRawStations(prev => prev.map(s => s.id === selected.id ? { ...s, availablePorts: Math.max(0, s.availablePorts - 1) } : s));
                      setBookingStatus("Slot booked locally (demo mode).");
                    }}
                    style={{
                      width: "100%", marginTop: 12, background: selected.availablePorts === 0 ? "#16223A" : "#0E2A24",
                      color: selected.availablePorts === 0 ? "#5B6478" : "#2DD4A7",
                      border: `1px solid ${selected.availablePorts === 0 ? "#243456" : "#1C4A3E"}`,
                      borderRadius: 8, padding: "9px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: 12.5,
                      fontWeight: 600, cursor: selected.availablePorts === 0 ? "not-allowed" : "pointer"
                    }}>
                    <Plug size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                    {selected.availablePorts === 0 ? "No ports available" : "Book this slot"}
                  </button>
                  {bookingStatus && <div style={{ fontSize: 11, color: theme.muted, marginTop: 8, fontFamily: "'JetBrains Mono', monospace" }}>{bookingStatus}</div>}
                </div>

                {selected.restaurants?.length > 0 && (
                  <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                      <Utensils size={14} color="#F5A623" />
                      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13 }}>Nearby while you wait</span>
                    </div>
                    {selected.restaurants.map(r => (
                      <div key={r} style={{ fontSize: 12.5, color: theme.ink, padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                        <ChevronRight size={12} color={theme.muted} /> {r}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, theme, icon }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${theme.border}` }}>
      <span style={{ fontSize: 12.5, color: theme.muted, display: "flex", alignItems: "center", gap: 5 }}>{icon}{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: theme.ink }}>{value}</span>
    </div>
  );
}
