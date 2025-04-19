// api/traumapoint.js
import { getCachedETA, setCachedETA } from "../lib/cache.js";
import { getWeekday, getTimeSlot } from "../utils/timeSlot.js";
import { haversineDistance } from "../lib/geo.js";
import {
  getKakaoETA,
  getKakaoMultiDestinationETAs,
  getMultiOriginETAs
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

  // ✅ directToGil
  let directToGil = await getCachedETA(origin, gilHospital, weekday, timeSlot, "originToGil");
  if (directToGil == null) {
    directToGil = await getKakaoETA(origin, gilHospital);
    if (directToGil != null) {
      await setCachedETA(origin, gilHospital, weekday, timeSlot, directToGil, "originToGil");
    }
  }

  if (directToGil == null) return res.status(500).json({ message: "❌ directToGil 계산 실패" });

  // ✅ origin → tp (다중 목적지)
  const eta119List = await Promise.all(
    validTPs.map(tp => getCachedETA(origin, tp, weekday, timeSlot, "originToTp"))
  );

  const missingOriginToTp = validTPs.filter((_, i) => eta119List[i] == null);
  const fetchedOriginToTp = await getKakaoMultiDestinationETAs(origin, missingOriginToTp);

  missingOriginToTp.forEach((tp, idx) => {
    const globalIdx = validTPs.indexOf(tp);
    if (fetchedOriginToTp[idx] != null) {
      eta119List[globalIdx] = fetchedOriginToTp[idx];
      setCachedETA(origin, tp, weekday, timeSlot, fetchedOriginToTp[idx], "originToTp");
    }
  });

  const candidates = validTPs.filter((tp, i) => {
    const eta = eta119List[i];
    return eta != null && eta < directToGil;
  });

  // ✅ gil → tp (다중 목적지)
  const gilToTpList = await Promise.all(
    candidates.map(tp => getCachedETA(gilHospital, tp, weekday, timeSlot, "gilToTp"))
  );

  const missingGilToTp = candidates.filter((_, i) => gilToTpList[i] == null);
  const fetchedGilToTp = await getKakaoMultiDestinationETAs(gilHospital, missingGilToTp);

  missingGilToTp.forEach((tp, idx) => {
    const globalIdx = candidates.indexOf(tp);
    if (fetchedGilToTp[idx] != null) {
      gilToTpList[globalIdx] = fetchedGilToTp[idx];
      setCachedETA(gilHospital, tp, weekday, timeSlot, fetchedGilToTp[idx], "gilToTp");
    }
  });

  const docArrivalList = gilToTpList.map(eta => (eta != null ? eta + 15 : null));

  const docFiltered = candidates.filter((tp, i) => {
    const eta119 = eta119List[validTPs.indexOf(tp)];
    const docArrival = docArrivalList[i];
    return eta119 && docArrival && eta119 > docArrival;
  });

  // ✅ tp → gil (다중 출발지)
  const tpToGilList = await Promise.all(
    docFiltered.map(tp => getCachedETA(tp, gilHospital, weekday, timeSlot, "tpToGil"))
  );

  const missingTpToGil = docFiltered.filter((_, i) => tpToGilList[i] == null);
  const fetchedTpToGil = await getMultiOriginETAs(missingTpToGil, gilHospital);

  missingTpToGil.forEach((tp, idx) => {
    const globalIdx = docFiltered.indexOf(tp);
    if (fetchedTpToGil[idx] != null) {
      tpToGilList[globalIdx] = fetchedTpToGil[idx];
      setCachedETA(tp, gilHospital, weekday, timeSlot, fetchedTpToGil[idx], "tpToGil");
    }
  });

  // ✅ 최종 결과
  const results = docFiltered.map((tp, i) => {
    const eta119 = eta119List[validTPs.indexOf(tp)];
    const etaDoc = docArrivalList[i];
    const tpToGil = tpToGilList[i];
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
