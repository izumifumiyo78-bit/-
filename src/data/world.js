// ---------------------------------------------------------------------------
// world.js : leagues and clubs. Every league, club, stadium and crest is an
// original invention; nations are only used as nationalities and settings.
// ---------------------------------------------------------------------------

/**
 * League table definitions.
 *  caTop / caBot : average starting-XI CA of the strongest / weakest club
 *  rev  : yearly revenue of a mid-table club (yen)
 *  rep  : league reputation 0-100
 *  dom  : share of domestic players
 */
export const LEAGUES = [
  { id: 'JPN1', nation: 'JPN', level: 1, name: 'ジパング・リーグ1部', short: 'ZL1', teams: 18,
    promo: 0, playoff: null, releg: 3, caTop: 123, caBot: 102, rev: 38e8, rep: 58, dom: 0.82, cap: [12000, 52000] },
  { id: 'JPN2', nation: 'JPN', level: 2, name: 'ジパング・リーグ2部', short: 'ZL2', teams: 18,
    promo: 2, playoff: [3, 6], releg: 3, caTop: 103, caBot: 88, rev: 13e8, rep: 40, dom: 0.9, cap: [5000, 22000] },
  { id: 'JPN3', nation: 'JPN', level: 3, name: 'ジパング・リーグ3部', short: 'ZL3', teams: 16,
    promo: 2, playoff: [3, 6], releg: 0, caTop: 89, caBot: 72, rev: 4.5e8, rep: 26, dom: 0.96, cap: [2500, 11000] },
  { id: 'ENG1', nation: 'ENG', level: 1, name: 'アルビオン・ファーストリーグ', short: 'AFL', teams: 20,
    promo: 0, playoff: null, releg: 3, caTop: 163, caBot: 128, rev: 380e8, rep: 95, dom: 0.42, cap: [25000, 74000] },
  { id: 'ENG2', nation: 'ENG', level: 2, name: 'アルビオン・チャンピオンリーグ', short: 'ACL', teams: 20,
    promo: 2, playoff: [3, 6], releg: 0, caTop: 130, caBot: 108, rev: 55e8, rep: 70, dom: 0.62, cap: [12000, 34000] },
  { id: 'ESP1', nation: 'ESP', level: 1, name: 'リーガ・イベリカ', short: 'LIB', teams: 18,
    promo: 0, playoff: null, releg: 0, caTop: 162, caBot: 118, rev: 190e8, rep: 92, dom: 0.6, cap: [16000, 81000] },
  { id: 'GER1', nation: 'GER', level: 1, name: 'ゲルマニア・リーガ', short: 'GML', teams: 18,
    promo: 0, playoff: null, releg: 0, caTop: 160, caBot: 120, rev: 200e8, rep: 90, dom: 0.52, cap: [22000, 80000] },
  { id: 'ITA1', nation: 'ITA', level: 1, name: 'イタリカ・セリエ', short: 'ITS', teams: 18,
    promo: 0, playoff: null, releg: 0, caTop: 157, caBot: 118, rev: 160e8, rep: 88, dom: 0.55, cap: [15000, 76000] },
];
export const leagueById = (id) => LEAGUES.find((l) => l.id === id);

export const CUPS = [
  { id: 'JPNC', nation: 'JPN', name: 'ジパング皇杯', short: '皇杯', leagues: ['JPN1', 'JPN2', 'JPN3'], prize: 3e8 },
  { id: 'ENGC', nation: 'ENG', name: 'アルビオン・チャレンジカップ', short: 'ACC', leagues: ['ENG1', 'ENG2'], prize: 25e8 },
  { id: 'ESPC', nation: 'ESP', name: 'コパ・イベリカ', short: 'CIB', leagues: ['ESP1'], prize: 12e8 },
  { id: 'GERC', nation: 'GER', name: 'ゲルマニア・ポカール', short: 'GPK', leagues: ['GER1'], prize: 12e8 },
  { id: 'ITAC', nation: 'ITA', name: 'コッパ・イタリカ', short: 'CIT', leagues: ['ITA1'], prize: 10e8 },
];
/** The original intercontinental club tournament. */
export const ELITE = { id: 'ELITE', name: 'ワールド・エリートカップ', short: 'WEC',
  slots: { ENG1: 4, ESP1: 3, GER1: 3, ITA1: 3, JPN1: 3 }, prize: 120e8 };

