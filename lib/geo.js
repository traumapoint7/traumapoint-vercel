// lib/geo.js
export function haversineDistance(point1, point2) {
  const R = 6371;
  const toRad = deg => (deg * Math.PI) / 180;

  const dLat = toRad(point2.y - point1.y);
  const dLon = toRad(point2.x - point1.x);
  const lat1 = toRad(point1.y);
  const lat2 = toRad(point2.y);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
