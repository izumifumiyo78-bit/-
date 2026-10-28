// ---------------------------------------------------------------------------
// dom.js : tiny DOM helpers. Screens render HTML strings; interaction goes
// through delegated data-a="action" attributes.
// ---------------------------------------------------------------------------
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
/** Encode an object into a data attribute. */
export const dx = (o) => esc(JSON.stringify(o));

const actions = new Map();
export function action(name, fn) { actions.set(name, fn); }
export function runAction(name, data, ev, target) {
  const fn = actions.get(name);
  if (!fn) { console.warn('no action', name); return; }
  return fn(data, ev, target);
}
export function installDelegation(root = document) {
  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-a]');
    if (!t || t.disabled) return;
    if (t.dataset.drag === '1') return;
    let data = {};
    if (t.dataset.x) { try { data = JSON.parse(t.dataset.x); } catch { data = {}; } }
    ev.preventDefault();
    runAction(t.dataset.a, data, ev, t);
  });
  root.addEventListener('change', (ev) => {
    const t = ev.target.closest('[data-change]');
    if (!t) return;
    let data = {};
    if (t.dataset.x) { try { data = JSON.parse(t.dataset.x); } catch { data = {}; } }
    runAction(t.dataset.change, data, ev, t);
  });
}

// --- modals & toasts ------------------------------------------------------------
let modalStack = [];
export function openModal(html, opts = {}) {
  const bd = el(`<div class="backdrop"><div class="modal ${opts.wide ? 'wide' : ''}">${html}</div></div>`);
  bd.addEventListener('click', (e) => { if (e.target === bd && !opts.sticky) closeModal(); });
  document.body.appendChild(bd);
  modalStack.push({ bd, onClose: opts.onClose });
  return bd.firstElementChild;
}
export function closeModal() {
  const m = modalStack.pop();
  if (!m) return;
  m.bd.remove();
  if (m.onClose) m.onClose();
}
export function closeAllModals() { while (modalStack.length) closeModal(); }
export const modalOpen = () => modalStack.length > 0;
export function replaceModal(html) {
  const m = modalStack[modalStack.length - 1];
  if (m) m.bd.firstElementChild.innerHTML = html;
}

export function toast(text, kind = '') {
  let box = document.getElementById('toasts');
  if (!box) { box = el('<div id="toasts"></div>'); document.body.appendChild(box); }
  const t = el(`<div class="toast ${kind}">${esc(text)}</div>`);
  box.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, 2600);
}

export function confirmBox(title, body, okText = 'OK', danger = false) {
  return new Promise((res) => {
    const m = openModal(`<div class="modal-h"><h2>${esc(title)}</h2></div><div class="modal-b"><p>${esc(body).replace(/\n/g, '<br>')}</p></div>
      <div class="modal-f"><button class="btn" data-k="0">キャンセル</button><button class="btn ${danger ? 'danger' : 'primary'}" data-k="1">${esc(okText)}</button></div>`,
    { onClose: () => res(false) });
    m.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.k === '1';
      modalStack.pop().bd.remove();
      res(v);
    }));
  });
}
