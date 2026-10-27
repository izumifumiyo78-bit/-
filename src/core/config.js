// ---------------------------------------------------------------------------
// config.js : pitch geometry (FIFA-legal metres) + all gameplay tuning.
// Everything the designer wants to tweak lives here.
// ---------------------------------------------------------------------------

export const PITCH = {
  length: 105,
  width: 68,
  halfL: 52.5,
  halfW: 34,
  goalWidth: 7.32,
  goalHalf: 3.66,
  goalHeight: 2.44,
  goalDepth: 2.0,
  boxDepth: 16.5,          // penalty area depth from goal line
  boxHalfW: 20.16,
  sixDepth: 5.5,
  sixHalfW: 9.16,
  penSpot: 11.0,
  centreR: 9.15,
  arcR: 9.15,              // penalty arc radius
  cornerR: 1.0,
  lineW: 0.12,
  // Out-of-play margin used by the camera / stands.
  runOffX: 8.5,
  runOffY: 7.5,
};

export const G = 9.81;

export const BALL = {
  r: 0.111,
  mass: 0.43,
  airDrag: 0.0055,         // quadratic drag coefficient (per m)
  magnus: 0.0072,           // spin -> lateral force factor (strong curl is visible)
  spinDecay: 0.72,         // per second, airborne
  spinDecayGround: 2.6,
  restitution: 0.58,       // vertical bounce
  friction: 0.62,          // sliding friction on grass
  rollDrag: 0.42,          // rolling resistance (per second)
  postRest: 0.66,
  netDamp: 0.22,
  maxSpeed: 42,
};

export const PLAY = {
  // --- movement -------------------------------------------------------------
  baseSpeed: 6.10,         // m/s at pace 50
  paceSpan: 2.00,          // extra m/s from pace 0->100
  sprintMul: 1.180,
  accel: 6.9,
  decel: 13.0,
  turnRate: 7.4,           // rad/s at full control
  turnPenalty: 0.55,       // speed scale when turning hard
  dribbleSpeedMul: 0.915,  // carrying the ball costs a little
  shieldSpeedMul: 0.6,
  // --- ball control ---------------------------------------------------------
  controlR: 1.05,          // radius in which a player may touch the ball
  controlZ: 1.05,
  touchCooldown: 0.085,
  dribbleAhead: 0.78,      // how far ahead the carrier pushes the ball
  dribbleTouchEvery: 0.22,
  firstTouchErr: 0.9,      // metres of error at control 0
  // --- passing --------------------------------------------------------------
  passMin: 9.5,
  passMax: 24.5,
  passLoftMin: 0.055,
  throughLoft: 0.1,
  longPassLoft: 0.34,
  passErrDeg: 9.5,         // angular error at passing 0 under full pressure
  // --- shooting -------------------------------------------------------------
  shotMin: 16.0,
  shotMax: 33.0,
  shotLoft: 0.165,
  shotErrDeg: 8.0,
  finesseCurl: 1.5,
  // --- defending ------------------------------------------------------------
  tackleR: 1.95,
  tackleWindow: 0.26,
  slideSpeed: 9.6,
  slideTime: 0.72,
  slideR: 1.5,
  foulBase: 0.075,
  jostleR: 0.95,
  // --- stamina --------------------------------------------------------------
  staminaDrainWalk: 0.22,
  staminaDrainSprint: 2.35,
  staminaRecover: 1.05,
  staminaSpeedBite: 0.17,  // max speed lost when exhausted
  // --- keeper ---------------------------------------------------------------
  gkReach: 2.55,
  gkDiveSpeed: 8.2,
  gkDiveTime: 0.78,
  gkRushTrigger: 13.0,
  gkHandleR: 1.25,
};

export const AI = {
  lineBase: 0.34,          // defensive line as fraction of own half
  pressRadius: 13.5,
  pressCount: 2,
  markTight: 2.1,
  shapeSpring: 2.5,
  supportSpread: 9.0,
  runTriggerDist: 26,
  offsideCare: 0.9,
  decisionEvery: 0.11,
  reactionBase: 0.14,
};

// Difficulty presets scale AI quality and the player's assistance.
export const DIFFICULTY = [
  { id: 'beginner', name: 'ビギナー', en: 'Beginner',
    aiSkill: 0.62, aiReact: 1.75, aiPress: 0.70, aiShotErr: 1.9,
    assist: 1.00, userErr: 0.55, gk: 0.80, userGk: 1.16 },
  { id: 'amateur', name: 'アマチュア', en: 'Amateur',
    aiSkill: 0.76, aiReact: 1.35, aiPress: 0.85, aiShotErr: 1.45,
    assist: 0.92, userErr: 0.75, gk: 0.90, userGk: 1.08 },
  { id: 'pro', name: 'プロ', en: 'Professional',
    aiSkill: 0.88, aiReact: 1.08, aiPress: 1.00, aiShotErr: 1.12,
    assist: 0.80, userErr: 0.92, gk: 1.00, userGk: 1.00 },
  { id: 'world', name: 'ワールドクラス', en: 'World Class',
    aiSkill: 0.97, aiReact: 0.90, aiPress: 1.14, aiShotErr: 0.95,
    assist: 0.68, userErr: 1.04, gk: 1.07, userGk: 0.96 },
  { id: 'legend', name: 'レジェンド', en: 'Legendary',
    aiSkill: 1.06, aiReact: 0.76, aiPress: 1.28, aiShotErr: 0.84,
    assist: 0.56, userErr: 1.14, gk: 1.14, userGk: 0.93 },
];

export const MATCH_LENGTHS = [2, 4, 6, 10];   // minutes per half

export const RULES = {
  offside: true,
  fouls: true,
  cards: true,
  advantageWindow: 0.9,
  restartHold: 0.38,       // settle time before a restart may be taken
  cornerPressTime: 1.2,
};

export const SIM = {
  hz: 60,
  dt: 1 / 60,
  maxSubSteps: 5,
};
