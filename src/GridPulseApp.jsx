import React, { useState, useMemo, useEffect } from "react";
import RealMap from "./RealMap.jsx";
import { fetchRealStations } from "./openChargeMap.js";
import { AreaChart, Area, ResponsiveContainer } from "recharts";
import {
  Zap, MapPin, Battery, Leaf, Route, Star, Settings, CloudSun, Plug, Trash2, Plus,
  Moon, SunMedium, LogOut, Mail, Lock, User, UserPlus, Activity, Search, Utensils
} from "lucide-react";
import "./gridpulse.css";
import Landing from "./Landing.jsx";
import LoadBalancer, { StatsRow } from "./LoadBalancer.jsx";
import RoutePanel from "./RoutePanel.jsx";
import { rankRoutes, haversineKm } from "./routing.js";

// Point this at your running GridPulse backend. The app falls back to built-in
// demo data whenever the API can't be reached.
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

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
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

// Maps a Mongo station doc onto the shape the UI renders.
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
    latitude: d.latitude,
    longitude: d.longitude,
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
  { id: "S1", name: "Kurnool Rd Solar Hub", latitude: 15.515, longitude: 80.062, x: 62, y: 30, distanceKm: 2.1, totalPorts: 6, availablePorts: 4, waitingTimeMin: 5, pricePerKWh: 11.5, renewablePct: 82, chargerType: "Fast (DC)", restaurants: ["Sri Annapurna Mess", "Cafe Coffee Day"] },
  { id: "S2", name: "Ongole Bypass Grid Point", latitude: 15.498, longitude: 80.045, x: 38, y: 58, distanceKm: 3.4, totalPorts: 4, availablePorts: 0, waitingTimeMin: 35, pricePerKWh: 9.2, renewablePct: 28, chargerType: "Fast (DC)", restaurants: ["Highway King Dhaba"] },
  { id: "S3", name: "Prakasam Wind Node", latitude: 15.525, longitude: 80.075, x: 78, y: 62, distanceKm: 5.6, totalPorts: 8, availablePorts: 5, waitingTimeMin: 8, pricePerKWh: 10.0, renewablePct: 91, chargerType: "Fast (DC)", restaurants: ["Green Leaf Restaurant", "Tea Junction"] },
  { id: "S4", name: "Market St Slow Charge", latitude: 15.508, longitude: 80.052, x: 22, y: 22, distanceKm: 1.4, totalPorts: 10, availablePorts: 6, waitingTimeMin: 3, pricePerKWh: 7.8, renewablePct: 45, chargerType: "Slow (AC)", restaurants: ["Udupi Grand"] },
  { id: "S5", name: "Ring Rd Hybrid Station", latitude: 15.485, longitude: 80.065, x: 55, y: 78, distanceKm: 6.9, totalPorts: 6, availablePorts: 1, waitingTimeMin: 22, pricePerKWh: 10.7, renewablePct: 64, chargerType: "Fast (DC)", restaurants: ["Spice Route", "Bakers Corner"] },
  { id: "S6", name: "Old Town Grid Charge", latitude: 15.492, longitude: 80.038, x: 15, y: 68, distanceKm: 4.8, totalPorts: 4, availablePorts: 2, waitingTimeMin: 14, pricePerKWh: 8.9, renewablePct: 36, chargerType: "Slow (AC)", restaurants: ["Bismillah Biryani"] },
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

const toneOf = (pct) => (pct >= 65 ? "good" : pct >= 40 ? "warn" : "bad");

function Chip({ tone = "", children }) {
  return <span className={`chip ${tone}`}>{children}</span>;
}

function Ring({ value }) {
  const c = value >= 70 ? "good" : value >= 45 ? "accent" : "warn";
  return <div className="ring" style={{ "--p": value, "--c": `var(--${c})` }}><span>{value}</span></div>;
}

function Field({ icon, label, children }) {
  return (
    <div className="field">
      <label className="label">{icon}{label}</label>
      {children}
    </div>
  );
}

