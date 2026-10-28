/* =============================================================================
   DJI OSMO ACTION 4 — INTERACTIVE TEARDOWN
   Pure Three.js / canvas-generated geometry and textures. No model files.
   ============================================================================= */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* -----------------------------------------------------------------------------
   01 — Component data
   -------------------------------------------------------------------------- */

const MODULES = [
  {
    id: 'lens',
    index: '01',
    name: '镜头模组',
    en: 'Lens Module',
    category: 'Optical system',
    spec: '155° · f/2.8',
    labelSide: 'right',
    delay: 0.04,
    base: [1.47, 0.27, 1.69],
    exploded: [2.2, 1.0, 4.0],
    rot: [0, 0, 0],
    explodeRot: [0.06, 0.12, 0.04],
    anchor: [0, 0, 0.57],
    desc: '1/1.3 英寸 CMOS 与 155° 超广角镜组集成在同一光学模组。f/2.8 大光圈配合 10-bit D-Log M，在低光与高反差场景中保留更宽的动态范围。',
    stats: [
      ['视场角', '155° 超广角'],
      ['光圈', 'f/2.8'],
      ['影像传感器', '1/1.3″ CMOS'],
      ['最近对焦', '0.4 m – ∞'],
    ],
  },
  {
    id: 'front-screen',
    index: '02',
    name: '前屏总成',
    en: 'Front Display',
    category: 'Display / front',
    spec: '1.4″ · 320²',
    labelSide: 'left',
    delay: 0.1,
    base: [-1.43, 0.22, 1.7],
    exploded: [-2.9, 1.35, 3.55],
    rot: [0, 0, 0],
    explodeRot: [0.03, -0.14, -0.04],
    anchor: [0, 0, 0.12],
    desc: '前屏采用 1.4 英寸方形触控面板，320 × 320 分辨率与 323 ppi 像素密度，在自拍取景时提供清晰、低延迟的画面回显。',
    stats: [
      ['尺寸', '1.4 英寸'],
      ['分辨率', '320 × 320'],
      ['像素密度', '323 ppi'],
      ['亮度', '750 ± 50 cd/m²'],
    ],
  },
  {
    id: 'front-shell',
    index: '03',
    name: '前壳面板',
    en: 'Front Frame',
    category: 'Structural shell',
    spec: 'IP68 SEAL',
    labelSide: 'left',
    delay: 0.18,
    base: [0, 0, 1.49],
    exploded: [0.1, -3.15, 1.1],
    rot: [0, 0, 0],
    explodeRot: [-1.4308, -0.12, 0.02],
    anchor: [-2.2, -1.05, 0.13],
    desc: '前壳以高强度复合材料压合而成，承担镜头座、屏幕与密封结构的安装基准，同时吸收正面冲击。',
    stats: [
      ['材质', '高强度复合材质'],
      ['密封结构', '双重压合'],
      ['防护', 'IP68 · 裸机 18 m'],
      ['镜头环', '可更换式'],
    ],
  },
  {
    id: 'frame',
    index: '04',
    name: '中框骨架',
    en: 'Structural Frame',
    category: 'Chassis core',
    spec: 'IP68 / 145 g',
    labelSide: 'right',
    delay: 0.26,
    base: [0, 0, 0],
    exploded: [0, 0, 0],
    rot: [0, 0, 0],
    explodeRot: [0, 0, 0],
    anchor: [2.7, 0.85, 0.42],
    desc: '中框是整机的承力骨架，将主板、电池与双侧舱盖收束在同一结构内，并参与 IP68 防水密封。',
    stats: [
      ['结构', '一体化承力中框'],
      ['抗冲击', '侧向缓冲设计'],
      ['电池仓', '快拆锁止'],
      ['整机重量', '145 g'],
    ],
  },
  {
    id: 'mainboard',
    index: '05',
    name: '主板核心',
    en: 'Mainboard',
    category: 'Processing core',
    spec: 'ROCKSTEADY 3.0',
    labelSide: 'right',
    delay: 0.37,
    base: [0.38, 0.12, -0.44],
    exploded: [1.2, 2.7, -1.15],
    rot: [0, 0, 0],
    explodeRot: [-0.16, -0.34, 0.035],
    anchor: [0, 1.05, 0.09],
    desc: '主板集成影像处理、电子增稳与无线连接。RockSteady 3.0 与地平线增稳算法在此实时运算，输出最高 4K/120fps 视频。',
    stats: [
      ['增稳', 'RockSteady 3.0'],
      ['最高视频', '4K / 120 fps'],
      ['视频编码', 'H.264 / HEVC'],
      ['无线连接', 'Wi-Fi 5 · BLE 5.0'],
    ],
  },
  {
    id: 'battery',
    index: '06',
    name: '电池模组',
    en: 'Battery',
    category: 'Power system',
    spec: '1770 mAh',
    labelSide: 'left',
    delay: 0.48,
    base: [0, -0.12, 0.08],
    exploded: [-3.15, -1.05, 1.35],
    rot: [0, 0, 0],
    explodeRot: [0.04, 0.14, -0.06],
    anchor: [0, 0.65, 1.08],
    desc: '1770mAh / 6.8Wh 的 1S LiPo 电池，支持最高 160 分钟持续录制。耐低温设计让它在 -20°C 至 45°C 的环境中保持稳定输出。',
    stats: [
      ['容量', '1770 mAh'],
      ['能量', '6.8 Wh'],
      ['电压', '3.85 V'],
      ['最长续航', '160 分钟'],
    ],
  },
  {
    id: 'rear-module',
    index: '07',
    name: '后屏组件',
    en: 'Rear Display',
    category: 'Display / rear',
    spec: '2.25″ · TOUCH',
    labelSide: 'right',
    delay: 0.15,
    base: [0, 0, -1.49],
    exploded: [3.4, 0.0, -2.4],
    rot: [0, 0, 0],
    explodeRot: [0.05, -0.75, 0.03],
    anchor: [1.2, 1.05, -0.16],
    desc: '后屏为 2.25 英寸触控屏，360 × 640 分辨率、326 ppi，并具备 750 cd/m² 亮度，用于监看、回放与完整参数设置。',
    stats: [
      ['尺寸', '2.25 英寸'],
      ['分辨率', '360 × 640'],
      ['像素密度', '326 ppi'],
      ['交互', '全贴合触控'],
    ],
  },
  {
    id: 'shutter',
    index: '08',
    name: '顶部录制键',
    en: 'Shutter Button',
    category: 'Control interface',
    spec: 'REC / STOP',
    labelSide: 'left',
    delay: 0.3,
    base: [-1.45, 2.22, 0.18],
    exploded: [-1.4, 3.55, 0.2],
    rot: [0, 0, 0],
    explodeRot: [0.16, 0.05, -0.08],
    anchor: [0, 0.16, 0],
    desc: '顶部录制键采用大尺寸圆形键帽与红色环形指示，盲操作时也能快速开始或停止录制，按键本身具备独立防水结构。',
    stats: [
      ['功能', '录制 / 快门'],
      ['状态指示', '环形 LED'],
      ['操作', '单按启停'],
      ['密封', '独立防水按键'],
    ],
  },
  {
    id: 'right-cover',
    index: '09',
    name: '右侧舱盖',
    en: 'USB-C Cover',
    category: 'Port interface',
    spec: 'USB-C · QS',
    labelSide: 'right',
    delay: 0.34,
    base: [3.54, -0.35, 0.1],
    exploded: [4.35, -1.25, 0.45],
    rot: [0, 0, 0],
    explodeRot: [0.03, 0.2, -0.03],
    anchor: [0, 0.85, 0],
    desc: '右侧舱盖整合 USB-C 接口与电源 / QuickSwitch 按键。硅胶密封结构在闭合后阻隔水汽与细颗粒进入接口区域。',
    stats: [
      ['接口', 'USB-C'],
      ['按键', '电源 / QuickSwitch'],
      ['防护', '硅胶密封舱盖'],
      ['功能', '充电 · 数据传输'],
    ],
  },
  {
    id: 'battery-door',
    index: '10',
    name: '电池仓盖',
    en: 'Battery Door',
    category: 'Access / power',
    spec: 'MICRO SD',
    labelSide: 'left',
    delay: 0.42,
    base: [-3.54, -0.1, 0.1],
    exploded: [-4.2, -1.9, 1.55],
    rot: [0, 0, 0],
    explodeRot: [-0.04, -0.17, 0.04],
    anchor: [0, 0.65, 0],
    desc: '左侧电池仓盖通过滑动锁扣开合，内部同时容纳 microSD 卡槽。可免工具快速更换电池，满足长时间户外拍摄。',
    stats: [
      ['开合', '侧滑锁扣'],
      ['存储', 'microSD · 最大 512 GB'],
      ['密封', '防水胶圈'],
      ['更换', '免工具快拆'],
    ],
  },
  {
    id: 'heatsink',
    index: '11',
    name: '散热模组',
    en: 'Thermal System',
    category: 'Thermal design',
    spec: 'PASSIVE COOLING',
    labelSide: 'left',
    delay: 0.52,
    base: [0, -0.34, -0.88],
    exploded: [2.45, -1.72, -0.8],
    rot: [0, 0, 0],
    explodeRot: [0.18, -0.24, -0.05],
    anchor: [0, 0.15, 0],
    desc: '内置散热模组通过金属鳍片与石墨导热层，将芯片热量传导至机身表面，保障 4K/120 高码率录制时的持续性能。',
    stats: [
      ['结构', '鳍片 + 导热层'],
      ['材料', '铝合金 / 石墨'],
      ['散热', '被动式贯穿风道'],
      ['目标', '4K / 120 持续录制'],
    ],
  },
];

/* -----------------------------------------------------------------------------
   02 — Utilities
   -------------------------------------------------------------------------- */

const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const PI = Math.PI;
const isCoarse = window.matchMedia('(pointer: coarse)').matches;

