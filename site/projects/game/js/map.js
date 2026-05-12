// ===== 像素要塞 · 地图系统 =====

// 地图数据: 20×14 网格
// 0=空地 1=路径 2=可建造(路径相邻)
let grid = [];
let pathPoints = [];      // 路径上的像素坐标 [{x, y}, ...]
let buildableCells = [];  // 可建造的格子 [{gx, gy}, ...]

// 预定义的蛇形路径 (网格坐标)
const PATH_CELLS = [
  // 列, 行
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3],
  [5, 4], [5, 5], [5, 6],
  [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [11, 6],
  [11, 5], [11, 4], [11, 3],
  [10, 3], [9, 3],
  [9, 2], [9, 1], [9, 0],
  [8, 0], [7, 0],
  [7, 1], [7, 2],
  [6, 2], [5, 2], [4, 2], [3, 2],
  [3, 3],
  [3, 4], [3, 5],
  [4, 5], [4, 6], [4, 7], [4, 8], [4, 9],
  [3, 9], [2, 9], [1, 9], [0, 9],
  [0, 8], [0, 7],
  [1, 7], [2, 7], [2, 8], [2, 9],
  [2, 10],
  [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10],
  [8, 9], [8, 8], [8, 7],
  [9, 7], [10, 7],
  [10, 8], [10, 9], [10, 10],
  [10, 11], [10, 12], [9, 12], [8, 12], [7, 12], [6, 12], [5, 12],
  [5, 11],
  [6, 11], [7, 11],
  [7, 12], [7, 13],
  [8, 13], [9, 13], [10, 13], [11, 13], [12, 13], [13, 13], [14, 13],
  [14, 12],
  [13, 12], [12, 12],
  [12, 11],
  [13, 11], [14, 11],
  [14, 10],
  [15, 10], [16, 10], [17, 10], [18, 10], [19, 10],
  [19, 9], [19, 8], [19, 7],
  [18, 7], [17, 7], [16, 7], [15, 7], [14, 7],
  [14, 6],
  [15, 6], [16, 6],
  [16, 5],
  [15, 5], [14, 5],
  [14, 4],
  [15, 4], [16, 4], [17, 4], [18, 4], [19, 4],
  [19, 3],
  [18, 3], [17, 3],
  [17, 2],
  [18, 2], [19, 2],
  [19, 1],
  [18, 1], [17, 1], [16, 1], [15, 1], [14, 1], [13, 1],
  [13, 0],
  [14, 0], [15, 0], [16, 0], [17, 0], [18, 0], [19, 0],
];

function initMap() {
  // 初始化网格
  grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(TILE.EMPTY));

  // 标记路径
  const pathSet = new Set(PATH_CELLS.map(([cx, cy]) => `${cx},${cy}`));
  for (const [cx, cy] of PATH_CELLS) {
    if (cy >= 0 && cy < GRID_ROWS && cx >= 0 && cx < GRID_COLS) {
      grid[cy][cx] = TILE.PATH;
    }
  }

  // 计算路径像素坐标 (格子中心)
  pathPoints = PATH_CELLS.map(([cx, cy]) => ({
    x: cx * CELL_SIZE + CELL_SIZE / 2,
    y: cy * CELL_SIZE + CELL_SIZE / 2,
  }));

  // 计算可建造格 (路径相邻 8 方向的空地)
  buildableCells = [];
  const directions = [
    [-1,-1], [0,-1], [1,-1],
    [-1, 0],         [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ];
  const checked = new Set();

  for (const [cx, cy] of PATH_CELLS) {
    for (const [dx, dy] of directions) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;
      if (nx >= 0 && nx < GRID_COLS && ny >= 0 && ny < GRID_ROWS &&
          !pathSet.has(key) && !checked.has(key)) {
        checked.add(key);
        grid[ny][nx] = TILE.BUILDABLE;
        buildableCells.push({ gx: nx, gy: ny });
      }
    }
  }
}

function isBuildable(gx, gy) {
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false;
  return grid[gy][gx] === TILE.BUILDABLE;
}

function isPath(gx, gy) {
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false;
  return grid[gy][gx] === TILE.PATH;
}

/** 获取路径上已走过的总像素距离 */
function getPathLength() {
  let len = 0;
  for (let i = 1; i < pathPoints.length; i++) {
    len += dist(pathPoints[i-1].x, pathPoints[i-1].y, pathPoints[i].x, pathPoints[i].y);
  }
  return len;
}

/** 根据行进距离获取路径上的坐标 */
function getPositionOnPath(distance) {
  let traveled = 0;
  for (let i = 1; i < pathPoints.length; i++) {
    const segLen = dist(pathPoints[i-1].x, pathPoints[i-1].y, pathPoints[i].x, pathPoints[i].y);
    if (traveled + segLen >= distance) {
      const t = (distance - traveled) / segLen;
      return {
        x: lerp(pathPoints[i-1].x, pathPoints[i].x, t),
        y: lerp(pathPoints[i-1].y, pathPoints[i].y, t),
        segIndex: i - 1,
      };
    }
    traveled += segLen;
  }
  // 已到达终点
  return {
    x: pathPoints[pathPoints.length - 1].x,
    y: pathPoints[pathPoints.length - 1].y,
    segIndex: pathPoints.length - 1,
    finished: true,
  };
}
