// api/traumapoint.js
import { getCachedETA, setCachedETA } from "../lib/cache.js";
import { getWeekday, getTimeSlot } from "../utils/timeSlot.js";
import { haversineDistance } from "../lib/geo.js";
import { getKakaoETA } from "../lib/geo/kakaoDirections.js";
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

  // ✅ directToGil (origin -> gil)
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

  const fetched119List = await Promise.all(
    validTPs.map(async (tp, i) => {
      if (eta119List[i] == null) {
        const eta = await getKakaoETA(origin, tp);
        if (eta != null) {
          await setCachedETA(origin, tp, weekday, timeSlot, eta, "originToTp");
        }
        return eta;
      }
      return eta119List[i];
    })
  );

  const candidates = validTPs.filter((tp, i) => {
    const eta = fetched119List[i];
    return eta != null && eta < directToGil;
  });

  // ✅ gil → tp
  const gilToTpList = await Promise.all(
    candidates.map(tp => getCachedETA(gilHospital, tp, weekday, timeSlot, "gilToTp"))
  );

  const updatedGilToTpList = await Promise.all(
    candidates.map(async (tp, i) => {
      if (gilToTpList[i] == null) {
        const eta = await getKakaoETA(gilHospital, tp);
        if (eta != null) {
          await setCachedETA(gilHospital, tp, weekday, timeSlot, eta, "gilToTp");
        }
        return eta;
      }
      return gilToTpList[i];
    })
  );

  // ✅ docArrival 계산
  const docArrivalList = updatedGilToTpList.map(eta => (eta != null ? eta + 15 : null));

  const docFiltered = candidates.filter((tp, i) => {
    const eta119 = fetched119List[validTPs.indexOf(tp)];
    const docArrival = docArrivalList[i];
    return eta119 && docArrival && eta119 > docArrival;
  });

  // ✅ tp → gil
  const tpToGilList = await Promise.all(
    docFiltered.map(tp => getCachedETA(tp, gilHospital, weekday, timeSlot, "tpToGil"))
  );

  const updatedTpToGilList = await Promise.all(
    docFiltered.map(async (tp, i) => {
      if (tpToGilList[i] == null) {
        const eta = await getKakaoETA(tp, gilHospital);
        if (eta != null) {
          await setCachedETA(tp, gilHospital, weekday, timeSlot, eta, "tpToGil");
        }
        return eta;
      }
      return tpToGilList[i];
    })
  );

  // ✅ 최종 결과 구성
  const results = docFiltered.map((tp, i) => {
    const eta119 = fetched119List[validTPs.indexOf(tp)];
    const etaDoc = docArrivalList[i];
    const tpToGil = updatedTpToGilList[i];
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