function smoothstep(min, max, value) {
  const t = clamp((value - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function seededRandom(seed = 1) {
  let value = seed >>> 0;
  return function random() {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function roundedShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(r, w / 2, h / 2);
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  shape.closePath();
  return shape;
}

function roundedRectPoints(w, h, r, segments = 8) {
  const points = [];
  const radius = Math.min(r, w / 2, h / 2);
  const corners = [
    [w / 2 - radius, -h / 2 + radius, -PI / 2],
    [w / 2 - radius, h / 2 - radius, 0],
    [-w / 2 + radius, h / 2 - radius, PI / 2],
    [-w / 2 + radius, -h / 2 + radius, PI],
  ];
  for (let c = 0; c < 4; c += 1) {
    const [cx, cy, start] = corners[c];
    for (let i = 0; i <= segments; i += 1) {
      const a = start + (i / segments) * (PI / 2);
      points.push(new THREE.Vector3(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, 0));
    }
  }
  return points;
}

function extrudedRoundedPlate(w, h, depth, radius, bevel = 0.045) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(w, h, radius), {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 18,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

function makeCanvasTexture(width, height, draw, colorSpace = true) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  if (colorSpace) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/* -----------------------------------------------------------------------------
   03 — Renderer, stage, camera
   -------------------------------------------------------------------------- */

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x040708, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040708);
scene.fog = new THREE.FogExp2(0x040708, 0.0175);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 120);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.enablePan = false;
controls.rotateSpeed = 0.62;
controls.zoomSpeed = 0.75;
controls.minDistance = 5.5;
controls.maxDistance = 46;
controls.minPolarAngle = 0.24;
controls.maxPolarAngle = PI * 0.535;
controls.target.set(0.5, 0.12, 0);
controls.autoRotateSpeed = 0.55;

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
const environmentScene = new RoomEnvironment();
const environmentMap = pmrem.fromScene(environmentScene, 0.04).texture;
scene.environment = environmentMap;
scene.environmentIntensity = 0.48;
environmentScene.dispose();

/* -----------------------------------------------------------------------------
   04 — Procedural textures
   -------------------------------------------------------------------------- */

const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const noiseTexture = (() => {
  const size = 256;
  const canvasEl = document.createElement('canvas');
  canvasEl.width = size;
  canvasEl.height = size;
  const ctx = canvasEl.getContext('2d');
  const image = ctx.createImageData(size, size);
  const random = seededRandom(48291);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = 104 + Math.floor(random() * 72);
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvasEl);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = maxAnisotropy;
  return texture;
})();

const frontScreenTexture = makeCanvasTexture(1024, 1024, (ctx, w, h) => {
  const random = seededRandom(84721);

  // Base glass
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#102b2d');
  base.addColorStop(0.5, '#0b1c1d');
  base.addColorStop(1, '#050c0c');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // Live-view scene — a procedural dusk horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.7);
  sky.addColorStop(0, '#164548');
  sky.addColorStop(0.38, '#2a7774');
  sky.addColorStop(0.66, '#c8a77c');
  sky.addColorStop(1, '#2a3430');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const sun = ctx.createRadialGradient(w * 0.68, h * 0.45, 2, w * 0.68, h * 0.45, w * 0.21);
  sun.addColorStop(0, 'rgba(255,244,208,.95)');
  sun.addColorStop(0.18, 'rgba(255,217,159,.6)');
  sun.addColorStop(1, 'rgba(255,197,128,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);

  // Far mountains.
  ctx.beginPath();
  ctx.moveTo(0, h * 0.55);
  for (let x = 0; x <= w; x += 26) {
    const y = h * 0.52 + Math.sin(x * 0.007 + 1.4) * 20 + random() * 14;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h * 0.7);
  ctx.lineTo(0, h * 0.7);
  ctx.closePath();
  ctx.fillStyle = 'rgba(20,49,49,.52)';
  ctx.fill();

  // Near ridge.
  ctx.beginPath();
  ctx.moveTo(0, h * 0.68);
  for (let x = 0; x <= w; x += 20) {
    const y = h * 0.64 + Math.sin(x * 0.013 + 0.2) * 42 + Math.sin(x * 0.031) * 11;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fillStyle = 'rgba(7,21,22,.9)';
  ctx.fill();

  // Water reflections.
  const water = ctx.createLinearGradient(0, h * 0.69, 0, h);
  water.addColorStop(0, 'rgba(46,103,98,.64)');
  water.addColorStop(1, 'rgba(3,12,13,1)');
  ctx.fillStyle = water;
  ctx.fillRect(0, h * 0.69, w, h * 0.31);
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 26; i += 1) {
    ctx.fillStyle = i % 3 === 0 ? '#e2c59d' : '#8ed4c9';
    const y = h * 0.7 + random() * h * 0.27;
    const width = 45 + random() * 240;
    ctx.fillRect(w * 0.5 - width / 2 + (random() - 0.5) * 120, y, width, 1.2);
  }
  ctx.globalAlpha = 1;

  // Viewfinder grid.
  ctx.strokeStyle = 'rgba(236,255,248,.14)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 16]);
  for (let i = 1; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo((w / 3) * i, 0);
    ctx.lineTo((w / 3) * i, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, (h / 3) * i);
    ctx.lineTo(w, (h / 3) * i);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Top HUD.
  const top = ctx.createLinearGradient(0, 0, 0, 126);
  top.addColorStop(0, 'rgba(2,8,9,.76)');
  top.addColorStop(1, 'rgba(2,8,9,0)');
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, w, 126);

  ctx.fillStyle = '#ff4b5d';
  ctx.beginPath();
  ctx.arc(56, 57, 10, 0, PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f4fbf7';
  ctx.font = '500 25px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('REC', 79, 66);
  ctx.fillStyle = 'rgba(233,252,246,.82)';
  ctx.font = '400 24px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('00:12:48', 155, 66);

  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(235,252,246,.92)';
  ctx.font = '600 27px "Avenir Next", "Helvetica Neue", sans-serif';
  ctx.fillText('4K · 120', w - 58, 64);
  ctx.fillStyle = 'rgba(233,252,246,.55)';
  ctx.font = '400 18px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('16:9  ·  130 Mbps', w - 58, 92);

  // Battery glyph.
  ctx.strokeStyle = 'rgba(238,255,248,.72)';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(w - 105, 105, 44, 20);
  ctx.fillStyle = 'rgba(125,255,232,.9)';
  ctx.fillRect(w - 102, 108, 33, 14);
  ctx.fillRect(w - 59, 111, 3, 8);

  // Focus brackets.
  const cx = w * 0.5;
  const cy = h * 0.53;
  const bracket = 84;
  ctx.strokeStyle = 'rgba(125,255,232,.9)';
  ctx.lineWidth = 3;
  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ];
  for (const [sx, sy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * bracket, cy + sy * bracket - sy * 24);
    ctx.lineTo(cx + sx * bracket, cy + sy * bracket);
    ctx.lineTo(cx + sx * bracket - sx * 24, cy + sy * bracket);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(238,255,250,.82)';
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, PI * 2);
  ctx.fill();

  // Left exposure scale.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(240,255,250,.86)';
  ctx.font = '400 21px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('ISO 100', 52, h * 0.57);
  ctx.fillText('1/240', 52, h * 0.6);
  ctx.fillStyle = 'rgba(125,255,232,.72)';
  ctx.font = '400 15px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('D-LOG M', 52, h * 0.645);

  // Bottom HUD.
  const bottom = ctx.createLinearGradient(0, h - 230, 0, h);
  bottom.addColorStop(0, 'rgba(2,9,10,0)');
  bottom.addColorStop(0.4, 'rgba(2,9,10,.55)');
  bottom.addColorStop(1, 'rgba(2,9,10,.9)');
  ctx.fillStyle = bottom;
  ctx.fillRect(0, h - 230, w, 230);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f0fdf8';
  ctx.font = '300 58px "Avenir Next Condensed", "Helvetica Neue", sans-serif';
  ctx.fillText('4K', 54, h - 88);
  ctx.fillStyle = 'rgba(125,255,232,.94)';
  ctx.font = '500 25px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('120 FPS', 160, h - 90);
  ctx.fillStyle = 'rgba(224,246,238,.54)';
  ctx.font = '400 17px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('ROCKSTEADY 3.0+  /  HORIZONSTEADY', 56, h - 50);

  // DJI wordmark drawn as type.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(232,255,247,.7)';
  ctx.font = '700 34px "Helvetica Neue", sans-serif';
  ctx.fillText('dji', w - 56, h - 51);
  ctx.fillStyle = 'rgba(231,255,247,.38)';
  ctx.font = '400 13px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('OSMO ACTION 4', w - 56, h - 28);

  // Glass reflection.
  const glare = ctx.createLinearGradient(0, 0, w, h);
  glare.addColorStop(0, 'rgba(255,255,255,.12)');
  glare.addColorStop(0.16, 'rgba(255,255,255,.015)');
  glare.addColorStop(0.55, 'rgba(255,255,255,0)');
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, w, h);

  // Vignette.
  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.16, w / 2, h / 2, w * 0.72);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
});
frontScreenTexture.anisotropy = maxAnisotropy;

const rearScreenTexture = makeCanvasTexture(1024, 640, (ctx, w, h) => {
  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, '#091515');
  base.addColorStop(1, '#040808');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, '#12343a');
  sky.addColorStop(0.6, '#356e6b');
  sky.addColorStop(1, '#101d1c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.72);

  const glow = ctx.createRadialGradient(w * 0.44, h * 0.43, 3, w * 0.44, h * 0.43, w * 0.18);
  glow.addColorStop(0, 'rgba(255,235,192,.8)');
  glow.addColorStop(1, 'rgba(255,222,170,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.beginPath();
  ctx.moveTo(0, h * 0.56);
  for (let x = 0; x <= w; x += 24) {
    ctx.lineTo(x, h * 0.52 + Math.sin(x * 0.01) * 24);
  }
  ctx.lineTo(w, h * 0.73);
  ctx.lineTo(0, h * 0.73);
  ctx.closePath();
  ctx.fillStyle = 'rgba(8,25,25,.86)';
  ctx.fill();

  ctx.fillStyle = 'rgba(2,8,8,.82)';
  ctx.fillRect(0, 0, w, 88);
  ctx.fillRect(0, h - 112, w, 112);

  ctx.fillStyle = 'rgba(238,255,249,.7)';
  ctx.font = '400 19px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('MEDIA  /  ALL', 46, 54);
  ctx.textAlign = 'right';
  ctx.fillText('4K 120  ·  00:00:46', w - 46, 54);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f0fff9';
  ctx.font = '300 58px "Avenir Next Condensed", "Helvetica Neue", sans-serif';
  ctx.fillText('PLAYBACK', 46, h - 48);
  ctx.fillStyle = 'rgba(125,255,232,.86)';
  ctx.font = '400 17px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('SWIPE TO REVIEW', 46, h - 24);

  // Playback controls.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(125,255,232,.9)';
  ctx.beginPath();
  ctx.moveTo(w - 135, h - 66);
  ctx.lineTo(w - 98, h - 46);
  ctx.lineTo(w - 135, h - 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(237,255,250,.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(w - 238, h - 54, 32, 18);
  ctx.strokeRect(w - 196, h - 54, 32, 18);

  const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,.44)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
});
rearScreenTexture.anisotropy = maxAnisotropy;

const pcbTexture = makeCanvasTexture(1024, 600, (ctx, w, h) => {
  const random = seededRandom(72013);
  ctx.fillStyle = '#071b17';
  ctx.fillRect(0, 0, w, h);

  const wash = ctx.createLinearGradient(0, 0, w, h);
  wash.addColorStop(0, 'rgba(29,89,72,.36)');
  wash.addColorStop(0.48, 'rgba(7,25,21,0)');
  wash.addColorStop(1, 'rgba(16,63,53,.28)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);

  // Dense copper traces.
  for (let i = 0; i < 120; i += 1) {
    const startX = random() * w;
    const startY = random() * h;
    const horizontal = random() > 0.45;
    const length = 35 + random() * 210;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    if (horizontal) {
      ctx.lineTo(startX + length, startY);
      ctx.lineTo(startX + length + 16, startY + (random() > 0.5 ? 16 : -16));
    } else {
      ctx.lineTo(startX, startY + length);
      ctx.lineTo(startX + (random() > 0.5 ? 16 : -16), startY + length + 16);
    }
    ctx.strokeStyle = random() > 0.3 ? 'rgba(192,146,78,.32)' : 'rgba(92,235,200,.24)';
    ctx.lineWidth = 0.7 + random() * 1.4;
    ctx.stroke();
  }

  // Pads and vias.
  for (let i = 0; i < 180; i += 1) {
    const x = random() * w;
    const y = random() * h;
    const r = 1.2 + random() * 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, PI * 2);
    ctx.fillStyle = random() > 0.6 ? 'rgba(209,174,109,.55)' : 'rgba(72,170,145,.35)';
    ctx.fill();
    if (random() > 0.7) {
      ctx.beginPath();
      ctx.arc(x, y, r + 2.5, 0, PI * 2);
      ctx.strokeStyle = 'rgba(147,255,225,.15)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // Board labels.
  ctx.fillStyle = 'rgba(211,255,243,.44)';
  ctx.font = '500 16px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('DJI  ACTION 4  /  MAINBOARD', 54, 70);
  ctx.fillStyle = 'rgba(125,255,232,.38)';
  ctx.font = '400 11px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('REV.04   ·   2023.07   ·   A4-MB-IN', 54, 91);
  ctx.fillStyle = 'rgba(226,185,118,.48)';
  ctx.fillText('J1', 800, 92);
  ctx.fillText('U7', 181, 470);
  ctx.fillText('TP4056', 780, 488);

  // Registration marks.
  ctx.strokeStyle = 'rgba(156,255,233,.18)';
  ctx.lineWidth = 1;
  const marks = [
    [26, 26],
    [w - 26, 26],
    [26, h - 26],
    [w - 26, h - 26],
  ];
  for (const [x, y] of marks) {
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x, y + 10);
    ctx.stroke();
  }
});
pcbTexture.anisotropy = maxAnisotropy;

const actionBadgeTexture = makeCanvasTexture(512, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#060909';
  roundRectPath(ctx, 2, 2, w - 4, h - 4, 25);
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,230,225,.15)';
  ctx.lineWidth = 2;
  roundRectPath(ctx, 3, 3, w - 6, h - 6, 24);
  ctx.stroke();

  ctx.fillStyle = '#ebf4f0';
  ctx.font = '600 54px "Avenir Next", "Helvetica Neue", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ACTION', 52, 82);
  ctx.fillStyle = 'rgba(240,250,246,.45)';
  ctx.beginPath();
  ctx.arc(333, 64, 6, 0, PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff3f53';
  ctx.font = '700 68px "Helvetica Neue", sans-serif';
  ctx.fillText('4', 366, 86);
});
actionBadgeTexture.anisotropy = maxAnisotropy;

const lensLabelTexture = makeCanvasTexture(1024, 1024, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);

  // Fine ticks around the collar.
  ctx.strokeStyle = 'rgba(209,229,224,.28)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 96; i += 1) {
    const angle = (i / 96) * PI * 2;
    const inner = i % 8 === 0 ? 404 : 416;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * 430, Math.sin(angle) * 430);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(213,230,226,.56)';
  ctx.font = '500 25px "SFMono-Regular", Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FOV 155°', 0, -324);

  ctx.save();
  ctx.rotate(-PI / 2);
  ctx.fillText('1/1.3″', -5, -322);
  ctx.restore();

  ctx.textAlign = 'right';
  ctx.fillText('F/2.8', 286, 304);
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,79,96,.78)';
  ctx.beginPath();
  ctx.arc(-260, 310, 4, 0, PI * 2);
  ctx.fill();
});

