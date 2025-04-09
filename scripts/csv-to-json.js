const csv = require('csvtojson');
const fs = require('fs');
const path = require('path');

// CSV 원본 파일 경로 (예: UTF-8로 저장된 CSV)
const csvPath = path.join(__dirname, '../data/traumalist.csv');

// JSON 출력 파일 경로
const outputPath = path.join(__dirname, '../data/traumaPoints.json');

(async () => {
  try {
    const jsonArray = await csv().fromFile(csvPath);
    fs.writeFileSync(outputPath, JSON.stringify(jsonArray, null, 2), 'utf8');
    console.log("✅ JSON 파일 생성 완료:", outputPath);
  } catch (err) {
    console.error("❌ 변환 실패:", err.message);
  }
})();
