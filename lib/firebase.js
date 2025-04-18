// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// 🔥 방금 Firebase에서 복사한 설정 정보!
const firebaseConfig = {
  apiKey: "AIzaSyAtzAD0OM9vDTxvkK_-RJtJ03zN9ufFGI4",
  authDomain: "traumapoint-cache.firebaseapp.com",
  projectId: "traumapoint-cache",
  storageBucket: "traumapoint-cache.appspot.com",
  messagingSenderId: "703980563410",
  appId: "1:703980563410:web:0b2cee2a05bb6ab04036b0"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // 🔥 Firestore 인스턴스

export { db };
