// Screens that are being built in later rounds.
import { screen } from '../state.js';
for (const [k, n] of [['training', 'トレーニング']]) {
  screen(k, { render: () => `<div class="ph"><h1>${n}</h1></div><div class="card"><div class="empty">準備中です</div></div>` });
}
