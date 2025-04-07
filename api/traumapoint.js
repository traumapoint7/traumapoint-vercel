export default async function handler(req, res) {
  console.log("🔥 Traumapoint 추천 API 실행됨");

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { origin } = req.body;
  const gilHospital = { x: 126.7214, y: 37.4487 }; // 길병원 좌표

  const traumaPoints = [
    { name: "인하대학교의과대학부속병원", address: "인천 중구 인항로 27", type: "권역응급의료센터", phone: "032-890-2310" },
    { name: "김포우리병원", address: "김포시 감암로 11", type: "지역센터", phone: "031-999-1000" },
    { name: "광명성애병원", address: "광명시 디지털로 36", type: "지역센터", phone: "02-2680-7114" },
    { name: "부천성모병원", address: "부천시 소사로 327", type: "지역센터", phone: "1577-0675" },
    { name: "순천향대부속부천병원", address: "부천시 조마루로 170", type: "권역센터", phone: "032-621-5114" },
    { name: "부천세종병원", address: "부천시 호현로489번길 28", type: "지역센터", phone: "1599-6677" },
    { name: "중앙대광명병원", address: "광명시 덕안로 110", type: "지역센터", phone: "1811-7800" },
    { name: "센트럴병원", address: "시흥시 공단1대로 237", type: "지역기관", phone: "1588-9339" },
    { name: "시화병원", address: "시흥시 군자천로 381", type: "지역센터", phone: "1811-7000" },
    { name: "한림병원", address: "인천 계양구 장제로 722", type: "지역응급의료센터", phone: "032-540-9114" },
    { name: "인천적십자병원", address: "인천 연수구 원인재로 263", type: "지역응급의료기관", phone: "0507-1404-4009" },
    { name: "강화소방서", address: "인천 강화군 강화읍 중앙로 505", type: "소방서", phone: "032-930-5801" }
    // ... 추가 소방서 병원 자유롭게 확장 가능
  ];

  const headers = {
    Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
  };

  const getCoordinates = async (query) => {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url, { headers });
      const data = await response.json();
      if (data.documents.length > 0) {
        return {
          x: parseFloat(data.documents[0].x),
          y: parseFloat(data.documents[0].y),
        };
      }
    } catch (err) {
      console.error(`좌표 검색 실패 (${query})`, err);
    }
    return null;
  };

  const getETA = async (from, to) => {
    const url = 'https://apis-navi.kakaomobility.com/v1/directions';
    const headersNavi = {
      Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
      'Content-Type': 'application/json',
    };
    const body = {
      origin: { x: from.x, y: from.y },
      destination: { x: to.x, y: to.y },
      priority: 'RECOMMEND'
    };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headersNavi,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.routes?.[0]?.summary?.duration) {
        return data.routes[0].summary.duration / 60; // 초 → 분
      }
    } catch (error) {
      console.error('ETA 계산 오류:', error);
    }
    return null;
  };

  const results = [];

  for (const point of traumaPoints) {
    console.log(`➡️ 병원 진입: ${point.name}`);
    const coords = await getCoordinates(point.name);
    if (!coords) {
      console.log(`❗ 좌표 검색 실패: ${point.name}`);
      continue;
    }

    const eta119 = await getETA(origin, coords);
    const etaDoc = await getETA(gilHospital, coords);
    if (eta119 == null || etaDoc == null) {
      console.log(`❗ ETA 계산 실패 - ${point.name}`);
      continue;
    }

    const docArrival = etaDoc + 15;
    if (docArrival >= eta119) continue;

    const tpToGil = await getETA(coords, gilHospital);
    const totalTime = eta119 + tpToGil;
    const diff = eta119 - docArrival;

    let category = 'Safe';
    if (diff <= 5) category = 'Fast';
    else if (diff <= 10) category = 'Accurate';

    results.push({
      name: point.name,
      phone: point.phone,
      type: point.type,
      eta119: eta119.toFixed(1),
      etaDoc: docArrival.toFixed(1),
      tpToGil: tpToGil.toFixed(1),
      total: totalTime.toFixed(1),
      category,
    });
  }

  results.sort((a, b) => a.total - b.total);
  res.status(200).json({ recommendations: results.slice(0, 12) });
}
