// lib/geo/tmapmatrix.js
import fetch from "node-fetch";

const TMAP_API_KEY = process.env.TMAP_APP_KEY;

export async function getTmapMatrixETA(origins, destinations) {
  const url = "https://apis.openapi.sk.com/tmap/matrix";

  const body = {
    origins: origins.map(o => ({ lat: o.lat, lon: o.lon })),
    destinations: destinations.map(d => ({ lat: d.lat, lon: d.lon })),
    reqCoordType: "WGS84GEO",
    resCoordType: "WGS84GEO",
    searchOption: "0"
  };

  const headers = {
    appKey: TMAP_API_KEY,
    "Content-Type": "application/json"
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const data = await response.json();

  if (!data.matrixRoutes || !Array.isArray(data.matrixRoutes)) {
    throw new Error(`Matrix API 응답 이상함: ${JSON.stringify(data)}`);
  }

  return data.matrixRoutes.map(route => ({
    duration: route.duration,
    distance: route.distance
  }));
}