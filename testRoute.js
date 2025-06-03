import 'dotenv/config'; // ✅ 이 줄 추가
import { getTmapRoute } from "./lib/geo/tmapRoute.js";

const origin = { name: "영조마음자리아파트", lat: 37.747594, lon: 126.48734 };
const destination = { name: "가좌119안전센터", lat: 37.487151, lon: 126.673742 };

(async () => {
  try {
    const result = await getTmapRoute(origin, destination);
    console.log("✅ 테스트 경로 결과:");
    console.log(`총 소요시간 (분): ${Math.round(result.duration / 60)}분`);
    console.log(`총 거리 (km): ${(result.distance / 1000).toFixed(1)}km`);
  } catch (e) {
    console.error("❌ 에러:", e.message);
  }
})();