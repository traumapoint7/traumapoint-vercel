// utils/timeSlot.js
export function getWeekday(date) {
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return weekdays[date.getDay()];
}

export function getTimeSlot(date) {
  const hour = date.getHours();
  if (hour >= 6 && hour < 10) return "출근";
  if (hour >= 10 && hour < 16) return "업무";
  if (hour >= 16 && hour < 20) return "퇴근";
  if (hour >= 20 || hour < 0) return "야간";
  return "심야";
}
