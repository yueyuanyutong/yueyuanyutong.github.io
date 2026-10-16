# YueYuan's Blog

个人知识库站点，基于 Hexo + Butterfly 主题构建，托管在 GitHub Pages。

**全站只有一种内容：笔记。** 首页是知识库入口（分区 + 最新笔记），而不是文章列表。

Hexo 默认的「文章」体系（`_posts` + 归档 + 分类 + 标签 + 分页）已**整体退役** ——  
那套范式是给"人写给人看、量少而精"的公开博客设计的，与本站"产出后自己消费、  
按主题分区检索"的用法不符。详见下方[内容模型](#内容模型为什么没有文章)。

线上地址：<https://yueyuanyutong.github.io>

> **在本仓库动手的 AI 代理请先读 [AGENTS.md](./AGENTS.md)** —— 那里是当前实际状态、  
> 操作手册与陷阱清单。本文件讲的是设计与缘由。

---

## 技术栈

| 层次     | 选型                                                   |
| ------ | ---------------------------------------------------- |
| 静态站点生成 | Hexo 7.3.0                                           |
| 主题     | Butterfly 5.4.0-b1（以 git submodule 引入，固定于 `ca03058`） |
| 渲染器    | hexo-renderer-marked / pug / ejs / stylus            |
| 站点搜索   | hexo-generator-searchdb + Butterfly `local_search`   |
| 配置解析   | js-yaml 4.x（`tools/` 与 `scripts/` 直接读取 YAML 配置）        |
| 部署     | GitHub Actions 构建后强推 `main` → GitHub Pages            |
| 运行时    | Node.js 22.x                                         |

---

## 仓库与分支

远程仓库 `yueyuanyutong.github.io` 承担两个角色，**两个分支用途不同，不要混淆**：

| 分支       | 内容                                | 由谁推送                                |
| -------- | --------------------------------- | ----------------------------------- |
| `master` | Hexo **源码**（笔记、配置、主题引用、脚本）         | 本地 `git push`                       |
| `main`   | 构建产物，**GitHub Pages 服务此分支**         | CI（`.github/workflows/deploy.yml`）  |

