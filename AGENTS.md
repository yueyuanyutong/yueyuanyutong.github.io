# AGENTS.md — 接手本仓库的代理必读

面向**在本仓库动手的 AI 代理**。

- 人读的设计说明与缘由 → [README.md](./README.md)
- 本文件记录的是**当前实际状态 + 操作手册 + 陷阱清单**，两者冲突时以本文件为准
- 改完任何东西，请同步更新本文件里受影响的小节

一句话定位：这是 `yueyuanyutong` 的**私人知识库站点**，全站只有「笔记」一种内容，
首页是知识库入口。不是追求流量与 SEO 的公开博客，不需要考虑访客转化那套东西。

线上：<https://yueyuanyutong.github.io>　源码仓库：`yueyuanyutong/yueyuanyutong.github.io`

---

## 0. 30 秒上手

```bash
cd D:/Blogs/myBlog
npm ci                            # 首次或依赖变更时；node_modules 已在可跳过
npm run build && npm run check    # 构建 + 自检（40 项断言，必须全部 ok；CI 跑同一套）
npm run server                    # 本地预览 http://localhost:4000
```

改动流程：**改 → 本地预览确认 → 等用户点头 → `git push origin master` → CI 自动部署**。

```bash
git push origin master            # 触发 GitHub Actions，几十秒后线上更新
```

---

## 1. 六条铁律（违反会直接搞坏线上）

1. **仓库必须保持 Public。** 设为私有会让 GitHub **立即禁用 Pages**，全站 404。
   私有化**不能隐藏内容** —— 官方明确「私有仓库的 Pages 站点依然公网公开」，
   所以它唯一的效果就是让站点挂掉。（2026-10-16 真的踩过一次，见排障手册）
2. **不要 `hexo clean` 之后再单独 `hexo deploy`。**
   `hexo deploy` 只在 `public/` **不存在**时才自动重新生成；先清空再单独部署会把
   **空站点**强推到 `main`，线上瞬间全空。要用就用 `./node_modules/.bin/hexo generate --deploy`。
3. **`source/index.md` 与 `source/notes/**` 是生成物**（已写进 `.gitignore`）。
   真源是 `source/_notes/**`。手改生成物会在下次构建被覆盖。
4. **主题是 git submodule，不要在 `themes/butterfly/` 里改文件。**
   所有定制走站点根：`scripts/`（构建期钩子）、`source/css/kb.css`、`_config.butterfly.yml`。
   主题目录只在「升级主题」时才动。
5. **`/archives/`、`/categories/`、`/tags/` 必须保持 404。**
   它们靠 `_posts/` 为空而自然消失。不要为了「分类」去启用 Hexo 的 category / tag ——
   那是文章体系的字段，与本站「目录即分区」语义重复，只会多出一整套页面。
6. **推送、改仓库可见性、删文件之前先问用户。**
   用户的固定要求是「先本地预览、确认后再上线」，而且他常会自己再拿手机看一遍。

---

## 2. 环境

| 用途 | 路径 / 说明 |
| --- | --- |
| Node.js 22.22.2（WorkBuddy 托管，**优先用绝对路径**） | `C:/Users/yueyu/.workbuddy/binaries/node/versions/22.22.2-6/node.exe` |
| Python 3.13（**只用于图片处理**，已装 Pillow） | `C:/Users/yueyu/.workbuddy/binaries/python/envs/default/Scripts/python.exe` |
| Hexo CLI | `./node_modules/.bin/hexo`（**不要全局安装**） |
| 临时工作目录 | `D:/Blogs/.workbuddy/tmp` |
| 项目记忆 | `D:/Blogs/.workbuddy/memory/`（`MEMORY.md` 长期 + 每日 `YYYY-MM-DD.md`） |

`npm` 脚本（`package.json`）：

| 命令 | 作用 |
| --- | --- |
| `npm run notes` | 只重新生成页面（首页 + `/notes/**`） |
| `npm run build` | `notes` + `hexo generate` |
| `npm run check` | 验收 `public/` 产物，40 项断言，失败时退出码 1 |
| `npm run server` | `notes` + 本地预览 `:4000` |
| `npm run clean` / `npm run deploy` | 慎用，见铁律 2 |

---

## 3. 仓库拓扑与发布

