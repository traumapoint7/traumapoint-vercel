const csv = require('csvtojson');
const fs = require('fs');

const csvFilePath = './data/traumalist.csv';
const jsonFilePath = './data/traumaPoints.json';

csv()
  .fromFile(csvFilePath)
  .then((jsonObj) => {
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonObj, null, 2), 'utf8');
    console.log("✅ CSV → JSON 변환 완료!");
  })
  .catch(err => {
    console.error("❌ 변환 중 오류 발생:", err);
  });
