export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { origin } = req.body;
  const gilHospital = { x: 126.7214, y: 37.4487 }; // 길병원 고정 좌표

  const traumaPoints = [
    {
      name: "인하대학교의과대학부속병원",
      type: "권역응급의료센터",
      x: 126.79303,
      y: 37.48749,
      phone: "032-890-2310"
    },
    {
      name: "김포우리병원",
      type: "지역센터",
      x: 126.71055,
      y: 37.63300,
      phone: "031-999-1000"
    },
    {
      name: "광명성애병원",
      type: "지역센터",
      x: 126.87221,
      y: 37.47305,
      phone: "02-2680-7114"
    },
    {
      name: "부천성모병원",
      type: "지역센터",
      x: 126.79302,
      y: 37.48749,
      phone: "1577-0675"
    },
    {
      name: "순천향대부속부천병원",
      type: "권역센터",
      x: 126.76211,
      y: 37.49836,
      phone: "032-621-5114"
    },
    {
      name: "부천세종병원",
      type: "지역센터",
      x: 126.79119,
      y: 37.48104,
      phone: "1599-6677"
    },
    {
      name: "중앙대광명병원",
      type: "지역센터",
      x: 126.88592,
      y: 37.42457,
      phone: "1811-7800"
    },
    {
      name: "플러스의료재단 단원병원",
      type: "지역기관",
      x: 126.81326,
      y: 37.30021,
      phone: "8040-6600"
    },
    {
      name: "센트럴병원",
      type: "지역기관",
      x: 126.72845,
      y: 37.33666,
      phone: "1588-9339"
    },
    {
      name: "시화병원",
      type: "지역센터",
      x: 126.73701,
      y: 37.34990,
      phone: "1811-7000"
    },
    {
      name: "인천적십자병원",
      type: "지역응급의료기관",
      x: 126.694,
      y: 37.422,
      phone: "0507-1404-4009"
    },
    {
      name: "인천세종병원",
      type: "지역응급의료센터",
      x: 126.738,
      y: 37.538,
      phone: "032-240-8000"
    }
  ];

  const headers = {
    Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}`,
    'Content-Type': 'application/json',
  };

  const getETA = async (from, to) => {
    const url = 'https://apis-navi.kakaomobility.com/v1/directions';
    const body = {
      origin: { x: from.x, y: from.y },
      destination: { x: to.x, y: to.y },
      priority: 'RECOMMEND'
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
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
    const eta119 = await getETA(origin, point);
    const etaDoc = await getETA(gilHospital, point);

    if (eta119 == null || etaDoc == null) continue;

    const docArrival = etaDoc + 15;
    if (docArrival >= eta119) continue;

    const tpToGil = await getETA(point, gilHospital);
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
