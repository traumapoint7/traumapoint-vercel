// test/testTmapMatrix.js
import { getTmapMatrixInBatches } from "../lib/geo/getTmapMatrixInBatches.js";
import traumaPoints from "../data/traumaPoints.json" assert { type: "json" };

const origin = { lat: 37.466, lon: 126.714 };

async function test() {
  const result = await getTmapMatrixInBatches([origin], traumaPoints.slice(0, 5));
  console.log(result);
}

test();