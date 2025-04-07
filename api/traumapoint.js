module.exports = async function handler(req, res) {
  console.log("🔥 Traumapoint 추천 API 실행됨");

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { origin } = req.body;
  console.log("🚀 origin 좌표:", origin); // ✅ 요 줄 추가한 거예요

  const gilHospital = { x: 126.7214, y: 37.4487 };

  const traumaPoints = [
    { name: "김포우리병원", x: 126.7171, y: 37.6155 },
    { name: "부천성모병원", x: 126.7635, y: 37.4860 },
    { name: "광명성애병원", x: 126.8643, y: 37.4790 },
    { name: "중앙대광명병원", x: 126.8649, y: 37.4773 },
    { name: "부천소방서", x: 126.7870, y: 37.5039 },
    { name: "센트럴병원", x: 126.7381, y: 37.3415 },
    { name: "시화병원", x: 126.7425, y: 37.3445 }
  ];

  const getETA = async (from, to) => {
    try {
      const resp = await fetch(`https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json&callback=result`, {
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
          resCoordType: "WGS84GEO"
        })
      });
      const data = await resp.json();
      return data.features?.[0]?.properties?.totalTime / 60 || null;
    } catch (err) {
      console.error("❗ ETA 계산 실패", err);
      return null;
    }
  };

  const results = [];

  for (const tp of traumaPoints) {
    const eta119 = await getETA(origin, tp);
    const etaDoc = await getETA(gilHospital, tp);

    if (!eta119 || !etaDoc) continue;

    const docArrival = etaDoc + 15;
    if (docArrival >= eta119) continue;

    const tpToGil = await getETA(tp, gilHospital);
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
  res.status(200).json({ recommendations: results.slice(0, 10) });
};
