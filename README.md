# YueYuan's Blog

个人博客站点，基于 Hexo + Butterfly 主题构建，托管在 GitHub Pages。

线上地址：<https://yueyuanyutong.github.io>

---

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 静态站点生成 | Hexo 7.3.0 |
| 主题 | Butterfly 5.4.0-b1 |
| 渲染器 | hexo-renderer-marked / pug / ejs / stylus |
| 站点搜索 | hexo-generator-searchdb + Butterfly `local_search` |
| 部署 | hexo-deployer-git → GitHub Pages |
| 运行时 | Node.js 22.x |

---

## 仓库与分支

远程仓库 `yueyuanyutong.github.io` 承担两个角色，**两个分支用途不同，不要混淆**：

| 分支 | 内容 | 由谁推送 |
| --- | --- | --- |
| `master` | Hexo **源码**（文章、配置、主题、脚本） | 本地 `git push` |
| `main` | `hexo deploy` 生成的**静态站点**，GitHub Pages 服务此分支 | `hexo deploy` |

因此：向 `master` 推送源码**不会**影响线上站点；只有执行 `hexo deploy` 才会更新网站。

---

## 目录结构

```
.
├── _config.yml              # Hexo 主配置（站点信息、url、部署目标）
├── _config.butterfly.yml    # 主题配置（导航、头像、评论、搜索、统计等）
├── source/
│   ├── _posts/              # 文章，Markdown
│   ├── _data/link.yml       # 友链数据（友链页用）
│   ├── img/                 # 站点自有图片（背景、头像）
│   ├── about/index.md       # 关于页
│   └── links/index.md       # 友链页（front-matter 需 type: link）
├── themes/butterfly/        # 主题（整包拷贝）
├── scaffolds/               # 新建文章/页面的模板
└── public/                  # 构建产物（git 忽略）
```

---

## 本地开发

```bash
# 安装依赖
npm install

# 本地预览，http://localhost:4000
./node_modules/.bin/hexo server

# 仅构建
./node_modules/.bin/hexo clean && ./node_modules/.bin/hexo generate
```

新建文章：

```bash
./node_modules/.bin/hexo new "文章标题"
```

文章写在 `source/_posts/`，front-matter 示例：

```yaml
---
title: 前缀和数组算法
date: 2025-06-23
tags:
  - 算法
  - 前缀和
categories: 编程
---
```

---

## 发布

站点已配置 **GitHub Actions 自动部署**：向 `master` 分支推送源码后，
`.github/workflows/deploy.yml` 会自动执行 `npm ci` → `hexo generate`，
并把构建产物强制推送到 `main` 分支，GitHub Pages 随后自动更新。
无需在本地做任何发布操作。

也可以手动触发：仓库的 **Actions → Build and Deploy → Run workflow**。

如需在本地手动发布（例如 CI 不可用时）：

```bash
./node_modules/.bin/hexo generate --deploy
```

### 两个必须注意的点

**1. 不要 `hexo clean` 之后再单独执行 `hexo deploy`。**

`hexo deploy` 只有在 `public/` **不存在**时才会自动重新生成。如果先清空 `public/` 再单独部署，
会把一个**空站点**强推到 `main`，直接清空线上网站。始终使用 `hexo generate --deploy`
（或确认 `public/` 已是当前构建）最安全。

**2. 推送需要代理。**

`github.com` 在直连下不稳定，而 **git 命令行不读取 Windows 系统代理**，必须显式配置。
本机 VPN 的代理端口为 `127.0.0.1:7892`，已写入全局配置（仅对 github.com 生效）：

```bash
git config --global http.https://github.com/.proxy http://127.0.0.1:7892
```

VPN 关闭时该域名会连不上，需要临时取消：

```bash
git config --global --unset http.https://github.com/.proxy
```

若代理端口变了，重新探测：

```bash
netstat -ano | grep LISTENING | grep 127.0.0.1
# 再用 curl -x http://127.0.0.1:端口 https://github.com 逐个验证，返回 200 的即是
```

---

## 当前配置状态

- 站点 `url`：`https://yueyuanyutong.github.io`（若绑定自定义域名，只需改这一行）
- 站内搜索：已启用（`local_search`）
- 页面：`/about/`、`/links/` 均已建立
- 统计：仅 busuanzi（不蒜子）
- **尚未配置**：评论系统、社交链接、数学公式

## 待办 / 隐患

- 主题为 **beta 版本**且为整包拷贝，无版本管理，升级时需手工覆盖（建议改为 git submodule）
- 图片资源已迁至 `source/img/`，但主题目录更新仍需注意不要覆盖站内资源
