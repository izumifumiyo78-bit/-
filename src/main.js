// ---------------------------------------------------------------------------
// main.js : boot. Registers the service worker (offline + home-screen app),
// loads every screen module and shows the title screen.
// ---------------------------------------------------------------------------
import { startShell } from './ui/app.js';
import { go } from './ui/state.js';
import './features.js';

startShell();
const boot = document.getElementById('boot');
if (boot) boot.remove();
go('title', {}, { root: true });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW', e));
  });
}
// keep the screen awake while a match is shown, where supported
document.addEventListener('visibilitychange', () => { /* audio resumes on interaction */ });
