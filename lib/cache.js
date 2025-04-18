// lib/cache.js
import { db } from "./firebase.js";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

const MAX_CACHE_AGE_DAYS = 90;
const MIN_VALID_SAMPLES = 3;

export function makeCacheKey(from, to, weekday, timeSlot, direction = "originToTp") {
  return `${direction}_${from.x}_${from.y}_to_${to.x}_${to.y}_${weekday}_${timeSlot}`;
}

export async function setCachedETA(from, to, weekday, timeSlot, eta, direction = "originToTp") {
  const key = makeCacheKey(from, to, weekday, timeSlot, direction);
  const docRef = doc(db, "eta_cache", key);
  const now = new Date();
  const newEntry = {
    eta,
    source: "KAKAO",
    collectedAt: now.toISOString()
  };

  const existingDoc = await getDoc(docRef);
  const data = existingDoc.exists() ? existingDoc.data() : null;
  const samples = data?.samples || [];

  const recentSamples = samples.filter(s => {
    const age = (now - new Date(s.collectedAt)) / (1000 * 60 * 60 * 24);
    return age <= MAX_CACHE_AGE_DAYS;
  });

  recentSamples.push(newEntry);

  let validSamples = recentSamples;
  if (recentSamples.length >= MIN_VALID_SAMPLES) {
    const etas = recentSamples.map(s => s.eta);
    const avg = etas.reduce((a, b) => a + b, 0) / etas.length;
    const threshold = avg * 1.5;
    validSamples = recentSamples.filter(s => Math.abs(s.eta - avg) <= threshold);
  }

  const avgETA = validSamples.reduce((sum, s) => sum + s.eta, 0) / validSamples.length;

  await setDoc(docRef, {
    avg: Math.round(avgETA),
    samples: validSamples,
    lastUpdated: now.toISOString()
  });
}

export async function getCachedETA(from, to, weekday, timeSlot, direction = "originToTp") {
  const key = makeCacheKey(from, to, weekday, timeSlot, direction);
  const docRef = doc(db, "eta_cache", key);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data()?.avg ?? null : null;
}

export async function getAllETAsForKey(key) {
  const docRef = doc(db, "eta_cache", key);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? (docSnap.data().samples || []).map(s => s.eta) : [];
}
