// Open Charge Map (openchargemap.org) is a free, public, crowd-sourced
// database of real EV charging locations worldwide, including India — no
// billing account or paid key required for reasonable demo-level usage.
//
// It does NOT publish real-time price, port availability, or energy-source
// mix (no free public network does this). Those specific fields are
// deterministically estimated per station below and labeled as such in the
// UI — the location, name, and connector data are real; the rest is a
// stand-in so the load-balancer scoring still has something to work with.

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed, min, max) {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return min + frac * (max - min);
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function fetchRealStations(lat, lng, radiusKm = 25) {
  const url =
    `https://api.openchargemap.io/v3/poi/?output=json&latitude=${lat}&longitude=${lng}` +
    `&distance=${radiusKm}&distanceunit=KM&maxresults=30&compact=true&verbose=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Open Charge Map request failed");
  const data = await res.json();

  return data
    .filter((poi) => poi?.AddressInfo?.Latitude && poi?.AddressInfo?.Longitude)
    .map((poi) => {
      const id = `ocm-${poi.ID}`;
      const seed = hashSeed(id);
      const connections = poi.Connections || [];
      const totalPorts = Math.max(1, connections.reduce((sum, c) => sum + (c.Quantity || 1), 0));
      const maxKW = connections.reduce((m, c) => Math.max(m, c.PowerKW || 0), 0);
      const chargerType = maxKW >= 40 ? "Fast (DC)" : "Slow (AC)";
      const availablePorts = Math.max(
        0,
        Math.min(totalPorts, Math.round(seeded(seed + 3, 0, totalPorts + 1)))
      );

      return {
        id,
        name: poi.AddressInfo.Title || "EV Charging Station",
        address: poi.AddressInfo.AddressLine1 || "",
        latitude: poi.AddressInfo.Latitude,
        longitude: poi.AddressInfo.Longitude,
        distanceKm: Math.round(haversineKm(lat, lng, poi.AddressInfo.Latitude, poi.AddressInfo.Longitude) * 10) / 10,
        totalPorts,
        availablePorts,
        waitingTimeMin: Math.round(seeded(seed + 2, 2, 30)),
        pricePerKWh: Math.round(seeded(seed + 1, 7, 15) * 10) / 10,
        renewablePct: Math.round(seeded(seed, 20, 95)),
        chargerType,
        restaurants: [],
        real: true,
      };
    });
}