const batteryLabelTexture = makeCanvasTexture(768, 384, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);

  // Small sticker on a dark cell.
  ctx.fillStyle = 'rgba(226,232,226,.96)';
  roundRectPath(ctx, 26, 26, w - 52, h - 52, 18);
  ctx.fill();

  ctx.fillStyle = '#0b1211';
  ctx.textAlign = 'left';
  ctx.font = '700 36px "Helvetica Neue", sans-serif';
  ctx.fillText('dji', 58, 92);
  ctx.font = '600 17px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('OSMO ACTION 4', 136, 90);

  ctx.fillStyle = '#243330';
  ctx.font = '400 16px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('Li-ion Battery  /  1S LiPo', 58, 137);
  ctx.fillStyle = '#080d0c';
  ctx.font = '700 52px "Avenir Next Condensed", "Helvetica Neue", sans-serif';
  ctx.fillText('1770 mAh', 58, 208);
  ctx.font = '500 26px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('6.8 Wh   ·   3.85 V', 58, 250);

  ctx.fillStyle = '#52615c';
  ctx.font = '400 12px "SFMono-Regular", Menlo, monospace';
  ctx.fillText('MODEL: AB4-1770  ·  DO NOT DISASSEMBLE', 58, 294);

  // Red charge mark.
  ctx.fillStyle = '#ff4155';
  ctx.fillRect(w - 92, 58, 34, 6);
  ctx.fillRect(w - 92, 58, 6, 34);

  // Barcode.
  const random = seededRandom(9902);
  let x = 58;
  while (x < 300) {
    const bar = 1 + Math.floor(random() * 4);
    ctx.fillStyle = 'rgba(12,20,18,.75)';
    ctx.fillRect(x, 312, bar, 28);
    x += bar + 2 + Math.floor(random() * 3);
  }
});

const djiSideLogoTexture = makeCanvasTexture(512, 128, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(216,229,223,.3)';
  ctx.font = '700 82px "Helvetica Neue", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('dji', w / 2, 91);
});

const powerIconTexture = makeCanvasTexture(256, 256, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(220,234,228,.5)';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(w / 2, h / 2 - 4, 55, PI * 0.26, PI * 0.74, true);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2, 53);
  ctx.lineTo(w / 2, 127);
  ctx.stroke();
  ctx.fillStyle = 'rgba(220,234,228,.34)';
  ctx.font = '600 25px "SFMono-Regular", Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('QS', w / 2, 205);
});

const glowTexture = makeCanvasTexture(256, 256, (ctx, w, h) => {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.18, 'rgba(180,255,241,.7)');
  gradient.addColorStop(0.52, 'rgba(92,255,229,.16)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
});
glowTexture.anisotropy = 2;

const haloTexture = makeCanvasTexture(512, 512, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.strokeStyle = 'rgba(125,255,232,.7)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([3, 12]);
  ctx.beginPath();
  ctx.arc(0, 0, 198, 0, PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(125,255,232,.26)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 230, 0, PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(125,255,232,.65)';
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * PI * 2 + PI / 4;
    ctx.beginPath();
    ctx.arc(0, 0, 182, angle - 0.12, angle + 0.12);
    ctx.stroke();
  }
});
haloTexture.anisotropy = 2;

const floorGridTexture = makeCanvasTexture(2048, 2048, (ctx, w, h) => {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2;
  const cy = h / 2;

  // Faint square grid.
  ctx.strokeStyle = 'rgba(111,255,230,.055)';
  ctx.lineWidth = 1.2;
  const spacing = 64;
  for (let x = 0; x <= w; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Concentric survey circles.
  for (let r = 180; r <= 930; r += 86) {
    ctx.strokeStyle = `rgba(125,255,232,${0.18 - r / 7000})`;
    ctx.lineWidth = r % 258 === 0 ? 2.2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, PI * 2);
    ctx.stroke();
  }

  // Radial ticks.
  for (let i = 0; i < 72; i += 1) {
    const angle = (i / 72) * PI * 2;
    const inner = i % 6 === 0 ? 570 : 640;
    const outer = i % 6 === 0 ? 700 : 670;
    ctx.strokeStyle = i % 6 === 0 ? 'rgba(125,255,232,.25)' : 'rgba(125,255,232,.1)';
    ctx.lineWidth = i % 6 === 0 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }

  // Crosshair lines.
  ctx.strokeStyle = 'rgba(125,255,232,.18)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([10, 18]);
  ctx.beginPath();
  ctx.moveTo(cx, 40);
  ctx.lineTo(cx, h - 40);
  ctx.moveTo(40, cy);
  ctx.lineTo(w - 40, cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Soft fade at texture edge.
  const fade = ctx.createRadialGradient(cx, cy, w * 0.18, cx, cy, w * 0.49);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.75, 'rgba(0,0,0,.1)');
  fade.addColorStop(1, 'rgba(4,7,8,1)');
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
});
floorGridTexture.anisotropy = maxAnisotropy;

/* -----------------------------------------------------------------------------
   05 — Materials
   -------------------------------------------------------------------------- */

const mats = {
  body: new THREE.MeshPhysicalMaterial({
    color: 0x090d0e,
    roughness: 0.9,
    metalness: 0.13,
    roughnessMap: noiseTexture,
    bumpMap: noiseTexture,
    bumpScale: 0.042,
    clearcoat: 0.035,
    clearcoatRoughness: 0.82,
    envMapIntensity: 0.3,
  }),
  bodyDark: new THREE.MeshPhysicalMaterial({
    color: 0x050808,
    roughness: 0.9,
    metalness: 0.09,
    roughnessMap: noiseTexture,
    bumpMap: noiseTexture,
    bumpScale: 0.025,
    envMapIntensity: 0.24,
  }),
  shell: new THREE.MeshStandardMaterial({
    color: 0x080b0c,
    roughness: 0.94,
    metalness: 0.035,
    bumpMap: noiseTexture,
    bumpScale: 0.055,
    envMapIntensity: 0.14,
  }),
  rubber: new THREE.MeshStandardMaterial({
    color: 0x0b0f10,
    roughness: 0.92,
    metalness: 0.02,
    bumpMap: noiseTexture,
    bumpScale: 0.018,
  }),
  metal: new THREE.MeshPhysicalMaterial({
    color: 0x333c3e,
    roughness: 0.31,
    metalness: 0.9,
    clearcoat: 0.2,
    clearcoatRoughness: 0.28,
    envMapIntensity: 1.55,
  }),
  darkMetal: new THREE.MeshPhysicalMaterial({
    color: 0x151b1c,
    roughness: 0.38,
    metalness: 0.82,
    envMapIntensity: 1.25,
  }),
  blackGloss: new THREE.MeshPhysicalMaterial({
    color: 0x050809,
    roughness: 0.12,
    metalness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.6,
  }),
  copper: new THREE.MeshPhysicalMaterial({
    color: 0x6d3a24,
    roughness: 0.3,
    metalness: 0.95,
    envMapIntensity: 1.4,
  }),
  gold: new THREE.MeshPhysicalMaterial({
    color: 0xc09b56,
    roughness: 0.28,
    metalness: 1,
    envMapIntensity: 1.5,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x0c2725,
    roughness: 0.035,
    metalness: 0.35,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.42,
    envMapIntensity: 2.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  glassThin: new THREE.MeshPhysicalMaterial({
    color: 0x8ee6d8,
    roughness: 0.04,
    metalness: 0.45,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    transparent: true,
    opacity: 0.075,
    envMapIntensity: 1.8,
    depthWrite: false,
  }),
  screen: new THREE.MeshBasicMaterial({
    map: frontScreenTexture,
    toneMapped: false,
  }),
  rearScreen: new THREE.MeshBasicMaterial({
    map: rearScreenTexture,
    toneMapped: false,
  }),
  pcb: new THREE.MeshStandardMaterial({
    color: 0x52605a,
    map: pcbTexture,
    roughness: 0.57,
    metalness: 0.35,
    emissive: 0x0b221c,
    emissiveMap: pcbTexture,
    emissiveIntensity: 0.24,
  }),
  pcbSide: new THREE.MeshStandardMaterial({
    color: 0x0a1b16,
    roughness: 0.68,
    metalness: 0.2,
  }),
  chip: new THREE.MeshPhysicalMaterial({
    color: 0x0b1112,
    roughness: 0.34,
    metalness: 0.5,
    clearcoat: 0.45,
    envMapIntensity: 1.2,
  }),
  chipMetal: new THREE.MeshPhysicalMaterial({
    color: 0x8c9996,
    roughness: 0.27,
    metalness: 0.95,
    envMapIntensity: 1.6,
  }),
  glowingMint: new THREE.MeshBasicMaterial({
    color: 0x6fffe5,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
  glowingRed: new THREE.MeshStandardMaterial({
    color: 0x2b080d,
    emissive: 0xff314a,
    emissiveIntensity: 1.8,
    roughness: 0.34,
    metalness: 0.45,
  }),
  textLens: new THREE.MeshBasicMaterial({
    map: lensLabelTexture,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  }),
  badge: new THREE.MeshBasicMaterial({
    map: actionBadgeTexture,
    transparent: true,
    toneMapped: false,
  }),
  batteryLabel: new THREE.MeshBasicMaterial({
    map: batteryLabelTexture,
    transparent: true,
    toneMapped: false,
  }),
  sideLogo: new THREE.MeshBasicMaterial({
    map: djiSideLogoTexture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  }),
  powerIcon: new THREE.MeshBasicMaterial({
    map: powerIconTexture,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  }),
};

/* -----------------------------------------------------------------------------
   06 — Scene construction
   -------------------------------------------------------------------------- */

const cameraRoot = new THREE.Group();
cameraRoot.position.y = 0.08;
scene.add(cameraRoot);

const parts = [];
const partById = new Map();
const builders = {};

function addMesh(parent, geometry, material, options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  if (options.position) mesh.position.set(...options.position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.scale) mesh.scale.set(...options.scale);
  mesh.castShadow = options.castShadow !== false;
  mesh.receiveShadow = options.receiveShadow !== false;
  if (options.renderOrder !== undefined) mesh.renderOrder = options.renderOrder;
  parent.add(mesh);
  return mesh;
}

function addDecal(parent, texture, width, height, position, rotation = [0, 0, 0], opacity = 1) {
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const mesh = addMesh(parent, new THREE.PlaneGeometry(width, height), material, {
    position,
    rotation,
    castShadow: false,
    receiveShadow: false,
    renderOrder: 4,
  });
  return mesh;
}

function cylinderAlongZ(radiusTop, radiusBottom, height, radialSegments = 64) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, 1, false);
  geometry.rotateX(PI / 2);
  return geometry;
}

/* ---- Lens ---------------------------------------------------------------- */

function createLens() {
  const group = new THREE.Group();

  addMesh(group, cylinderAlongZ(1.13, 1.13, 0.36, 72), mats.darkMetal, { position: [0, 0, 0.1] });
  addMesh(group, cylinderAlongZ(1.34, 1.34, 0.3, 96), mats.bodyDark, { position: [0, 0, 0.13] });
  addMesh(group, cylinderAlongZ(1.12, 1.12, 0.42, 72), mats.metal, { position: [0, 0, 0.26] });
  addMesh(group, cylinderAlongZ(0.96, 0.96, 0.2, 72), mats.blackGloss, { position: [0, 0, 0.39] });

  // Outer knurled grip ring.
  const ridgeGeometry = new THREE.BoxGeometry(0.18, 0.055, 0.29);
  const ridgeMaterial = mats.darkMetal;
  const ridges = new THREE.InstancedMesh(ridgeGeometry, ridgeMaterial, 72);
  ridges.castShadow = true;
  ridges.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 72; i += 1) {
    const angle = (i / 72) * PI * 2;
    dummy.position.set(Math.cos(angle) * 1.35, Math.sin(angle) * 1.35, 0.13);
    dummy.rotation.set(0, 0, angle);
    dummy.updateMatrix();
    ridges.setMatrixAt(i, dummy.matrix);
  }
  ridges.instanceMatrix.needsUpdate = true;
  group.add(ridges);

  // Polished rims.
  const frontRim = addMesh(group, new THREE.TorusGeometry(1.3, 0.035, 10, 96), mats.metal, {
    position: [0, 0, 0.295],
  });
  frontRim.castShadow = true;

  const innerCopper = addMesh(group, new THREE.TorusGeometry(1.02, 0.018, 8, 80), mats.copper, {
    position: [0, 0, 0.405],
  });
  innerCopper.castShadow = false;

  // Glass dome and aperture.
  const glassDomeGeometry = new THREE.SphereGeometry(0.84, 64, 32, 0, PI * 2, 0, PI / 2);
  glassDomeGeometry.rotateX(PI / 2);
  const glassDome = addMesh(group, glassDomeGeometry, mats.glass, {
    position: [0, 0, 0.4],
    scale: [1, 1, 0.36],
    castShadow: false,
  });
  glassDome.renderOrder = 3;

  addMesh(group, cylinderAlongZ(0.69, 0.69, 0.06, 64), mats.blackGloss, {
    position: [0, 0, 0.47],
    castShadow: false,
  });
  const innerGlass = addMesh(group, cylinderAlongZ(0.58, 0.58, 0.025, 64), new THREE.MeshPhysicalMaterial({
    color: 0x071c1e,
    emissive: 0x082e2c,
    emissiveIntensity: 0.28,
    roughness: 0.08,
    metalness: 0.6,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1.8,
  }), { position: [0, 0, 0.505], castShadow: false });
  innerGlass.renderOrder = 4;

  addMesh(group, new THREE.TorusGeometry(0.56, 0.013, 8, 64), mats.glowingMint, {
    position: [0, 0, 0.52],
    castShadow: false,
  });

  // Lens labelling on the barrel face.
  const lensText = addMesh(group, new THREE.PlaneGeometry(2.7, 2.7), mats.textLens, {
    position: [0, 0, 0.54],
    castShadow: false,
    receiveShadow: false,
    renderOrder: 5,
  });
  lensText.renderOrder = 5;

  // A restrained optical flare.
  const flareMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xabfff0,
    transparent: true,
    opacity: 0.26,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const flare = new THREE.Sprite(flareMaterial);
  flare.position.set(0.24, 0.26, 0.67);
  flare.scale.setScalar(0.92);
  group.add(flare);

  const flareMaterial2 = new THREE.SpriteMaterial({
    map: glowTexture,
    color: 0xffd7be,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
  const flare2 = new THREE.Sprite(flareMaterial2);
  flare2.position.set(-0.38, -0.2, 0.62);
  flare2.scale.setScalar(0.46);
  group.add(flare2);

  return group;
}
builders.lens = createLens;

/* ---- Front screen -------------------------------------------------------- */

function createFrontScreen() {
  const group = new THREE.Group();

  addMesh(group, new RoundedBoxGeometry(3.04, 3.04, 0.14, 4, 0.16), mats.blackGloss, {
    position: [0, 0, 0],
  });

  addMesh(group, new RoundedBoxGeometry(2.88, 2.88, 0.055, 3, 0.12), mats.bodyDark, {
    position: [0, 0, 0.075],
    castShadow: false,
  });

  const screen = addMesh(group, new THREE.PlaneGeometry(2.66, 2.66), mats.screen, {
    position: [0, 0, 0.108],
    castShadow: false,
    receiveShadow: false,
    renderOrder: 4,
  });
  screen.material.toneMapped = false;

  const glass = addMesh(group, new THREE.PlaneGeometry(2.7, 2.7), mats.glassThin, {
    position: [0, 0, 0.114],
    castShadow: false,
    receiveShadow: false,
    renderOrder: 5,
  });
  glass.renderOrder = 5;

  // Tiny status LED.
  addMesh(group, cylinderAlongZ(0.024, 0.024, 0.012, 12), mats.glowingRed, {
    position: [1.26, 1.27, 0.134],
    castShadow: false,
  });

  return group;
}
builders['front-screen'] = createFrontScreen;

/* ---- Front shell --------------------------------------------------------- */

function createFrontShell() {
  const group = new THREE.Group();

  addMesh(group, extrudedRoundedPlate(7.05, 4.42, 0.28, 0.58, 0.045), mats.shell, {
    position: [0, 0, 0],
  });

  // Inset perimeter line.
  const points = roundedRectPoints(6.73, 4.12, 0.5, 9);
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineLoop(lineGeometry, new THREE.LineBasicMaterial({
    color: 0x3a514d,
    transparent: true,
    opacity: 0.62,
  }));
  line.position.z = 0.157;
  group.add(line);

  // Screen well — exposed as a dark recess when the display is removed.
  addMesh(group, new RoundedBoxGeometry(3.08, 3.08, 0.018, 3, 0.15), new THREE.MeshBasicMaterial({
    color: 0x020505,
  }), {
    position: [-1.43, 0.22, 0.192],
    castShadow: false,
    receiveShadow: false,
  });
  const wellPoints = roundedRectPoints(3.0, 3.0, 0.15, 7);
  const wellLine = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(wellPoints),
    new THREE.LineBasicMaterial({ color: 0x546964, transparent: true, opacity: 0.42 }),
  );
  wellLine.position.set(-1.43, 0.22, 0.203);
  group.add(wellLine);

  // Raised lens seat.
  addMesh(group, cylinderAlongZ(1.35, 1.4, 0.15, 80), mats.bodyDark, {
    position: [1.47, 0.27, 0.1],
  });
  addMesh(group, new THREE.TorusGeometry(1.36, 0.026, 8, 96), mats.darkMetal, {
    position: [1.47, 0.27, 0.18],
  });

  // Four service screws.
  const screwGeometry = cylinderAlongZ(0.04, 0.04, 0.014, 12);
  const screwPositions = [
    [-3.08, 1.84],
    [3.08, 1.84],
    [-3.08, -1.84],
    [3.08, -1.84],
  ];
  for (const [x, y] of screwPositions) {
    addMesh(group, screwGeometry, mats.darkMetal, {
      position: [x, y, 0.194],
      castShadow: false,
    });
  }

  // ACTION 4 badge.
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.92, 0.48), mats.badge);
  badge.position.set(1.52, -1.52, 0.202);
  badge.castShadow = false;
  badge.receiveShadow = false;
  badge.renderOrder = 4;
  group.add(badge);

  return group;
}
builders['front-shell'] = createFrontShell;

