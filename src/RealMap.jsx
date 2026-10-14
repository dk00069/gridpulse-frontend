import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function stationColor(pct) {
  if (pct >= 65) return "#2DD4A7";
  if (pct >= 40) return "#F5A623";
  return "#FF6B6B";
}

function makeStationIcon(color, selected) {
  const size = selected ? 30 : 22;
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};border:3px solid #0A0F1A;
      box-shadow:0 0 0 2px ${color}66;
      display:flex;align-items:center;justify-content:center;
      font-size:${selected ? 13 : 10}px;">⚡</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const USER_ICON = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:32px;height:42px;">
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z"
        fill="#4FC3F7" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  </div>`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -38],
});

export default function RealMap({
  stations, userCoords, selectedId, onSelect, dark,
  routes = [], pickMode = false, onPickLocation,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});
  const routeLayerRef = useRef(null);
  const pickRef = useRef({});
  pickRef.current = { pickMode, onPickLocation };

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView([userCoords.lat, userCoords.lng], 13);
    mapRef.current = map;
    mapRef.current._tileLayer = null;
    routeLayerRef.current = L.layerGroup().addTo(map);
    // "Set demo location": next click on the map becomes the user's position
    map.on("click", (e) => {
      const p = pickRef.current;
      if (p.pickMode && p.onPickLocation) p.onPickLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Crosshair cursor while picking a location
  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getContainer().style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  // Tile layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map._tileLayer) map.removeLayer(map._tileLayer);
    map._tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
  }, [dark]);

  // User marker (+ recentre when there are no routes yet)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markersRef.current.__user) map.removeLayer(markersRef.current.__user);
    markersRef.current.__user = L.marker([userCoords.lat, userCoords.lng], { icon: USER_ICON })
      .addTo(map).bindPopup("You are here");
    if (!routes.length) map.setView([userCoords.lat, userCoords.lng], 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userCoords]);

  // Station markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    Object.keys(markersRef.current).forEach((id) => {
      if (id === "__user") return;
      if (!stations.find((s) => s.id === id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
    stations.forEach((s) => {
      if (s.latitude == null || s.longitude == null) return;
      const icon = makeStationIcon(stationColor(s.renewablePct), s.id === selectedId);
      const html = `<b>${s.name}</b><br/>${s.availablePorts}/${s.totalPorts} ports · ${s.renewablePct}% renewable${
        s.real ? "<br/><i>real location · estimated pricing</i>" : ""}`;
      let marker = markersRef.current[s.id];
      if (marker) {
        marker.setIcon(icon);
        marker.setLatLng([s.latitude, s.longitude]);
        marker.setPopupContent(html);
      } else {
        marker = L.marker([s.latitude, s.longitude], { icon }).addTo(map).bindPopup(html);
        marker.on("click", () => onSelect(s.id));
        markersRef.current[s.id] = marker;
      }
    });
  }, [stations, selectedId, onSelect]);

  // Draw routes: selected one on top, thicker; fastest green, slowest red
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    [...routes]
      .sort((a, b) => (a.stationId === selectedId) - (b.stationId === selectedId))
      .forEach((r) => {
        const active = r.stationId === selectedId;
        L.polyline(r.coords, {
          color: r.color, weight: active ? 8 : 4, opacity: active ? 1 : 0.55,
          dashArray: r.fallback ? "8 8" : null, lineJoin: "round",
        }).on("click", () => onSelect(r.stationId)).addTo(layer);
      });
  }, [routes, selectedId, onSelect]);

  // Zoom to fit all routes when a new set arrives
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routes.length) return;
    const pts = routes.flatMap((r) => r.coords);
    pts.push([userCoords.lat, userCoords.lng]);
    map.fitBounds(L.latLngBounds(pts), { padding: [30, 30] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  // Pan to selected station (only when no routes are shown)
  useEffect(() => {
    const map = mapRef.current;
    const sel = stations.find((s) => s.id === selectedId);
    if (map && sel && sel.latitude != null && !routes.length) map.panTo([sel.latitude, sel.longitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={containerRef} style={{ width: "100%", height: 380, borderRadius: 8, overflow: "hidden" }} />;
}
