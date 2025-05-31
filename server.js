// server.js

import dotenv from 'dotenv';         // ✅ 추가
dotenv.config();                     // ✅ 실행

console.log("✅ dotenv 로드됨");
console.log("🔑 TMAP_APP_KEY:", process.env.TMAP_APP_KEY);

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 3000;

// __dirname 설정 (ESM 환경에서 필요)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 정적 파일 서빙 (public, data, lib 등)
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// API 라우팅
import traumapointHandler from './api/traumapoint.js';
app.post('/api/traumapoint', traumapointHandler);

// 기본 라우트 - index.html 서빙
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버 시작
app.listen(port, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${port}`);
});