/* ---- Structural frame ---------------------------------------------------- */

function createFrame() {
  const group = new THREE.Group();

  const outer = roundedShape(7.05, 4.42, 0.58);
  const hole = new THREE.Path();
  const holeW = 6.17;
  const holeH = 3.54;
  const holeR = 0.36;
  const x = -holeW / 2;
  const y = -holeH / 2;
  hole.moveTo(x + holeR, y);
  hole.lineTo(x + holeW - holeR, y);
  hole.quadraticCurveTo(x + holeW, y, x + holeW, y + holeR);
  hole.lineTo(x + holeW, y + holeH - holeR);
  hole.quadraticCurveTo(x + holeW, y + holeH, x + holeW - holeR, y + holeH);
  hole.lineTo(x + holeR, y + holeH);
  hole.quadraticCurveTo(x, y + holeH, x, y + holeH - holeR);
  hole.lineTo(x, y + holeR);
  hole.quadraticCurveTo(x, y, x + holeR, y);
  hole.closePath();
  outer.holes.push(hole);

  const frameGeometry = new THREE.ExtrudeGeometry(outer, {
    depth: 2.78,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 20,
  });
  frameGeometry.center();
  frameGeometry.computeVertexNormals();
  addMesh(group, frameGeometry, mats.shell);

  // Inner liner gives depth to the open chassis.
  const innerLiner = roundedShape(6.28, 3.64, 0.38);
  const innerHole = new THREE.Path();
  const linerW = 6.12;
  const linerH = 3.48;
  const linerR = 0.32;
  const lx = -linerW / 2;
  const ly = -linerH / 2;
  innerHole.moveTo(lx + linerR, ly);
  innerHole.lineTo(lx + linerW - linerR, ly);
  innerHole.quadraticCurveTo(lx + linerW, ly, lx + linerW, ly + linerR);
  innerHole.lineTo(lx + linerW, ly + linerH - linerR);
  innerHole.quadraticCurveTo(lx + linerW, ly + linerH, lx + linerW - linerR, ly + linerH);
  innerHole.lineTo(lx + linerR, ly + linerH);
  innerHole.quadraticCurveTo(lx, ly + linerH, lx, ly + linerH - linerR);
  innerHole.lineTo(lx, ly + linerR);
  innerHole.quadraticCurveTo(lx, ly, lx + linerR, ly);
  innerHole.closePath();
  innerLiner.holes.push(innerHole);
  const linerGeometry = new THREE.ExtrudeGeometry(innerLiner, {
    depth: 2.86,
    steps: 1,
    bevelEnabled: false,
    curveSegments: 12,
  });
  linerGeometry.center();
  addMesh(group, linerGeometry, mats.bodyDark);

  // Microphone perforations on a slightly raised top-deck insert.
  addMesh(group, new RoundedBoxGeometry(0.74, 0.014, 0.38, 2, 0.05), mats.bodyDark, {
    position: [0.98, 2.218, -0.68],
    castShadow: false,
    receiveShadow: false,
  });
  const micGeometry = new THREE.CylinderGeometry(0.022, 0.022, 0.012, 8);
  const micMat = new THREE.MeshBasicMaterial({ color: 0x010303 });
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      addMesh(group, micGeometry, micMat, {
        position: [0.72 + col * 0.1, 2.228, -0.81 + row * 0.11],
        castShadow: false,
        receiveShadow: false,
      });
    }
  }

  // Magnetic quick-release mounting plate on the underside.
  addMesh(group, new RoundedBoxGeometry(3.92, 0.14, 2.22, 3, 0.14), mats.darkMetal, {
    position: [0, -2.29, 0.06],
  });
  addMesh(group, new RoundedBoxGeometry(1.18, 0.16, 0.36, 2, 0.05), mats.metal, {
    position: [-1.12, -2.4, 0.54],
  });
  addMesh(group, new RoundedBoxGeometry(1.18, 0.16, 0.36, 2, 0.05), mats.metal, {
    position: [1.12, -2.4, 0.54],
  });
  addMesh(group, new THREE.CylinderGeometry(0.28, 0.28, 0.025, 32), mats.gold, {
    position: [0, -2.37, -0.52],
    castShadow: false,
  });

  // A small structural hinge block inside the battery bay.
  addMesh(group, new RoundedBoxGeometry(0.4, 2.2, 0.26, 2, 0.06), mats.darkMetal, {
    position: [-2.85, -0.05, 0.05],
  });
  addMesh(group, new RoundedBoxGeometry(0.34, 0.42, 0.22, 2, 0.05), mats.copper, {
    position: [-2.84, -1.45, 0.15],
  });

  return group;
}
builders.frame = createFrame;

/* ---- Mainboard ----------------------------------------------------------- */

function createMainboard() {
  const group = new THREE.Group();

  const boardMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b2a26,
    roughness: 0.66,
    metalness: 0.22,
  });

  addMesh(group, new RoundedBoxGeometry(5.45, 3.18, 0.11, 2, 0.06), boardMaterial, {
    position: [0, 0, 0],
  });

  const boardFaceMaterial = new THREE.MeshBasicMaterial({
    map: pcbTexture,
    toneMapped: true,
  });
  const face = addMesh(group, new THREE.PlaneGeometry(5.28, 3.02), boardFaceMaterial, {
    position: [0, 0, 0.061],
    castShadow: false,
    receiveShadow: false,
  });

  // Processing die and shield cans.
  addMesh(group, new RoundedBoxGeometry(0.92, 0.9, 0.14, 2, 0.02), mats.chipMetal, {
    position: [-0.78, 0.15, 0.14],
  });
  addMesh(group, new RoundedBoxGeometry(0.52, 0.38, 0.1, 2, 0.02), mats.chip, {
    position: [0.18, 0.37, 0.12],
  });
  addMesh(group, new RoundedBoxGeometry(0.42, 0.3, 0.08, 2, 0.02), mats.chip, {
    position: [1.15, -0.18, 0.1],
  });
  addMesh(group, new RoundedBoxGeometry(0.28, 0.56, 0.12, 2, 0.02), mats.chipMetal, {
    position: [2.1, 0.58, 0.13],
  });
  addMesh(group, new RoundedBoxGeometry(0.9, 0.24, 0.08, 2, 0.02), mats.chipMetal, {
    position: [-1.8, -1.02, 0.1],
  });

  // Gold connector row.
  for (let i = 0; i < 9; i += 1) {
    addMesh(group, new THREE.BoxGeometry(0.045, 0.22, 0.05), mats.gold, {
      position: [1.55 + i * 0.075, -1.3, 0.095],
      castShadow: false,
    });
  }

  // Cyan status traces.
  addMesh(group, new THREE.BoxGeometry(4.7, 0.011, 0.01), mats.glowingMint, {
    position: [0.02, -1.48, 0.067],
    castShadow: false,
  });
  addMesh(group, new THREE.BoxGeometry(0.01, 2.2, 0.01), mats.glowingMint, {
    position: [-2.48, 0.18, 0.068],
    castShadow: false,
  });

  // Mounting holes.
  const holeGeometry = new THREE.TorusGeometry(0.075, 0.016, 6, 20);
  for (const [x, y] of [
    [-2.4, 1.25],
    [2.4, 1.25],
    [-2.4, -1.25],
    [2.4, -1.25],
  ]) {
    addMesh(group, holeGeometry, mats.gold, {
      position: [x, y, 0.066],
      castShadow: false,
    });
  }

  return group;
}
builders.mainboard = createMainboard;