远程仓库承担两个角色，**分支用途不同，不要混淆**：

| 分支 | 内容 | 谁在推 |
| --- | --- | --- |
| `master` | Hexo **源码**（配置、笔记、脚本、主题引用） | 本地 `git push origin master` |
| `main` | 构建产物，**GitHub Pages 服务此分支** | CI（或 `hexo deploy`） |

- 推送 `master` **不会**直接影响线上；站点由 CI 更新
- `.github/workflows/deploy.yml`：`push master` 或手动触发 → `npm ci` →
  `npx hexo clean && npm run build` → `npm run check` → 把 `public/` 连同 `.nojekyll` 强推到 `main`
- **`npm run check` 是部署闸门**：那一步断言不过，工作流失败，`main` 不会被更新。
  改了站点结构而没同步 `tools/check.js` 的断言，CI 会直接拦下来
- 想只改线上、不动源码：不可能，也不要手工往 `main` 推东西
- 远端还留着历史分支 `chore/update-deps`（早期 Dependabot PR，停在 hexo 6.2.0→6.3.0，
  与现在的 `^7.3.0` 早已脱节），可择机删除 —— 删远端分支前先问用户

---

## 4. 改动落点地图

**想改什么就改哪里** —— 这张表能覆盖绝大多数需求。

| 需求 | 改哪里 |
| --- | --- |
| 首页内容（分区入口卡片 + 最新笔记） | `tools/lib/notes-core.js` → `renderHomeBlock()` |
| 笔记列表页 / 分区页 / 正文页的结构 | 同上 → `indexPage()` / `sectionPage()` / `notePage()` |
| 决定生成哪些路径、写什么文件 | `tools/notes.js`（CLI 入口） |
| 分区英文别名、首页分区排序 | `source/_notes/_sections.yml` |
| 每页顶部的个人介绍区块（内容） | `renderHero()` + `readProfile()`（数据取自两处配置，不新增文件） |
| 个人介绍区块的显示时机 / 样式 | `source/css/kb.css`（**宽屏隐藏，≤900px 显示**） |
| 哪些页面被注入个人介绍 | `scripts/hero.js` |
| 站内搜索索引里有什么 | `scripts/search.js` |
| 首页抬头横幅图 | 图放 `source/img/header.webp`；路径由 `homePage()` 写进 front-matter `top_img` |
| 其余页面抬头（透明 / 纯色 / 默认图） | `_config.butterfly.yml` → `default_top_img`（**要「无横幅」必须显式写 `false`**） |
| 导航菜单、头像、作者卡、侧栏卡片开关 | `_config.butterfly.yml` |
| 站点名 / 签名 / 作者名 / `url` | `_config.yml` |
| 新增一篇笔记 | 丢 `.md` 到 `source/_notes/<分区>/`，见第 5 节 |
| 关于页 / 友链页正文 | `source/about/index.md`、`source/links/index.md`（**手写**，不是生成物） |
| 旧文章 URL 跳转 | `source/2025/06/23/2025-06-23/index.html` + `_config.yml` 的 `skip_render` |

---

## 5. 内容模型：笔记

- **唯一真源**：`source/_notes/**/*.md`。下划线前缀让 Hexo 直接忽略该目录，
  由 `tools/notes.js` 扫描后生成页面
- **目录即分区**：一级目录 = 大分区，二级 = 子分区，可继续嵌套；文件名即 URL 片段
- **front-matter 只写**：`title` / `date` / `kind` / `tags` / `excerpt`（`source` 可选）。
  **没有 `category`** —— 分区由路径推导，写 `category` 没有意义
- `kind` 取值：`concept` 概念卡、`cheatsheet` 速查表、`problem` 题解、
  `pitfall` 踩坑记录、`review` 复盘、`note` 随笔（未知值回落为「随笔」）
- 新增分区：建同名文件夹即可；想让地址栏是英文，到 `_sections.yml` 的 `aliases` 加一行
- 生成的页面 front-matter **刻意不含 `type`**，靠主题对未知 type 回落默认页面布局

生成的页面清单：

| 路径 | 内容 |
| --- | --- |
| `/` | 分区入口 + 最新 6 条（`source/index.md`，由生成器产出） |
| `/notes/` | 全部笔记 + 分区筛选栏 |
| `/notes/<分区>/` | 该分区（含子分区）全部笔记 + 子分区入口 |
| `/notes/<分区>/…/<slug>/` | 笔记正文 |

