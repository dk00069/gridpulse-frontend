import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function stationColor(pct) {
  if (pct >= 65) return "#3FB68B";
  if (pct >= 40) return "#F0A35E";
  return "#E0645A";
}

function makeStationIcon(color, selected) {
  const size = selected ? 36 : 28;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid #fff;
      box-shadow:0 4px 12px rgba(60,40,100,.35)${selected ? ",0 0 0 5px rgba(91,69,160,.35)" : ""};
      display:flex;align-items:center;justify-content:center;color:#fff;font-size:${selected ? 15 : 12}px;">⚡</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const USER_ICON = L.divIcon({
  className: "",
  html: `<svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 4px 6px rgba(60,40,100,.35))">
    <path d="M16 0C7.2 0 0 7.2 0 16c0 12 16 26 16 26s16-14 16-26C32 7.2 24.8 0 16 0z" fill="#5B45A0" stroke="white" stroke-width="2"/>
    <circle cx="16" cy="16" r="6" fill="white"/></svg>`,
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
    const map = L.map(containerRef.current, { zoomControl: false }).setView([userCoords.lat, userCoords.lng], 13);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    mapRef.current._tileLayer = null;
    routeLayerRef.current = L.layerGroup().addTo(map);
    map.on("click", (e) => {
      const p = pickRef.current;
      if (p.pickMode && p.onPickLocation) p.onPickLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    });
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (map) map.getContainer().style.cursor = pickMode ? "crosshair" : "";
  }, [pickMode]);

  // OpenStreetMap tiles (no API key). Softened for light mode and inverted for dark mode via CSS in gridpulse.css
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

  // Routes: selected one on top and thicker
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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !routes.length) return;
    const pts = routes.flatMap((r) => r.coords);
    pts.push([userCoords.lat, userCoords.lng]);
    const wide = window.innerWidth > 820;
    map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [wide ? 430 : 30, 70], paddingBottomRight: [wide ? 40 : 30, 40] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  useEffect(() => {
    const map = mapRef.current;
    const sel = stations.find((s) => s.id === selectedId);
    if (map && sel && sel.latitude != null && !routes.length) map.panTo([sel.latitude, sel.longitude]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