/* ---- Battery ------------------------------------------------------------- */

function createBattery() {
  const group = new THREE.Group();

  addMesh(group, new RoundedBoxGeometry(5.25, 2.94, 2.04, 4, 0.11), mats.bodyDark, {
    position: [0, 0, 0],
  });

  // Cell seams.
  addMesh(group, new THREE.BoxGeometry(4.86, 0.012, 0.012), mats.metal, {
    position: [0, 1.16, 1.026],
    castShadow: false,
  });
  addMesh(group, new THREE.BoxGeometry(4.86, 0.012, 0.012), mats.metal, {
    position: [0, -1.16, 1.026],
    castShadow: false,
  });

  addDecal(group, batteryLabelTexture, 3.08, 1.54, [-0.58, 0.08, 1.033], [0, 0, 0], 1);

  // Gold contact pads.
  for (let i = 0; i < 4; i += 1) {
    addMesh(group, new THREE.BoxGeometry(0.1, 0.18, 0.035), mats.gold, {
      position: [2.6, -0.82 + i * 0.34, 0.98],
      rotation: [0, PI / 2, 0],
      castShadow: false,
    });
  }

  // Charge indicator.
  addMesh(group, new THREE.BoxGeometry(0.42, 0.03, 0.008), mats.glowingMint, {
    position: [-1.74, -1.06, 1.025],
    castShadow: false,
  });

  // Small red latch.
  addMesh(group, new RoundedBoxGeometry(0.34, 0.16, 0.08, 2, 0.025), mats.glowingRed, {
    position: [0, 1.4, 0.95],
    castShadow: false,
  });

  return group;
}
builders.battery = createBattery;

/* ---- Rear module --------------------------------------------------------- */

function createRearModule() {
  const group = new THREE.Group();

  addMesh(group, extrudedRoundedPlate(7.05, 4.42, 0.28, 0.58, 0.045), mats.shell, {
    position: [0, 0, 0],
  });

  // Rear screen recess.
  addMesh(group, new RoundedBoxGeometry(4.64, 2.94, 0.08, 3, 0.1), mats.blackGloss, {
    position: [0, 0.18, -0.155],
  });

  const screen = addMesh(group, new THREE.PlaneGeometry(4.38, 2.68), mats.rearScreen, {
    position: [0, 0.18, -0.204],
    rotation: [0, PI, 0],
    castShadow: false,
    receiveShadow: false,
    renderOrder: 4,
  });
  screen.renderOrder = 4;

  addMesh(group, new THREE.PlaneGeometry(4.42, 2.72), mats.glassThin, {
    position: [0, 0.18, -0.209],
    rotation: [0, PI, 0],
    castShadow: false,
    receiveShadow: false,
    renderOrder: 5,
  });

  // White DJI side mark under the screen.
  addDecal(group, djiSideLogoTexture, 0.95, 0.24, [0, -1.72, -0.161], [0, PI, 0], 0.42);

  // Side grip grooves.
  for (let i = 0; i < 4; i += 1) {
    addMesh(group, new THREE.BoxGeometry(0.28, 0.018, 0.035), mats.darkMetal, {
      position: [-3.33, -0.42 + i * 0.1, -0.04],
      castShadow: false,
    });
    addMesh(group, new THREE.BoxGeometry(0.28, 0.018, 0.035), mats.darkMetal, {
      position: [3.33, -0.42 + i * 0.1, -0.04],
      castShadow: false,
    });
  }

  const points = roundedRectPoints(6.73, 4.12, 0.5, 9);
  const line = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x273b38, transparent: true, opacity: 0.28 }),
  );
  line.position.z = -0.158;
  group.add(line);

  return group;
}
builders['rear-module'] = createRearModule;

/* ---- Shutter ------------------------------------------------------------- */

function createShutter() {
  const group = new THREE.Group();

  addMesh(group, new THREE.CylinderGeometry(0.72, 0.75, 0.07, 48), mats.darkMetal, {
    position: [0, 0.02, 0],
  });
  addMesh(group, new THREE.CylinderGeometry(0.58, 0.62, 0.13, 48), mats.rubber, {
    position: [0, 0.1, 0],
  });
  const ring = addMesh(group, new THREE.TorusGeometry(0.44, 0.025, 8, 64), mats.glowingRed, {
    position: [0, 0.168, 0],
    rotation: [PI / 2, 0, 0],
    castShadow: false,
  });
  ring.material.emissiveIntensity = 1.45;

  addMesh(group, new THREE.CylinderGeometry(0.2, 0.2, 0.02, 32), mats.blackGloss, {
    position: [0, 0.174, 0],
    castShadow: false,
  });

  return group;
}
builders.shutter = createShutter;

/* ---- Right cover / port -------------------------------------------------- */

function createRightCover() {
  const group = new THREE.Group();

  // USB-C hatch.
  addMesh(group, new RoundedBoxGeometry(0.12, 1.72, 2.16, 3, 0.1), mats.rubber, {
    position: [0.01, -0.52, 0.08],
  });
  addMesh(group, new RoundedBoxGeometry(0.025, 1.48, 1.88, 2, 0.08), mats.bodyDark, {
    position: [0.075, -0.52, 0.08],
    castShadow: false,
  });
  // USB-C slot.
  addMesh(group, new RoundedBoxGeometry(0.02, 0.14, 0.34, 2, 0.06), mats.blackGloss, {
    position: [0.09, -0.82, 0.18],
    castShadow: false,
  });
  addMesh(group, new THREE.BoxGeometry(0.012, 0.022, 0.22), mats.metal, {
    position: [0.102, -0.82, 0.18],
    castShadow: false,
  });

  // Power / QS button above the hatch.
  addMesh(group, new RoundedBoxGeometry(0.13, 0.58, 0.72, 3, 0.08), mats.rubber, {
    position: [0.02, 1.1, 0.06],
  });
  addDecal(group, powerIconTexture, 0.46, 0.46, [0.093, 1.1, 0.06], [0, PI / 2, 0], 0.82);

  // Grip line.
  addMesh(group, new THREE.BoxGeometry(0.015, 1.2, 0.02), mats.metal, {
    position: [0.083, -0.42, -0.97],
    castShadow: false,
  });

  return group;
}
builders['right-cover'] = createRightCover;

/* ---- Battery door -------------------------------------------------------- */

function createBatteryDoor() {
  const group = new THREE.Group();

  addMesh(group, new RoundedBoxGeometry(0.13, 3.15, 2.34, 3, 0.11), mats.rubber, {
    position: [0, 0, 0],
  });
  addMesh(group, new RoundedBoxGeometry(0.018, 2.92, 2.08, 2, 0.08), mats.bodyDark, {
    position: [-0.073, 0, 0],
    castShadow: false,
  });

  // Latch slider.
  addMesh(group, new RoundedBoxGeometry(0.055, 0.2, 0.54, 2, 0.05), mats.darkMetal, {
    position: [-0.085, -1.16, 0.45],
  });
  addMesh(group, new THREE.BoxGeometry(0.012, 0.018, 0.33), mats.metal, {
    position: [-0.115, -1.16, 0.45],
    castShadow: false,
  });

  // Grip grooves.
  for (let i = 0; i < 4; i += 1) {
    addMesh(group, new THREE.BoxGeometry(0.012, 0.018, 1.2), mats.darkMetal, {
      position: [-0.082, -0.62 + i * 0.11, -0.3],
      castShadow: false,
    });
  }

  addDecal(group, djiSideLogoTexture, 0.82, 0.2, [-0.087, 0.83, -0.4], [0, -PI / 2, 0], 0.38);

  // A tiny microSD detail tucked into the interior face.
  addMesh(group, new RoundedBoxGeometry(0.03, 0.18, 0.25, 2, 0.02), mats.chipMetal, {
    position: [0.08, 0.4, 0.86],
    castShadow: false,
  });

  return group;
}
builders['battery-door'] = createBatteryDoor;

/* ---- Heatsink ------------------------------------------------------------ */

function createHeatsink() {
  const group = new THREE.Group();

  addMesh(group, new RoundedBoxGeometry(4.2, 2.35, 0.12, 2, 0.04), mats.darkMetal, {
    position: [0, 0, 0],
  });
  addMesh(group, new RoundedBoxGeometry(3.98, 2.12, 0.04, 2, 0.02), mats.copper, {
    position: [0, 0, 0.075],
    castShadow: false,
  });

  const finGeometry = new THREE.BoxGeometry(0.035, 2.04, 0.68);
  const fins = new THREE.InstancedMesh(finGeometry, mats.metal, 18);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 18; i += 1) {
    dummy.position.set(-1.85 + i * 0.218, 0, -0.38);
    dummy.updateMatrix();
    fins.setMatrixAt(i, dummy.matrix);
  }
  fins.instanceMatrix.needsUpdate = true;
  fins.castShadow = true;
  fins.receiveShadow = true;
  group.add(fins);

  addMesh(group, new THREE.BoxGeometry(3.66, 0.018, 0.016), mats.glowingMint, {
    position: [0, -1.03, 0.1],
    castShadow: false,
  });

  return group;
}
builders.heatsink = createHeatsink;

/* ---- Register and place all parts --------------------------------------- */

function registerPart(def) {
  const group = builders[def.id]();
  group.userData.partId = def.id;

  // Measure the part in its local space, before it is placed in the assembly.
  group.position.set(0, 0, 0);
  group.rotation.fromArray(def.rot || [0, 0, 0]);
  group.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(group);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const localCenter = center.clone();
  const radius = size.length() / 2;

  const basePosition = new THREE.Vector3(...def.base);
  const explodedPosition = new THREE.Vector3(...def.exploded);
  const baseQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(def.rot?.[0] || 0, def.rot?.[1] || 0, def.rot?.[2] || 0),
  );
  const explodedQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      def.explodeRot?.[0] || 0,
      def.explodeRot?.[1] || 0,
      def.explodeRot?.[2] || 0,
    ),
  );

  group.position.copy(basePosition);
  group.quaternion.copy(baseQuaternion);
  group.updateMatrixWorld(true);

  const part = {
    ...def,
    group,
    basePosition,
    explodedPosition,
    baseQuaternion,
    explodedQuaternion,
    localCenter,
    radius,
    motion: 0,
    anchorVector: new THREE.Vector3(...def.anchor),
    anchorWorld: new THREE.Vector3(),
    outlineMeshes: [],
    labelEl: null,
    leaderGroup: null,
    leaderPath: null,
    leaderDot: null,
  };

  group.traverse((object) => {
    if (object.isMesh && !object.isSprite) {
      const material = object.material;
      const transparent = Array.isArray(material)
        ? material.some((entry) => entry.transparent)
        : material?.transparent;
      if (!transparent && !object.userData.noOutline) part.outlineMeshes.push(object);
    }
  });

  cameraRoot.add(group);
  parts.push(part);
  partById.set(def.id, part);
}

for (const def of MODULES) registerPart(def);

/* -----------------------------------------------------------------------------
   07 — Stage dressing: lights, floor, rings, particles
   -------------------------------------------------------------------------- */

const floorY = -4.9;

// Key light.
const keyLight = new THREE.DirectionalLight(0xf2fffb, 2.6);
keyLight.position.set(7.5, 12, 8.5);
keyLight.target.position.set(0, 0.2, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -12;
keyLight.shadow.camera.right = 12;
keyLight.shadow.camera.top = 12;
keyLight.shadow.camera.bottom = -9;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 40;
keyLight.shadow.bias = -0.00035;
keyLight.shadow.normalBias = 0.035;
scene.add(keyLight, keyLight.target);

// Cyan rim from behind/left.
const rimLight = new THREE.DirectionalLight(0x63ffe7, 1.65);
rimLight.position.set(-9, 5, -8);
rimLight.target.position.set(0, 0.2, 0);
scene.add(rimLight, rimLight.target);

// Soft warm fill to counter the cool palette.
const fillLight = new THREE.DirectionalLight(0xffc0aa, 0.45);
fillLight.position.set(7, -1.5, -7);
fillLight.target.position.set(0, -0.4, 0);
scene.add(fillLight, fillLight.target);

// Close-range specular accent for the lens and metal edges.
const mintPoint = new THREE.PointLight(0x62ffe5, 11, 19, 2);
mintPoint.position.set(-5.6, 2.4, 5.2);
scene.add(mintPoint);

const redPoint = new THREE.PointLight(0xff334f, 8, 16, 2);
redPoint.position.set(4.6, -1.2, -5.2);
scene.add(redPoint);

scene.add(new THREE.HemisphereLight(0x6a9a93, 0x030606, 0.34));

// Soft shadow catcher.
const shadowFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(48, 48),
  new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.36, transparent: true }),
);
shadowFloor.rotation.x = -PI / 2;
shadowFloor.position.y = floorY;
shadowFloor.receiveShadow = true;
shadowFloor.renderOrder = 2;
scene.add(shadowFloor);

