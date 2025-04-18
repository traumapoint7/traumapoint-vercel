// scripts/dailyCache.js
import { setCachedETA, getCachedETA } from '../lib/cache.js';
import { getWeekday, getTimeSlot } from '../utils/timeSlot.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const gilHospital = { x: 126.7214, y: 37.4487 };
const hereApiKey = process.env.HERE_API_KEY;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getMatrixETAs(origins, destinations) {
  const body = {
    origins: origins.map(p => ({ lat: p.y, lng: p.x })),
    destinations: destinations.map(p => ({ lat: p.y, lng: p.x })),
    transportMode: "car",
    regionDefinition: { type: "world" }
  };

  const url = `https://matrix.router.hereapi.com/v8/matrix?apikey=${hereApiKey}&async=false`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    if (!data.matrix || !data.matrix.length) throw new Error("Matrix 결과 없음");
    return data.matrix.map(item => Math.round(item.travelTime / 60));
  } catch (e) {
    console.error("❗ Matrix 호출 실패:", e.message);
    return [];
  }
}

async function run() {
  console.log("🧠 정기 ETA 캐싱 시작");

  const now = new Date();
  const weekday = getWeekday(now);
  const timeSlot = getTimeSlot(now);
  const traumaPath = path.join(__dirname, '../data/traumaPoints.json');
  const traumaPoints = JSON.parse(await fs.readFile(traumaPath, 'utf8'));

  const validTPs = traumaPoints
    .filter(tp => tp.x && tp.y && !isNaN(tp.x) && !isNaN(tp.y))
    .map(tp => ({ ...tp, x: parseFloat(tp.x), y: parseFloat(tp.y) }));

  const label = `${weekday}_${timeSlot}`;

  const key = `gilToTp_${gilHospital.x}_${gilHospital.y}_to_${validTPs[0].x}_${validTPs[0].y}_${label}`;
  const existing = await getCachedETA(gilHospital, validTPs[0], weekday, timeSlot, "gilToTp");
  if (existing) {
    console.log(`⏭️ 이미 수집된 시간대 (${label}) → 생략`);
    return;
  }

  console.log("➡️ 길 → TP 계산");
  const gilToTp = await getMatrixETAs([gilHospital], validTPs);
  for (let i = 0; i < validTPs.length; i++) {
    const tp = validTPs[i];
    const eta = gilToTp[i];
    if (eta != null) {
      await setCachedETA(gilHospital, tp, weekday, timeSlot, eta, "gilToTp");
    }
  }

  console.log("⬅️ TP → 길 계산");
  const tpToGil = await getMatrixETAs(validTPs, [gilHospital]);
  for (let i = 0; i < validTPs.length; i++) {
    const tp = validTPs[i];
    const eta = tpToGil[i];
    if (eta != null) {
      await setCachedETA(tp, gilHospital, weekday, timeSlot, eta, "tpToGil");
    }
  }

  console.log("✅ 정기 캐싱 완료");
}

run();
