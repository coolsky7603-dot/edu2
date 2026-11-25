"use strict";

const TravelExpenses = (() => {
  const rate = 25_000;
  const dayMilliseconds = 86_400_000;
  const caps = { seoul: 100_000, metro: 80_000, other: 70_000 };

  function dayNumber(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const date = new Date(value + "T00:00:00Z");
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return NaN;
    return date.getTime() / dayMilliseconds;
  }

  function integer(value, label, min, max, fallback = 0) {
    if (value === "" || value === undefined) return fallback;
    const amount = Number(value);
    if (!Number.isSafeInteger(amount) || amount < min || amount > max) {
      throw new Error(label + " 항목에 " + min.toLocaleString("ko-KR") +
        "부터 " + max.toLocaleString("ko-KR") + "까지의 정수를 입력하세요.");
    }
    return amount;
  }

  function calculate(values) {
    if (!values.start || !values.end) return null;
    const start = dayNumber(values.start);
    const end = dayNumber(values.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("유효한 날짜를 입력하세요.");
    if (end < start) throw new Error("복귀일은 출발일과 같거나 이후여야 합니다.");
    const days = end - start + 1;
    const official = values.vehicle === "official";

    if (values.tripType === "inside") {
      if (days !== 1) throw new Error("근무지 내 출장은 1회 당일 출장의 출발일과 복귀일을 입력하세요.");
      if (values.vehicle === "assigned") return { days, daily: 0, total: 0, notes: ["전용 차량 배정자는 근무지 내 출장여비 지급 대상에서 제외됩니다."] };
      if (!values.hours && !values.minutes) return null;
      const hours = integer(values.hours, "시간", 0, 23);
      const minutes = integer(values.minutes, "분", 0, 59);
      const duration = hours * 60 + minutes;
      if (duration <= 0) throw new Error("출장시간을 1분 이상 입력하세요.");
      const daily = (duration >= 240 ? 20_000 : 10_000) - (official ? 10_000 : 0);
      return { days, daily, total: daily, notes: official ? ["공무용 차량 이용 등 해당 조건으로 10,000원을 감액했습니다."] : [] };
    }

    let firstReduced = Infinity;
    let lastReduced = -Infinity;
    if (official) {
      const customPeriod = values.reducedStart || values.reducedEnd;
      firstReduced = customPeriod ? dayNumber(values.reducedStart) : start;
      lastReduced = customPeriod ? dayNumber(values.reducedEnd) : end;
      if (!(start <= firstReduced && firstReduced <= lastReduced && lastReduced <= end)) {
        throw new Error("감액 시작일과 종료일을 출장 기간 안에서 순서대로 입력하세요.");
      }
    }

    const notes = [];
    if (official) notes.push((lastReduced - firstReduced + 1) + "일의 일비를 절반으로 계산했습니다.");
    let daily = 0;
    const bands = values.longStay
      ? [[0, 15, rate], [16, 30, 22_500], [31, 60, 20_000], [61, Infinity, 17_500]]
      : [[0, Infinity, rate]];
    for (const [from, to, dailyRate] of bands) {
      const firstDay = start + from;
      const lastDay = Math.min(end, start + to);
      const count = Math.max(0, lastDay - firstDay + 1);
      const reduced = Math.max(0, Math.min(lastDay, lastReduced) - Math.max(firstDay, firstReduced) + 1);
      daily += (count - reduced / 2) * dailyRate;
    }
    if (values.longStay && days > 16) notes.push("동일 지역 장기 체재에 따른 일비 감액을 적용했습니다.");

    const waterAir = values.transportMode === "water-air";
    const mealDays = waterAir ? integer(values.mealDays, "별도 식비 일수", 0, days) : days;
    const meals = mealDays * rate;
    const fare = integer(values.fare, "교통비", 0, 999_999_999);
    const allowLodging = !waterAir || values.necessaryLodging;
    const actualLodging = allowLodging ? integer(values.lodging, "숙박비", 0, 999_999_999) : 0;
    const nights = allowLodging ? integer(values.nights, "실제 숙박 횟수", 0, days - 1, days - 1) : 0;
    if (!nights && actualLodging) throw new Error("숙박비를 반영하려면 실제 숙박 횟수가 1박 이상이어야 합니다.");
    const cap = caps[values.region] ?? caps.other;
    const limit = values.grade === "first" ? Infinity : cap + (values.lodgingUplift ? cap * 0.3 : 0);
    const lodging = nights ? Math.min(actualLodging, limit * nights) : 0;
    if (actualLodging > lodging) notes.push("숙박비에 1박당 " + limit.toLocaleString("ko-KR") + "원 상한을 적용했습니다.");
    if (waterAir) notes.push("선박·항공 이동의 식비와 숙박비는 선택한 예외 조건을 적용했습니다.");
    return { days, daily, meals, fare, lodging, total: daily + meals + fare + lodging, notes };
  }

  return { calculate, dayNumber };
})();

if (typeof module === "object") module.exports = TravelExpenses;