// Procedural floor survey grid.
const floorGrid = new THREE.Mesh(
  new THREE.PlaneGeometry(26, 26),
  new THREE.MeshBasicMaterial({
    map: floorGridTexture,
    transparent: true,
    opacity: 0.32,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
);
floorGrid.rotation.x = -PI / 2;
floorGrid.position.y = floorY - 0.008;
floorGrid.renderOrder = 1;
scene.add(floorGrid);

// Halo under the camera.
const underGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(13, 13),
  new THREE.MeshBasicMaterial({
    map: glowTexture,
    color: 0x63ffdf,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
);
underGlow.rotation.x = -PI / 2;
underGlow.position.y = floorY + 0.01;
scene.add(underGlow);

// Orbital survey rings.
const ringGroup = new THREE.Group();
ringGroup.position.y = 0.05;
scene.add(ringGroup);

const orbitRingA = new THREE.Mesh(
  new THREE.TorusGeometry(6.05, 0.009, 4, 256),
  new THREE.MeshBasicMaterial({
    color: 0x7dffe8,
    transparent: true,
    opacity: 0.19,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
);
orbitRingA.rotation.x = PI / 2;
ringGroup.add(orbitRingA);

const orbitRingB = new THREE.Mesh(
  new THREE.TorusGeometry(5.35, 0.006, 4, 220),
  new THREE.MeshBasicMaterial({
    color: 0xff6474,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
);
orbitRingB.rotation.set(1.15, 0.2, 0.48);
ringGroup.add(orbitRingB);

// Dust field.
function createParticleField(count, radius, color, size, opacity, seed) {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = radius * (0.35 + random() * 0.65);
    const theta = random() * PI * 2;
    const phi = Math.acos(2 * random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = (random() - 0.35) * radius * 1.05;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color,
    size,
    map: glowTexture,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
    toneMapped: false,
  });
  const points = new THREE.Points(geometry, material);
  scene.add(points);
  return points;
}

const dustA = createParticleField(190, 12.5, 0x8bffe9, 0.075, 0.45, 6021);
const dustB = createParticleField(70, 9.5, 0xffb487, 0.055, 0.25, 9931);

// A slow scanning ring that appears only during the teardown transition.
const scanRing = new THREE.Mesh(
  new THREE.TorusGeometry(4.15, 0.011, 4, 180),
  new THREE.MeshBasicMaterial({
    color: 0x89fff0,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  }),
);
scanRing.rotation.x = PI / 2;
scene.add(scanRing);

// Selected-part halo sprite.
const selectionHalo = new THREE.Sprite(new THREE.SpriteMaterial({
  map: haloTexture,
  color: 0x8bffe9,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: false,
  toneMapped: false,
}));
selectionHalo.renderOrder = 30;
selectionHalo.visible = false;
scene.add(selectionHalo);

/* -----------------------------------------------------------------------------
   08 — Post-processing
   -------------------------------------------------------------------------- */

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const outlinePass = new OutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera,
);
outlinePass.edgeStrength = 4.2;
outlinePass.edgeGlow = 1.15;
outlinePass.edgeThickness = 1.65;
outlinePass.pulsePeriod = 0;
outlinePass.visibleEdgeColor.set(0x7dffe8);
outlinePass.hiddenEdgeColor.set(0x1d3d37);
composer.addPass(outlinePass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.46,
  0.55,
  0.74,
);
composer.addPass(bloomPass);

composer.addPass(new OutputPass());

/* -----------------------------------------------------------------------------
   09 — Interface elements
   -------------------------------------------------------------------------- */

const app = {
  state: {
    exploded: false,
    explodeValue: 0,
    selectedId: null,
    hoveredId: null,
    autoRotate: false,
    introPlayed: false,
    userInteracted: false,
    explodedOnce: false,
    detailObstacle: null,
  },
  dom: {
    loader: document.getElementById('loader'),
    loaderFill: document.getElementById('loader-fill'),
    loaderPercent: document.getElementById('loader-percent'),
    loaderState: document.getElementById('loader-state'),
    componentList: document.getElementById('component-list'),
    assemblyState: document.getElementById('assembly-state'),
    partsPanel: document.getElementById('parts-panel'),
    partsToggle: document.getElementById('parts-toggle'),
    panelClose: document.getElementById('panel-close'),
    panelScrim: document.getElementById('panel-scrim'),
    detailCard: document.getElementById('detail-card'),
    detailBody: document.querySelector('.detail-body'),
    detailIndex: document.getElementById('detail-index'),
    detailCategory: document.getElementById('detail-category'),
    detailTitle: document.getElementById('detail-title'),
    detailEn: document.getElementById('detail-en'),
    detailDesc: document.getElementById('detail-desc'),
    detailSpecs: document.getElementById('detail-specs'),
    detailFootLabel: document.getElementById('detail-foot-label'),
    detailClose: document.getElementById('detail-close'),
    focusButton: document.getElementById('focus-button'),
    explodeButton: document.getElementById('explode-btn'),
    explodeLabel: document.getElementById('explode-label'),
    explodeKicker: document.getElementById('explode-kicker'),
    explodeValue: document.getElementById('explode-value'),
    progressFill: document.getElementById('progress-fill'),
    resetButton: document.getElementById('reset-btn'),
    rotateButton: document.getElementById('rotate-btn'),
    rotateState: document.getElementById('rotate-state'),
    hoverTip: document.getElementById('hover-tip'),
    hoverIndex: document.getElementById('hover-index'),
    hoverName: document.getElementById('hover-name'),
    labelLayer: document.getElementById('label-layer'),
    labelSvg: document.getElementById('label-svg'),
    toast: document.getElementById('toast'),
    toastText: document.getElementById('toast-text'),
    hero: document.querySelector('.hero'),
  },
};

const rowById = new Map();

function buildComponentList() {
  const fragment = document.createDocumentFragment();
  for (const def of MODULES) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'component-item';
    row.dataset.id = def.id;
    row.innerHTML = `
      <span class="item-index">${def.index}</span>
      <span class="item-copy">
        <span class="item-name">${def.name}</span>
        <span class="item-en">${def.en.toUpperCase()}</span>
      </span>
      <span class="item-spec">${def.spec}</span>
      <span class="item-arrow" aria-hidden="true"></span>
    `;
    row.addEventListener('click', () => {
      selectPart(def.id, { explode: true });
      if (window.innerWidth <= 900) closePartsPanel();
    });
    row.addEventListener('pointerenter', () => setHoveredPart(def.id, null));
    row.addEventListener('pointerleave', () => setHoveredPart(null, null));
    fragment.appendChild(row);
    rowById.set(def.id, row);
  }
  app.dom.componentList.appendChild(fragment);
}

function buildLabels() {
  for (const part of parts) {
    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'part-label';
    label.dataset.id = part.id;
    label.setAttribute('aria-label', `查看${part.name}详情`);
    label.tabIndex = -1;
    label.innerHTML = `
      <span class="pl-mark" aria-hidden="true"></span>
      <span class="pl-copy">
        <span class="pl-top"><span class="pl-number">${part.index}</span><span>${part.en.toUpperCase()}</span></span>
        <span class="pl-name">${part.name}</span>
        <span class="pl-spec">${part.spec}</span>
      </span>
    `;
    label.addEventListener('click', (event) => {
      event.stopPropagation();
      selectPart(part.id, { explode: true });
    });
    app.dom.labelLayer.appendChild(label);

    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.classList.add('leader-group');
    group.dataset.id = part.id;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('leader-line');
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.classList.add('leader-dot');
    dot.setAttribute('r', '2.2');
    group.append(path, dot);
    app.dom.labelSvg.appendChild(group);

    part.labelEl = label;
    part.leaderGroup = group;
    part.leaderPath = path;
    part.leaderDot = dot;
  }
}

/* -----------------------------------------------------------------------------
   10 — Default camera and camera animation
   -------------------------------------------------------------------------- */

function getDefaultView() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w < 900) {
    const fov = 42;
    const aspect = w / h;
    const desiredWidth = 10.2;
    const distance = clamp(
      desiredWidth / aspect / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2))),
      13,
      35,
    );
    const target = new THREE.Vector3(0, h < 720 ? 0.75 : 0.2, 0);
    const direction = new THREE.Vector3(11.8, 6.9, 26.5).normalize();
    return {
      position: target.clone().add(direction.multiplyScalar(distance)),
      target,
      fov,
    };
  }
  if (w < 1180) {
    return {
      position: new THREE.Vector3(8.4, 5.5, 19.0),
      target: new THREE.Vector3(0.52, 0.15, 0),
      fov: 37,
    };
  }
  return {
    position: new THREE.Vector3(6.8, 5.0, 15.8),
    target: new THREE.Vector3(0.65, 0.15, 0),
    fov: 35,
  };
}

let cameraTween = null;
let cachedBaseFov = 35;

function tweenCamera(position, target, duration = 1200) {
  cameraTween = {
    start: performance.now(),
    duration,
    fromPosition: camera.position.clone(),
    toPosition: position.clone(),
    fromTarget: controls.target.clone(),
    toTarget: target.clone(),
  };
}

function updateCameraTween(now) {
  if (!cameraTween) return;
  const t = clamp((now - cameraTween.start) / cameraTween.duration, 0, 1);
  const eased = easeInOutCubic(t);
  camera.position.lerpVectors(cameraTween.fromPosition, cameraTween.toPosition, eased);
  controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
  if (t >= 1) cameraTween = null;
}

function resetView(animated = true) {
  const view = getDefaultView();
  cachedBaseFov = view.fov;
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  if (animated) {
    tweenCamera(view.position, view.target, 1100);
  } else {
    camera.position.copy(view.position);
    controls.target.copy(view.target);
    controls.update();
  }
}

function applyInitialView() {
  const view = getDefaultView();
  cachedBaseFov = view.fov;
  camera.fov = view.fov;
  camera.position.copy(view.position).multiplyScalar(1.12);
  camera.position.y += 0.7;
  controls.target.copy(view.target);
  camera.updateProjectionMatrix();
  controls.update();
}

/* -----------------------------------------------------------------------------
   11 — Interaction state
   -------------------------------------------------------------------------- */

let toastTimer = null;
let explodeTween = null;

function showToast(text, duration = 2200) {
  if (!app.dom.toast) return;
  app.dom.toastText.textContent = text;
  app.dom.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    app.dom.toast.classList.remove('is-visible');
  }, duration);
}

function setAutoRotate(enabled, silent = false) {
  app.state.autoRotate = enabled;
  controls.autoRotate = enabled;
  app.dom.rotateButton.classList.toggle('is-on', enabled);
  app.dom.rotateButton.setAttribute('aria-pressed', String(enabled));
  app.dom.rotateState.textContent = enabled ? 'ON' : 'OFF';
  if (!silent) showToast(enabled ? '自动旋转已开启' : '自动旋转已关闭', 1600);
}

function updateExplodedUI() {
  const exploded = app.state.exploded;
  app.dom.explodeButton.classList.toggle('is-exploded', exploded);
  app.dom.explodeButton.setAttribute('aria-pressed', String(exploded));
  app.dom.explodeLabel.textContent = exploded ? '重新组装' : '开始拆解';
  app.dom.explodeKicker.textContent = exploded ? 'REASSEMBLE' : 'TEARDOWN';
  app.dom.assemblyState.textContent = exploded ? 'Exploded' : 'Assembled';
  document.body.classList.toggle('is-exploded', exploded);
}

function setExploded(exploded, silent = false) {
  if (app.state.exploded === exploded) return;
  app.state.exploded = exploded;
  app.state.explodedOnce = app.state.explodedOnce || exploded;
  const now = performance.now();
  explodeTween = {
    start: now,
    duration: exploded ? 1840 : 1480,
    from: app.state.explodeValue,
    to: exploded ? 1 : 0,
  };
  updateExplodedUI();
  if (exploded) {
    setAutoRotate(false, true);
    if (!silent) showToast('已展开 11 个部件 · 点击任意模块查看参数');
  } else {
    clearSelection();
    if (!silent) showToast('已恢复整机装配状态');
  }
}

