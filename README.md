# 🌌 Explorer · 个人个站

科技感 + 艺术感个人主页，Docker 化部署，可迁移，可扩展。

## 架构

```
personal-site/
├── docker-compose.yml     # 编排文件（一键启动）
├── .env                   # 环境变量（端口等）
├── nginx/
│   ├── Dockerfile         # Nginx 镜像
│   └── nginx.conf         # 核心配置（含未来项目反代预留）
├── site/                  # ★ 静态个站本体（nginx 直接托管）
│   ├── index.html
│   ├── css/style.css
│   ├── js/main.js         # 粒子系统 + 打字效果 + 滚动动画
│   ├── match3/            # 果园消消乐 · 基础款
│   └── match3-program/    # 果园工坊 · 编程三消
└── projects/              # （预留）需要独立进程的前端工程
    └── (your-game, ai-tools, music-viz, ...)
```

## 快速开始

```bash
# 1. 启动
docker compose up -d

# 2. 访问
open http://localhost:8080
```

修改 `site/` 下任何文件 → 刷新浏览器即时生效（volume 挂载）。

> `nginx/nginx.conf` 是打进镜像的，改完要在服务器执行 `docker compose up -d --build nginx`；只改 `site/` 下的静态文件不用重建。

## 已上线 Demo

| 路径 | 内容 |
| --- | --- |
| [`/match3/`](site/match3/) | 果园消消乐 · 基础款：8 关、关卡地图、星星存档 |
| [`/match3-program/`](site/match3-program/) | 果园工坊 · 编程三消：可编辑规则表 + 执行日志 + 4 关 |

> Demo 不在首页导航里，按路径直接访问。

## 新增静态 Demo（当前推荐）

纯 HTML/JS 的小游戏不需要新容器，直接放进 `site/`：

1. **放文件**：`cp -R <工程目录> site/<slug>/`，入口必须是 `site/<slug>/index.html`，资源全部用相对路径。
2. **防缓存**：在 `nginx/nginx.conf` 的「子项目不缓存」正则里加上 `<slug>`。JS/CSS 文件名没有哈希，强缓存会让浏览器拿到旧版。
3. **登记**：在本 README 的「已上线 Demo」表里加一行。
4. **自测**：工程自带测试就在对应目录跑；再起个静态服务器确认入口和资源都能打开。
5. **提交推送**：`git add site/<slug> nginx/nginx.conf README.md && git commit -m "feat: 新增 <name>（/<slug>/）" && git push origin main`。

> **每次做完都要推。** 完整约定见 [AGENTS.md](AGENTS.md)。

## 添加需要独立进程的项目（可选）

如果项目需要 Node/Python 进程、WebSocket 或自己的 Dockerfile，再走反代。假设你要上线一个需要后端的小游戏：

### 步骤 1：创建项目目录

```bash
mkdir -p projects/game
# 把你的前端工程放进去（需要 Dockerfile）
```

### 步骤 2：在 `docker-compose.yml` 中取消注释并添加 service

```yaml
services:
  game:
    build: ./projects/game
    container_name: portfolio-game
    expose:
      - "3000"
    restart: unless-stopped
    networks:
      - portfolio-net
```

### 步骤 3：在 `nginx/nginx.conf` 中添加 location

```nginx
location /projects/game/ {
    proxy_pass http://game:3000/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

然后 `docker compose up -d --build` 即可。

## 设计特点

| 特点 | 说明 |
|------|------|
| 🎨 **视觉** | 深空背景 + 粒子网络 + 霓虹光效 + 毛玻璃卡片 |
| ✨ **动画** | Canvas 粒子系统、打字机效果、滚动渐入 |
| 📱 **响应式** | 手机 / 平板 / 桌面全适配 |
| 🐳 **可迁移** | 一个 `docker compose up` 在任何机器上跑 |
| 🔌 **可扩展** | Nginx 反代预留，新项目只需加 location |

## 自定义

替换以下内容即可变成你自己的站：
- `site/index.html` — 名字、描述、项目卡片
- `site/js/main.js` — `names` 数组改成你的称呼
- 联系方式链接改成你的
