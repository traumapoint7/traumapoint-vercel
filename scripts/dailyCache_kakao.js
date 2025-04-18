// scripts/dailyCache_kakao.js
import { setCachedETA, getAllETAsForKey } from '../lib/cache.js';
import { getWeekday, getTimeSlot } from '../utils/timeSlot.js';
import { getKakaoETAs, getKakaoReverseETAs } from '../lib/geo/kakaoDirections.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import cron from 'node-cron'; // 🔥 cron 추가
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gilHospital = { x: 126.721898, y: 37.448876 }; // 💡 카카오 기준 길병원 좌표

function computeFilteredAverage(values) {
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const threshold = avg * 1.5;
  const filtered = values.filter(v => Math.abs(v - avg) <= threshold);
  if (filtered.length === 0) return null;
  return Math.round(filtered.reduce((a, b) => a + b, 0) / filtered.length);
}

async function runDailyCache() {
  console.log("\n🧠 Kakao 기반 정기 ETA 캐싱 시작");

  const now = new Date();
  const weekday = getWeekday(now);   // ex) "월"
  const timeSlot = getTimeSlot(now); // ex) "퇴근"
  const label = `${weekday}_${timeSlot}`;

  const traumaPath = path.join(__dirname, '../data/traumaPoints.json');
  const jsonData = await fs.readFile(traumaPath, 'utf8');
  const traumaPoints = JSON.parse(jsonData);

  const validPoints = traumaPoints
    .filter(tp => tp.x && tp.y && !isNaN(tp.x) && !isNaN(tp.y))
    .map(tp => ({ ...tp, x: parseFloat(tp.x), y: parseFloat(tp.y) }));

  const firstKey = `gilToTp_${gilHospital.x}_${gilHospital.y}_to_${validPoints[0].x}_${validPoints[0].y}_${label}`;
  const existing = await getAllETAsForKey(firstKey);
  if (existing.length >= 1) {
    console.log(`⏭️ 이미 수집된 시간대 (${label}) → 수집 생략`);
    return;
  }

  // ✅ 길 → tp (다중 목적지)
  console.log("➡️ 길병원 → TP 계산 중...");
  const gilToTpETAs = await getKakaoETAs(gilHospital, validPoints);

  for (let i = 0; i < validPoints.length; i++) {
    const tp = validPoints[i];
    const eta = gilToTpETAs[i];
    if (eta != null) {
      const key = `gilToTp_${gilHospital.x}_${gilHospital.y}_to_${tp.x}_${tp.y}_${label}`;
      const prev = await getAllETAsForKey(key);
      const avg = computeFilteredAverage([...prev, eta]);
      if (prev.length >= 2 && avg != null) {
        await setCachedETA(gilHospital, tp, weekday, timeSlot, avg, "gilToTp");
      } else {
        await setCachedETA(gilHospital, tp, weekday, timeSlot, eta, "gilToTp");
      }
    }
  }

  // ✅ tp → 길 (다중 출발지)
  console.log("⬅️ TP → 길병원 계산 중...");
  const tpToGilETAs = await getKakaoReverseETAs(validPoints, gilHospital);

  for (let i = 0; i < validPoints.length; i++) {
    const tp = validPoints[i];
    const eta = tpToGilETAs[i];
    if (eta != null) {
      const key = `tpToGil_${tp.x}_${tp.y}_to_${gilHospital.x}_${gilHospital.y}_${label}`;
      const prev = await getAllETAsForKey(key);
      const avg = computeFilteredAverage([...prev, eta]);
      if (prev.length >= 2 && avg != null) {
        await setCachedETA(tp, gilHospital, weekday, timeSlot, avg, "tpToGil");
      } else {
        await setCachedETA(tp, gilHospital, weekday, timeSlot, eta, "tpToGil");
      }
    }
  }

  console.log("✅ Kakao 기반 정기 캐싱 완료");
}

// ✅ 자동 스케줄링: 매일 03:05 실행 (시간대별 반복 스케줄은 원할 경우 추가)
cron.schedule('5 3 * * *', () => {
  console.log("⏰ CRON 실행: 매일 03:05 - Kakao 캐싱 시작");
  runDailyCache();
});

// 👉 수동 실행도 가능하도록
if (process.argv.includes("--now")) {
  runDailyCache();
}