function toggleExploded() {
  setExploded(!app.state.exploded);
}

function updateExplosion(now) {
  if (!explodeTween) return;
  const t = clamp((now - explodeTween.start) / explodeTween.duration, 0, 1);
  const eased = easeInOutCubic(t);
  app.state.explodeValue = lerp(explodeTween.from, explodeTween.to, eased);
  if (t >= 1) {
    app.state.explodeValue = explodeTween.to;
    explodeTween = null;
  }
  const percentage = Math.round(app.state.explodeValue * 100);
  app.dom.explodeValue.textContent = `${String(percentage).padStart(3, '0')} %`;
  app.dom.progressFill.style.width = `${percentage}%`;
}

function updatePartTransforms(now) {
  const value = app.state.explodeValue;
  for (const part of parts) {
    const delay = part.delay || 0;
    const localRaw = clamp((value - delay) / (1 - delay || 1), 0, 1);
    const local = smoothstep(0, 1, localRaw);
    part.motion = local;

    part.group.position.lerpVectors(part.basePosition, part.explodedPosition, local);
    part.group.quaternion.copy(part.baseQuaternion).slerp(part.explodedQuaternion, local);

    // A barely perceptible float keeps the exploded diagram alive.
    if (local > 0.01) {
      const float = Math.sin(now * 0.00055 + parts.indexOf(part) * 1.7) * 0.018 * local;
      part.group.position.y += float;
    }
  }
}

function selectPart(id, options = {}) {
  const part = partById.get(id);
  if (!part) return;
  const { explode = true } = options;

  app.state.selectedId = id;
  document.body.classList.add('has-selection');

  if (explode && !app.state.exploded) setExploded(true, true);

  outlinePass.selectedObjects = part.outlineMeshes;
  outlinePass.edgeStrength = 4.2;
  outlinePass.edgeGlow = 1.15;
  outlinePass.visibleEdgeColor.set(0x7dffe8);
  selectionHalo.visible = true;

  for (const [partId, row] of rowById) {
    const active = partId === id;
    row.classList.toggle('is-active', active);
    if (active) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  for (const candidate of parts) {
    const active = candidate.id === id;
    candidate.labelEl.classList.toggle('is-selected', active);
    candidate.leaderGroup.classList.toggle('is-selected', active);
  }

  app.dom.detailIndex.textContent = part.index;
  app.dom.detailCategory.textContent = part.category;
  app.dom.detailTitle.textContent = part.name;
  app.dom.detailEn.textContent = part.en;
  app.dom.detailDesc.textContent = part.desc;
  app.dom.detailFootLabel.textContent = `Module ${part.index} / ${String(MODULES.length).padStart(2, '0')}`;
  app.dom.detailSpecs.innerHTML = part.stats
    .map(([label, value]) => `<div class="spec-cell"><dt>${label}</dt><dd>${value}</dd></div>`)
    .join('');
  app.dom.detailCard.classList.add('is-open');
  app.dom.detailCard.classList.remove('is-changing');
  void app.dom.detailBody.offsetWidth;
  app.dom.detailCard.classList.add('is-changing');
  captureDetailObstacle();

  setAutoRotate(false, true);
}

function clearSelection() {
  if (!app.state.selectedId) return;
  app.state.selectedId = null;
  document.body.classList.remove('has-selection');
  outlinePass.selectedObjects = [];
  outlinePass.edgeStrength = 4.2;
  outlinePass.visibleEdgeColor.set(0x7dffe8);
  selectionHalo.visible = false;
  selectionHalo.material.opacity = 0;
  app.dom.detailCard.classList.remove('is-open');
  app.state.detailObstacle = null;

  for (const row of rowById.values()) row.classList.remove('is-active');
  for (const part of parts) {
    part.labelEl.classList.remove('is-selected');
    part.leaderGroup.classList.remove('is-selected');
  }
}

function captureDetailObstacle() {
  if (!app.dom.detailCard.classList.contains('is-open')) {
    app.state.detailObstacle = null;
    return;
  }
  const rect = app.dom.detailCard.getBoundingClientRect();
  app.state.detailObstacle = {
    x: rect.left - 12,
    y: rect.top - 12,
    w: rect.width + 24,
    h: rect.height + 24,
  };
}

function setHoveredPart(id, event) {
  if (app.state.hoveredId === id) {
    if (id && event) positionHoverTip(event.clientX, event.clientY);
    return;
  }
  app.state.hoveredId = id;
  canvas.classList.toggle('is-hovering-part', Boolean(id));

  if (!id) {
    app.dom.hoverTip.classList.remove('is-visible');
    if (!app.state.selectedId) {
      outlinePass.selectedObjects = [];
      outlinePass.edgeStrength = 4.2;
      outlinePass.visibleEdgeColor.set(0x7dffe8);
    }
    return;
  }
  const part = partById.get(id);
  if (!part) return;
  if (!app.state.selectedId) {
    outlinePass.selectedObjects = part.outlineMeshes;
    outlinePass.edgeStrength = 2.3;
    outlinePass.edgeGlow = 0.7;
    outlinePass.visibleEdgeColor.set(0x78cfc0);
  }
  app.dom.hoverIndex.textContent = part.index;
  app.dom.hoverName.textContent = part.name;
  if (event && app.state.explodeValue < 0.35) {
    app.dom.hoverTip.classList.add('is-visible');
    positionHoverTip(event.clientX, event.clientY);
  } else {
    app.dom.hoverTip.classList.remove('is-visible');
  }
}

function positionHoverTip(x, y) {
  const tip = app.dom.hoverTip;
  const width = tip.offsetWidth || 150;
  const height = tip.offsetHeight || 26;
  const left = clamp(x + 16, 12, window.innerWidth - width - 12);
  const top = clamp(y + 16, 76, window.innerHeight - height - 12);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

function focusSelectedPart() {
  const part = partById.get(app.state.selectedId);
  if (!part) return;
  const box = new THREE.Box3().setFromObject(part.group);
  const center = box.getCenter(new THREE.Vector3());
  const direction = camera.position.clone().sub(controls.target).normalize();
  const radius = part.radius || 2;
  const distance = clamp(radius * 3.15, 6.3, 13.5);
  const destination = center.clone().add(direction.multiplyScalar(distance));
  tweenCamera(destination, center, 1050);
  setAutoRotate(false, true);
}

/* -----------------------------------------------------------------------------
   12 — Parts panel behavior
   -------------------------------------------------------------------------- */

function openPartsPanel() {
  app.dom.partsPanel.classList.add('is-open');
  document.body.classList.add('parts-open');
  app.dom.partsToggle.setAttribute('aria-expanded', 'true');
}

function closePartsPanel() {
  app.dom.partsPanel.classList.remove('is-open');
  document.body.classList.remove('parts-open');
  app.dom.partsToggle.setAttribute('aria-expanded', 'false');
}

/* -----------------------------------------------------------------------------
   13 — Label layout + 3D annotation projection
   -------------------------------------------------------------------------- */

let labelWidth = 186;
let labelHeight = 52;

function updateLabelMetrics() {
  if (window.innerWidth <= 620) {
    labelWidth = 156;
    labelHeight = 49;
  } else if (window.innerWidth <= 900) {
    labelWidth = 172;
    labelHeight = 50;
  } else {
    labelWidth = 186;
    labelHeight = 52;
  }
}

const projected = new THREE.Vector3();
const tempCameraSpace = new THREE.Vector3();
const tempWorld = new THREE.Vector3();
const occupiedRects = [];

function rectsOverlap(a, b, padding = 0) {
  return !(
    a.x + a.w + padding <= b.x ||
    b.x + b.w + padding <= a.x ||
    a.y + a.h + padding <= b.y ||
    b.y + b.h + padding <= a.y
  );
}

function overlapArea(a, b) {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

function candidatePositions(side, sx, sy, w, h) {
  switch (side) {
    case 'left':
      return [
        [sx - 48 - w, sy - h / 2],
        [sx - 38 - w, sy - h - 20],
        [sx - 40 - w, sy + 20],
        [sx + 54, sy - h / 2],
      ];
    case 'top':
      return [
        [sx - w / 2, sy - h - 46],
        [sx + 34, sy - h - 34],
        [sx - w - 34, sy - h - 34],
        [sx - w / 2, sy + 46],
      ];
    case 'bottom':
      return [
        [sx - w / 2, sy + 48],
        [sx + 36, sy + 34],
        [sx - w - 36, sy + 34],
        [sx - w / 2, sy - h - 48],
      ];
    case 'right':
    default:
      return [
        [sx + 48, sy - h / 2],
        [sx + 36, sy - h - 20],
        [sx + 38, sy + 20],
        [sx - 54 - w, sy - h / 2],
      ];
  }
}

function updateLabels(now, forceVisible = false) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isMobile = width <= 900;
  const safeLeft = width > 900 ? 30 : 12;
  const safeTop = width > 620 ? 116 : 98;
  const safeRight = !isMobile
    ? width - (width > 1280 ? 392 : width > 1050 ? 360 : 344)
    : width - 12;
  const safeBottom = height - (isMobile ? 96 : 128);

  occupiedRects.length = 0;

  // Keep interfaces clear.
  if (app.state.detailObstacle) occupiedRects.push(app.state.detailObstacle);

  const sorted = [...parts].sort((a, b) => {
    if (a.id === app.state.selectedId) return -1;
    if (b.id === app.state.selectedId) return 1;
    return Number(a.index) - Number(b.index);
  });

  const focusMode = Boolean(app.state.selectedId) && app.state.explodeValue > 0.1;

  for (const part of sorted) {
    const selected = part.id === app.state.selectedId;
    const showBase = forceVisible || (app.state.explodeValue > 0.56 && part.motion > 0.7);
    const allow = showBase && (!isMobile || selected) && (!focusMode || selected);
    if (!allow) {
      part.labelEl.classList.remove('is-visible');
      part.leaderGroup.classList.remove('is-visible');
      continue;
    }

    part.anchorWorld.copy(part.anchorVector);
    part.group.localToWorld(part.anchorWorld);

    tempCameraSpace.copy(part.anchorWorld).applyMatrix4(camera.matrixWorldInverse);
    projected.copy(part.anchorWorld).project(camera);

    const visible =
      tempCameraSpace.z < -0.2 &&
      projected.z < 1 &&
      Math.abs(projected.x) < 1.5 &&
      Math.abs(projected.y) < 1.5;

    if (!visible) {
      part.labelEl.classList.remove('is-visible');
      part.leaderGroup.classList.remove('is-visible');
      continue;
    }

    const sx = (projected.x * 0.5 + 0.5) * width;
    const sy = (-projected.y * 0.5 + 0.5) * height;

    const w = labelWidth;
    const h = labelHeight;
    const candidates = candidatePositions(part.labelSide, sx, sy, w, h);

    // Add tidy rail positions around the stage so every callout has a clean
    // escape route when the exploded anchors crowd each other.
    const railStep = h + 11;
    for (let y = safeTop; y <= safeBottom - h; y += railStep) {
      candidates.push([safeLeft, y]);
      candidates.push([safeRight - w, y]);
    }

    // A selected callout gets a wider clearance from the component itself.
    if (selected) {
      candidates.unshift(
        [sx + 118, sy - h / 2],
        [sx - 118 - w, sy - h / 2],
        [sx - w / 2, sy - h - 76],
        [sx - w / 2, sy + 76],
      );
    }

    let best = null;
    let bestFree = null;
    let selectedChoice = null;

    const preferredSelected = part.labelSide === 'left'
      ? [
          [sx - 118 - w, sy - h / 2],
          [sx + 118, sy - h / 2],
          [sx - w / 2, sy - h - 76],
          [sx - w / 2, sy + 76],
        ]
      : [
          [sx + 118, sy - h / 2],
          [sx - 118 - w, sy - h / 2],
          [sx - w / 2, sy - h - 76],
          [sx - w / 2, sy + 76],
        ];

    for (const candidate of candidates) {
      const x = clamp(candidate[0], safeLeft, Math.max(safeLeft, safeRight - w));
      const y = clamp(candidate[1], safeTop, Math.max(safeTop, safeBottom - h));
      const rect = { x, y, w, h };
      let overlap = 0;
      for (const occupied of occupiedRects) overlap += overlapArea(rect, occupied);
      const distance = Math.hypot(x - candidate[0], y - candidate[1]);
      const anchorDistance = Math.hypot(x + w / 2 - sx, y + h / 2 - sy);
      const sidePenalty = part.labelSide === 'right' && x + w / 2 < sx ? 14 : 0;
      const score = distance * 1.4 + anchorDistance * 0.38 + sidePenalty;
      const entry = { x, y, score, rect, overlap };
      if (!best || score < best.score) best = entry;
      if (overlap === 0 && (!bestFree || score < bestFree.score)) bestFree = entry;
    }

    if (selected) {
      for (const candidate of preferredSelected) {
        const x = clamp(candidate[0], safeLeft, Math.max(safeLeft, safeRight - w));
        const y = clamp(candidate[1], safeTop, Math.max(safeTop, safeBottom - h));
        const rect = { x, y, w, h };
        let overlap = 0;
        for (const occupied of occupiedRects) overlap += overlapArea(rect, occupied);
        if (overlap === 0) {
          selectedChoice = { x, y, rect };
          break;
        }
      }
    }

    // Prefer a non-overlapping placement. If the callout cloud is dense,
    // fall back to the lowest-overlap slot rather than dropping the label.
    const chosen = selectedChoice || bestFree || best;
    const rect = chosen.rect;
    occupiedRects.push({ x: rect.x - 7, y: rect.y - 6, w: rect.w + 14, h: rect.h + 12 });

    part.labelEl.style.transform = `translate3d(${rect.x}px, ${rect.y}px, 0)`;
    part.labelEl.classList.add('is-visible');
    part.leaderGroup.classList.add('is-visible');
    part.labelEl.classList.toggle('is-selected', selected);

    // Choose the nearest label edge, then draw a soft elbow to the anchor.
    const centerX = rect.x + rect.w / 2;
    const centerY = rect.y + rect.h / 2;
    const dx = sx - centerX;
    const dy = sy - centerY;
    let edgeX = centerX;
    let edgeY = centerY;

    if (Math.abs(dx) > Math.abs(dy) * 1.08) {
      edgeX = dx > 0 ? rect.x + rect.w : rect.x;
      edgeY = centerY;
    } else {
      edgeX = centerX;
      edgeY = dy > 0 ? rect.y + rect.h : rect.y;
    }

    const control1X = sx + (edgeX - sx) * 0.42;
    const control1Y = sy + (edgeY - sy) * 0.02;
    const control2X = edgeX - (edgeX - sx) * 0.04;
    const control2Y = edgeY;
    const path = `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${control1X.toFixed(1)} ${control1Y.toFixed(1)}, ${control2X.toFixed(1)} ${control2Y.toFixed(1)}, ${edgeX.toFixed(1)} ${edgeY.toFixed(1)}`;
    part.leaderPath.setAttribute('d', path);
    part.leaderDot.setAttribute('cx', sx.toFixed(1));
    part.leaderDot.setAttribute('cy', sy.toFixed(1));

    if (selected) {
      part.leaderGroup.classList.add('is-selected');
    } else {
      part.leaderGroup.classList.remove('is-selected');
    }
  }

  // Keep selected label styling in sync even if it was hidden this frame.
  for (const part of parts) {
    part.labelEl.classList.toggle('is-selected', part.id === app.state.selectedId);
  }

  selectionHalo.visible = Boolean(app.state.selectedId);
  if (app.state.selectedId) {
    const part = partById.get(app.state.selectedId);
    const worldCenter = part.localCenter.clone().applyMatrix4(part.group.matrixWorld);
    selectionHalo.position.copy(worldCenter);
    const scale = Math.max(2.25, part.radius * 2.7);
    selectionHalo.scale.setScalar(scale);
    selectionHalo.material.rotation = now * 0.00008;
    selectionHalo.material.opacity = 0.24 + Math.sin(now * 0.0021) * 0.055;
  }
}

/* -----------------------------------------------------------------------------
   14 — Pointer picking
   -------------------------------------------------------------------------- */

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-10, -10);
const pointerPosition = { x: 0, y: 0 };
let pointerInside = false;
let pointerDownPosition = null;
let pointerDownTime = 0;
let pointerDragged = false;

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  pointerPosition.x = event.clientX;
  pointerPosition.y = event.clientY;
}

