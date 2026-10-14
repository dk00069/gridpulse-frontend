// Road routing via the public OSRM demo server (free, OpenStreetMap data, no API key).
// Falls back to an approximate straight-line route if the service is unreachable.
const OSRM = "https://router.project-osrm.org/route/v1/driving";
const GREEN = "#2DD4A7", AMBER = "#F5A623", RED = "#FF6B6B";

export function haversineKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function describeStep(s) {
  const m = s.maneuver || {};
  const road = s.name ? ` onto ${s.name}` : "";
  switch (m.type) {
    case "depart": return `Head ${m.modifier || "out"}${s.name ? " on " + s.name : ""}`;
    case "arrive": return "Arrive at the charging station";
    case "roundabout": case "rotary": return `Take the roundabout${road}`;
    case "turn": case "end of road": case "fork": case "on ramp": case "off ramp":
      return `Turn ${m.modifier || ""}${road}`.replace("  ", " ");
    default: return `Continue${road}`;
  }
}

async function fetchRoute(from, to, signal) {
  const url = `${OSRM}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("routing failed");
  const data = await res.json();
  const r = data.routes && data.routes[0];
  if (!r) throw new Error("no route");
  return {
    coords: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
    steps: r.legs[0].steps.map((s) => ({ text: describeStep(s), meters: Math.round(s.distance) })),
    fallback: false,
  };
}

function approxRoute(from, to) {
  const km = haversineKm(from, to) * 1.3; // roads are longer than straight lines
  return {
    coords: [[from.lat, from.lng], [to.lat, to.lng]],
    distanceKm: km, durationMin: (km / 30) * 60,
    steps: [{ text: "Approximate route (routing service unreachable)", meters: Math.round(km * 1000) }],
    fallback: true,
  };
}

// Routes from `origin` to the nearest few stations, ranked by real driving time.
// Fastest = green, slowest = red, others amber.
export async function rankRoutes(origin, stations, limit = 5) {
  const withCoords = stations.filter((s) => s.latitude != null && s.longitude != null);
  const open = withCoords.filter((s) => s.availablePorts > 0);
  const pool = open.length >= 2 ? open : withCoords;
  const near = pool
    .map((s) => ({ s, d: haversineKm(origin, { lat: s.latitude, lng: s.longitude }) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, limit);

  const results = await Promise.all(
    near.map(async ({ s }) => {
      const to = { lat: s.latitude, lng: s.longitude };
      let r;
      try { r = await fetchRoute(origin, to); } catch (e) { r = approxRoute(origin, to); }
      return { stationId: s.id, name: s.name, ...r };
    })
  );
  results.sort((a, b) => a.durationMin - b.durationMin);
  return results.map((r, i) => ({
    ...r, rank: i + 1,
    color: i === 0 ? GREEN : i === results.length - 1 && results.length > 1 ? RED : AMBER,
  }));
}
