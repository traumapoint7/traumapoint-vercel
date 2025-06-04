const traumaPoints = require("../../../public/data/traumaPoints_within_9km.json");

export default function handler(req, res) {
  console.log("✅ API 호출됨");
  res.status(200).json({
    message: "✅ API 정상 작동 중",
    count: traumaPoints.length,
  });
}