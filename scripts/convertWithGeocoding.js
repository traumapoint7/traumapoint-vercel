// scripts/convertWithGeocoding.js
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import csv from "csvtojson";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
dotenv.config();

const kakaoKey = process.env.KAKAO_REST_API_KEY;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getCoordsFromAddress(address) {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
  const res = await fetch(url, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
  });
  const data = await res.json();

  if (data.documents && data.documents.length > 0) {
    const { x, y } = data.documents[0];
    return { x: parseFloat(x), y: parseFloat(y) };
  }
  return { x: null, y: null };
}

async function convertCSVtoJSONWithCoords() {
  const csvPath = path.join(__dirname, "../data/traumaPoints.csv");
  const jsonPath = path.join(__dirname, "../data/traumaPoints.json");

  const raw = await csv().fromFile(csvPath);
  const enriched = [];

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    const coords = await getCoordsFromAddress(row.address);
    enriched.push({ ...row, ...coords });
    console.log(`📍 ${row.name} → (${coords.x}, ${coords.y})`);
  }

  await fs.writeFile(jsonPath, JSON.stringify(enriched, null, 2), "utf-8");
  console.log("✅ 좌표 포함 JSON 파일 저장 완료: traumaPoints.json");
}

convertCSVtoJSONWithCoords();
