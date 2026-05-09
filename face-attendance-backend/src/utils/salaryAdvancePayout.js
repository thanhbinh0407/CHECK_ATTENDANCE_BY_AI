/**
 * @param {number|string} year
 * @param {number|string} month 1–12
 * @returns {Date} Calendar date (local) for configured payout day in that month
 */
export function getConfiguredSalaryAdvancePayoutDay() {
  const raw = process.env.SALARY_ADVANCE_PAYOUT_DAY;
  const n = raw != null && raw !== "" ? parseInt(String(raw), 10) : 15;
  if (!Number.isFinite(n) || n < 1 || n > 28) return 15;
  return n;
}

export function getSalaryAdvancePayoutDate(year, month) {
  const day = getConfiguredSalaryAdvancePayoutDay();
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const last = new Date(y, m, 0).getDate();
  const d = Math.min(day, last);
  return new Date(y, m - 1, d);
}

export function formatSalaryAdvancePayoutDateISO(year, month) {
  const d = getSalaryAdvancePayoutDate(year, month);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isSalaryAdvanceDisburseAllowedToday(year, month) {
  const payout = getSalaryAdvancePayoutDate(year, month);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startPayout = new Date(payout.getFullYear(), payout.getMonth(), payout.getDate());
  return startToday >= startPayout;
}
