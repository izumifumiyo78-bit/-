// ---------------------------------------------------------------------------
// date.js : the game calendar. A "day" is an integer count from 2026-01-01
// (UTC), which keeps saves small and date arithmetic trivial.
// ---------------------------------------------------------------------------
const EPOCH = Date.UTC(2026, 0, 1);
const MS = 86400000;
const WD = ['日', '月', '火', '水', '木', '金', '土'];

export function dayOf(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / MS); }
export function dateOf(day) {
  const dt = new Date(EPOCH + day * MS);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), wd: dt.getUTCDay() };
}
export function fmtDate(day, withWd = true) {
  const t = dateOf(day);
  return `${t.y}年${t.m}月${t.d}日${withWd ? `（${WD[t.wd]}）` : ''}`;
}
export function fmtDateShort(day) {
  const t = dateOf(day);
  return `${t.m}/${t.d}`;
}
export function fmtDateMid(day) {
  const t = dateOf(day);
  return `${t.m}月${t.d}日（${WD[t.wd]}）`;
}
export const weekday = (day) => dateOf(day).wd;
/** Season label for the season that starts in July of `y`. */
export const seasonLabel = (y) => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
/** Season start year for a given day (seasons run July -> June). */
export function seasonOf(day) {
  const t = dateOf(day);
  return t.m >= 7 ? t.y : t.y - 1;
}
/** Next day on or after `day` that falls on weekday `wd` (0 = Sunday). */
export function nextWeekday(day, wd) {
  const cur = weekday(day);
  return day + ((wd - cur + 7) % 7);
}
export function ageOn(born, day) {
  const a = dateOf(born), b = dateOf(day);
  let age = b.y - a.y;
  if (b.m < a.m || (b.m === a.m && b.d < a.d)) age--;
  return age;
}
export const WEEKDAYS = WD;
