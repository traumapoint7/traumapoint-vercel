// scripts/testMatrix.js
import fetch from 'node-fetch';
import 'dotenv/config';

const hereApiKey = process.env.HERE_API_KEY;

const body = {
  origins: [
    { lat: 37.4487, lng: 126.7214 } // 길병원
  ],
  destinations: [
    { lat: 37.457889, lng: 126.633626 } // 인하대학병원
  ],
  transportMode: "car",
  regionDefinition: { type: "world" }
};

const url = `https://matrix.router.hereapi.com/v8/matrix?apikey=${hereApiKey}&async=false`;

(async () => {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log("📦 Matrix 응답 결과:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("❗ Matrix 호출 실패:", err);
  }
})();