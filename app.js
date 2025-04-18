// 전역에 마커 관리 배열 추가
let markerList = [];

function showResults(routes, origin) {
  const container = document.getElementById('results');
  container.innerHTML = '';

  // ✅ 이전 마커 제거
  markerList.forEach(m => m.setMap(null));
  markerList = [];

  if (!routes || routes.length === 0) {
    container.innerHTML = '<p>❌ 추천 결과가 없습니다.</p>';
    return;
  }

  // ✅ origin 마커 (빨간색 A)
  const originMarker = new Tmapv2.Marker({
    position: new Tmapv2.LatLng(origin.y, origin.x),
    map: map,
    icon: `http://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_a.png`,
    title: "출발지"
  });
  markerList.push(originMarker);

  // ✅ 길병원 마커 (보라색 G)
  const gil = { x: 126.7214, y: 37.4487 };
  const gilMarker = new Tmapv2.Marker({
    position: new Tmapv2.LatLng(gil.y, gil.x),
    map: map,
    icon: `https://tmapapi.sktelecom.com/upload/tmap/marker/pin_p_m_g.png`,
    title: "길병원"
  });
  markerList.push(gilMarker);

  // 🅰️ 추천 병원 표시
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  routes.forEach((tp, i) => {
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

    // ✅ 추천 병원 마커 추가
    if (tp.x && tp.y) {
      const marker = new Tmapv2.Marker({
        position: new Tmapv2.LatLng(tp.y, tp.x),
        map: map,
        icon: `https://tmapapi.sktelecom.com/upload/tmap/marker/pin_b_m_${alphabet[i]}.png`,
        title: tp.name
      });
      markerList.push(marker);
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
