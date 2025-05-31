// test-kakao.js
import fetch from "node-fetch";

const url = "https://apis-navi.kakaomobility.com/v1/api/navi-affiliate/destinations/directions100";
const headers = {
  "Authorization": "KakaoAK 15c28ebb75dda243548737ac615a5681",
  "Content-Type": "application/json"
};

const body = {
  origin: { x: "126.97865", y: "37.56667" },
  destinations: [
    { x: "126.9723", y: "37.541", id: "길병원" }
  ],
  radius: 50000,
  priority: "FAST"
};

fetch(url, {
  method: "POST",
  headers,
  body: JSON.stringify(body)
})
  .then(res => res.json())
  .then(console.log)
  .catch(console.error);