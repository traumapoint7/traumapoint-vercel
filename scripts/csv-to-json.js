const csv = require('csvtojson');
const fs = require('fs');
const path = require('path');

// CSV 경로 (파일명 정확히 확인!)
const csvPath = path.join(__dirname, '../data/traumalist.csv');
// 결과 저장 경로
const outputPath = path.join(__dirname, '../data/traumaPoints.json');

(async () => {
  try {
    const jsonArray = await csv().fromFile(csvPath);
    fs.writeFileSync(outputPath, JSON.stringify(jsonArray, null, 2), 'utf8');
    console.log("🎉 변환 완료 → traumaPoints.json");
  } catch (err) {
    console.error("❌ 변환 실패:", err.message);
  }
})();