为什么没有「文章」——见 [README 的对应章节](./README.md#内容模型为什么没有文章)。

---

## 6. 定制点逐个说明

### `tools/notes.js`（CLI）
扫描 `_notes`，写出 `source/index.md` 与 `source/notes/**`。是唯一的写入口，
`npm run notes` 即执行它。

### `tools/lib/notes-core.js`（共用内核，**不要重写**）
被 `tools/notes.js`、`scripts/hero.js`、`scripts/search.js`、`tools/check.js` 四处 require，
所以内核里**只放纯函数**，不要在这里写文件。

内核直接 `require('js-yaml')` 读配置 —— `js-yaml` 已在 `package.json` 的 `dependencies`
里**显式声明**（`^4.1.0`），不要再把它当成 hexo 的传递依赖；删掉它构建期就会崩。

关键导出：
- `collect()` → `{ base, profile, notes, tree, sections, topSections, order }`
  一次扫描拿到全部数据（`base` 是站点 root，`profile` 是个人介绍数据）
- `renderCard` / `renderList` / `renderChips` → HTML 片段
- `renderHero(data)` / `heroBlock()` → 个人介绍区块（后者自读配置，供过滤器用）
- `homePage` / `indexPage` / `sectionPage` / `notePage` → 各页 markdown 生成器
- `readProfile()` → 个人介绍的数据来源，**复用现有配置**：
  `_config.yml` 的 `author` / `description` + `_config.butterfly.yml` 的
  `avatar.img` / `aside.card_author`。**不要在别处再存一份身份信息。**

### `scripts/hero.js`（构建期注入）
`after_render:html` 过滤器，在**每个页面** `<div id="page">` 之后插入 `core.heroBlock()`。

- `#page` 是主题的内容卡片（`.layout > div:first-child:not(.nc)`，自带背景与 `padding: 50px 40px`），
  `.page-title` 与 `#article-container` 都在它内部 → 区块落在卡片内、且是**页面第一个元素**
- 幂等：页面上已有 `kb-hero` 就跳过
- 跳过非 HTML 路由（`search.xml` 交给 `scripts/search.js`）
- **为什么用注入而不是写进各页 markdown**：`/about/`、`/links/` 是手写页面，
  注入后自动获得；将来新增页面也自动带上；个人介绍文字只存在配置里一份

### `scripts/search.js`（构建期清理）
`after_generate` 里读 `route.get('search.xml')` → 剔除分区列表页与非 HTML 资源 → `route.set` 写回。
不清的话，搜一个词会被同一篇笔记的分区页重复命中。**改站点页面结构时要同步它的排除规则。**

### `source/css/kb.css`
站点全部自定义样式，经 `_config.butterfly.yml` 的 `inject.head` 引入。
只用半透明灰 + 主题 CSS 变量，兼容暗色模式。四条关键规则：

| 规则 | 作用 |
| --- | --- |
| `.kb-hero { display: none }` | 宽屏隐藏正文顶部区块，个人介绍由侧栏作者卡承担 |
| `@media (max-width: 900px) { .kb-hero { display: flex } }` | 窄屏顶上去 |
| 同断点内 `body:has(.kb-hero) .card-info { display: none }` | 避免头像出现两次 |
| `#sidebar-menus .site-data, .card-info .site-data { display: none }` | 隐藏主题里硬编码的「文章/标签/分类」计数 |

**900px 是主题自己的断点**（`minWidth900` / `maxWidth900`），与侧栏下沉的时机同步，
**不要改成 768px**。

### `_config.butterfly.yml` 里几个必须知道的点
- `default_top_img: false` —— 没写 `top_img` 的页面抬头为**透明的 not-top-img**
  （高度降到 60px 只剩导航条，标题移进正文以 `.page-title` 呈现）。
  **留空（null）是错的**：`top_img` 会等于 `undefined`，漏过主题的 `top_img !== false` 判断，
  页面会变成 400px 纯色块
- `index_img` 是**死配置**（首页是 page 类型，主题只在 `globalPageType === 'home'` 时读它），
  已注释掉并在原地写明原因，不要重新启用
- 侧栏卡片：`card_author` / `card_announcement` / `card_webinfo` 开启，
  其余（recent_post / categories / tags / archives …）因数据源是文章而关闭
- 导航：`主页 / 笔记 / 友链 / 关于笔者`

---

## 7. 网络与代理（本机特有，容易白花时间）

- **推送必须走代理**：`github.com:443` 直连不稳定，而 git **不读 Windows 系统代理**。
  已写入全局配置（仅对 github.com 生效）：
  ```bash
  git config --global http.https://github.com/.proxy http://127.0.0.1:7892
  ```
  VPN 关闭时该域名会连不上，需临时取消：`git config --global --unset http.https://github.com/.proxy`
- **认证走 HTTPS**：`~/.ssh` 下没有私钥，SSH 推送一律 `Permission denied (publickey)`。
  不要改回 SSH 地址
- **已知噪音**：推送后会打印 `git-credential-manager.exe: No such file or directory`
  （`.gitconfig` 里 credential.helper 第二项路径写错，指向 PortableGit 1.2.0）。
  **不影响结果**，推送是成功的
- **Agent shell 的沙箱代理是个坑**：环境里会被注入
  `https_proxy=http://127.0.0.1:52195`，它对 `github.com` 返回 502。
  - 访问公网 → 显式指定用户的 VPN 代理：`curl -x http://127.0.0.1:7892 https://...`
  - 访问本地端口 → 反而要 `curl --noproxy '*' http://127.0.0.1:4000/...`
  - Python 里用显式 `ProxyHandler`（会覆盖 env 里的代理）：
    ```python
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({'https': 'http://127.0.0.1:7892'}))
    ```
- 代理端口可能随 VPN 客户端变动，重新探测：
  ```bash
  netstat -ano | grep LISTENING | grep 127.0.0.1
  # 逐个 curl -x http://127.0.0.1:端口 https://github.com 验证
  ```

---

## 8. 验收：改完必须跑这个

```bash
npm run build && npm run check
```

`tools/check.js` 检查的是 **`public/` 里的实际产物**（不是源码），共 40 项断言：

- 每个主题渲染页面的 `#page` 首块都是 `.kb-hero`，且只有 1 份
- 页面清单与 `notes-core.collect()` 的扫描结果一致（无漏生成 / 多生成）
- `/archives/` `/categories/` `/tags/` 不存在
- `search.xml` 含全部笔记正文、**不含**分区列表页，条目数 = 笔记数 + 2
- `kb.css` 的五条关键规则在位
- 首页抬头铺 `header.webp`（`not-home-page`），其余页面抬头为 `not-top-img`
- `source/img/header.webp` 体积 < 60 KB

**改动站点结构时请同步更新 `tools/check.js` 的断言** —— 它就是这个站点的契约。
（已验证：故意删掉某页的 hero，脚本会 FAIL 并以退出码 1 结束。）

**它同时是 CI 的部署闸门**：`deploy.yml` 里有一个 `Verify build artifacts` 步骤跑
`npm run check`，位置在 `npx hexo clean && npm run build` 之后、强推 `main` 之前 ——
断言不过则工作流失败，线上保持原样。

注意两者的差别：CI 是 `hexo clean` 后的**全量**构建，而上面这条本地命令不 clean，
`public/` 里上一轮的产物可能掩盖「某页不再生成」这类问题。怀疑生成器有问题时，
先 `npm run clean` 再 `npm run build && npm run check`。

推送后再验一遍线上：

```bash
for u in / /notes/ /about/ /links/ /css/kb.css /search.xml; do
  printf "%-16s %s\n" "$u" \
    "$(curl -s --noproxy '*' -x http://127.0.0.1:7892 -o /dev/null -w '%{http_code}' https://yueyuanyutong.github.io$u)"
done
# 期望：全 200；/archives/ /categories/ /tags/ 应为 404
```

---

## 9. 排障手册

| 症状 | 原因 | 处置 |
| --- | --- | --- |
| **线上全站 404** | 仓库被设为私有 → Pages 被自动禁用 | 用带凭据的 API 改回公开并重建 Pages：`PATCH /repos/{o}/{r}` `{"private":false}` → `POST /repos/{o}/{r}/pages` `{"build_type":"legacy","source":{"branch":"main","path":"/"}}`。先判断是「构建问题」还是「托管问题」：`GET /users/<user>/repos`（匿名）看仓库是否私有 |
| **本地预览是改动前的内容** | 上一轮的 `hexo server` 还占着 4000，新实例 `EADDRINUSE` **静默失败**，旧进程继续 200 响应旧内容 | `netstat -ano \| grep :4000` 找 PID → `Stop-Process -Id <pid> -Force` → 重启 |
| 窄屏某页看不到个人介绍 | 主题升级后 `#page` 标记变了，`scripts/hero.js` 静默跳过 | 检查 `public/` 里该页是否含 `kb-hero`；确认 `PAGE` 正则 |
| 搜索里同一篇笔记重复命中 | `scripts/search.js` 失效或排除规则过时 | `npm run check` 会报「search.xml 不含分区列表页」失败 |
| 页面抬头变成 400px 纯色块 | `default_top_img` 被留空（`undefined` 漏过 `!== false` 判断） | 显式写 `false` |
| 首页抬头变回默认蓝色 | 生成物 `source/index.md` 被手改，或 `homePage()` 没写 `top_img` | 重新 `npm run notes`，检查 front-matter |
| push 报 `CONNECT tunnel failed` / `Empty reply` | git 代理没生效或 VPN 关了 | 检查并设置 `http.https://github.com/.proxy`；确认 `7892` 在监听 |
| 侧栏冒出「文章 0 / 标签 0 / 分类 0」 | `kb.css` 里 `.site-data` 的隐藏规则被覆盖或主题类名变了 | 检查 `kb.css` 末尾与环境配置；`npm run check` 会报该项失败 |
| 移动端个人介绍出现两次 | 浏览器不支持 `:has()`，或断点被改 | 确认断点仍是 900px；`body:has(.kb-hero) .card-info` 规则在位 |

---

## 10. 当前状态快照（2026-10-16 晚）

- 远端：`master = 5e6f8e4`（源码）、`main = 8dc4c1b`（站点），CI 两次运行均 success
- 页面共 **13 个 HTML**：12 个由主题渲染（首页 / `/notes/` / 4 个分区页 /
  4 篇笔记正文 / `/about/` / `/links/`，全部已注入个人介绍区块），
  外加 1 个 `skip_render` 的旧地址跳转页（纯 meta refresh，无主题布局）
- 内容：4 条笔记，分区树实际只有 `计算机` 一支（下设 `工具` / `网络` / `算法`）；
  顶层的 `考研` / `考公` / `阅读` 只是空骨架（各有一个 `.gitkeep`）——
  **空目录不会生成分区页**（分区节点是扫描笔记时顺带建出来的）
- 图片：`source/img/` 下 `avatar.jpg` 35 KB、`background.webp` 125 KB、
  `background2.webp` 129 KB、`header.webp` 33 KB；`public/` 总量约 1.3 MB
- 搜索：`local_search`，`search.field: all`，`search.xml` **6 条**
- 统计：仅不蒜子（busuanzi）
- **未配置**：评论系统、社交链接、数学公式

## 11. 待办

- `source/about/index.md`、`source/links/index.md` 仍是通用模板文案，待用户提供实际内容
  （关于页现在从每页顶部的「关于笔者」胶囊可直达，比较显眼）
- 主题固定在上游 `ca03058`（beta `5.4.0-b1`），上游稳定版 5.7.0，可择机升级；
  升级后需重新确认 `#page`、`.site-data` 等被依赖的类名是否还在，并重跑 `npm run check`
- 旧文章 URL 跳转页 `source/2025/**` 与 `_config.yml` 的 `skip_render`：
  确认无人访问后可一并删除
- 窄屏下侧栏剩余的「公告」「网站信息」两张卡仍排在正文之后（主题固有行为，未改）

---

## 12. 与用户协作的约定

- 用户是**中文交流**，偏好结构化输出（表格、分点、明确的下一步）
- 回答习惯三段式：**先给结论 → 再讲原因 → 最后给关键提醒**
- 沟通简短指令式（「提交吧」「push吧」），期待代理自主推进，但
  **外部动作（push / 改仓库可见性 / 删文件）前必须先确认**
- 改完先给可点的本地预览地址，等他确认；他常会再用手机看一遍线上
- 涉及版本覆盖风险时，他的原则是「以最新的为准」
