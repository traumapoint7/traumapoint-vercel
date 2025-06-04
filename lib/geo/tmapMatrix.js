import fetch from 'node-fetch';

const TMAP_API_KEY = process.env.TMAP_APP_KEY;

export async function getMatrixETAs(origin, destinations) {
  const url = 'https://apis.openapi.sk.com/tmap/routes/matrix?version=1';

  // 목적지 배열 구성
  const destCoords = destinations.map((dest, idx) => ({
    id: `dest${idx}`,
    lat: dest.lat,
    lon: dest.lon
  }));

  const payload = {
    format: 'json',
    reqCoordType: 'WGS84GEO',
    resCoordType: 'WGS84GEO',
    routeInfo: 'duration', // ETA 계산
    startList: [{
      startX: origin.lon.toString(),
      startY: origin.lat.toString(),
      startTime: getCurrentTimeString()
    }],
    endList: destCoords.map(d => ({
      endX: d.lon.toString(),
      endY: d.lat.toString(),
      id: d.id
    }))
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      appKey: TMAP_API_KEY
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Matrix API 호출 실패: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  const results = {};
  data.matrixElement.forEach((el, i) => {
    const id = destCoords[i].id;
    results[id] = el.duration; // duration: 초 단위
  });

  return results; // { dest0: 1234, dest1: 2480, ... }
}

// 현재 시각을 YYYYMMDDHHmm 형식으로 반환
function getCurrentTimeString() {
  const now = new Date();
  return (
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0')
  );
}