function StationCard({ s, selected, best, favorite, onSelect, onFav }) {
  const full = s.availablePorts === 0;
  return (
    <div className={`card station ${selected ? "sel" : ""}`} onClick={() => onSelect(s.id)}>
      <Ring value={s.matchScore} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="st-title">
          <span className="st-name">{s.name}</span>
          {best && <Chip tone="good">Best match</Chip>}
          {s.real && <Chip>real location</Chip>}
        </div>
        <div className="chips">
          <Chip tone={full ? "bad" : "good"}>{full ? "Full" : `${s.availablePorts}/${s.totalPorts} ports`}</Chip>
          <Chip tone={s.waitingTimeMin > 20 ? "bad" : s.waitingTimeMin > 10 ? "warn" : "good"}>{s.waitingTimeMin} min wait</Chip>
          <Chip tone={toneOf(s.renewablePct)}>{s.renewablePct}% renewable</Chip>
          <Chip>₹{s.pricePerKWh}/kWh</Chip>
          <Chip>{s.distanceKm} km</Chip>
        </div>
      </div>
      <button className={`star ${favorite ? "on" : ""}`} aria-label="favorite" onClick={(e) => { e.stopPropagation(); onFav(s.id); }}>
        <Star size={18} fill={favorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function AdminPanel({ stations, setStations, token }) {
  const update = async (id, field, value) => {
    setStations(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (!token) return;
    const fieldMap = { renewablePct: "renewablePercentage", waitingTimeMin: "waitingTime", name: "stationName" };
    try { await api.updateStation(token, id, { [fieldMap[field] || field]: value }); } catch (err) { /* local state already updated */ }
  };
  const remove = async (id) => {
    setStations(prev => prev.filter(s => s.id !== id));
    if (token) { try { await api.deleteStation(token, id); } catch (err) { /* already removed locally */ } }
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
          id: station._id, name: station.stationName, latitude: station.latitude, longitude: station.longitude,
          x: 50, y: 50, distanceKm: 0, totalPorts: station.totalPorts, availablePorts: station.availablePorts,
          waitingTimeMin: station.waitingTime, pricePerKWh: station.pricePerKWh, renewablePct: station.renewablePercentage,
          chargerType: station.chargerType, restaurants: [],
        }]);
        return;
      } catch (err) { /* fall through to local-only add */ }
    }
    const nid = "S" + (stations.length + 1) + Math.floor(Math.random() * 100);
    setStations(prev => [...prev, {
      id: nid, name: "New Station", latitude: draft.latitude, longitude: draft.longitude,
      x: 50 + Math.random() * 20 - 10, y: 50 + Math.random() * 20 - 10, distanceKm: 3.0, totalPorts: 4,
      availablePorts: 4, waitingTimeMin: 5, pricePerKWh: 10, renewablePct: 50, chargerType: "Fast (DC)", restaurants: []
    }]);
  };
  const num = (id, field, v, w, clampFn) => (
    <input className="input" type="number" value={v} style={{ width: w }}
      onChange={e => update(id, field, clampFn ? clampFn(+e.target.value) : +e.target.value)} />
  );
  return (
    <div className="card pad">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap" }}>
        <div>
          <div className="display" style={{ fontSize: 22 }}>Station registry</div>
          {!token && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>Demo mode: changes are local until you log in against the live backend as an admin.</div>}
        </div>
        <button className="btn btn-primary" onClick={add}><Plus size={14} /> Add station</button>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl">
          <thead>
            <tr><th>Name</th><th>Ports (free / total)</th><th>₹/kWh</th><th>Renewable %</th><th>Wait (min)</th><th /></tr>
          </thead>
          <tbody>
            {stations.map(s => (
              <tr key={s.id}>
                <td><input className="input" value={s.name} style={{ minWidth: 170 }} onChange={e => update(s.id, "name", e.target.value)} /></td>
                <td>
                  <div className="row" style={{ gap: 6 }}>
                    {num(s.id, "availablePorts", s.availablePorts, 64, (n) => Math.max(0, Math.min(s.totalPorts, n)))}
                    <span className="muted">/</span>
                    {num(s.id, "totalPorts", s.totalPorts, 64)}
                  </div>
                </td>
                <td>{num(s.id, "pricePerKWh", s.pricePerKWh, 76)}</td>
                <td>{num(s.id, "renewablePct", s.renewablePct, 76, (n) => Math.max(0, Math.min(100, n)))}</td>
                <td>{num(s.id, "waitingTimeMin", s.waitingTimeMin, 76)}</td>
                <td><button className="star" style={{ color: "var(--bad)" }} onClick={() => remove(s.id)} aria-label="delete"><Trash2 size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) { setError("Fill in every field to continue."); return; }
    if (password.length < 4) { setError("Password needs at least 4 characters."); return; }
    setError("");
    setLoading(true);
    try {
      const payload = mode === "register"
        ? await api.register({ name: name.trim(), email: email.trim(), password, vehicle })
        : await api.login({ email: email.trim(), password });
      onAuth({ ...payload.user, vehicle: payload.user.vehicle || vehicle, token: payload.token });
    } catch (err) {
      if (err.message === "Failed to fetch") {
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
    <div className="gp-app center" data-theme="light">
      <div className="card" style={{ width: "100%", maxWidth: 400, padding: 28 }}>
        <div className="row" style={{ marginBottom: 22 }}>
          <div className="logo"><Zap size={20} /></div>
          <div>
            <div className="display" style={{ fontSize: 22 }}>GridPulse</div>
            <div className="muted" style={{ fontSize: 12 }}>Sign in to find your charge</div>
          </div>
        </div>
        <div className="seg" style={{ display: "flex", marginBottom: 20 }}>
          {["login", "register"].map(m => (
            <button key={m} type="button" className={mode === m ? "on" : ""} style={{ flex: 1, justifyContent: "center" }}
              onClick={() => { setMode(m); setError(""); }}>{m === "login" ? "Log in" : "Register"}</button>
          ))}
        </div>
        <form onSubmit={submit}>
          {mode === "register" && (
            <Field icon={<User size={13} />} label="Full name">
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Asha Rao" />
            </Field>
          )}
          <Field icon={<Mail size={13} />} label="Email">
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="asha@example.com" />
          </Field>
          <Field icon={<Lock size={13} />} label="Password">
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>
          {mode === "register" && (
            <Field icon={<Zap size={13} />} label="Vehicle model">
              <select className="input" value={vehicle} onChange={e => setVehicle(e.target.value)}>
                {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
          )}
          {error && <div style={{ color: "var(--bad)", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary btn-block" type="submit" disabled={loading} style={{ padding: 12 }}>
            <UserPlus size={15} /> {loading ? "Connecting..." : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        <button type="button" className="btn btn-block" style={{ marginTop: 10, padding: 12 }}
          onClick={() => onAuth({ name: "Demo guest", email: "guest@gridpulse.app", vehicle, token: null })}>
          Continue as guest
        </button>
        <div className="muted" style={{ fontSize: 11, marginTop: 14, textAlign: "center" }}>
          {demoNotice ? "Backend unreachable. Continuing in local demo mode." : `Talks to ${API_BASE_URL}`}
        </div>
      </div>
    </div>
  );
}

export default function GridPulseApp() {
  const [rawStations, setRawStations] = useState(INITIAL_STATIONS);
  const [realStations, setRealStations] = useState([]);
  const [realStationsStatus, setRealStationsStatus] = useState("loading"); // loading | ok | error
  const [userLoc, setUserLoc] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [routeStatus, setRouteStatus] = useState("");
  const [pickMode, setPickMode] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    const ocmKey = (typeof import.meta !== "undefined" && import.meta.env?.VITE_OCM_API_KEY) || "";
    fetchRealStations(USER_LAT, USER_LNG, 25, ocmKey)
      .then((stations) => { if (!cancelled) { setRealStations(stations); setRealStationsStatus("ok"); } })
      .catch(() => { if (!cancelled) setRealStationsStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  // Once the user's location is known, recompute each station's distance from it.
  const combinedStations = useMemo(() => {
    const all = [...realStations, ...rawStations];
    if (!userLoc) return all;
    return all.map((s) =>
      s.latitude != null && s.longitude != null
        ? { ...s, distanceKm: +haversineKm(userLoc, { lat: s.latitude, lng: s.longitude }).toFixed(1) }
        : s
    );
  }, [realStations, rawStations, userLoc]);
  const ranked = useMatchScore(combinedStations);

  const [selectedId, setSelectedId] = useState(ranked[0]?.id);
  const [battery, setBattery] = useState(28);
  const [vehicle, setVehicle] = useState(VEHICLES[0].id);
  const [favorites, setFavorites] = useState(new Set());
  const [view, setView] = useState("locator");
  const [favOnly, setFavOnly] = useState(false);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("match");
  const [query, setQuery] = useState("");
  const [dark, setDark] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [showLanding, setShowLanding] = useState(true);

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const selected = ranked.find(s => s.id === selectedId) || ranked[0];
  const vehicleObj = VEHICLES.find(v => v.id === vehicle);
  const kWhNeeded = useMemo(() => Math.max(0, (0.85 - battery / 100) * vehicleObj.capacityKWh), [battery, vehicleObj]);
  const cost = selected ? kWhNeeded * selected.pricePerKWh : 0;
  const etaMin = selected ? Math.round(selected.distanceKm * 2.6 + 4) : 0;
  const batteryOnArrival = selected ? Math.max(2, Math.round(battery - selected.distanceKm * 1.1)) : battery;

  const origin = useMemo(() => userLoc || { lat: USER_LAT, lng: USER_LNG }, [userLoc]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = ranked.filter(s =>
      (!favOnly || favorites.has(s.id)) &&
      (!onlyOpen || s.availablePorts > 0) &&
      (typeFilter === "all" || (s.chargerType || "").includes(typeFilter)) &&
      s.name.toLowerCase().includes(q)
    );
    const by = {
      match: (a, b) => b.matchScore - a.matchScore,
      distance: (a, b) => a.distanceKm - b.distanceKm,
      price: (a, b) => a.pricePerKWh - b.pricePerKWh,
      green: (a, b) => b.renewablePct - a.renewablePct,
    };
    return [...out].sort(by[sortBy]);
  }, [ranked, favOnly, favorites, onlyOpen, typeFilter, sortBy, query]);

  const findRoutes = async (loc) => {
    setRouteStatus("Finding routes...");
    const r = await rankRoutes(loc, ranked, 5);
    setRoutes(r);
    setRouteStatus(
      r.length === 0 ? "No stations with coordinates found."
        : r.some((x) => x.fallback) ? "Routing service unreachable: showing approximate routes." : ""
    );
    if (r[0]) setSelectedId(r[0].stationId);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setRouteStatus("Location is not supported in this browser."); return; }
    setRouteStatus("Waiting for location permission...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        findRoutes(loc);
      },
      () => setRouteStatus("Location is blocked. Use Demo location instead."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const book = async () => {
    setToast("Booking...");
    if (token && !selected.real) {
      try {
        await api.createBooking(token, selected.id);
        setRawStations(prev => prev.map(s => s.id === selected.id ? { ...s, availablePorts: s.availablePorts - 1 } : s));
        setToast("Slot booked and confirmed.");
      } catch (err) {
        setToast(err.message);
      }
      return;
    }
    const dec = (arr) => arr.map(s => s.id === selected.id ? { ...s, availablePorts: Math.max(0, s.availablePorts - 1) } : s);
    if (selected.real) {
      setRealStations(dec);
      setToast("Slot booked locally (real station, no live reservation network).");
    } else {
      setRawStations(dec);
      setToast("Slot booked locally (demo mode).");
    }
  };

  if (!currentUser && showLanding) return <Landing onStart={() => setShowLanding(false)} />;
  if (!currentUser) {
    return <LoginPanel onAuth={(u) => { setCurrentUser(u); setToken(u.token || null); if (u.vehicle) setVehicle(u.vehicle); }} />;
  }

  const bestId = ranked[0]?.id;

  return (
    <div className="gp-app" data-theme={dark ? "dark" : "light"}>
      <div className="shell">
        <div className="topbar">
          <div className="row">
            <div className="logo"><Zap size={20} /></div>
            <div>
              <div className="display" style={{ fontSize: 22, lineHeight: 1.1 }}>GridPulse</div>
              <div className="muted" style={{ fontSize: 12 }}>Renewable-aware EV charge routing</div>
            </div>
            <span className={`chip gp-pulse ${apiOnline ? "good" : "warn"}`}>{apiOnline ? "● live backend" : "○ demo data"}</span>
          </div>

          <div className="seg">
            {[["locator", "Locator", MapPin], ["balancer", "Load balancer", Activity], ["admin", "Admin", Settings]].map(([id, label, Icon]) => (
              <button key={id} className={view === id ? "on" : ""} onClick={() => setView(id)}><Icon size={14} /> {label}</button>
            ))}
          </div>

          <div className="row" style={{ flexWrap: "wrap" }}>
            <div className="card row" style={{ padding: "6px 12px", borderRadius: 14, gap: 8 }}>
              <span className="muted" style={{ fontSize: 12 }}>Grid renewable</span>
              <div style={{ width: 70, height: 26 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={RENEWABLE_TREND}>
                    <defs>
                      <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3FB68B" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#3FB68B" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="v" stroke="#3FB68B" strokeWidth={1.8} fill="url(#rg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <b style={{ color: "var(--good)" }}>63%</b>
            </div>
            <span className="chip"><CloudSun size={14} /> Ongole · 31°C</span>
            <span className="chip"><User size={13} /> {currentUser.name}</span>
            <button className="btn btn-icon" onClick={() => setDark(d => !d)} aria-label="toggle theme">{dark ? <SunMedium size={16} /> : <Moon size={16} />}</button>
            <button className="btn btn-icon" onClick={() => setCurrentUser(null)} aria-label="log out"><LogOut size={16} /></button>
          </div>
        </div>

        {view === "locator" && <StatsRow stations={ranked} />}

        {view === "balancer" ? (
          <LoadBalancer stations={ranked} />
        ) : view === "admin" ? (
          <AdminPanel stations={rawStations} setStations={setRawStations} token={token} />
        ) : (
          <div className="grid3">
            {/* Left: trip setup */}
            <div className="card pad">
              <div className="row" style={{ marginBottom: 16 }}><MapPin size={16} color="var(--accent)" /><b>Trip setup</b></div>
              <div className="field">
                <label className="label">Vehicle</label>
                <select className="input" value={vehicle} onChange={e => setVehicle(e.target.value)}>
                  {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="label">Battery level</label>
                <div className="display" style={{ fontSize: 36, lineHeight: 1 }}>{battery}%</div>
                <input type="range" min="2" max="95" step="1" value={battery} onChange={e => setBattery(+e.target.value)}
                  style={{ width: "100%", margin: "10px 0", accentColor: "#5B45A0" }} />
                <Chip tone={battery < 20 ? "bad" : "good"}><Battery size={13} /> {battery < 20 ? "Low, charge soon" : "Battery healthy"}</Chip>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 6 }}>
                <div className="label">Match score weights</div>
                {[["Distance", 40], ["Waiting time", 25], ["Cost", 20], ["Renewable", 15]].map(([k, v]) => (
                  <div key={k} className="sb" style={{ gridTemplateColumns: "84px 1fr 34px" }}>
                    <span className="muted">{k}</span>
                    <div className="track"><div className="fill" style={{ width: `${v * 2.2}%` }} /></div>
                    <em>{v}%</em>
                  </div>
                ))}
              </div>
            </div>

            {/* Center: map + filters + list */}
            <div>
              <div className="card mapwrap" style={{ marginBottom: 16 }}>
                <RealMap
                  stations={ranked}
                  userCoords={origin}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  dark={dark}
                  routes={routes}
                  pickMode={pickMode}
                  onPickLocation={(loc) => { setPickMode(false); setUserLoc(loc); findRoutes(loc); }}
                />
                <div className="muted" style={{ fontSize: 12, padding: "8px 8px 2px" }}>
                  {realStationsStatus === "loading" && <div className="skel" style={{ width: 240 }} />}
                  {realStationsStatus === "ok" && `${realStations.length} real stations via OpenStreetMap + Open Charge Map. Pricing, availability and renewable % are estimated.`}
                  {realStationsStatus === "error" && "Couldn't reach Open Charge Map. Showing saved stations only."}
                </div>
              </div>

              <div className="toolbar">
                <div className="search">
                  <Search size={15} />
                  <input className="input" placeholder="Search stations" value={query} onChange={e => setQuery(e.target.value)} />
                </div>
                <select className="input" style={{ width: "auto" }} value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort stations">
                  <option value="match">Best match</option>
                  <option value="distance">Nearest</option>
                  <option value="price">Cheapest</option>
                  <option value="green">Greenest</option>
                </select>
              </div>
              <div className="chips" style={{ marginTop: 0, marginBottom: 14 }}>
                <button className={`chip ${onlyOpen ? "on" : ""}`} onClick={() => setOnlyOpen(v => !v)}>Available now</button>
                <button className={`chip ${typeFilter === "DC" ? "on" : ""}`} onClick={() => setTypeFilter(t => t === "DC" ? "all" : "DC")}>Fast (DC)</button>
                <button className={`chip ${typeFilter === "AC" ? "on" : ""}`} onClick={() => setTypeFilter(t => t === "AC" ? "all" : "AC")}>Slow (AC)</button>
                <button className={`chip ${favOnly ? "on" : ""}`} onClick={() => setFavOnly(v => !v)}><Star size={12} /> Favourites</button>
              </div>

              {list.length === 0 ? (
                <div className="muted" style={{ textAlign: "center", padding: 30, fontSize: 14 }}>No stations match these filters.</div>
              ) : list.map((s) => (
                <StationCard key={s.id} s={s} selected={s.id === selectedId} best={s.id === bestId}
                  favorite={favorites.has(s.id)} onSelect={setSelectedId}
                  onFav={(id) => {
                    setFavorites(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
                    if (token) api.toggleFavorite(token, id).catch(() => {});
                  }} />
              ))}
            </div>

            {/* Right: routes + station detail */}
            <div className="stack">
              <RoutePanel routes={routes} selectedId={selectedId} onSelect={setSelectedId}
                status={routeStatus} pickMode={pickMode} onUseLocation={useMyLocation} onTogglePick={() => setPickMode(p => !p)} />

              {selected && (
                <>
                  <div className="card pad">
                    <div className="display" style={{ fontSize: 22 }}>{selected.name}</div>
                    <div className="muted" style={{ fontSize: 13, margin: "4px 0 14px" }}>{selected.chargerType} · {selected.distanceKm} km away</div>
                    <div className="row" style={{ justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span className="row" style={{ gap: 6 }}><Leaf size={14} color="var(--good)" /> Solar / wind <b>{selected.renewablePct}%</b></span>
                      <span className="muted">Grid {100 - selected.renewablePct}%</span>
                    </div>
                    <div className="track" style={{ marginBottom: 16 }}><div className="fill" style={{ width: `${selected.renewablePct}%`, background: "var(--good)" }} /></div>
                    {[["Distance", selected.breakdown.distance, true], ["Wait time", selected.breakdown.waiting, true],
                      ["Cost", selected.breakdown.cost, true], ["Renewable", selected.breakdown.renewable, false]].map(([k, v, inv]) => {
                      const pct = Math.round((inv ? 1 - v : v) * 100);
                      return (
                        <div key={k} className="sb">
                          <span className="muted">{k}</span>
                          <div className="track"><div className="fill" style={{ width: `${pct}%` }} /></div>
                          <em>{pct}%</em>
                        </div>
                      );
                    })}
                  </div>

                  <div className="card pad">
                    <div className="row" style={{ marginBottom: 12 }}><Route size={16} color="var(--accent)" /><b>Route & cost</b></div>
                    <div className="tiles">
                      <div className="tile"><b>{etaMin}</b><span>min ETA</span></div>
                      <div className="tile"><b>{batteryOnArrival}%</b><span>on arrival</span></div>
                      <div className="tile"><b>₹{cost.toFixed(0)}</b><span>est. cost</span></div>
                    </div>
                    <div className="kv"><span className="muted">Energy needed</span><b>{kWhNeeded.toFixed(1)} kWh</b></div>
                    <button className="btn btn-primary btn-block" style={{ marginTop: 12, padding: 12 }}
                      disabled={selected.availablePorts === 0} onClick={book}>
                      <Plug size={15} /> {selected.availablePorts === 0 ? "No ports available" : "Book this slot"}
                    </button>
                  </div>

                  {selected.restaurants?.length > 0 && (
                    <div className="card pad">
                      <div className="row" style={{ marginBottom: 4 }}><Utensils size={16} color="var(--warn)" /><b>Nearby while you wait</b></div>
                      <div className="chips">{selected.restaurants.map(r => <Chip key={r}>{r}</Chip>)}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