// [name, abbr, crest symbol, size 1-10 (club stature)]
export const CLUBS = {
  JPN1: [
    ['東都ユナイテッド', 'TOT', 'crown', 10], ['浪速ブレイズ', 'NAN', 'flame', 9], ['武蔵ヴァンガード', 'MUS', 'sword', 9],
    ['尾張グランツ', 'OWA', 'castle', 8], ['播磨フェニックス', 'HAR', 'bird', 8], ['筑紫アステル', 'TSU', 'star', 7],
    ['駿河ウェーブ', 'SUR', 'wave', 7], ['陸奥ストーム', 'MUT', 'bolt', 6], ['越後レグルス', 'ECH', 'lion', 6],
    ['安芸ルミナス', 'AKI', 'sun', 6], ['近江ノヴァ', 'OMI', 'star', 5], ['大和FC', 'YMT', 'shield', 5],
    ['加賀セレスタ', 'KAG', 'moon', 5], ['常陸ファルコンズ', 'HIT', 'bird', 4], ['上総ブリッツ', 'KZS', 'bolt', 4],
    ['出雲SC', 'IZM', 'tree', 4], ['薩摩タイタンズ', 'SAT', 'mountain', 4], ['北嶺オルカ', 'HKR', 'wave', 3],
  ],
  JPN2: [
    ['信濃ステラ', 'SHN', 'star', 5], ['甲斐ソレイユ', 'KAI', 'sun', 5], ['伊予シエロ', 'IYO', 'bird', 4],
    ['讃岐ガイア', 'SAN', 'tree', 4], ['土佐クレスト', 'TOS', 'wave', 4], ['吉備ヴィクトリー', 'KIB', 'crown', 4],
    ['長門カイザー', 'NAG', 'lion', 4], ['肥後SC', 'HIG', 'mountain', 3], ['日向ミラージュ', 'HYU', 'sun', 3],
    ['下野アスレティック', 'SMT', 'shield', 3], ['能登シティ', 'NOT', 'anchor', 3], ['若狭FC', 'WAK', 'wave', 3],
    ['紀伊ドラゴンズ', 'KII', 'flame', 3], ['阿波ヴォラーレ', 'AWA', 'bird', 3], ['豊後ユナイテッド', 'BUN', 'castle', 3],
    ['房総ストライカーズ', 'BOS', 'bolt', 2], ['美濃FC', 'MNO', 'tree', 2], ['飛騨ブレイブ', 'HID', 'mountain', 2],
  ],
  JPN3: [
    ['伊賀シャドウズ', 'IGA', 'moon', 2], ['志摩マリーン', 'SMA', 'anchor', 2], ['丹波FC', 'TNB', 'tree', 2],
    ['但馬SC', 'TJM', 'mountain', 2], ['因幡ラビッツ', 'INB', 'moon', 2], ['伯耆SC', 'HKI', 'shield', 1],
    ['石見シルバーズ', 'IWM', 'star', 1], ['周防ユナイテッド', 'SUO', 'wave', 1], ['対馬FC', 'TSM', 'anchor', 1],
    ['壱岐アイランダーズ', 'IKI', 'wave', 1], ['佐渡ゴールド', 'SDO', 'sun', 1], ['隠岐FC', 'OKI', 'anchor', 1],
    ['淡路ウィンズ', 'AWJ', 'bird', 1], ['出羽マウンテニアーズ', 'DEW', 'mountain', 1], ['羽後FC', 'UGO', 'tree', 1],
    ['磐城スターズ', 'IWK', 'star', 1],
  ],
  ENG1: [
    ['キングスメア・ユナイテッド', 'KMU', 'crown', 10], ['レイヴンズビー・シティ', 'RAV', 'bird', 10],
    ['アシュコム・ローヴァーズ', 'ASH', 'lion', 9], ['ウェストマーチ・アスレティック', 'WMA', 'sword', 9],
    ['ノースゲート・アルビオン', 'NGA', 'castle', 8], ['ハロウフィールド・タウン', 'HFT', 'shield', 8],
    ['イーストホーム・ワンダラーズ', 'EHW', 'star', 7], ['ブラッケンリッジFC', 'BRK', 'tree', 7],
    ['オークヘイヴン・シティ', 'OAK', 'tree', 7], ['レッドクリフ・レンジャーズ', 'RCR', 'mountain', 6],
    ['ストーンムーア・ユナイテッド', 'STM', 'castle', 6], ['エルズフォード・アスレティック', 'ELL', 'bolt', 6],
    ['メイプルトン・フォレスト', 'MAP', 'tree', 5], ['ホイットベリー・タウン', 'WHT', 'shield', 5],
    ['コールドウォーター・カウンティ', 'CLD', 'wave', 5], ['リンチェスター・シティ', 'LYN', 'lion', 5],
    ['ポート・ハルデン', 'PHA', 'anchor', 4], ['サクソンブリッジ・ヴィラ', 'SAX', 'castle', 4],
    ['ドレイマスFC', 'DRY', 'anchor', 4], ['ソーンウィック・アスレティック', 'THW', 'flame', 4],
  ],
  ENG2: [
    ['ギャロウメア・タウン', 'GAL', 'moon', 4], ['ホリンズワース・ユナイテッド', 'HOL', 'shield', 4],
    ['ブラムウェル・ローヴァーズ', 'BRM', 'bird', 4], ['フェンウィック・シティ', 'FEN', 'castle', 4],
    ['グリムズデール・アスレティック', 'GRM', 'mountain', 3], ['ペンマーシュFC', 'PEN', 'wave', 3],
    ['ウェクスリー・ワンダラーズ', 'WEX', 'star', 3], ['バーンホロウ・ユナイテッド', 'BHU', 'tree', 3],
    ['カルダーブルック・タウン', 'CAL', 'wave', 3], ['セッジムーア・シティ', 'SED', 'lion', 3],
    ['タイドウェル・ローヴァーズ', 'TID', 'anchor', 3], ['アンブルフォードFC', 'AMB', 'sun', 3],
    ['ケストレル・ベイFC', 'KES', 'bird', 2], ['メリトン・アスレティック', 'MER', 'bolt', 2],
    ['クオリーヒル・ユナイテッド', 'QHU', 'mountain', 2], ['ルックウッド・タウン', 'ROO', 'tree', 2],
    ['シルヴァーデイル・レンジャーズ', 'SIL', 'star', 2], ['アプトンマーシュFC', 'UPM', 'wave', 2],
    ['ヴェイルブルック・シティ', 'VAL', 'shield', 2], ['ヤロウビー・タウン', 'YAR', 'flame', 2],
  ],
  ESP1: [
    ['レアル・コスタルス', 'RCL', 'crown', 10], ['アトレティコ・バルドーラ', 'ATV', 'flame', 9],
    ['CDモンセラ', 'MON', 'mountain', 8], ['UDシエラマール', 'SIE', 'wave', 7], ['デポルティーボ・アルメナーラ', 'DAL', 'castle', 7],
    ['CFトレベージャ', 'TRV', 'castle', 6], ['ラシン・プエルトソル', 'RPS', 'sun', 6], ['UDカステルマール', 'CMR', 'anchor', 5],
    ['CDビエントアルト', 'VAT', 'bird', 5], ['スポルティング・バジェベルデ', 'SVV', 'tree', 5], ['CFロカネグラ', 'ROC', 'mountain', 4],
    ['ウニオン・ラゴアスル', 'ULA', 'wave', 4], ['CDペニャクララ', 'PCL', 'star', 4], ['アトレティコ・ミラソル', 'AMI', 'sun', 4],
    ['SDオリバレス', 'OLI', 'tree', 3], ['UDブリサマール', 'BRI', 'wave', 3], ['レアル・ベントサ', 'RVE', 'crown', 3],
    ['CDサンタルス', 'SLZ', 'star', 3],
  ],
  GER1: [
    ['FCアイゼンフルト', 'EIS', 'shield', 10], ['SVラインシュタット', 'RHE', 'castle', 9], ['VfLホーエンマルク', 'HOH', 'mountain', 8],
    ['TSVベルクタール', 'BTL', 'mountain', 7], ['1.FCヴォルフスハイム', 'WOL', 'lion', 7], ['SCノルトハーフェン', 'NOR', 'anchor', 6],
    ['アイントラハト・ゾンフェルト', 'SON', 'sun', 6], ['フォルトゥナ・カルトブルン', 'KAL', 'star', 5], ['FCグラウベルク', 'GRA', 'mountain', 5],
    ['SpVggリンデナウ', 'LIN', 'tree', 5], ['VfBシュタイナハ', 'STE', 'shield', 4], ['SVアドラーホルスト', 'ADL', 'bird', 4],
    ['FCモースバッハ', 'MOO', 'tree', 4], ['ウニオン・エルプタール', 'ELB', 'wave', 4], ['TuSファルケンリート', 'FAL', 'bird', 3],
    ['SCヴァイスハイム', 'WEI', 'star', 3], ['FSVドナウエック', 'DON', 'wave', 3], ['ロートヴァイス・オストヴァルト', 'RWO', 'flame', 3],
  ],
  ITA1: [
    ['ACヴァッレローザ', 'VRO', 'crown', 10], ['USモンテビアンコ', 'MBI', 'mountain', 9], ['ASポルトフェッロ', 'PFE', 'anchor', 8],
    ['FCカステルヴェルデ', 'CVE', 'castle', 7], ['スポルティング・アクイローニア', 'AQU', 'bird', 7], ['SSコッレアルト', 'CAL', 'mountain', 6],
    ['ACマーレネーロ', 'MNE', 'wave', 6], ['USトッレブルーナ', 'TBR', 'castle', 5], ['FCピエトラロッサ', 'PRO', 'flame', 5],
    ['ASヴァルドーロ', 'VDO', 'sun', 5], ['カルチョ・フィウメルンゴ', 'FIU', 'wave', 4], ['ヴィルトゥス・サンガッロ', 'SGL', 'shield', 4],
    ['ACベルコッレ', 'BEL', 'tree', 4], ['ロブル・モンテソーレ', 'MSO', 'sun', 4], ['USラーゴネーロ', 'LNE', 'moon', 3],
    ['FCセッラベッラ', 'SBE', 'star', 3], ['ASカンポルンゴ', 'CPL', 'tree', 3], ['プロ・コルダーナ', 'COR', 'lion', 3],
  ],
};

