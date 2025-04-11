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

  document.getElementById('searchBtn').addEventListener('click', () => {
    findTraumapoint();
  });

  document.getElementById('startInput').addEventListener('input', handleAutocomplete);

  document.getElementById('currentLocationBtn')?.addEventListener('click', () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const origin = {
          x: pos.coords.longitude,
          y: pos.coords.latitude
        };

        console.log("📍 현재 위치 좌표:", origin);

        // ✅ 현재 위치 마커 표시
        new Tmapv2.Marker({
          position: new Tmapv2.LatLng(origin.y, origin.x),
          map: map,
          icon: "http://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_a.png",
          title: "현재 위치"
        });

        fetch('/api/traumapoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origin })
        })
          .then(res => res.json())
          .then(data => {
            showResults(data.recommendations, origin);
          });
      }, () => {
        alert("❌ 위치 정보를 가져올 수 없습니다.");
      });
    } else {
      alert("❌ 이 브라우저는 위치 정보를 지원하지 않습니다.");
    }
  });

  // URL에서 좌표 전달 시 자동 실행
  const params = new URLSearchParams(window.location.search);
  const x = parseFloat(params.get('x'));
  const y = parseFloat(params.get('y'));
  if (x && y) {
    const origin = { x, y };
    fetch('/api/traumapoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin })
    })
      .then(res => res.json())
      .then(data => {
        showResults(data.recommendations, origin);
      });
  }
};

function handleAutocomplete(e) {
  const keyword = e.target.value;
  const suggestionsBox = document.getElementById('suggestions');
  suggestionsBox.innerHTML = '';

  if (!keyword.trim()) return;

  fetch(`https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&appKey=${tmapKey}`)
    .then(res => res.json())
    .then(data => {
      const pois = data.searchPoiInfo?.pois?.poi || [];

      pois.slice(0, 5).forEach(poi => {
        const div = document.createElement('div');
        div.textContent = poi.name;
        div.addEventListener('click', () => {
          document.getElementById('startInput').value = poi.name;
          document.getElementById('suggestions').innerHTML = '';
        });
        suggestionsBox.appendChild(div);
      });
    })
    .catch(err => {
      console.error('자동완성 실패:', err);
    });
}

function findTraumapoint() {
  const keyword = document.getElementById('startInput').value;
  const suggestionsBox = document.getElementById('suggestions');
  suggestionsBox.innerHTML = '';

  fetch(`https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(keyword)}&appKey=${tmapKey}`)
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
          showResults(data.recommendations, origin);
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

function showResults(routes, origin) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  if (!routes || !Array.isArray(routes) || routes.length === 0) {
    container.innerHTML = '<p>❌ 추천할 수 있는 Traumapoint가 없습니다.</p>';
    return;
  }

  const grouped = {
    Fast: [],
    Accurate: [],
    Safe: [],
  };

  routes.forEach(r => {
    grouped[r.category]?.push(r);
  });

  const categoryLabel = {
    Fast: '닥터카 인계점 대기시간: ~5분',
    Accurate: '닥터카 인계점 대기시간: 5~10분',
    Safe: '닥터카 인계점 대기시간: 10분 이상',
  };

  for (const cat of ['Fast', 'Accurate', 'Safe']) {
    container.innerHTML += `<h3>✅ 추천 Traumapoint (${cat})</h3>`;
    container.innerHTML += `<p>${categoryLabel[cat]}</p>`;

    if (grouped[cat].length === 0) {
      container.innerHTML += `<p>추천 Traumapoint 없음.</p>`;
    } else {
      const hospitals = grouped[cat].filter(tp => tp.type === '병원').slice(0, 2);
      const fireStations = grouped[cat].filter(tp => tp.type === '소방').slice(0, 2);
      const selected = hospitals.concat(fireStations);

      selected.forEach(tp => {
        const gain = (tp.eta119 - tp.etaDoc).toFixed(1);

        container.innerHTML += `
          <div class="hospital" style="padding:10px; margin-bottom:10px;">
            <h4>🏥 ${tp.name} ${tp.level ? `(${tp.level})` : ''}</h4>
            <ul>
              <li><strong>🕒 119 ETA: ${tp.eta119}분</strong></li>
              <li>🚑 닥터카 ETA: ${tp.etaDoc}분 → ${gain}분 먼저 도착</li>
              <li class="highlight"><strong>⏱ 🚨 총 이송시간: ${tp.total}분</strong> (<span style="color:red; font-weight:bold;">🩺 의사 접촉: ${tp.eta119}분</span>)</li>
              <li><span style="color:red; font-weight: bold;">🚨 길병원 다이렉트 이송 시: ${tp.directToGilETA}분</span></li>
              <li>📍 주소: ${tp.address || '정보 없음'}</li>
              <li>📞 전화번호: ${tp.tel || '정보 없음'}</li>
            </ul>
          </div>
        `;
      });
    }
  }

  const shareUrl = `${window.location.origin}?x=${origin.x}&y=${origin.y}`;
  container.innerHTML += `
    <p>
      <a href="#" class="tmap-link" onclick="navigator.clipboard.writeText('${shareUrl}'); alert('📎 링크가 복사되었습니다: ${shareUrl}'); return false;">
        🔗 결과 공유하기
      </a>
    </p>
  `;
}
