// lib/geo/kakaoDirections.js
import dotenv from "dotenv";
dotenv.config();

const kakaoKey = process.env.KAKAO_REST_API_KEY;

/**
 * ✅ 기본 Kakao 길찾기 (단일 → 단일)
 * @param {{x: number, y: number}} origin 
 * @param {{x: number, y: number}} destination 
 * @returns {Promise<number|null>} ETA in minutes
 */
export async function getKakaoETA(origin, destination) {
  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.x},${origin.y}&destination=${destination.x},${destination.y}&priority=TIME`;
  
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${kakaoKey}`
      }
    });

    const data = await res.json();
    const duration = data.routes?.[0]?.summary?.duration;
    return duration ? Math.round(duration / 60) : null;

  } catch (e) {
    console.error("❌ Kakao ETA 요청 실패:", e.message);
    return null;
  }
}

// ✅ 다중 목적지 모듈 가져오기
export { getKakaoMultiDestinationETAs } from "./kakaoMultiDirections.js";

// ✅ 다중 출발지 모듈 가져오기
export { getMultiOriginETAs } from "./kakaoMultiOrigins.js";
