const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');
const path = require('path');

// 길병원 위치
const gilHospital = { x: 126.7214, y: 37.4487 };
// Tmap appKey
const appKey = '여기에_너의_appKey_입력';

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

async function getETAsFrom(from, destinations, appKey) {
  const passList = destinations.map(p => `${p.x},${p.y}`).join('_');

  const res = await fetch('https://apis.openapi.sk.com/tmap/routes?version=1&format=json&callback=result', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'appKey': appKey
    },
    body: JSON.stringify({
      startX: from.x.toString(),
      startY: from.y.toString(),
      endX: '126.7214',
      endY: '37.4487',
      passList,
      reqCoordType: 'WGS84GEO',
      resCoordType: 'WGS84GEO',
      searchOption: 0,
      trafficInfo: 'Y'
    })
  });

  const data = await res.json();
  const features = data.features || [];

  const resultTimes = [];
  let accTime = 0;
  for (const f of features) {
    const desc = f.properties.description;
    if (desc && desc.includes('경유지')) {
      accTime += f.properties.totalTime;
      resultTimes.push(Math.round(accTime / 60)); // 초 → 분
    }
  }
  return resultTimes;
}

module.exports = async function handler(req, res) {
  console.log("🔥 traumapoint 최적화 API 실행됨");

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { origin } = req.body;
  console.log("📍 출발지:", origin);

  const traumaPointsPath = path.join(process.cwd(), 'data', 'traumaPoints.json');
  let traumaPoints = [];
  try {
    const jsonData = fs.readFileSync(traumaPointsPath, 'utf8');
    traumaPoints = JSON.parse(jsonData);
  } catch (err) {
    console.error("❌ traumaPoints.json 로드 실패:", err);
    return res.status(500).json({ message: '서버 에러: JSON 로딩 실패' });
  }

  // ① 현장 → 길병원 direct 이송 시간
  const [directToGil] = await getETAsFrom(origin, [gilHospital], appKey);
  console.log("🚑 directToGil:", directToGil, "분");

  // ② ETA119 계산 + 필터링
  let eta119Results = [];
  for (const chunk of chunkArray(traumaPoints, 20)) {
    const etas = await getETAsFrom(origin, chunk, appKey);
    etas.forEach((eta, i) => {
      if (eta < directToGil) {
        eta119Results.push({ ...chunk[i], eta119: eta });
      }
    });
  }
  console.log("🚨 ETA119 필터링 후 개수:", eta119Results.length);

  // ③ docArrival 계산 + 필터링
  let filtered = [];
  for (const chunk of chunkArray(eta119Results, 20)) {
    const etas = await getETAsFrom(gilHospital, chunk, appKey);
    etas.forEach((eta, i) => {
      const docArrival = eta + 15;
      const tp = chunk[i];
      if (docArrival < tp.eta119) {
        filtered.push({ ...tp, etaDoc: docArrival });
      }
    });
  }
  console.log("🧪 docArrival 필터링 후 개수:", filtered.length);

  // ④ Safe/On-time 분류 + 상위 10개 선택
  filtered.forEach(tp => {
    tp.diff = tp.eta119 - tp.etaDoc;
  });

  filtered.sort((a, b) => (a.eta119 + a.etaDoc) - (b.eta119 + b.etaDoc));

  const safe = filtered.filter(tp => tp.diff >= 10).slice(0, 4);
  const rest = filtered.filter(tp => tp.diff < 10).slice(0, 6);
  const selected = [...safe, ...rest];

  // ⑤ traumaPoint → 길병원 계산 (tpToGil)
  const tpToGilTimes = await getETAsFromBatch(selected, gilHospital, appKey);
  tpToGilTimes.forEach((t, i) => {
    selected[i].tpToGil = t;
    selected[i].total = selected[i].eta119 + t;
  });

  // ⑥ 정렬 후 응답
  selected.sort((a, b) => a.total - b.total);

  console.log("📦 최종 추천:", selected.length);
  res.status(200).json({ recommendations: selected });
};

// helper: traumaPoint 각각 출발 → 길병원 도착 ETA
async function getETAsFromBatch(points, destination, appKey) {
  const times = [];
  for (const chunk of chunkArray(points, 20)) {
    const chunkETAs = await getETAsFrom(chunk[0], chunk, appKey);
    times.push(...chunkETAs);
  }
  return times;
}
