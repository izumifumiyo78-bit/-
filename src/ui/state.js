// ---------------------------------------------------------------------------
// state.js : the UI's shared state and router. Kept free of imports so
// screen modules and the shell can both depend on it without cycles.
// ---------------------------------------------------------------------------
export const app = {
  G: null,            // the game
  stack: [],          // [{ name, params }]
  prefs: {},
  slot: null,         // current save slot
  busy: false,
  stop: false,
  render: null,       // set by the shell
  shell: null,
  ui: {},             // per-screen ephemeral state (tabs, sorting, selection)
};
export const SCREENS = {};
export function screen(name, def) { SCREENS[name] = def; }

export function cur() { return app.stack[app.stack.length - 1] || null; }
export function go(name, params = {}, opts = {}) {
  if (opts.replace || opts.root) {
    if (opts.root) app.stack = [];
    else app.stack.pop();
  }
  const top = cur();
  if (!(top && top.name === name && JSON.stringify(top.params) === JSON.stringify(params))) {
    app.stack.push({ name, params });
    if (app.stack.length > 40) app.stack.splice(0, app.stack.length - 40);
  }
  try { history.pushState({ d: app.stack.length }, ''); } catch { /* ignore */ }
  if (app.render) app.render(true);
}
export function back() {
  if (app.stack.length > 1) app.stack.pop();
  if (app.render) app.render(true);
}
export function refresh() { if (app.render) app.render(false); }
/** Per-screen UI memory (tabs etc.). */
export function ui(key, init) {
  if (!(key in app.ui)) app.ui[key] = typeof init === 'function' ? init() : init;
  return app.ui[key];
}
