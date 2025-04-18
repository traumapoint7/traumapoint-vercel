// scripts/checkCache.js
import { db } from "../lib/firebase.js";
import { getDoc, doc } from "firebase/firestore";

// ✅ 예시 key — 원하는 캐시 키를 입력
const key = "originToGil_126.8829_37.4138_to_126.7214_37.4487_월_출근";

async function check() {
  const ref = doc(db, "eta_cache", key);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    console.log("❌ 해당 캐시 없음");
  } else {
    const data = snap.data();
    console.log("📦 캐시 내용 확인:");
    console.log("평균 ETA:", data.avg);
    console.log("샘플 개수:", data.samples.length);
    console.table(data.samples.map(s => ({
      eta: s.eta,
      source: s.source,
      collectedAt: s.collectedAt
    })));
  }
}

check();
