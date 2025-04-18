// lib/geo/kakaoMultiDirections.js
import dotenv from "dotenv";
dotenv.config();

const kakaoKey = process.env.KAKAO_REST_API_KEY;

/**
 * Kakao 다중 목적지 길찾기 API
 * @param {Object} origin - { x, y }
 * @param {Array} destinations - [{ x, y }]
 * @returns {Array<number|null>} - 분 단위 ETA 배열
 */
export async function getKakaoMultiDestinationETAs(origin, destinations) {
  const url = `https://apis-navi.kakaomobility.com/v1/destinations/directions`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `KakaoAK ${kakaoKey}`
  };

  const body = {
    origin: {
      x: String(origin.x),
      y: String(origin.y)
    },
    destinations: destinations.map((tp, idx) => ({
      x: String(tp.x),
      y: String(tp.y),
      key: `${idx}`
    })),
    radius: 10000,
    priority: "TIME"
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!data.routes) return destinations.map(() => null);

    const etaMap = {};
    for (const route of data.routes) {
      const key = route.key;
      etaMap[key] = route.summary?.duration ? Math.round(route.summary.duration / 60) : null;
    }

    return destinations.map((_, idx) => etaMap[idx] ?? null);
  } catch (e) {
    console.error("❌ Kakao 다중목적지 API 오류:", e.message);
    return destinations.map(() => null);
  }
}
