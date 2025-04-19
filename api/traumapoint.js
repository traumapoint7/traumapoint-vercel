// api/traumapoint.js
import { getCachedETA, setCachedETA } from "../lib/cache.js";
import { getWeekday, getTimeSlot } from "../utils/timeSlot.js";
import { haversineDistance } from "../lib/geo.js";
import {
  getKakaoETA,
  getKakaoETAs,
  getKakaoETAsFromMultipleOrigins
} from "../lib/geo/kakaoDirections.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gilHospital = { x: 126.7214, y: 37.4487 };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { origin } = req.body;
  const now = new Date();
  const weekday = getWeekday(now);
  const timeSlot = getTimeSlot(now);

  const traumaPath = path.join(__dirname, "../data/traumaPoints.json");
  const traumaPoints = JSON.parse(await fs.readFile(traumaPath, "utf8"));

  const validTPs = traumaPoints
    .filter(tp => tp.x && tp.y && !isNaN(tp.x) && !isNaN(tp.y))
    .map(tp => ({ ...tp, x: parseFloat(tp.x), y: parseFloat(tp.y) }))
    .filter(tp => haversineDistance(origin, tp) <= haversineDistance(origin, gilHospital));

  // ✅ directToGil (origin → gil): 단일 호출
  let directToGil = await getCachedETA(origin, gilHospital, weekday, timeSlot, "originToGil");
  if (directToGil == null) {
    directToGil = await getKakaoETA(origin, gilHospital);
    if (directToGil != null) {
      await setCachedETA(origin, gilHospital, weekday, timeSlot, directToGil, "originToGil");
    }
  }
  if (directToGil == null) return res.status(500).json({ message: "❌ directToGil 계산 실패" });

  // ✅ origin → tp (다중 목적지)
  const originToTpKeys = validTPs.map(tp => ({
    tp,
    key: `originToTp_${origin.x}_${origin.y}_to_${tp.x}_${tp.y}_${weekday}_${timeSlot}`
  }));

  const cachedOriginToTp = await Promise.all(
    originToTpKeys.map(({ tp }) => getCachedETA(origin, tp, weekday, timeSlot, "originToTp"))
  );

  const missingOriginToTp = originToTpKeys
    .map((obj, idx) => (cachedOriginToTp[idx] == null ? obj.tp : null))
    .filter(Boolean);

  const fetchedETAs = await getKakaoETAs(origin, missingOriginToTp);

  for (let i = 0; i < missingOriginToTp.length; i++) {
    const tp = missingOriginToTp[i];
    const eta = fetchedETAs[i];
    if (eta != null) {
      await setCachedETA(origin, tp, weekday, timeSlot, eta, "originToTp");
    }
  }

  const fullEta119List = validTPs.map((tp, i) => {
    const cached = cachedOriginToTp[i];
    if (cached != null) return cached;
    const idx = missingOriginToTp.findIndex(mtp => mtp.name === tp.name);
    return idx >= 0 ? fetchedETAs[idx] : null;
  });

  // ✅ 후보 필터링
  const candidates = validTPs.filter((tp, i) => {
    const eta = fullEta119List[i];
    return eta != null && eta < directToGil;
  });

  // ✅ gil → tp (다중 목적지)
  const gilToTpKeys = candidates.map(tp => ({
    tp,
    key: `gilToTp_${gilHospital.x}_${gilHospital.y}_to_${tp.x}_${tp.y}_${weekday}_${timeSlot}`
  }));

  const cachedGilToTp = await Promise.all(
    gilToTpKeys.map(({ tp }) => getCachedETA(gilHospital, tp, weekday, timeSlot, "gilToTp"))
  );

  const missingGilToTp = gilToTpKeys
    .map((obj, idx) => (cachedGilToTp[idx] == null ? obj.tp : null))
    .filter(Boolean);

  const fetchedGilETAs = await getKakaoETAs(gilHospital, missingGilToTp);

  for (let i = 0; i < missingGilToTp.length; i++) {
    const tp = missingGilToTp[i];
    const eta = fetchedGilETAs[i];
    if (eta != null) {
      await setCachedETA(gilHospital, tp, weekday, timeSlot, eta, "gilToTp");
    }
  }

  const fullGilToTpList = candidates.map((tp, i) => {
    const cached = cachedGilToTp[i];
    if (cached != null) return cached;
    const idx = missingGilToTp.findIndex(mtp => mtp.name === tp.name);
    return idx >= 0 ? fetchedGilETAs[idx] : null;
  });

  // ✅ docArrival
  const docArrivalList = fullGilToTpList.map(eta => (eta != null ? eta + 15 : null));

  const docFiltered = candidates.filter((tp, i) => {
    const eta119 = fullEta119List[validTPs.indexOf(tp)];
    const docArrival = docArrivalList[i];
    return eta119 && docArrival && eta119 > docArrival;
  });

  // ✅ tp → gil (다중 출발지)
  const tpToGilKeys = docFiltered.map(tp => ({
    tp,
    key: `tpToGil_${tp.x}_${tp.y}_to_${gilHospital.x}_${gilHospital.y}_${weekday}_${timeSlot}`
  }));

  const cachedTpToGil = await Promise.all(
    tpToGilKeys.map(({ tp }) => getCachedETA(tp, gilHospital, weekday, timeSlot, "tpToGil"))
  );

  const missingTpToGil = tpToGilKeys
    .map((obj, idx) => (cachedTpToGil[idx] == null ? obj.tp : null))
    .filter(Boolean);

  const fetchedTpToGilETAs = await getKakaoETAsFromMultipleOrigins(missingTpToGil, gilHospital);

  for (let i = 0; i < missingTpToGil.length; i++) {
    const tp = missingTpToGil[i];
    const eta = fetchedTpToGilETAs[i];
    if (eta != null) {
      await setCachedETA(tp, gilHospital, weekday, timeSlot, eta, "tpToGil");
    }
  }

  const fullTpToGilList = docFiltered.map((tp, i) => {
    const cached = cachedTpToGil[i];
    if (cached != null) return cached;
    const idx = missingTpToGil.findIndex(mtp => mtp.name === tp.name);
    return idx >= 0 ? fetchedTpToGilETAs[idx] : null;
  });

  // ✅ 최종 결과 구성
  const results = docFiltered.map((tp, i) => {
    const eta119 = fullEta119List[validTPs.indexOf(tp)];
    const etaDoc = docArrivalList[i];
    const tpToGil = fullTpToGilList[i];
    const total = eta119 + tpToGil;
    const gain = eta119 - etaDoc;
    const category = gain < 5 ? "Danger" : gain < 10 ? "On-time" : "Safe";

    return {
      name: tp.name,
      address: tp.address,
      tel: tp.tel,
      level: tp.level,
      type: tp.type,
      eta119: eta119?.toFixed(1),
      etaDoc: etaDoc?.toFixed(1),
      tpToGil: tpToGil?.toFixed(1),
      total: total?.toFixed(1),
      directToGilETA: directToGil?.toFixed(1),
      category
    };
  });

  results.sort((a, b) => parseFloat(a.total) - parseFloat(b.total));
  res.status(200).json({ recommendations: results.slice(0, 10) });
}
