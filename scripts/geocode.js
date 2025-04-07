const axios = require('axios');
const fs = require('fs');

const appKey = 'tEiRteq9K69x8eOSBcOJb3FWVFkzNRiJ3OxUBB1m'; // Tmap 앱키 그대로

const names = [
  "김포소방서",
  // "중앙119안전센터 (김포)",
  "양촌119안전센터",
  "마산119안전센터", "대곶119안전센터", "통진119안전센터",
  "고촌119안전센터", "하성119안전센터", "괴안119안전센터",
  "범박119안전센터", "오정119안전센터", "원종119안전센터",
  "여월119안전센터", "부천소방서",
  // "중앙119안전센터 (부천)",
  "중동119안전센터", "상동119안전센터", "서부119안전센터",
  "신상119안전센터", "시흥소방서", "시흥119안전센터",
  "은행119안전센터", "정왕119안전센터", "연성119안전센터",
  "목감119안전센터", "배곧119안전센터", "사동119안전센터",
  "반월119안전센터", "상록수119안전센터", "월피119안전센터",
  "군자119안전센터", "대부119안전센터", "신길119안전센터",
  "안산소방서", "인하대학교의과대학부속병원", "가톨릭관동대학교인천성모병원",
  "가톨릭관동대학교국제성모병원", "검단탑병원", "인천세종병원",
  "나사렛국제병원", "나은병원", "인천사랑병원", "부평세림병원",
  "한림병원", "비에스종합병원", "온누리병원", "뉴 성민병원",
  "인천광역시의료원", "인천기독병원", "현대유비스병원", "백령병원",
  "힘찬종합병원", "인천적십자병원", "인천백병원", "가톨릭대부천성모병원",
  "다니엘종합병원", "부천세종병원", "순천향대부속부천병원",
  "광명성애병원", "중앙대광명병원", "고려대안산병원",
  "근로복지공단안산병원", "한도병원", "사랑의병원", "단원병원",
  "센트럴병원", "시화병원", "신천연합병원", "김포우리병원", "뉴고려병원"
];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const results = [];

  for (let name of names) {
    try {
      const { data } = await axios.get('https://apis.openapi.sk.com/tmap/geo/fullAddrGeo', {
        params: {
          version: 1,
          addr: name,
          appKey
        }
      });

      const info = data.coordinateInfo.coordinate[0];

      results.push({
        name,
        x: parseFloat(info.newLon),
        y: parseFloat(info.newLat),
        type: name.includes("병원") ? "병원" : "소방서",
        address: info.fullAddress,
        tel: ""
      });

      console.log(`✅ ${name} → (${info.newLat}, ${info.newLon})`);
      await delay(1000); // 1초 대기
    } catch (err) {
      console.error(`❌ ${name} 실패:`, err.response?.data?.resultMsg || err.message);
    }
  }

  fs.writeFileSync('data/traumaPoints.json', JSON.stringify(results, null, 2), 'utf8');
  console.log("🎉 저장 완료 → data/traumaPoints.json");
})();
