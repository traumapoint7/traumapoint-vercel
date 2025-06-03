require('dotenv').config();  // ⬅️ .env에서 API 키 로드
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const TMAP_APP_KEY = process.env.TMAP_APP_KEY;

const INPUT_FILE = path.join(__dirname, 'data', 'traumaPoints_within_9km.json');
const OUTPUT_FILE = path.join(__dirname, 'data', 'traumaPoints_adjusted.json');

async function getNearestRoad(lat, lon) {
  const url = `https://apis.openapi.sk.com/tmap/road/nearToRoad?version=1&lat=${lat}&lon=${lon}`;
  try {
    const response = await axios.get("https://apis.openapi.sk.com/tmap/road/nearToRoad", {
  params: {
    version: 1,
    lat,
    lon,
    appKey: TMAP_APP_KEY
  }
});

    const roadData = response.data?.resultData?.header;
    if (roadData && roadData.point) {
      return {
        lat: roadData.point.latitude,
        lon: roadData.point.longitude,
      };
    } else {
      console.warn(`⚠️ 도로정보 없음: (${lat}, ${lon})`);
      return { lat, lon };
    }
  } catch (error) {
    console.error(`❌ 도로 좌표 요청 실패 (${lat}, ${lon}):`, error.message);
    return { lat, lon };
  }
}

async function processPoints() {
  const originalData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const adjustedData = [];

  for (const point of originalData) {
    const { lat, lon, name } = point;
    console.log(`📍 ${name} (${lat}, ${lon}) → 도로 보정 중...`);
    const adjusted = await getNearestRoad(lat, lon);
    adjusted.name = name;
    adjustedData.push(adjusted);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(adjustedData, null, 2), 'utf8');
  console.log(`✅ 도로 기반 좌표 저장 완료: ${OUTPUT_FILE}`);
}

processPoints();
