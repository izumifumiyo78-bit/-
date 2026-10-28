// ---------------------------------------------------------------------------
// storage.js : save slots in IndexedDB (per device), compressed with gzip
// when the browser supports CompressionStream, plus file export/import.
// ---------------------------------------------------------------------------
const DB = 'touchline26';
const STORE = 'saves';
export const SLOTS = ['auto', 's1', 's2', 's3', 's4', 's5', 's6'];
export const SLOT_NAME = { auto: 'オートセーブ', s1: 'スロット1', s2: 'スロット2', s3: 'スロット3', s4: 'スロット4', s5: 'スロット5', s6: 'スロット6' };

let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (!('indexedDB' in self)) { rej(new Error('IndexedDBが利用できません')); return; }
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { r.result.createObjectStore(STORE, { keyPath: 'slot' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
function tx(mode, fn) {
  return db().then((d) => new Promise((res, rej) => {
    const t = d.transaction(STORE, mode);
    const st = t.objectStore(STORE);
    let out;
    Promise.resolve(fn(st)).then((v) => { out = v; });
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error || new Error('aborted'));
  }));
}
const req = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

// --- compression -----------------------------------------------------------------------
const canGzip = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
export async function packJSON(obj) {
  const text = JSON.stringify(obj);
  if (!canGzip) return { enc: 'json', data: text, size: text.length };
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  const buf = await new Response(stream).arrayBuffer();
  return { enc: 'gzip', data: buf, size: buf.byteLength };
}
export async function unpackJSON(rec) {
  if (rec.enc === 'json') return JSON.parse(rec.data);
  const stream = new Blob([rec.data]).stream().pipeThrough(new DecompressionStream('gzip'));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

// --- slots ------------------------------------------------------------------------------
export async function saveSlot(slot, G, meta) {
  const packed = await packJSON(G);
  const rec = { slot, meta: { ...meta, savedAt: Date.now(), size: packed.size }, enc: packed.enc, data: packed.data };
  await tx('readwrite', (st) => req(st.put(rec)));
  return rec.meta;
}
export async function loadSlot(slot) {
  const rec = await tx('readonly', (st) => req(st.get(slot)));
  if (!rec) return null;
  return unpackJSON(rec);
}
export async function listSlots() {
  try {
    const all = await tx('readonly', (st) => req(st.getAll()));
    const map = {};
    for (const r of all || []) map[r.slot] = r.meta;
    return map;
  } catch (e) {
    console.warn(e);
    return {};
  }
}
export async function deleteSlot(slot) { await tx('readwrite', (st) => req(st.delete(slot))); }

// --- files --------------------------------------------------------------------------------
export async function exportFile(G, meta) {
  const packed = await packJSON({ app: 'TOUCHLINE26', meta, game: G });
  const blob = packed.enc === 'gzip' ? new Blob([packed.data], { type: 'application/gzip' }) : new Blob([packed.data], { type: 'application/json' });
  const name = `touchline26_${(meta.club || 'save').replace(/[\\/:*?"<>|\s]/g, '')}_${meta.dateText ? meta.dateText.replace(/[^0-9]/g, '') : Date.now()}.${packed.enc === 'gzip' ? 't26' : 'json'}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  return name;
}
export async function importFile(file) {
  const buf = await file.arrayBuffer();
  const u8 = new Uint8Array(buf);
  let obj;
  if (u8[0] === 0x1f && u8[1] === 0x8b) {
    if (!canGzip) throw new Error('このブラウザは圧縮ファイルの読み込みに対応していません');
    obj = await unpackJSON({ enc: 'gzip', data: buf });
  } else {
    obj = JSON.parse(new TextDecoder().decode(u8));
  }
  if (!obj || obj.app !== 'TOUCHLINE26' || !obj.game) throw new Error('TOUCHLINE 26 のセーブデータではありません');
  return obj;
}

// --- small settings in localStorage ----------------------------------------------------------
export function loadPrefs() {
  try { return JSON.parse(localStorage.getItem('t26prefs') || '{}'); } catch { return {}; }
}
export function savePrefs(p) {
  try { localStorage.setItem('t26prefs', JSON.stringify(p)); } catch { /* private mode */ }
}