function pickPart(event) {
  setPointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(parts.map((part) => part.group), true);
  for (const hit of intersections) {
    let object = hit.object;
    while (object && !object.userData.partId) object = object.parent;
    if (object?.userData.partId) return object.userData.partId;
  }
  return null;
}

let lastHoverCheck = 0;

function handlePointerMove(event) {
  setPointerFromEvent(event);
  if (pointerDownPosition) {
    const dx = event.clientX - pointerDownPosition.x;
    const dy = event.clientY - pointerDownPosition.y;
    if (Math.hypot(dx, dy) > 7) pointerDragged = true;
  }

  if (app.state.hoveredId) positionHoverTip(event.clientX, event.clientY);

  if (performance.now() - lastHoverCheck < 32) return;
  lastHoverCheck = performance.now();
  if (!pointerInside) return;
  const id = pickPart(event);
  const tipAllowed = app.state.explodeValue < 0.5;
  if (id) {
    if (app.state.hoveredId !== id) setHoveredPart(id, event);
    if (tipAllowed) app.dom.hoverTip.classList.add('is-visible');
    if (tipAllowed) positionHoverTip(event.clientX, event.clientY);
  } else {
    setHoveredPart(null, event);
    app.dom.hoverTip.classList.remove('is-visible');
  }
}

function handlePointerDown(event) {
  pointerInside = true;
  pointerDownPosition = { x: event.clientX, y: event.clientY };
  pointerDownTime = performance.now();
  pointerDragged = false;
  cameraTween = null;
  app.state.userInteracted = true;
  canvas.classList.add('is-dragging');
  app.dom.hoverTip.classList.remove('is-visible');
}

function handlePointerUp(event) {
  canvas.classList.remove('is-dragging');
  pointerInside = true;
  const moved = pointerDownPosition
    ? Math.hypot(event.clientX - pointerDownPosition.x, event.clientY - pointerDownPosition.y)
    : 0;
  const isClick = !pointerDragged && moved < 7 && performance.now() - pointerDownTime < 700;
  pointerDownPosition = null;

  if (!isClick) return;

  const id = pickPart(event);
  if (id) {
    selectPart(id, { explode: true });
  } else if (app.state.selectedId) {
    clearSelection();
  }
}

function handlePointerEnter(event) {
  pointerInside = true;
  setPointerFromEvent(event);
}

function handlePointerLeave() {
  pointerInside = false;
  setHoveredPart(null);
  app.dom.hoverTip.classList.remove('is-visible');
}

canvas.addEventListener('pointermove', handlePointerMove);
canvas.addEventListener('pointerdown', handlePointerDown);
canvas.addEventListener('pointerup', handlePointerUp);
canvas.addEventListener('pointerenter', handlePointerEnter);
canvas.addEventListener('pointerleave', handlePointerLeave);
canvas.addEventListener('pointercancel', () => {
  pointerDownPosition = null;
  canvas.classList.remove('is-dragging');
});
canvas.addEventListener('contextmenu', (event) => event.preventDefault());

controls.addEventListener('start', () => {
  cameraTween = null;
  app.state.userInteracted = true;
  canvas.classList.add('is-dragging');
});
controls.addEventListener('end', () => {
  canvas.classList.remove('is-dragging');
});

/* -----------------------------------------------------------------------------
   15 — UI bindings
   -------------------------------------------------------------------------- */

app.dom.explodeButton.addEventListener('click', toggleExploded);
app.dom.resetButton.addEventListener('click', () => {
  resetView(true);
  showToast('视角已重置', 1400);
});
app.dom.rotateButton.addEventListener('click', () => {
  setAutoRotate(!app.state.autoRotate);
});
app.dom.detailClose.addEventListener('click', clearSelection);
app.dom.focusButton.addEventListener('click', focusSelectedPart);
app.dom.partsToggle.addEventListener('click', () => {
  if (app.dom.partsPanel.classList.contains('is-open')) closePartsPanel();
  else openPartsPanel();
});
app.dom.panelClose.addEventListener('click', closePartsPanel);
app.dom.panelScrim.addEventListener('click', closePartsPanel);

window.addEventListener('keydown', (event) => {
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (event.code === 'Space') {
    event.preventDefault();
    toggleExploded();
  } else if (event.key.toLowerCase() === 'r') {
    resetView(true);
    showToast('视角已重置', 1400);
  } else if (event.key.toLowerCase() === 'a') {
    setAutoRotate(!app.state.autoRotate);
  } else if (event.key === 'Escape') {
    if (app.dom.partsPanel.classList.contains('is-open')) closePartsPanel();
    else clearSelection();
  }
});

document.querySelector('.brand').addEventListener('click', (event) => {
  event.preventDefault();
  resetView(true);
});

/* -----------------------------------------------------------------------------
   16 — Resize
   -------------------------------------------------------------------------- */

function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
  renderer.setSize(width, height);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);
  outlinePass.setSize(width, height);
  bloomPass.setSize(width, height);
  camera.aspect = width / height;
  const view = getDefaultView();
  cachedBaseFov = view.fov;
  camera.fov = view.fov;
  camera.updateProjectionMatrix();
  updateLabelMetrics();
  if (app.state.detailObstacle) captureDetailObstacle();
  if (!app.state.userInteracted) {
    controls.target.copy(view.target);
    camera.position.copy(view.position);
    controls.update();
  }
  if (width > 900) closePartsPanel();
}

window.addEventListener('resize', handleResize);

/* -----------------------------------------------------------------------------
   17 — Boot, loader, render loop
   -------------------------------------------------------------------------- */

buildComponentList();
buildLabels();
updateLabelMetrics();
updateExplodedUI();
applyInitialView();

const loader = {
  set(progress, label) {
    app.dom.loaderFill.style.transform = `scaleX(${progress / 100})`;
    app.dom.loaderPercent.textContent = `${String(progress).padStart(2, '0')}%`;
    if (label) app.dom.loaderState.textContent = label;
  },
};

loader.set(18, 'Initializing renderer');
loader.set(42, 'Constructing chassis');
loader.set(68, 'Mapping components');
loader.set(88, 'Calibrating optics');

// Compile shaders before revealing the stage.
let firstFrame = true;
let introStarted = false;
const clock = new THREE.Clock();

function startIntro() {
  if (introStarted) return;
  introStarted = true;
  loader.set(100, 'System ready');
  setTimeout(() => {
    app.dom.loader.classList.add('is-done');
    setTimeout(() => {
      app.dom.loader.style.display = 'none';
    }, 950);
    const view = getDefaultView();
    tweenCamera(view.position, view.target, 1950);
    app.state.introPlayed = true;
  }, 240);
}

function animate(nowMs) {
  const now = nowMs || performance.now();
  const delta = Math.min(clock.getDelta(), 0.05);

  updateCameraTween(now);
  controls.update();
  updateExplosion(now);
  updatePartTransforms(now);

  // Intro floating motion.
  if (app.state.introPlayed) {
    dustA.rotation.y += delta * 0.012;
    dustB.rotation.y -= delta * 0.009;
    ringGroup.rotation.y += delta * 0.018;
    orbitRingB.rotation.z += delta * 0.025;
  }

  const pulse = 0.7 + Math.sin(now * 0.0013) * 0.14;
  orbitRingA.material.opacity = 0.19 * pulse;
  ringGroup.scale.setScalar(1 + app.state.explodeValue * 0.08);

  // Scan band during disassembly.
  if (explodeTween) {
    const raw = clamp((now - explodeTween.start) / explodeTween.duration, 0, 1);
    const band = Math.sin(raw * PI);
    scanRing.material.opacity = band * 0.5;
    scanRing.position.y = -2.4 + raw * 6.2;
    scanRing.scale.setScalar(1 + raw * 0.2);
  } else {
    scanRing.material.opacity *= 0.86;
  }

  // Open the lens slightly while exploded so the full teardown fits.
  const fovBoost = window.innerWidth < 900 ? 8.5 : 4.2;
  const targetFov = cachedBaseFov + app.state.explodeValue * fovBoost;
  if (Math.abs(camera.fov - targetFov) > 0.01) {
    camera.fov = targetFov;
    camera.updateProjectionMatrix();
  }

  // Keep bloom restrained to emissive details.
  bloomPass.strength = 0.43 + app.state.explodeValue * 0.08;

  // Update matrices before projecting labels.
  camera.updateMatrixWorld();
  cameraRoot.updateMatrixWorld(true);
  updateLabels(now);

  composer.render(delta);

  if (firstFrame) {
    firstFrame = false;
    startIntro();
  }
}

renderer.setAnimationLoop((time) => animate(time));

// Final loader stage after one rendered frame.
setTimeout(() => {
  if (firstFrame) {
    // Fallback in case the animation loop is throttled.
    loader.set(94, 'Preparing first frame');
  }
}, 800);

window.addEventListener('beforeunload', () => {
  renderer.setAnimationLoop(null);
  pmrem.dispose();
  renderer.dispose();
});

// Avoid a flash of default cursor feedback on touch devices.
if (isCoarse) {
  canvas.style.cursor = 'grab';
}

