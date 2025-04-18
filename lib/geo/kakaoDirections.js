// lib/geo/kakaoDirections.js
import dotenv from "dotenv";
dotenv.config();

const kakaoKey = process.env.KAKAO_REST_API_KEY;

/**
 * 출발지(origin)에서 목적지까지 ETA(분)를 계산
 * @param {Object} origin - { x: 경도, y: 위도 }
 * @param {Object} dest - { x: 경도, y: 위도 }
 * @returns {number|null} ETA (단위: 분)
 */
export async function getKakaoETA(origin, dest) {
  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.x},${origin.y}&destination=${dest.x},${dest.y}&priority=RECOMMEND&car_fuel=GASOLINE&car_hipass=false&alternatives=false&road_details=false`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${kakaoKey}`,
      },
    });

    if (!res.ok) {
      console.warn(`❌ Kakao 요청 실패: ${res.status}`);
      const errorBody = await res.text();
      console.log("📦 응답 내용:", errorBody);
      return null;
    }

    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const seconds = data.routes[0].summary.duration;
      return Math.round(seconds / 60);
    } else {
      console.warn("❌ 유효한 경로 없음");
      return null;
    }
  } catch (err) {
    console.error("❌ Kakao Directions 에러:", err.message);
    return null;
  }
}
