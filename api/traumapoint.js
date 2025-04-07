export default async function handler(req, res) {
  console.log("🔥 Traumapoint 추천 API 실행됨");

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { origin } = req.body;
  const gilHospital = { x: 126.7214, y: 37.4487 };

  // 병원 및 소방서 목록과 좌표를 미리 정의
  const traumaPoints = [
    { name: "인하대학교의과대학부속병원", x: 126.6520, y: 37.4483 },
    { name: "김포우리병원", x: 126.7171, y: 37.6155 },
    { name: "광명성애병원", x: 126.8643, y: 37.4790 },
    { name: "부천성모병원", x: 126.7635, y: 37.4860 },
    { name: "순천향대부속부천병원", x: 126.7820, y: 37.5034 },
    { name: "부천세종병원", x: 126.7870, y: 37.5039 },
    { name: "중앙대광명병원", x: 126.8649, y: 37.4773 },
    { name: "플러스의료재단 단원병원", x: 126.8121, y: 37.3217 },
    { name: "센트럴병원", x: 126.7381, y: 37.3415 },
    { name: "시화병원", x: 126.7425, y: 37.3445 },
    { name: "한림병원", x: 126.7022, y: 37.5065 },
    { name: "인천적십자병원", x: 126.6874, y: 37.4765 },
    { name: "강화소방서", x: 126.4871, y: 37.7474 },
    { name: "연수소방서", x: 126.6785, y: 37.4180 },
    { name: "김포소방서", x: 126.7170, y: 37.6155 },
    { name: "광명소방서", x: 126.8643, y: 37.4790 },
    { name: "부천소방서", x: 126.7870, y: 37.5039 },
    { name: "시흥소방서", x: 126.7870, y: 37.3800 }
  ];

  const headers = {
    Authorization: `KakaoAK ${process.env.KAKAO_REST_KEY}`,
    'Content-Type': 'application/json'
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

  for (const point of traumaPoints) {
    console.log(`➡️ 병원 진입: ${point.name}`);

    const eta119 = await getETA(origin, point);
    const etaDoc = await getETA(gilHospital, point);

    if (eta119 == null || etaDoc == null) {
      console.log(`❗ ETA 계산 실패 - ${point.name} eta119: ${eta119}, etaDoc: ${etaDoc}`);
      continue;
    }

    const docArrival = etaDoc + 15;

    if (docArrival >= eta119) continue; // 닥터카 먼저 도착 못함 ❌

    const tpToGil = await getETA(point, gilHospital);
    const totalTime = eta119 + tpToGil;

    const diff = eta119 - docArrival;
    let category = "Safe";
    if (diff <= 5) category =
::contentReference[oaicite:12]{index=12}
