// ---------------------------------------------------------------------------
// install.js : "add to home screen" guidance (iPhone / Android) and the
// native install prompt when the browser offers one.
// ---------------------------------------------------------------------------
import { action, toast } from '../dom.js';
import { icon } from '../icons.js';

let deferred = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
window.addEventListener('appinstalled', () => { deferred = null; toast('ホーム画面に追加しました', 'good'); });

const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function installHelpHTML() {
  if (standalone()) return '<p class="good">✓ すでにホーム画面のアプリとして起動しています。オフラインでも遊べます。</p>';
  return `<p class="dim">ホーム画面に追加すると、アイコンをタップするだけでアドレスバーなしの全画面で起動します。一度読み込めばオフラインでもプレイできます。</p>
    ${deferred ? `<button class="btn primary block mb8" data-a="nativeInstall">${icon('install')}今すぐインストール</button>` : ''}
    <div class="card mt12" ${isIOS() ? 'style="border-color:var(--acc)"' : ''}><div class="card-h">iPhone / iPad（Safari）</div><div class="card-b"><ol style="margin:0;padding-left:20px;line-height:1.9">
      <li>画面下（iPadは右上）の<b>共有ボタン</b>（□に↑のアイコン）をタップ</li>
      <li>メニューを下にスクロールして<b>「ホーム画面に追加」</b>を選択</li>
      <li>右上の<b>「追加」</b>をタップ</li>
      <li>ホーム画面の<b>TOUCHLINE 26</b>アイコンから起動</li></ol>
      <p class="small mute" style="margin:8px 0 0">※ Safari以外のブラウザ（Chromeなど）では追加できない場合があります。</p></div></div>
    <div class="card mt12" ${!isIOS() ? 'style="border-color:var(--acc)"' : ''}><div class="card-h">Android（Chrome）</div><div class="card-b"><ol style="margin:0;padding-left:20px;line-height:1.9">
      <li>右上の<b>︙ メニュー</b>をタップ</li>
      <li><b>「アプリをインストール」</b>または<b>「ホーム画面に追加」</b>を選択</li>
      <li><b>「インストール」</b>をタップ</li>
      <li>ホーム画面またはアプリ一覧のアイコンから起動</li></ol></div></div>`;
}
action('nativeInstall', async () => {
  if (!deferred) { toast('ブラウザのメニューから追加してください'); return; }
  deferred.prompt();
  try { await deferred.userChoice; } catch { /* ignore */ }
  deferred = null;
});
