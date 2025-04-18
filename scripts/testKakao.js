// scripts/testKakao.js
import dotenv from "dotenv";
dotenv.config();

const kakaoKey = process.env.KAKAO_REST_API_KEY;
const origin = { x: 126.721898, y: 37.448876 }; // 길병원
const destination = { x: 126.632935, y: 37.457993 }; // 예시 tp

const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.y},${origin.x}&destination=${destination.y},${destination.x}&priority=TIME`;

fetch(url, {
  method: "GET",
  headers: { Authorization: `KakaoAK ${kakaoKey}` }
})
  .then(async res => {
    const data = await res.json();
    console.log("✅ 상태코드:", res.status);
    console.log("📦 응답 내용:", data);
  })
  .catch(err => {
    console.error("❌ 에러:", err.message);
  });
