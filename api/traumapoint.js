const axios = require('axios');

const REST_API_KEY = '15c28ebb75dda243548737ac615a5681'; // 카카오 REST API 키

const getCoordinates = async (address) => {
    try {
        const response = await axios.get('https://dapi.kakao.com/v2/local/search/address.json', {
            headers: { Authorization: `KakaoAK ${REST_API_KEY}` },
            params: { query: address }
        });

        if (response.data.documents && response.data.documents.length > 0) {
            const { x, y } = response.data.documents[0];
            return { x, y };
        } else {
            console.error(`좌표 검색 실패: ${address}에 대한 결과가 없습니다.`);
            return null;
        }
    } catch (error) {
        console.error(`좌표 검색 중 오류 발생: ${address}`, error);
        return null;
    }
};

// 예시: 병원 및 소방서 목록
const locations = [
    '인하대학교의과대학부속병원',
    '김포우리병원',
    // 추가적인 병원 및 소방서 이름들...
];

const processLocations = async () => {
    for (const location of locations) {
        const coords = await getCoordinates(location);
        if (coords) {
            console.log(`${location}의 좌표: x=${coords.x}, y=${coords.y}`);
            // 좌표를 이용한 추가 로직 처리...
        } else {
            console.log(`${location}의 좌표를 찾을 수 없습니다.`);
        }
    }
};

processLocations();
