# YueYuan's Blog

个人博客站点，基于 Hexo + Butterfly 主题构建，托管在 GitHub Pages。

线上地址：<https://yueyuanyutong.github.io>

---

## 技术栈

| 层次 | 选型 |
| --- | --- |
| 静态站点生成 | Hexo 7.3.0 |
| 主题 | Butterfly 5.4.0-b1（以 git submodule 引入，固定于 `ca03058`） |
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
│   ├── _notes/              # 笔记源文件（「笔记」栏目的唯一来源）
│   ├── notes/               # 笔记栏目产物，由 tools/notes.js 生成（git 忽略）
│   ├── _data/link.yml       # 友链数据（友链页用）
│   ├── css/kb.css           # 「笔记」栏目样式
│   ├── img/                 # 站点自有图片（背景、头像）
│   ├── about/index.md       # 关于页
│   └── links/index.md       # 友链页（front-matter 需 type: link）
├── tools/notes.js           # 「笔记」栏目生成器
├── themes/butterfly/        # 主题（git submodule，固定于 ca03058）
├── scaffolds/               # 新建文章/页面的模板
└── public/                  # 构建产物（git 忽略）
```

---

## 本地开发

```bash
# 安装依赖
npm install

# 本地预览，http://localhost:4000（会先自动生成「笔记」栏目）
npm run server

# 仅构建（同样会先生成「笔记」栏目）
npm run build

# 只重新生成「笔记」栏目
npm run notes
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

## 「笔记」栏目

`source/_notes/` 下的内容会在构建时自动汇总成 `/notes/` 栏目，用于承载
**从对话、阅读、踩坑中沉淀下来的零散知识**——概念解释、速查表、踩坑记录、复盘。
与 `_posts/`（成篇的文章）分开：笔记不进首页、不参与文章归档，只在自己的栏目里按时间倒序排列。

### 新增一篇笔记

在 `source/_notes/` 下新建一个 `.md` 文件即可，文件名即 URL（`xxx.md` → `/notes/xxx/`，
需要自定义就加 `slug` 字段）：

```yaml
---
title: TCP 为什么必须三次握手
date: 2026-10-16 15:45:00
kind: concept          # concept 概念卡 / cheatsheet 速查表 / pitfall 踩坑记录 / review 复盘 / note 随笔
category: 计算机网络
tags: [TCP, 网络协议]
excerpt: 列表页上显示的一句话摘要
source: 出处（可选）
---

正文 Markdown……
```

### 它是怎么工作的

- `source/_notes/` 是**唯一真源**，下划线前缀让 Hexo 直接忽略该目录
- `tools/notes.js` 扫描它，生成 `source/notes/index.md`（列表页）与
  `source/notes/<slug>/index.md`（每篇笔记页面）
- 产物目录 `source/notes/` 已写进 `.gitignore`，无需手动维护、也不要手动改
- 生成动作已挂进 `npm run build` / `npm run server` 与 CI 工作流，无需额外操作
- 笔记会被站内搜索收录（`_config.yml` 中 `search.field: all`）

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
- 站内搜索：已启用（`local_search`，`search.field: all`，笔记与页面均可被搜到）
- 页面：`/about/`、`/links/`、`/notes/` 均已建立
- 统计：仅 busuanzi（不蒜子）
- **尚未配置**：评论系统、社交链接、数学公式

## 主题管理（git submodule）

主题以 git submodule 形式引入，固定在上游提交 `ca03058`（即 `5.4.0-b1` 快照）。

**首次克隆仓库必须带 submodule**，否则主题目录为空、构建会失败：

```bash
git clone --recursive <repo-url>
# 若已克隆过，补拉子模块：
git submodule update --init --recursive
```

**查看当前固定的版本：**

```bash
git -C themes/butterfly log -1 --format="%h %ad %s" --date=short
```

**升级主题：** 先切到目标 tag（如 5.7.0），构建并与线上比对，确认无误后再提交。
站点自有图片已迁至 `source/img/`，主题目录内不含任何自定义资源，升级不会覆盖你的东西。

```bash
git -C themes/butterfly fetch --tags
git -C themes/butterfly checkout 5.7.0
./node_modules/.bin/hexo clean && ./node_modules/.bin/hexo generate
# 本地预览确认无异常后：
git add themes/butterfly && git commit -m "chore: 升级 Butterfly 主题至 5.7.0"
```

> 注意：主题跨大版本升级时 `_config.butterfly.yml` 可能需要补充新增配置项，
> 建议先对照 `themes/butterfly/_config.yml` 的 diff。

## 待办 / 隐患

- 主题为 **beta 版本**（5.4.0-b1），上游最新稳定版为 5.7.0，可按需升级
- 图片资源已迁至 `source/img/`，主题目录内已无自定义资源
