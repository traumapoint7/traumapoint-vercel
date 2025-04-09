const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  console.log("🔥 Traumapoint 추천 API 실행됨");

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { origin } = req.body;
  console.log("🚀 origin 좌표:", origin);

  // 길병원 위치 (수정된 좌표 순서 주의)
  const gilHospital = { x: 126.7214, y: 37.4487 };

  // traumaPoints.json 경로
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
      console.log("📦 ETA 응답 데이터:", data);
      return data.features?.[0]?.properties?.totalTime / 60 || null;
    } catch (err) {
      console.error("❗ ETA 계산 실패", err);
      return null;
    }
  };

  const results = [];

  for (const tp of traumaPoints) {
    const tpCoords = {
      x: Number(tp.x),
      y: Number(tp.y)
    };

    const eta119 = await getETA(origin, tpCoords);
    const etaDoc = await getETA(gilHospital, tpCoords);

    if (!eta119 || !etaDoc) continue;

    const docArrival = etaDoc + 15;
    if (docArrival >= eta119) continue;

    const tpToGil = await getETA(tpCoords, gilHospital);
    const total = eta119 + tpToGil;

    const diff = eta119 - docArrival;
    let category = "Safe";
    if (diff <= 5) category = "Fast";
    else if (diff <= 10) category = "Accurate";

    results.push({
      name: tp.name,
      eta119: eta119.toFixed(1),
      etaDoc: docArrival.toFixed(1),
      tpToGil: tpToGil.toFixed(1),
      total: total.toFixed(1),
      category
    });
  }

  results.sort((a, b) => a.total - b.total);
  console.log("📦 최종 추천 결과:", results.length);
  res.status(200).json({ recommendations: results.slice(0, 10) });
};