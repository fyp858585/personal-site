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
├── site/                  # ★ 静态个站本体
│   ├── index.html
│   ├── css/style.css
│   └── js/main.js         # 粒子系统 + 打字效果 + 滚动动画
└── projects/              # ★ 未来前端工程放在这里
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

## 添加新项目（3 步）

假设你要上线一个 Canvas 小游戏：

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
