import React from "react";
import { Navigation, Crosshair, LocateFixed } from "lucide-react";

export default function RoutePanel({ routes, selectedId, onSelect, status, pickMode, onUseLocation, onTogglePick }) {
  const active = routes.find((r) => r.stationId === selectedId);
  return (
    <div className="card pad">
      <div className="row" style={{ marginBottom: 12 }}>
        <Navigation size={16} color="var(--accent)" />
        <b>Find the best route</b>
      </div>
      <div className="row">
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onUseLocation}><LocateFixed size={14} /> My location</button>
        <button className={`btn ${pickMode ? "btn-soft" : ""}`} style={{ flex: 1 }} onClick={onTogglePick}>
          <Crosshair size={14} /> {pickMode ? "Click the map" : "Demo location"}
        </button>
      </div>
      {status && <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>{status}</div>}

      {routes.length > 0 && (
        <>
          <div className="row muted" style={{ fontSize: 12, gap: 14, margin: "14px 0 8px" }}>
            <span><b style={{ color: "#3FB68B" }}>●</b> fastest</span>
            <span><b style={{ color: "#F0A35E" }}>●</b> medium</span>
            <span><b style={{ color: "#E0645A" }}>●</b> farthest</span>
          </div>
          {routes.map((r) => (
            <div key={r.stationId} onClick={() => onSelect(r.stationId)} className="row" style={{
              padding: "10px 12px", marginBottom: 6, borderRadius: 14, cursor: "pointer",
              border: `1px solid ${r.stationId === selectedId ? r.color : "var(--border)"}`,
              background: r.stationId === selectedId ? "var(--accent-soft)" : "transparent",
            }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                <div className="muted" style={{ fontSize: 12 }}>{r.distanceKm.toFixed(1)} km{r.fallback ? " (approx.)" : ""}</div>
              </div>
              <b>{Math.round(r.durationMin)} min</b>
            </div>
          ))}
        </>
      )}

      {active && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Directions to {active.name}</div>
          <div style={{ maxHeight: 170, overflowY: "auto" }}>
            {active.steps.slice(0, 12).map((s, i) => (
              <div key={i} className="row" style={{ justifyContent: "space-between", fontSize: 13, padding: "4px 0" }}>
                <span>{s.text}</span>
                <span className="muted" style={{ whiteSpace: "nowrap" }}>{s.meters >= 1000 ? (s.meters / 1000).toFixed(1) + " km" : s.meters + " m"}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
