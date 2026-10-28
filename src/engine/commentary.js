// ---------------------------------------------------------------------------
// commentary.js : Japanese play-by-play lines for match events.
// ---------------------------------------------------------------------------
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function line(rng, type, d = {}) {
  const a = d.a || '', b = d.b || '', t = d.t || '';
  switch (type) {
    case 'kickoff': return pick(rng, [`キックオフ！ ${t}ボールで試合開始です。`, `主審の笛が鳴り、${t}のキックオフで試合が始まりました。`]);
    case 'kickoff2': return `後半キックオフ。${t}ボールで再開です。`;
    case 'goal': return pick(rng, [`ゴーーール！！ ${a}が決めた！`, `決まったーっ！ ${a}のシュートがネットを揺らす！`,
      `ゴール！ ${a}、冷静に流し込みました！`, `${a}！ 見事なフィニッシュでゴール！`]);
    case 'goalHeader': return pick(rng, [`ゴール！ ${a}のヘディングが突き刺さる！`, `頭で合わせた！ ${a}のヘディングゴール！`]);
    case 'goalPen': return `${a}、PKを沈めました！ ゴール！`;
    case 'goalFK': return `直接FKが決まったー！ ${a}の見事なキック！`;
    case 'ownGoal': return `オウンゴール！ ${a}のクリアが自陣ゴールへ…`;
    case 'assist': return `アシストは${a}。`;
    case 'save': return pick(rng, [`${b}がセーブ！ ${a}のシュートを止めた！`, `${a}のシュート！ しかしGK${b}が好守！`,
      `${a}が狙うも、${b}が反応しました。`]);
    case 'saveBig': return pick(rng, [`ビッグセーブ！ ${b}が${a}の決定機を阻止！`, `なんという反応！ ${b}がスーパーセーブ！`]);
    case 'parry': return `${b}が弾いた！ こぼれ球は…`;
    case 'wide': return pick(rng, [`${a}のシュートは枠の外。`, `${a}が狙ったが、わずかに外れました。`, `${a}のシュート、ゴール右へ逸れる。`]);
    case 'over': return pick(rng, [`${a}のシュートはクロスバーの上。`, `${a}、ふかしてしまいました。`]);
    case 'post': return pick(rng, [`ポスト！ ${a}のシュートはポストを叩いた！`, `${a}のシュートがゴールポストに嫌われる！`]);
    case 'bar': return `クロスバー直撃！ ${a}、惜しい！`;
    case 'block': return pick(rng, [`${a}のシュートは${b}がブロック。`, `${b}が体を張って${a}のシュートを防ぐ！`]);
    case 'bigChance': return pick(rng, [`${a}に決定機！`, `${a}、抜け出した！ 決定的なチャンス！`, `${a}がGKと1対1！`]);
    case 'through': return `${a}から${b}へ絶妙なスルーパス！`;
    case 'cross': return pick(rng, [`${a}がクロスを上げる。`, `${a}、サイドからクロス！`]);
    case 'corner': return `${t}がコーナーキックを獲得。`;
    case 'foul': return pick(rng, [`${a}のファウル。${b}が倒されました。`, `${b}が${a}に倒されてフリーキック。`]);
    case 'yellow': return `${a}にイエローカード。`;
    case 'red': return `レッドカード！ ${a}が退場処分！`;
    case 'secondYellow': return `${a}に2枚目のイエロー！ 退場です！`;
    case 'penalty': return `PK！！ ${b}がエリア内で倒された！ ${t}にペナルティキック！`;
    case 'penMiss': return pick(rng, [`${a}のPKは${b}が止めた！`, `${a}、PKを外してしまった！`]);
    case 'offside': return `${a}はオフサイドの判定。`;
    case 'sub': return `${t}の選手交代：${a} → ${b}`;
    case 'injury': return `${a}が痛んでいます…プレー続行は難しそうです。`;
    case 'halftime': return `前半終了。${d.score}`;
    case 'fulltime': return `試合終了！ ${d.score}`;
    case 'etStart': return '延長戦に突入します。';
    case 'shootout': return 'PK戦で決着をつけます！';
    case 'tackle': return pick(rng, [`${a}が見事なタックルでボールを奪う。`, `${a}がボールを刈り取った。`]);
    case 'dribble': return pick(rng, [`${a}がドリブルで${b}をかわす！`, `${a}、鮮やかな突破！`]);
    case 'fk': return `${t}がゴール前でフリーキックを得ました。キッカーは${a}。`;
    case 'oneOnOne': return `${a}がGKと1対1！`;
    case 'longShot': return `${a}がミドルレンジから狙う！`;
    case 'header': return `${a}がヘディングで合わせる！`;
    case 'counter': return `${t}のカウンター！`;
    case 'tactic': return `${t}が戦術を変更しました。`;
    default: return '';
  }
}
