# AGENTS.md — personal-site 发布约定

本仓库是个人站的唯一部署源。**每次完成一个可玩的 demo / 可交付的页面，必须 commit + push，不能只留在本地。**

## 每次交付的固定动作

1. **放文件**：静态 demo 放 `site/<slug>/`，入口必须是 `site/<slug>/index.html`，资源全部用相对路径。
2. **防缓存**：在 `nginx/nginx.conf` 的「子项目不缓存」正则里加上新 `<slug>`：
   ```nginx
   location ~* ^/(match3|match3-program|drink-party-game|dji-action-4|pregnancy)/ {
       expires -1;
   }
   ```
   JS/CSS 文件名没有哈希，强缓存会让浏览器拿到旧版。
3. **登记**：在 `README.md` 的「已上线 Demo」表里加一行，写清路径和内容。
4. **自测**：工程自带测试就在对应目录跑（如 `node test/engine.test.js`）；再起个静态服务器确认入口、JS、CSS 都能打开。
5. **提交推送**：
   ```bash
   git add site/<slug> nginx/nginx.conf README.md
   git commit -m "feat: 新增 <name>（/<slug>/）"
   git push origin main
   ```
6. **验证远端**：
   ```bash
   git ls-remote origin refs/heads/main
   git rev-parse HEAD
   ```
   两者一致，且 `git status -sb` 显示 `## main...origin/main`，才算完成。

## 当前静态 Demo

| 路径 | 源工程 |
| --- | --- |
| `/match3/` | `game_idea/match3_rule_game/basic/` |
| `/match3-program/` | `game_idea/match3_rule_game/program/` |

## 硬规则

- `nginx.conf` 是打进镜像的：改完要在服务器执行 `docker compose up -d --build nginx`；只改 `site/` 下的静态文件不用重建（volume 挂载）。
- 不提交 `.DS_Store`；提交前 `git status --short` 检查一遍。
- 不改 `site/match3/`（基础款）的既有行为；新玩法放新目录。
- 不 force push；push 失败不要假装成功，保留 commit，报告错误后重试。
- 提交信息用中文，写清路径和玩法。
