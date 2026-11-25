"use strict";

const form = document.getElementById("trip-form");
const output = (id) => document.getElementById(id);
const won = new Intl.NumberFormat("ko-KR");
const printButton = output("print-result");
const exportButton = output("export-result");

function show(id, visible) {
  output(id).hidden = !visible;
}

function setError(id, message = "") {
  output(id).textContent = message;
  show(id, Boolean(message));
}

function render() {
  const values = Object.fromEntries(new FormData(form));
  const inside = values.tripType === "inside";
  const assigned = form.elements.vehicle.querySelector('[value="assigned"]');
  assigned.hidden = !inside;
  assigned.disabled = !inside;
  if (!inside && form.elements.vehicle.value === "assigned") {
    form.elements.vehicle.value = "none";
    values.vehicle = "none";
  }
  const official = values.vehicle === "official";
  const waterAir = values.transportMode === "water-air";
  const second = values.grade === "second";
  const allowLodging = !waterAir || form.elements.necessaryLodging.checked;

  show("inside-fields", inside && values.vehicle !== "assigned");
  show("outside-conditions", !inside);
  show("outside-hint", !inside);
  show("official-fields", !inside && official);
  show("official-hint", !inside && official);
  show("expense-fields", !inside);
  show("water-air-fields", waterAir);
  show("region-field", second);
  show("uplift-field", second && allowLodging);
  form.elements.lodging.disabled = !allowLodging;
  form.elements.nights.disabled = !allowLodging;
  output("fare-label").textContent = official ? "별도 인정 교통비 (원)" : "교통비 합계 (원)";
  output("daily-label").textContent = inside ? "근무지 내 출장여비" : "일비";
  for (const row of document.querySelectorAll(".outside-row")) row.hidden = inside;

  const startDay = TravelExpenses.dayNumber(values.start);
  const endDay = TravelExpenses.dayNumber(values.end);
  const reversed = endDay < startDay;
  const badDates = form.elements.start.validity.badInput || form.elements.end.validity.badInput;
  form.elements.end.min = values.start;
  const dateError = badDates ? "날짜를 정확히 입력하세요." : reversed ? "복귀일은 출발일과 같거나 이후여야 합니다." : "";
  form.elements.end.setAttribute("aria-invalid", String(Boolean(dateError)));
  setError("date-error", dateError);
  setError("input-error");

  let result = null;
  let status = "출발일과 복귀일을 입력하세요.";
  if (dateError) {
    status = "출장 일정을 확인하세요.";
  } else if (values.start && values.end) {
    try {
      const activeNumbers = [...form.querySelectorAll('input[type="number"]')].filter(
        (field) => !field.disabled && !field.closest("[hidden]")
      );
      if (activeNumbers.some((field) => field.validity.badInput)) throw new Error("숫자 입력 항목을 확인하세요.");
      result = TravelExpenses.calculate(values);
      status = result
        ? (inside ? "근무지 내 국내 출장 1회" : "출발·복귀일 포함 " + result.days + "일")
        : "실제 출장시간을 입력하세요.";
    } catch (error) {
      status = "출장 조건과 입력값을 확인하세요.";
      setError("input-error", error.message);
    }
  }

  const amounts = { total: "total", daily: "daily", meals: "meals", "fare-out": "fare", "lodging-out": "lodging" };
  for (const [id, key] of Object.entries(amounts)) {
    output(id).textContent = result?.[key] === undefined ? "—" : won.format(result[key]) + "원";
  }
  output("status").textContent = status;
  output("adjustment").textContent = result?.notes.join(" ") ?? "";
  show("adjustment", Boolean(result?.notes.length));
  printButton.disabled = !result;
  exportButton.disabled = !result;
  setError("export-error");
  document.body.classList.toggle("has-result", Boolean(result));
  if (!result) return;

  output("print-dates").textContent = values.start === values.end
    ? values.start
    : values.start + " ~ " + values.end;
  output("print-trip-type").textContent = form.elements.tripType.selectedOptions[0].textContent;
  output("print-vehicle").textContent = form.elements.vehicle.selectedOptions[0].textContent;
  output("print-grade").textContent = form.elements.grade.selectedOptions[0].textContent;
  output("print-transport").textContent = form.elements.transportMode.selectedOptions[0].textContent;
  const hasDuration = inside && values.vehicle !== "assigned";
  show("print-duration-row", hasDuration);
  if (hasDuration) {
    output("print-duration").textContent = (values.hours || "0") + "시간 " + (values.minutes || "0") + "분";
  }
  show("print-grade-row", !inside);
  show("print-transport-row", !inside);
  show("print-lodging-row", !inside && allowLodging && Number(values.lodging) > 0);
  output("print-lodging").textContent = won.format(Number(values.lodging || 0)) + "원";
  return result;
}

form.addEventListener("input", render);
form.addEventListener("change", render);
form.addEventListener("submit", (event) => event.preventDefault());
printButton.addEventListener("click", () => window.print());
output("open-help").addEventListener("click", () => output("help-dialog").showModal());
exportButton.addEventListener("click", async () => {
  const result = render();
  if (!result) return;

  const rows = [
    ["항목", "내용"],
    ["출발일", form.elements.start.value],
    ["복귀일", form.elements.end.value]
  ];
  for (const detail of output("print-details").children) {
    if (detail.hidden || detail.contains(output("print-dates"))) continue;
    const [label, value] = detail.children;
    const content = value.id === "print-lodging" ? Number(form.elements.lodging.value) : value.textContent;
    rows.push([label.textContent, content]);
  }
  rows.push([], ["지급 항목", "금액 (원)"], [output("daily-label").textContent, result.daily]);
  if (result.meals !== undefined) {
    rows.push(["식비", result.meals], ["교통비", result.fare], ["숙박비", result.lodging]);
  }
  rows.push(["예상 합계", result.total]);
  for (const note of result.notes) rows.push(["계산 참고", note]);

  const filename = "출장여비_" + form.elements.start.value + ".xlsx";
  try {
    await downloadExcel(rows, filename);
  } catch (error) {
    setError("export-error", "엑셀 파일을 저장하지 못했습니다. 다시 시도해 주세요.");
  }
});
render();
