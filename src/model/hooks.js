// ---------------------------------------------------------------------------
// hooks.js : extension points so feature modules (transfers, training,
// youth, awards, board...) can plug into the season loop without circular
// imports. Each module assigns its handlers at load time.
// ---------------------------------------------------------------------------
const noop = () => {};
export const hooks = {
  afterResult: noop,
  trophy: noop,
  daily: noop,
  weekly: noop,
  monthly: noop,
  awards: noop,
  retirements: noop,
  endOfSeason: noop,
  promotion: noop,
  newSeason: noop,
  trainingFor: () => ({ intensity: 1, focus: null, coach: null }),
};
/** Chain a handler after any existing one. */
export function on(name, fn) {
  const prev = hooks[name];
  hooks[name] = name === 'trainingFor' ? fn : (...args) => { prev(...args); return fn(...args); };
}
