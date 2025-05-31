import json
from geopy.distance import geodesic

# 길병원 위치
gil_location = (37.44837707353655, 126.70203624459102)

# 원본 파일 로딩
with open("traumaPoints.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# 9km 이내 항목 필터링
filtered = []
for item in data:
    lat = item.get("lat")
    lon = item.get("lon")
    if lat and lon:
        if geodesic(gil_location, (lat, lon)).kilometers <= 9:
            filtered.append(item)

# 결과 저장
with open("traumaPoints_within_9km.json", "w", encoding="utf-8") as f:
    json.dump(filtered, f, ensure_ascii=False, indent=2)

print(f"{len(filtered)}개 항목이 저장되었습니다.")