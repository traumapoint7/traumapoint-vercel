let map;
let tmapKey = 'tEiRteq9K69x8eOSBcOJb3FWVFkzNRiJ3OxUBB1m';

window.onload = function () {
  map = new Tmapv2.Map("map", {
    center: new Tmapv2.LatLng(37.5665, 126.978),
    width: "100%",
    height: "400px",
    zoom: 12
  });

  fetch('/data/traumaPoints.json')
    .then(res => res.json())
    .then(data => {
      console.log("✅ traumaPoints loaded:", data);
    })
    .catch(err => {
      console.error("❌ traumaPoints 불러오기 실패:", err);
    });

  document.getElementById('searchBtn').addEventListener('click', findTraumapoint);
  document.getElementById('startInput').addEventListener('input', handleAutocomplete);

  document.getElementById('currentLocationBtn')?.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const origin = {
            x: parseFloat(pos.coords.longitude.toFixed(7)),
            y: parseFloat(pos.coords.latitude.toFixed(7))
          };
          console.log("📍 현재 위치 좌표:", origin);

          new Tmapv2.Marker({
            position: new Tmapv2.LatLng(origin.y, origin.x),
            map: map,
            title: "현재 위치"
          });

          map.setCenter(new Tmapv2.LatLng(origin.y, origin.x));
          requestRecommendation(origin);
        },
        err => {
          console.error("❌ 위치 정보 오류:", err.message);
          alert("❌ 위치 정보를 가져올 수 없습니다.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("❌ 이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
  });

  const params = new URLSearchParams(window.location.search);
  const x = parseFloat(params.get('x'));
  const y = parseFloat(params.get('y'));
  if (x && y) {
    const origin = { x, y };
    requestRecommendation(origin);
  }
};

function handleAutocomplete(e) {
  const keyword = e.target.value;
  const suggestionsBox = document.getElementById('suggestions');
  suggestionsBox.innerHTML = '';

  if (!keyword.trim()) return;

  fetch(`https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&appKey=${tmapKey}`)
    .then(async res => {
      if (!res.ok) throw new Error("Tmap API 응답 실패");
      const text = await res.text();
      if (!text) throw new Error("응답 없음");
      return JSON.parse(text);
    })
    .then(data => {
      const pois = data.searchPoiInfo?.pois?.poi || [];
      pois.slice(0, 5).forEach(poi => {
        const div = document.createElement('div');
        div.textContent = poi.name;
        div.addEventListener('click', () => {
          document.getElementById('startInput').value = poi.name;
          suggestionsBox.innerHTML = '';
        });
        suggestionsBox.appendChild(div);
      });
    })
    .catch(err => {
      console.error('자동완성 실패:', err.message);
    });
}

function findTraumapoint() {
  const keyword = document.getElementById('startInput').value;
  const suggestionsBox = document.getElementById('suggestions');
  suggestionsBox.innerHTML = '';

  fetch(`https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&appKey=${tmapKey}`)
    .then(async res => {
      if (!res.ok) throw new Error("Tmap 장소 검색 실패");
      const text = await res.text();
      if (!text) throw new Error("응답 없음");
      return JSON.parse(text);
    })
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

      new Tmapv2.Marker({
        position: new Tmapv2.LatLng(origin.y, origin.x),
        map: map,
        title: "검색한 위치"
      });
      map.setCenter(new Tmapv2.LatLng(origin.y, origin.x));

      requestRecommendation(origin);
    })
    .catch(err => {
      console.error('장소 검색 실패:', err.message);
      alert("장소 검색 실패. 다시 시도해주세요.");
    });
}

function showLoading() {
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) loadingDiv.style.display = 'block';
}

function hideLoading() {
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) loadingDiv.style.display = 'none';
}

function requestRecommendation(origin) {
  showLoading();

  fetch('/api/traumapoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin })
  })
    .then(res => res.json())
    .then(data => {
      hideLoading();
      showResults(data.recommendations, origin);
    })
    .catch(err => {
      hideLoading();
      console.error("🚨 API 호출 실패:", err.message);
      alert("추천 실패. 다시 시도해주세요.");
    });
}

function showResults(routes, origin) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  if (!routes || routes.length === 0) {
    container.innerHTML = '<p>❌ 추천 결과가 없습니다.</p>';
    return;
  }

  routes.forEach(tp => {
    const eta119 = parseFloat(tp.eta119);
    const docArrival = parseFloat(tp.etaDoc);
    const gain = (eta119 - docArrival).toFixed(1);

    let status = 'Safe';
    let color = 'green';
    if (gain < 5) {
      status = 'Danger';
      color = 'red';
    } else if (gain < 10) {
      status = 'On-time';
      color = 'blue';
    }

    container.innerHTML += `
      <div class="hospital" style="padding:10px; border:1px solid #ccc; margin-bottom:10px;">
        <h4>🏥 ${tp.name} ${tp.level ? `(${tp.level})` : ''}</h4>
        <ul>
          <li>🕒 119 ETA: ${tp.eta119}분</li>
          <li>🚑 닥터카 ETA: ${tp.etaDoc}분 → ${gain}분 빠름 <span style="color:${color}; font-weight:bold;">${status}</span></li>
          <li><strong>⏱ 총 이송시간: ${tp.total}분</strong></li>
          <li>🚨 길병원 바로 이송 시: ${tp.directToGilETA}분</li>
          <li>📍 ${tp.address}</li>
          <li>📞 ${tp.tel}</li>
        </ul>
      </div>
    `;
  });

  const shareUrl = `${window.location.origin}?x=${origin.x}&y=${origin.y}`;
  container.innerHTML += `
    <p>
      <a href="#" onclick="navigator.clipboard.writeText('${shareUrl}'); alert('📎 링크 복사됨: ${shareUrl}'); return false;">
        🔗 결과 공유하기
      </a>
    </p>
  `;
}
