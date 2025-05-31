// lib/geo/tmapRoute.js
import fetch from "node-fetch";

export async function getTmapRoute(origin, destination, options = {}) {
  const TMAP_API_KEY = process.env.TMAP_APP_KEY;
  const url = `https://apis.openapi.sk.com/tmap/routes?version=1&appKey=${TMAP_API_KEY}`;

  // 출발 시점 처리
  let departureTimeString = null;
  if (options.departureOffsetMin) {
    const date = new Date();
    date.setMinutes(date.getMinutes() + options.departureOffsetMin);
    departureTimeString = formatDateTime(date);
  } else if (options.departureTime instanceof Date) {
    departureTimeString = formatDateTime(options.departureTime);
  }

  const body = {
    startX: origin.lon.toString(),
    startY: origin.lat.toString(),
    endX: destination.lon.toString(),
    endY: destination.lat.toString(),
    reqCoordType: "WGS84GEO",
    resCoordType: "WGS84GEO",
    searchOption: "0",           // 빠른 길
    trafficInfo: "Y",            // ✅ 실시간 교통 반영
    departureSearchOption: "0",  // ✅ 출발 시간 기준
    ...(departureTimeString && { departureTime: departureTimeString }),
  };

  const headers = {
    "Content-Type": "application/json"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`[${origin.name} → ${destination.name}] 응답 오류: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const routeInfo = data.features?.[0]?.properties;

    if (!routeInfo) {
      throw new Error(`[${origin.name} → ${destination.name}] 경로 정보 없음`);
    }

    return {
      duration: routeInfo.totalTime,    // 초
      distance: routeInfo.totalDistance // 미터
    };
  } catch (err) {
    throw new Error(`[${origin.name} → ${destination.name}] API 호출 실패: ${err.message}`);
  }
}

// 🔧 날짜를 "YYYYMMDDHHmm" 형식으로 변환
function formatDateTime(date) {
  return (
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0") +
    String(date.getHours()).padStart(2, "0") +
    String(date.getMinutes()).padStart(2, "0")
  );
}
