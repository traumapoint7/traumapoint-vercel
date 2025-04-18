// scripts/clearCache.js
import { db } from "../lib/firebase.js";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

async function clearCache() {
  const snap = await getDocs(collection(db, "eta_cache"));
  console.log(`🧹 삭제할 캐시 수: ${snap.size}개`);

  const promises = snap.docs.map(d => deleteDoc(doc(db, "eta_cache", d.id)));
  await Promise.all(promises);

  console.log("✅ 모든 캐시 삭제 완료");
}

clearCache();
