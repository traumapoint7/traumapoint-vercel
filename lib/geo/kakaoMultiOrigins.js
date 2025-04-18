// lib/geo/kakaoMultiOrigins.js
import dotenv from "dotenv";
dotenv.config();

const kakaoKey = process.env.KAKAO_REST_API_KEY;

/**
 * Kakao 다중 출발지 → 단일 목적지 ETA 계산
 * @param {Array} origins - 출발지 배열 [{x, y}]
 * @param {Object} destination - 목적지 하나 {x, y}
 * @returns {Array<number|null>} - ETA 배열 (null = 실패)
 */
export async function getMultiOriginETAs(origins, destination) {
  const url = "https://apis-navi.kakaomobility.com/v1/origins/directions";

  const body = {
    destination: {
      x: destination.x.toString(),
      y: destination.y.toString()
    },
    origins: origins.map((o, idx) => ({
      x: o.x.toString(),
      y: o.y.toString(),
      key: idx.toString()
    })),
    radius: 10000,
    priority: "TIME",
    avoid: [],
    roadevent: 0
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${kakaoKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!data.routes || !Array.isArray(data.routes)) {
      console.error("❌ 잘못된 응답 형식:", data);
      return origins.map(() => null);
    }

    return data.routes.map(route => {
      if (route.result_code === 0 && route.summary?.duration != null) {
        return Math.round(route.summary.duration / 60); // 초 → 분
      } else {
        console.warn(`⚠️ 출발지 key=${route.key} 실패:`, route.result_msg);
        return null;
      }
    });

  } catch (e) {
    console.error("❌ Kakao 다중 출발지 요청 실패:", e);
    return origins.map(() => null);
  }
}
