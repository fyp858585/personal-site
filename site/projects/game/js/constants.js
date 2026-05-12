// ===== 像素要塞 · 游戏常量 =====

// ---- 画布 ----
const CELL_SIZE = 48;
const GRID_COLS = 20;
const GRID_ROWS = 14;
const CANVAS_WIDTH = CELL_SIZE * GRID_COLS;   // 960
const CANVAS_HEIGHT = CELL_SIZE * GRID_ROWS;   // 672

// ---- 地图格类型 ----
const TILE = { EMPTY: 0, PATH: 1, BUILDABLE: 2 };

// ---- 塔类型 ----
const TOWER_TYPES = {
  arrow: {
    name: '箭塔',
    icon: '🔸',
    cost: 50,
    damage: 15,
    range: 3,           // 格数
    fireRate: 0.6,      // 秒/发
    bulletSpeed: 8,     // px/frame
    color: '#00e5ff',
    bulletColor: '#00e5ff',
    description: '快速射击，单目标',
  },
  cannon: {
    name: '炮塔',
    icon: '💣',
    cost: 100,
    damage: 40,
    range: 2.5,
    fireRate: 2.0,
    bulletSpeed: 5,
    splash: 1,          // 溅射半径(格)
    color: '#ff8c42',
    bulletColor: '#ff8c42',
    description: '范围溅射，伤害高',
  },
  ice: {
    name: '冰塔',
    icon: '❄️',
    cost: 75,
    damage: 10,
    range: 3,
    fireRate: 1.0,
    bulletSpeed: 6,
    slowAmount: 0.4,    // 减速比例
    slowDuration: 2.0,  // 秒
    color: '#a0d8ef',
    bulletColor: '#b0e0ff',
    description: '减速敌人40%',
  },
  tesla: {
    name: '电塔',
    icon: '⚡',
    cost: 125,
    damage: 20,
    range: 3,
    fireRate: 1.8,
    chainCount: 3,
    chainRange: 2,      // 弹射范围(格)
    color: '#a855f7',
    bulletColor: '#c084fc',
    description: '连锁闪电，弹射3目标',
  },
};

// ---- 升级系统 ----
const UPGRADE_MULTIPLIERS = {
  1: { damage: 1.0, range: 1.0, costMult: 1.0, nameSuffix: '' },
  2: { damage: 1.5, range: 1.15, costMult: 0.6, nameSuffix: ' II' },
  3: { damage: 2.5, range: 1.3, costMult: 1.2, nameSuffix: ' III' },
};
const SELL_REFUND = 0.6;

// ---- 敌人类型 ----
const ENEMY_TYPES = {
  runner: {
    name: '疾行者',
    icon: '🟢',
    hp: 30,
    speed: 3,           // px/frame
    reward: 5,
    livesCost: 1,
    size: 12,
    color: '#44ff88',
    slowResist: 0,
    healAura: 0,
    minWave: 1,
  },
  grunt: {
    name: '步兵',
    icon: '🟡',
    hp: 80,
    speed: 2,
    reward: 10,
    livesCost: 1,
    size: 14,
    color: '#ffd740',
    slowResist: 0,
    healAura: 0,
    minWave: 2,
  },
  tank: {
    name: '重装兵',
    icon: '🟠',
    hp: 250,
    speed: 1,
    reward: 20,
    livesCost: 2,
    size: 18,
    color: '#ff8c42',
    slowResist: 0.5,
    healAura: 0,
    minWave: 5,
  },
  medic: {
    name: '医疗兵',
    icon: '🟣',
    hp: 120,
    speed: 2,
    reward: 25,
    livesCost: 1,
    size: 14,
    color: '#c084fc',
    slowResist: 0,
    healAura: 5,        // HP/s 治疗周围
    minWave: 8,
  },
  boss: {
    name: '首领',
    icon: '🔴',
    hp: 800,
    speed: 0.7,
    reward: 100,
    livesCost: 5,
    size: 28,
    color: '#ff4466',
    slowResist: 1.0,    // 完全免疫减速
    healAura: 0,
    minWave: 5,
    boss: true,
  },
};

// ---- 波次 ----
const WAVE_PREP_TIME = 15;        // 准备时间(秒)
const BASE_ENEMY_COUNT = 4;       // 基础敌人数
const ENEMIES_PER_WAVE = 2;       // 每波增加敌人数
const HP_SCALE = 1.15;            // 每波血量倍率
const SPAWN_INTERVAL_MIN = 0.4;   // 最快出兵间隔(秒)
const SPAWN_INTERVAL_MAX = 1.2;   // 最慢出兵间隔(秒)
const WAVE_BONUS_BASE = 50;       // 波次通关基础奖励
const WAVE_BONUS_PER = 10;        // 每波额外奖励
const START_GOLD = 200;
const START_LIVES = 20;

// ---- 特殊波 ----
const BOSS_WAVE_INTERVAL = 5;     // 每N波出Boss
const RUSH_WAVE_INTERVAL = 10;    // 闪电冲锋波
const SIEGE_WAVE_INTERVAL = 15;   // 铁壁重装波
