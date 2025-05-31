// test/testTmapRoute.js
import { getTmapRoute } from "../lib/geo/tmapRoute.js";

const origin = { lat: 37.466, lon: 126.714 };
const destination = { lat: 37.4484902659502, lon: 126.75475575788 }; // 길병원

async function test() {
  const result = await getTmapRoute(origin, destination);
  console.log(result);
}

test();