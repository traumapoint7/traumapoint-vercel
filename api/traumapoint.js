import { getTmapRoute } from "../lib/geo/tmapRoute.js";
import fs from "fs";

const traumaPoints = JSON.parse(fs.readFileSync("./data/traumaPoints_within_9km.json", "utf-8"));

const GIL = {
  name: "길병원",
  lat: 37.4484902659502,
  lon: 126.75475575788,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { origin } = req.body;
  if (!origin || typeof origin.lat !== "number" || typeof origin.lon !== "number") {
    return res.status(400).json({ error: "Invalid origin (lat/lon required)" });
  }

  try {
    const originPoint = { lat: origin.lat, lon: origin.lon };

    // 길병원 직송 ETA
    const directToGil = await getTmapRoute(originPoint, GIL);
    const directToGilETA = Math.round(directToGil.duration / 60);

    // 1. origin → traumaPoints (119)
    const eta119List = await Promise.all(
      traumaPoints.map(async (tp) => {
        const route = await getTmapRoute(originPoint, tp);
        const eta119 = Math.round(route.duration / 60);
        if (eta119 <= directToGilETA + 20) return null;
        return { ...tp, eta119 };
      })
    );

    // 2. 길병원 → traumaPoints (닥터카)
    const withDocETA = await Promise.all(
      eta119List.filter(Boolean).map(async (tp) => {
        const route = await getTmapRoute(GIL, tp, { departureOffsetMin: 15 });
        const etaDocRaw = Math.round(route.duration / 60); // 15분 지연 시점의 교통 기준
        const etaDoc = etaDocRaw + 15; // 출발 지연 시간 더함

        if (tp.eta119 <= etaDoc) return null;
        if (etaDocRaw > directToGilETA + 20) return null;

        return { ...tp, eta119: tp.eta119, etaDoc, etaDocRaw };
      })
    );

    // 3. traumaPoint → 길병원 (인계 시점부터)
    const withTpToGil = await Promise.all(
      withDocETA.filter(Boolean).map(async (tp) => {
        const departure = new Date();
        departure.setMinutes(departure.getMinutes() + tp.eta119); // 119 도착 시점 기준
        const route = await getTmapRoute(tp, GIL, { departureTime: departure });
        const tptogilETA = Math.round(route.duration / 60);
        const totalTransfer = tp.eta119 + tptogilETA;

        if (totalTransfer > directToGilETA + 20) return null;

        return {
          name: tp.name,
          lat: tp.lat,
          lon: tp.lon,
          eta119: tp.eta119,
          etaDoc: tp.etaDoc,
          etaDocRaw: tp.etaDocRaw,
          tptogilETA,
          totalTransfer
        };
      })
    );

    // 그룹 분류
    const grouped = { safe: [], accurate: [], fast: [] };

    withTpToGil.filter(Boolean).forEach(tp => {
      const gain = tp.eta119 - tp.etaDoc;
      const entry = {
        name: tp.name,
        lat: tp.lat,
        lon: tp.lon,
        eta119: tp.eta119,
        etaDoc: tp.etaDoc,
        etaDocRaw: tp.etaDocRaw,
        tptogilETA: tp.tptogilETA,
        totalTransfer: tp.totalTransfer,
      };

      if (gain >= 10) grouped.safe.push(entry);
      else if (gain >= 5) grouped.accurate.push(entry);
      else if (gain >= 3) grouped.fast.push(entry);
    });

    // 그룹 정렬: 총 이송시간 기준 오름차순
    Object.keys(grouped).forEach(key => {
      grouped[key] = grouped[key]
        .sort((a, b) => a.totalTransfer - b.totalTransfer)
        .slice(0, 4);
    });

    res.status(200).json({
      origin,
      directToGilETA,
      recommendations: grouped,
    });

  } catch (e) {
    console.error("🚨 Tmap 계산 실패:", e);
    res.status(500).json({ error: e.message || "Tmap API 호출 오류" });
  }
}