export const STADIUM_WORDS = {
  JPN: ['スタジアム', 'フィールド', 'パーク', 'アリーナ', '競技場'],
  ENG: ['パーク', 'ロード', 'グラウンド', 'レーン', 'スタジアム'],
  ESP: ['エスタディオ', 'カンポ'],
  GER: ['シュターディオン', 'アレーナ', 'パルク'],
  ITA: ['スタディオ', 'アレーナ'],
};

/** Kit palettes: [primary, secondary, accent]. */
export const PALETTES = [
  ['#c8102e', '#ffffff', '#1a1a1a'], ['#0b3d91', '#ffffff', '#f2c14e'], ['#00843d', '#ffffff', '#0a2f1b'],
  ['#1d1d1f', '#ffffff', '#c8a24a'], ['#6a2c91', '#ffffff', '#f5c400'], ['#e35205', '#14213d', '#ffffff'],
  ['#0072ce', '#ffd100', '#0b2545'], ['#ffd100', '#1d1d1f', '#ffffff'], ['#7a1e2c', '#7fb2e5', '#ffffff'],
  ['#009ca6', '#ffffff', '#11324d'], ['#d6001c', '#0c2340', '#ffffff'], ['#f4f4f4', '#0c2340', '#c8102e'],
  ['#87ceeb', '#0b2545', '#ffffff'], ['#3a5f0b', '#f2e6c9', '#1a1a1a'], ['#ff6f00', '#ffffff', '#222222'],
  ['#14213d', '#fca311', '#ffffff'], ['#b31942', '#ffffff', '#0a3161'], ['#2e7d32', '#ffeb3b', '#1b1b1b'],
  ['#5c2d91', '#00bcd4', '#ffffff'], ['#a50034', '#f7c600', '#ffffff'], ['#0d47a1', '#e53935', '#ffffff'],
  ['#263238', '#80cbc4', '#ffffff'], ['#ef6c00', '#263238', '#ffffff'], ['#1565c0', '#90caf9', '#0d1b2a'],
];
export const PATTERNS = ['plain', 'stripes', 'hoops', 'sash', 'halves', 'plain', 'stripes'];
export const CREST_SHAPES = ['shield', 'round', 'diamond', 'shield2', 'hex', 'banner'];
