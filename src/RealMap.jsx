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
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#4FC3F7;border:3px solid white;box-shadow:0 0 0 4px #4FC3F755;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function RealMap({ stations, userCoords, selectedId, onSelect, dark }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  // Init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      [userCoords.lat, userCoords.lng],
      13
    );
    mapRef.current = map;
    mapRef.current._tileLayer = null;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap tile style with dark/light toggle
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map._tileLayer) map.removeLayer(map._tileLayer);
    const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    map._tileLayer = L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
  }, [dark]);

  // User marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (markersRef.current.__user) map.removeLayer(markersRef.current.__user);
    markersRef.current.__user = L.marker([userCoords.lat, userCoords.lng], { icon: USER_ICON })
      .addTo(map)
      .bindPopup("You are here");
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
      if (markersRef.current[s.id]) {
        markersRef.current[s.id].setIcon(icon);
        markersRef.current[s.id].setLatLng([s.latitude, s.longitude]);
      } else {
        const marker = L.marker([s.latitude, s.longitude], { icon }).addTo(map);
        marker.on("click", () => onSelect(s.id));
        markersRef.current[s.id] = marker;
      }
      markersRef.current[s.id].setPopupContent(
        `<b>${s.name}</b><br/>${s.availablePorts}/${s.totalPorts} ports · ${s.renewablePct}% renewable${
          s.real ? "<br/><i>real location · estimated pricing</i>" : ""
        }`
      );
      markersRef.current[s.id].bindPopup(markersRef.current[s.id].getPopup() || "");
    });
  }, [stations, selectedId, onSelect]);

  // Pan to selected station
  useEffect(() => {
    const map = mapRef.current;
    const sel = stations.find((s) => s.id === selectedId);
    if (map && sel && sel.latitude != null) {
      map.panTo([sel.latitude, sel.longitude]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={containerRef} style={{ width: "100%", height: 320, borderRadius: 8, overflow: "hidden" }} />;
}
