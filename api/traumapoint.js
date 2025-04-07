export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'POST only' });
  }

  const { origin, destinations } = req.body;

  const apiKey = '15c28ebb75dda243548737ac615a5681'; // 카카오 내비 REST API 키

  try {
    const response = await fetch('https://apis-navi.kakaomobility.com/v1/destinations/directions', {
      method: 'POST',
      headers: {
        'Authorization': `KakaoAK ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        origin,
        destinations,
        priority: 'TIME',
        radius: 80000 // ✅ 반경 80km 설정
      })
    });

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('카카오 API 호출 실패:', error);
    return res.status(500).json({
      error: '카카오 API 호출 실패',
      message: error.message
    });
  }
}
