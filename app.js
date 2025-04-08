let map;
let tmapKey = 'tEiRteq9K69x8eOSBcOJb3FWVFkzNRiJ3OxUBB1m';

window.onload = function () {
  map = new Tmapv2.Map("map", {
    center: new Tmapv2.LatLng(37.5665, 126.978),
    width: "100%",
    height: "400px",
    zoom: 12
  });

  // ✅ traumaPoints.json 테스트 로딩
  fetch('/data/traumaPoints.json')
    .then(res => res.json())
    .then(data => {
      console.log("✅ traumaPoints loaded:", data);
    })
    .catch(err => {
      console.error("❌ traumaPoints 불러오기 실패:", err);
    });

  document.getElementById('searchBtn').addEventListener('click', () => {
    findTraumapoint();
  });
};

function findTraumapoint() {
  const keyword = document.getElementById('startInput').value;

  fetch(`https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&appKey=${tmapKey}`, {
    method: 'GET'
  })
    .then(res => res.json())
    .then(data => {
      const pois = data.searchPoiInfo?.pois?.poi;
      if (!pois || pois.length === 0) {
        alert("출발지를 찾을 수 없습니다.");
        return;
      }

      const place = pois[0];
      const origin = {
        x: parseFloat(place.frontLon),
        y: parseFloat(place.frontLat)
      };

      fetch('/api/traumapoint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin })
      })
        .then(res => res.json())
        .then(data => {
          showResults(data.recommendations);
        })
        .catch(err => {
          console.error('API 호출 실패:', err);
          alert("추천 실패. 다시 시도해주세요.");
        });
    })
    .catch(err => {
      console.error('장소 검색 실패:', err);
      alert("장소 검색 실패. 다시 시도해주세요.");
    });
}

function showResults(routes) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  if (!routes || !Array.isArray(routes) || routes.length === 0) {
    container.innerHTML = '<p>❌ 추천할 수 있는 Traumapoint가 없습니다.</p>';
    return;
  }

  routes.forEach(r => {
    container.innerHTML += `<p>🚨 ${r.name} | 119ETA: ${r.eta119}분, 닥터카ETA: ${r.etaDoc}분, 분류: ${r.category}</p>`;
  });
}