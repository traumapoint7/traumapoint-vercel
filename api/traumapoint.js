export default async function handler(req, res) {
  console.log("🔥 Traumapoint 추천 API 실행됨");

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { origin } = req.body;
  const gilHospital = { x: 126.7214, y: 37.4487 };

  const traumaPoints = [
    "인하대학교의과대학부속병원", "김포우리병원", "광명성애병원",
    "부천성모병원", "순천향대부속부천병원", "부천세종병원",
    "중앙대광명병원", "플러스의료재단 단원병원", "센트럴병원",
    "시화병원", "한림병원", "인천적십자병원",
    "강화소방서", "연수소방서", "김포소방서",
    "광명소방서", "부천소방서", "시흥소방서"
  ];

  const headers = {
    Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}`,
    'Content-Type': 'application/json'
  };

  // 좌표 보정 함수
  const getCoordinates = async (placeName) => {
    try {
      const resp = await fetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(placeName)}`,
        { headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}` } }
      );
      const data = await resp.json();

      if (!data.documents || data.documents.length === 0) {
        console.error(`❗ 좌표 검색 실패: ${placeName}`);
        return null;
      }

      const loc = data.documents[0];
      return { x: parseFloat(loc.x), y: parseFloat(loc.y) };
    } catch (err) {
      console.error(`❗ Kakao 검색 API 실패 (${placeName})`, err);
      return null;
    }
  };

  // ETA 계산 함수
  const getETA = async (from, to) => {
    try {
      const res = await fetch('https://apis-navi.kakaomobility.com/v1/directions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          origin: { x: from.x, y: from.y },
          destination: { x: to.x, y: to.y },
          priority: 'RECOMMEND'
        })
      });
      const data = await res.json();
      return data.routes?.[0]?.summary?.duration / 60 || null; // 초 → 분
    } catch (err) {
      console.error("❗ ETA 계산 실패", err);
      return null;
    }
  };

  const results = [];

  for (const name of traumaPoints) {
    console.log(`➡️ 병원 진입: ${name}`);
    const coords = await getCoordinates(name);
    if (!coords) continue;

    const eta119 = await getETA(origin, coords);
    const etaDoc = await getETA(gilHospital, coords);

    if (eta119 == null || etaDoc == null) {
      console.log(`❗ ETA 계산 실패 - ${name} eta119: ${eta119}, etaDoc: ${etaDoc}`);
      continue;
    }

    const docArrival = etaDoc + 15;

    if (docArrival >= eta119) continue; // 닥터카 먼저 도착 못함 ❌

    const tpToGil = await getETA(coords, gilHospital);
    const totalTime = eta119 + tpToGil;

    const diff = eta119 - docArrival;
    let category = "Safe";
    if (diff <= 5) category = "Fast";
    else if (diff <= 10) category = "Accurate";

    results.push({
      name,
      eta119: eta119.toFixed(1),
      etaDoc: docArrival.toFixed(1),
      tpToGil: tpToGil.toFixed(1),
      total: totalTime.toFixed(1),
      category
    });
  }

  results.sort((a, b) => a.total - b.total);
  res.status(200).json({ recommendations: results.slice(0, 12) });
}
