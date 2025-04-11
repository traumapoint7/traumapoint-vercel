const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  console.log("🔥 Traumapoint 추천 API 실행됨");

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { origin } = req.body;
  console.log("🚀 origin 좌표:", origin);

  const gilHospital = { x: 126.7214, y: 37.4487 };

  const traumaPointsPath = path.join(process.cwd(), 'data', 'traumaPoints.json');
  let traumaPoints = [];

  try {
    const jsonData = fs.readFileSync(traumaPointsPath, 'utf8');
    traumaPoints = JSON.parse(jsonData);
  } catch (err) {
    console.error("❌ traumaPoints.json 읽기 실패:", err.message);
    return res.status(500).json({ message: '서버 에러: JSON 로딩 실패' });
  }

  const getETA = async (from, to) => {
    try {
      const resp = await fetch(`https://apis.openapi.sk.com/tmap/routes?version=1&format=json&callback=result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'appKey': 'tEiRteq9K69x8eOSBcOJb3FWVFkzNRiJ3OxUBB1m'
        },
        body: JSON.stringify({
          startX: from.x.toString(),
          startY: from.y.toString(),
          endX: to.x.toString(),
          endY: to.y.toString(),
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
          startName: "출발지",
          endName: "도착지"
        })
      });

      const data = await resp.json();
      return data.features?.[0]?.properties?.totalTime / 60 || null;
    } catch (err) {
      console.error("❗ ETA 계산 실패", err);
      return null;
    }
  };

  const categorizedResults = {
    Fast: { hospitals: [], fireStations: [] },
    Accurate: { hospitals: [], fireStations: [] },
    Safe: { hospitals: [], fireStations: [] },
  };

  const directToGil = await getETA(origin, gilHospital);

  for (const tp of traumaPoints) {
    const tpCoords = { x: Number(tp.x), y: Number(tp.y) };

    const eta119 = await getETA(origin, tpCoords);
    const etaDoc = await getETA(gilHospital, tpCoords);

    if (!eta119 || !etaDoc) {
      console.log(`❌ ETA 실패: ${tp.name}`);
      continue;
    }

    const docArrival = etaDoc + 15;
    console.log(`🧭 ${tp.name} / 119: ${eta119.toFixed(1)} / DocArrival: ${docArrival.toFixed(1)}`);

    if (docArrival >= eta119) {
      console.log(`⚠️ 제외됨: ${tp.name} - docArrival(${docArrival.toFixed(1)}) >= eta119(${eta119.toFixed(1)})`);
      continue;
    }

    const tpToGil = await getETA(tpCoords, gilHospital);
    const total = eta119 + tpToGil;
    const diff = eta119 - docArrival;

    let category = "Safe";
    if (diff <= 5) category = "Fast";
    else if (diff <= 10) category = "Accurate";

    const result = {
      name: tp.name,
      address: tp.address,
      tel: tp.tel,
      eta119: eta119.toFixed(1),
      etaDoc: docArrival.toFixed(1),
      tpToGil: tpToGil.toFixed(1),
      total: total.toFixed(1),
      directToGilETA: directToGil?.toFixed(1) || null,
      category,
      type: tp.type,
      level: tp.level,
    };

    if (tp.type === '병원') {
      categorizedResults[category].hospitals.push(result);
    } else if (tp.type === '소방') {
      categorizedResults[category].fireStations.push(result);
    }
  }

  const finalResults = [];

  for (const category of ['Fast', 'Accurate', 'Safe']) {
    categorizedResults[category].hospitals
      .sort((a, b) => a.total - b.total)
      .slice(0, 2)
      .forEach(item => finalResults.push(item));

    categorizedResults[category].fireStations
      .sort((a, b) => a.total - b.total)
      .slice(0, 2)
      .forEach(item => finalResults.push(item));
  }

  console.log("📦 최종 추천 결과:", finalResults.length);
  res.status(200).json({ recommendations: finalResults });
};
