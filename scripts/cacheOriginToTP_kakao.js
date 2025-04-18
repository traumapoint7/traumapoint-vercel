// scripts/cacheOriginToTP_kakao.js
import { setCachedETA, getCachedETA } from '../lib/cache.js';
import { getWeekday, getTimeSlot } from '../utils/timeSlot.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getKakaoMultiDestinationETAs } from '../lib/geo/kakaoMultiDirections.js'; // 🔄 다중 목적지용 모듈
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gilHospital = { x: 126.721898, y: 37.448876 };

// 화수목 동일 취급
function normalizedWeekday(date) {
  const day = date.getDay(); // 일(0) ~ 토(6)
  return [2, 3, 4].includes(day) ? "화수목" : ["일", "월", "화", "수", "목", "금", "토"][day];
}

async function run() {
  const origin = {
    x: 126.65666051, // 예시: 검단사거리역
    y: 37.60174992
  };

  console.log("🧠 사용자 경로 기반 캐시 시작");
  console.log("📍 origin:", origin);

  const now = new Date();
  const weekday = normalizedWeekday(now);
  const timeSlot = getTimeSlot(now);

  const traumaPath = path.join(__dirname, '../data/traumaPoints.json');
  const traumaPoints = JSON.parse(await fs.readFile(traumaPath, 'utf8'));

  const validTPs = traumaPoints
    .filter(tp => tp.x && tp.y && !isNaN(tp.x) && !isNaN(tp.y))
    .map(tp => ({ ...tp, x: parseFloat(tp.x), y: parseFloat(tp.y) }));

  // ❗️캐시 없을 경우만 실행
  const destinationsToFetch = [];
  const tpWithIndex = [];

  for (let i = 0; i < validTPs.length; i++) {
    const tp = validTPs[i];
    const cached = await getCachedETA(origin, tp, weekday, timeSlot, "originToTp");
    if (cached == null) {
      destinationsToFetch.push(tp);
      tpWithIndex.push(i);
    }
  }

  if (destinationsToFetch.length === 0) {
    console.log("✅ 모든 origin→TP 경로가 이미 캐싱되어 있음");
    return;
  }

  console.log(`🚗 캐싱할 대상 ${destinationsToFetch.length}개`);

  // 👉 다중 목적지 호출 (최대 30개씩 분할)
  const BATCH_SIZE = 30;
  for (let i = 0; i < destinationsToFetch.length; i += BATCH_SIZE) {
    const batch = destinationsToFetch.slice(i, i + BATCH_SIZE);
    const etas = await getKakaoMultiDestinationETAs(origin, batch);

    for (let j = 0; j < batch.length; j++) {
      const tp = batch[j];
      const eta = etas[j];
      if (eta != null) {
        await setCachedETA(origin, tp, weekday, timeSlot, eta, "originToTp");
        console.log(`💾 캐시 저장: ${tp.name} = ${eta}분`);
      }
    }
  }

  console.log("✅ 사용자 origin→TP 캐시 완료");
}

run();