因此：向 `master` 推送源码会触发 CI 自动构建部署（`npm ci` → `hexo clean` + `npm run build`
→ `npm run check` → 强推 `main`）。**`npm run check` 不通过时 CI 直接失败，不会上线** ——
站点契约（`tools/check.js` 的 40 项断言）在 CI 与本地是同一条。本地只在 CI 不可用时
才需要手动发布，见[发布](#发布)。

---

## 目录结构

```
.
├── _config.yml              # Hexo 主配置（站点信息、url、部署目标）
├── _config.butterfly.yml    # 主题配置（导航、头像、评论、搜索、统计等）
├── source/
│   ├── _notes/              # 笔记源文件 —— 目录结构即分区（站点的唯一内容源）
│   │   ├── _sections.yml    #   分区英文别名 + 首页排序
│   │   └── 计算机/          #   文件夹名就是分区名，可继续嵌套
│   │       ├── 算法/xxx.md
│   │       ├── 网络/xxx.md
│   │       └── 工具/xxx.md
│   ├── index.md             # 首页源文件，由 tools/notes.js 生成（git 忽略）
│   ├── notes/               # 笔记栏目产物，由 tools/notes.js 生成（git 忽略）
│   ├── _posts/              # 已清空 —— 文章体系退役（空目录不被 git 跟踪，克隆后不存在属正常）
│   ├── _data/link.yml       # 友链数据（友链页用）
│   ├── css/kb.css           # 笔记栏目样式
│   ├── img/                 # 站点自有图片（头像、壁纸、首页抬头横幅 header.webp）
│   ├── 2025/…/index.html    # 旧文章 URL 的跳转页（纯静态 HTML）
│   ├── about/index.md       # 关于页
│   └── links/index.md       # 友链页（front-matter 需 type: link）
├── tools/
│   ├── notes.js             # 页面生成器（首页 + 笔记栏目）
│   ├── check.js             # 构建产物验收（npm run check，40 项断言）
│   └── lib/notes-core.js    #   共用内核：扫描、分区树、HTML 片段渲染
├── scripts/                 # Hexo 构建期脚本（站点根目录，自动加载）
│   ├── hero.js              #   给每个页面注入「个人介绍」区块
│   └── search.js            #   清理 search.xml：剔除列表页与非 HTML 资源
├── AGENTS.md                # 代理交接手册（当前状态 / 操作 / 陷阱）
├── themes/butterfly/        # 主题（git submodule，固定于 ca03058）
├── scaffolds/               # 新建页面模板（文章体系已退役，post/draft 模板已移除）
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

# 验收构建产物（40 项断言：页面清单、个人介绍注入、搜索索引、样式规则…）
npm run check
```

改动后建议 `npm run build && npm run check`，确认没改坏再推送。新增内容请见下一节 ——  
本站只有「笔记」一种内容，**不再使用 `hexo new` 创建文章**。

---

## 笔记（站点的全部内容）

站点的入口是**知识库**，不是文章列表 —— 首页顶部就是分区入口与最新笔记。

`source/_notes/` 下的内容会在构建时自动汇总，承载**从对话、阅读、踩坑中沉淀下来的  
零散知识**：概念解释、速查表、踩坑记录、复盘。

### 目录即分区

**不需要写任何分类字段** —— 文件夹决定分区，文件名决定 URL：

```
source/_notes/
├── 计算机/
│   ├── 算法/balanced-matrix-prefix-sum.md  → /notes/computer/algorithms/balanced-matrix-prefix-sum/
│   ├── 网络/tcp-three-way-handshake.md   → /notes/computer/network/tcp-three-way-handshake/
│   └── 工具/git-proxy-cheatsheet.md      → /notes/computer/tools/git-proxy-cheatsheet/
├── 考研/
└── 考公/
```

- 一级目录 = 大分区，二级目录 = 子分区，可以继续往下嵌套
- 中文文件名/目录名不进 URL，地址栏片段由 `source/_notes/_sections.yml` 的  
  `aliases` 映射（中文分区名 → 英文片段）

### 新增一篇笔记

把 `.md` 丢进对应文件夹即可。front-matter 只写这几项：

```yaml
---
title: TCP 为什么必须三次握手
date: 2026-10-16 15:45:00
kind: concept          # concept 概念卡 / cheatsheet 速查表 / problem 题解 / pitfall 踩坑记录 / review 复盘 / note 随笔
tags: [TCP, 网络协议]
excerpt: 列表页上显示的一句话摘要
source: 出处（可选）
---
```

正文 Markdown……

### 新建一个分区

在 `source/_notes/` 下建同名文件夹，再到 `_sections.yml` 的 `aliases` 加一行映射：

```yaml
aliases:
  计算机网络: computer-network   # 左边是文件夹名，右边是地址栏片段
```

**不配置也能用**，只是地址栏会出现 `%E8%AE%A1%E7%AE%97%E6%9C%BA` 这样的编码字符。  
`sections.yml` 里的 `home` 列表只控制首页分区的**显示顺序**，不会让有笔记的分区消失。

### 生成哪些页面

| 页面                      | 内容                                      |
| ----------------------- | --------------------------------------- |
| `/`                     | 分区入口卡片 + 最新 6 条笔记（由生成器直接产出，不是主题默认的文章列表） |
| `/notes/`               | 全部笔记 + 分区筛选栏                            |
| `/notes/<分区>/`          | 该分区（含子分区）的全部笔记 + 子分区入口                  |
| `/notes/<分区>/…/<slug>/` | 笔记正文                                    |

### 它是怎么工作的

- `source/_notes/` 是**唯一真源**，下划线前缀让 Hexo 直接忽略该目录
- `tools/lib/notes-core.js` 是共用内核（扫描、建分区树、渲染 HTML 片段），  
  由 `tools/notes.js` 生成**首页与全部笔记页面**
- 产物 `source/index.md` 与 `source/notes/` 已写进 `.gitignore`，  
  无需手动维护、也不要手动改（构建时自动重建）
- 生成动作已挂进 `npm run build` / `npm run server` 与 CI 工作流，无需额外操作
- `scripts/search.js` 会把分区列表页与非 HTML 资源从 `search.xml` 中剔除，  
  否则搜一个词会被同一篇笔记的分区页重复命中好几次
- `scripts/hero.js` 在构建期把「个人介绍」区块注入**每个页面**正文顶部  
  （内容取自 `_config.yml` 与 `_config.butterfly.yml` 的现有身份配置，不新增数据源）。  
  宽屏下它是 `display:none`、个人介绍由侧边栏作者卡承担；≤900px 时主题会把整列侧栏  
  挪到正文之后，这时才由这个区块顶上去，并隐藏侧栏里重复的作者卡

### 内容模型：为什么没有「文章」

Hexo 默认的博客范式（`_posts` + 归档 + 分类 + 标签 + 分页）已**整体退役**：  
它是为"人写给人看、量少而精"的公开博客设计的，而本站是"自己 / AI 产出、自己消费"  
的知识库 —— 按主题分区检索，而不是按时间流浏览。两套并存只会互相干扰：  
首页要同时塞两种内容、导航里挂着永远为空的入口、搜索索引里两类混着。

因此**全站只有笔记一种内容**。`_posts/` 保持为空后，Hexo 的四个生成器会自动静默：

| 生成器                               | 空 `_posts` 时的实际行为               |
| --------------------------------- | ------------------------------- |
| `hexo-generator-index`            | 分页总数算得 0，循环体一次都不执行              |
| `hexo-generator-archive`          | `if (!allPosts.length) return;` |
| `hexo-generator-category` / `tag` | 空分类 / 空标签直接跳过                   |

这带来两个直接结果：`/archives/`、`/categories/`、`/tags/` 三类页面**自然消失**，  
首页也彻底空出来交给生成器接管 —— **不需要在配置里禁用任何东西**。

> 不要为了「分类」去用 Hexo 的 category / tag：那是文章体系的字段，会额外生成一整套  
> 页面、还要维护两套命名，与「目录即分区」语义重复。分区只认文件夹。

---

## 发布

站点已配置 **GitHub Actions 自动部署**：向 `master` 分支推送源码后，  
`.github/workflows/deploy.yml` 会依次执行 `npm ci` → `hexo clean` + `npm run build`  
→ `npm run check`，全部通过后才把构建产物强制推送到 `main` 分支，GitHub Pages 随后  
自动更新。`npm run check` 失败会让整个工作流失败、**不会**部署 —— 所以本地能过、  
CI 过不了的改动不会悄悄上线。无需在本地做任何发布操作。

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
- 首页：由 `tools/notes.js` 生成 `source/index.md` 产出（分区 + 最新笔记），  
  **改首页内容改 `tools/lib/notes-core.js` 里的 `renderHomeBlock`**
- 抬头：首页铺插画横幅 `source/img/header.webp`（由生成器写进 front-matter `top_img`）；  
  **其余页面抬头透明**（`default_top_img: false` —— 留空是错的，`undefined` 会漏过主题的  
  `top_img !== false` 判断，页面会变成 400px 纯色块）
- 个人介绍：每个页面正文顶部都有 `.kb-hero` 区块（构建期注入），**只在 ≤900px 显示**；  
  宽屏仍由侧边栏作者卡承担。900px 是主题自己的断点，与侧栏下沉时机同步
- 内容模型：只有笔记一种；`_posts/` 已空，归档 / 分类 / 标签页不再生成
- 侧边栏：主题里硬编码的「文章 / 标签 / 分类」计数已用 CSS 隐藏（见 `kb.css` 末尾说明），  
  「文章数目」一行通过 `card_webinfo.post_count` 关闭
- 导航：`主页 / 笔记 / 友链 / 关于笔者`
- 站内搜索：已启用（`local_search`，`search.field: all`，笔记可被搜到）
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

> 权威清单见 [AGENTS.md §11](./AGENTS.md#11-待办)，下面这份是面向人的概述。

- 主题为 **beta 版本**（5.4.0-b1），上游最新稳定版为 5.7.0，可按需升级
- 图片资源已迁至 `source/img/`，主题目录内已无自定义资源
- `about` / `links` 两页仍是通用模板文案，待按实际情况填写
- 移动端菜单与作者卡里的「文章 / 标签 / 分类」计数写死在主题模板中  
  （`sidebar.pug` / `card_author.pug`），没有配置开关，目前靠 CSS 隐藏。  
  **升级主题后需重新确认 `.site-data` 这个类名是否还在**，否则计数会露出来
- 旧文章 URL `/2025/06/23/2025-06-23/` 已加跳转页；确认无人访问后可删除  
  `source/2025/` 目录，并同步移除 `_config.yml` 里的 `skip_render` 配置
