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
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#4FC3F7;border:3px solid white;box-shadow:0 0 0 4px
