// api/traumapoint.js
import { getCachedETA, setCachedETA } from "../lib/cache.js";
import { getWeekday, getTimeSlot } from "../utils/timeSlot.js";
import { haversineDistance } from "../lib/geo.js";
import { getKakaoETA } from "../lib/geo/kakaoDirections.js";
import { getKakaoMultiDestinationETAs } from "../lib/geo/kakaoMultiDirections.js";
import { getMultiOriginETAs } from "../lib/geo/kakaoMultiOrigins.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gilHospital = { x: 126.7214, y: 37.4487 };

// ✅ 청크 유틸
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

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

  // ✅ origin → tp
  const eta119List = await Promise.all(
    validTPs.map(tp => getCachedETA(origin, tp, weekday, timeSlot, "originToTp"))
  );

  const missingIndexes = eta119List.map((eta, i) => (eta == null ? i : null)).filter(i => i != null);
  const missingTPs = missingIndexes.map(i => validTPs[i]);

  // ✅ 다중 목적지 API 호출 (청크 처리)
  const chunks = chunkArray(missingTPs, 30);
  let fetchedETAs = [];
  for (const chunk of chunks) {
    const chunkETAs = await getKakaoMultiDestinationETAs(origin, chunk);
    fetchedETAs.push(...chunkETAs);
  }

  for (let i = 0; i < missingIndexes.length; i++) {
    const idx = missingIndexes[i];
    const eta = fetchedETAs[i];
    if (eta != null) {
      eta119List[idx] = eta;
      await setCachedETA(origin, validTPs[idx], weekday, timeSlot, eta, "originToTp");
    }
  }

  const candidates = validTPs.filter((tp, i) => eta119List[i] != null && eta119List[i] < directToGil);

  // ✅ gil → tp (청크 처리)
  const gilToTpList = await Promise.all(
    candidates.map(tp => getCachedETA(gilHospital, tp, weekday, timeSlot, "gilToTp"))
  );

  const gilMissingIdx = gilToTpList.map((eta, i) => (eta == null ? i : null)).filter(i => i != null);
  const gilMissingTPs = gilMissingIdx.map(i => candidates[i]);

  const gilChunks = chunkArray(gilMissingTPs, 30);
  let gilFetchedETAs = [];
  for (const chunk of gilChunks) {
    const chunkETAs = await getKakaoMultiDestinationETAs(gilHospital, chunk);
    gilFetchedETAs.push(...chunkETAs);
  }

  for (let i = 0; i < gilMissingIdx.length; i++) {
    const idx = gilMissingIdx[i];
    const eta = gilFetchedETAs[i];
    if (eta != null) {
      gilToTpList[idx] = eta;
      await setCachedETA(gilHospital, candidates[idx], weekday, timeSlot, eta, "gilToTp");
    }
  }

  const docArrivalList = gilToTpList.map(eta => (eta != null ? eta + 15 : null));

  const docFiltered = candidates.filter((tp, i) => {
    const eta119 = eta119List[validTPs.indexOf(tp)];
    const docArrival = docArrivalList[i];
    return eta119 && docArrival && eta119 > docArrival;
  });

  // ✅ tp → gil (청크 처리: 다중 출발지)
  const tpToGilList = await Promise.all(
    docFiltered.map(tp => getCachedETA(tp, gilHospital, weekday, timeSlot, "tpToGil"))
  );

  const tpMissingIdx = tpToGilList.map((eta, i) => (eta == null ? i : null)).filter(i => i != null);
  const tpMissingTPs = tpMissingIdx.map(i => docFiltered[i]);

  const tpChunks = chunkArray(tpMissingTPs, 30);
  let tpFetchedETAs = [];
  for (const chunk of tpChunks) {
    const chunkETAs = await getMultiOriginETAs(chunk, gilHospital);
    tpFetchedETAs.push(...chunkETAs);
  }

  for (let i = 0; i < tpMissingIdx.length; i++) {
    const idx = tpMissingIdx[i];
    const eta = tpFetchedETAs[i];
    if (eta != null) {
      tpToGilList[idx] = eta;
      await setCachedETA(docFiltered[idx], gilHospital, weekday, timeSlot, eta, "tpToGil");
    }
  }

  // ✅ 최종 정리
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
