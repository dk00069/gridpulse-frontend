import React from "react";
import { Navigation, Crosshair, LocateFixed } from "lucide-react";

const btn = (theme, on) => ({
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer",
  borderRadius: 8, padding: "9px 8px", fontSize: 12.5, fontWeight: 600,
  background: on ? "#16223A" : "#0E2A24", color: on ? "#4FC3F7" : "#2DD4A7",
  border: `1px solid ${on ? "#4FC3F7" : "#1C4A3E"}`,
});

export default function RoutePanel({ routes, selectedId, onSelect, theme, status, pickMode, onUseLocation, onTogglePick }) {
  const active = routes.find((r) => r.stationId === selectedId);
  return (
    <div style={{ background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Navigation size={14} color="#4FC3F7" />
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14 }}>Find the best route</span>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onUseLocation} style={btn(theme, false)}><LocateFixed size={14} /> Use my location</button>
        <button onClick={onTogglePick} style={btn(theme, pickMode)}><Crosshair size={14} /> {pickMode ? "Click the map" : "Set demo location"}</button>
      </div>
      {status && <div style={{ fontSize: 11.5, color: theme.muted, marginTop: 8 }}>{status}</div>}

      {routes.length > 0 && (
        <>
          <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: theme.muted, margin: "12px 0 6px" }}>
            <span><b style={{ color: "#2DD4A7" }}>━</b> fastest</span>
            <span><b style={{ color: "#F5A623" }}>━</b> medium</span>
            <span><b style={{ color: "#FF6B6B" }}>━</b> farthest</span>
          </div>
          {routes.map((r) => (
            <div key={r.stationId} onClick={() => onSelect(r.stationId)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, borderRadius: 8, cursor: "pointer",
              border: `1px solid ${r.stationId === selectedId ? r.color : theme.border}`,
              background: r.stationId === selectedId ? "#16223A" : "transparent",
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div style={{ fontSize: 11.5, color: theme.muted }}>{r.distanceKm.toFixed(1)} km{r.fallback ? " (approx.)" : ""}</div>
              </div>
              <b style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{Math.round(r.durationMin)} min</b>
            </div>
          ))}
        </>
      )}

      {active && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${theme.border}`, paddingTop: 10 }}>
          <div style={{ fontSize: 12, color: theme.muted, marginBottom: 6 }}>Directions to {active.name}</div>
          <div style={{ maxHeight: 170, overflowY: "auto" }}>
            {active.steps.slice(0, 12).map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, padding: "4px 0" }}>
                <span>{s.text}</span>
                <span style={{ color: theme.muted, whiteSpace: "nowrap" }}>{s.meters >= 1000 ? (s.meters / 1000).toFixed(1) + " km" : s.meters + " m"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
