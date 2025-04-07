let map, geocoder, places;

window.onload = function () {
  map = new kakao.maps.Map(document.getElementById('map'), {
    center: new kakao.maps.LatLng(37.5665, 126.978),
    level: 7
  });

  geocoder = new kakao.maps.services.Geocoder();
  places = new kakao.maps.services.Places();

  document.getElementById('searchBtn').addEventListener('click', () => {
    findTraumapoint();
  });
};

const destinations = [
  { name: "인천성모병원", x: "126.678", y: "37.453" },
  { name: "송도소방서", x: "126.644", y: "37.390" },
  { name: "부천순천향병원", x: "126.775", y: "37.505" },
  { name: "부천소방서", x: "126.783", y: "37.496" },
  { name: "김포우리병원", x: "126.716", y: "37.620" },
  { name: "김포소방서", x: "126.718", y: "37.616" }
];

function findTraumapoint() {
  const keyword = document.getElementById('startInput').value;

  places.keywordSearch(keyword, (data, status) => {
    if (status !== kakao.maps.services.Status.OK || !data.length) {
      alert("출발지를 찾을 수 없습니다.");
      return;
    }

    const place = data[0];
    const origin = { x: place.x, y: place.y };

    fetch('/api/traumapoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destinations })
    })
    .then(res => res.json())
    .then(data => {
      console.log('API 응답:', data); // ✅ 여기 추가!
      showResults(data.routes);
    })
    .catch(err => {
      console.error('API 호출 실패:', err);
      alert("추천 실패. 다시 시도해주세요.");
    });
  });
}

function showResults(routes) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  if (!routes || !Array.isArray(routes)) {
    container.innerHTML = '<p>❌ 추천할 수 있는 Traumapoint가 없습니다.</p>';
    return;
  }

  routes.sort((a, b) => a.summary.duration - b.summary.duration);

  routes.forEach(r => {
    const min = Math.floor(r.summary.duration / 60);
    container.innerHTML += `<p>🚨 ${r.key} : 약 ${min}분 소요</p>`;
  });
}
