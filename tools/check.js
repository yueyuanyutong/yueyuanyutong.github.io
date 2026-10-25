'use strict';

/**
 * 构建产物验收（`npm run check`）
 *
 * 用途：任何改动之后、推送之前跑一遍，用机器判定「有没有改坏」。
 * 它检查的是 public/ 里的**实际产物**，不是源码 —— 源码看着对、产物不对的情况
 * 在本仓库真实发生过（见维护者本地的代理手册 AGENTS.md，该文件不入库）。
 *
 * 全部断言都来自「这个站点的约定」，改动站点结构时请同步改这里：
 *   1. 每个主题渲染的页面，正文卡片 #page 的第一个元素都是个人介绍区块 .kb-hero
 *   2. 页面清单与 tools/lib/notes-core.js 的扫描结果一致（没有漏生成 / 多生成）
 *   3. 文章体系已退役：/archives/ /categories/ /tags/ 不得存在
 *   4. search.xml 只含笔记正文页与手写页面，不含分区列表页
 *   5. kb.css 的四条关键规则在位
 *   6. 首页抬头铺横幅图，其余页面抬头为透明的 not-top-img
 *
 * 用法：
 *   node tools/check.js            # 检查本地 public/
 *   node tools/check.js --quiet    # 只输出失败项与结论
 */

const fs = require('fs');
const path = require('path');
const core = require('./lib/notes-core');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const QUIET = process.argv.includes('--quiet');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: detail || '' });
  if (!ok || !QUIET) {
    console.log((ok ? '  ok   ' : '  FAIL ') + name + (detail ? '  — ' + detail : ''));
  }
}

function read(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    return null;
  }
}

function routePath(url) {
  const clean = String(url).replace(/^\/+/, '').replace(/\/+$/, '');
  return (clean ? clean + '/' : '') + 'index.html';
}

function walkHtml(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkHtml(full, out);
    else if (/\.html$/i.test(ent.name)) out.push(full);
  }
  return out;
}

function main() {
  if (!fs.existsSync(PUBLIC)) {
    console.error('public/ 不存在 —— 先跑 `npm run build`');
    process.exit(2);
  }

  const data = core.collect();
  const pages = walkHtml(PUBLIC, []).map((p) => path.relative(PUBLIC, p).split(path.sep).join('/'));

  /* ---------- 1. 个人介绍区块注入 ---------- */
  const themed = [];
  const skipped = [];
  for (const rel of pages) {
    const html = read(path.join(PUBLIC, rel));
    const m = /<div id="page"[^>]*>/.exec(html);
    if (!m) {
      skipped.push(rel);
      continue;
    }
    themed.push(rel);
    const count = (html.match(/class="kb-hero"/g) || []).length;
    const first = html.slice(m.index + m[0].length, m.index + m[0].length + 40);
    check('个人介绍区块：' + rel, count === 1 && first.startsWith('<div class="kb-hero"'),
      'hero=' + count + (first.startsWith('<div class="kb-hero"') ? '' : '，且不是 #page 的第一个元素'));
  }
  check('跳过的页面都是静态跳转页（skip_render）',
    skipped.every((rel) => /http-equiv=["']?refresh/i.test(read(path.join(PUBLIC, rel)) || '')),
    skipped.length ? skipped.join(', ') : '（无）');

  /* ---------- 2. 页面清单与扫描结果一致 ---------- */
  const mustHave = ['index.html', 'about/index.html', 'links/index.html', 'notes/index.html']
    .concat(data.sections.map((s) => routePath(s.url)))
    .concat(data.notes.map((n) => routePath(n.url)));
  const missingPages = mustHave.filter((p) => !pages.includes(p));
  check('应有的页面全部生成（首页/关于/友链/笔记总览/分区/正文）',
    missingPages.length === 0,
    missingPages.length ? '缺失 ' + missingPages.join(', ') : mustHave.length + ' 个页面');

  check('笔记数据非空', data.notes.length > 0,
    data.notes.length + ' 条笔记，' + data.sections.length + ' 个分区');

  /* ---------- 3. 文章体系已退役 ---------- */
  for (const dir of ['archives', 'categories', 'tags']) {
    check('退役路径不应存在：/' + dir + '/', !pages.some((p) => p.startsWith(dir + '/')));
  }

  /* ---------- 4. search.xml 只含正文页 ---------- */
  const sx = read(path.join(PUBLIC, 'search.xml'));
  if (!sx) {
    check('search.xml 存在', false);
  } else {
    // search.xml 里的 url 带前导斜杠，统一去掉再比
    const norm = (u) => String(u).replace(/^\/+/, '');
    const urls = (sx.match(/<url>([^<]*)<\/url>/g) || []).map((s) => norm(s.replace(/<\/?url>/g, '')));
    const expected = data.notes.map((n) => routePath(n.url));
    const listPages = ['notes/index.html'].concat(
      data.sections.map((s) => routePath(s.url)));

    const missing = expected.filter((u) => !urls.includes(u));
    const noise = urls.filter((u) => listPages.includes(u));
    check('search.xml 含全部笔记正文', missing.length === 0, missing.join(', '));
    check('search.xml 不含分区列表页', noise.length === 0, noise.join(', '));
    check('search.xml 条目数', urls.length === expected.length + 2,
      urls.length + ' 条（预期 ' + (expected.length + 2) + ' = ' + expected.length + ' 篇笔记 + /about/ + /links/）');
  }

  /* ---------- 5. kb.css 关键规则 ---------- */
  const css = read(path.join(PUBLIC, 'css', 'kb.css'));
  if (!css) {
    check('kb.css 存在', false);
  } else {
    check('kb.css：宽屏隐藏 .kb-hero', /\.kb-hero\s*\{\s*display:\s*none/.test(css));
    check('kb.css：≤900px 显示 .kb-hero',
      /max-width:\s*900px\)\s*\{[\s\S]{0,160}\.kb-hero\s*\{\s*display:\s*flex/.test(css));
    check('kb.css：≤900px 隐藏重复作者卡',
      /max-width:\s*900px\)\s*\{[\s\S]{0,400}body:has\(\.kb-hero\)\s*\.card-info\s*\{\s*display:\s*none/.test(css));
    check('kb.css：首页抬头文字阴影', css.includes('#page-header #page-site-info h1'));
    check('kb.css：隐藏主题硬编码计数', css.includes('.card-info .site-data'));
  }

  /* ---------- 6. 抬头状态 ---------- */
  const home = read(path.join(PUBLIC, 'index.html')) || '';
  const hm = /<header[^>]*id="page-header"[^>]*>/.exec(home);
  check('首页抬头铺横幅图（top_img 生效）',
    !!hm && hm[0].includes('background-image: url(/img/header.webp)'),
    hm ? hm[0].slice(0, 120) : '找不到 #page-header');
  check('首页抬头为 not-home-page',
    !!hm && /\bnot-home-page\b/.test(hm[0]));

  for (const rel of themed) {
    if (rel === 'index.html') continue;
    const html = read(path.join(PUBLIC, rel)) || '';
    const m = /<header[^>]*id="page-header"[^>]*>/.exec(html);
    check('其余页面抬头透明：' + rel, !!m && /\bnot-top-img\b/.test(m[0]) && !m[0].includes('background-image'));
  }

  /* ---------- 7. 资源体积 ---------- */
  const headerPath = path.join(ROOT, 'source', 'img', 'header.webp');
  if (!fs.existsSync(headerPath)) {
    check('source/img/header.webp 存在', false);
  } else {
    const kb = fs.statSync(headerPath).size / 1024;
    check('header.webp 体积合理（<60 KB）', kb < 60, kb.toFixed(1) + ' KB');
  }

  /* ---------- 8. 数学公式：按页按需加载 MathJax ---------- */
  const MATH_RE = /\$\$[\s\S]*?\$\$|\$[^$\n]{2,}\$/;
  const mathNotes = data.notes.filter((n) => MATH_RE.test(String(n.body || '')));
  const mathLoaded = mathNotes.filter((n) =>
    (read(path.join(PUBLIC, routePath(n.url))) || '').includes('window.MathJax'));
  check('含公式的笔记注入了 MathJax', mathNotes.length > 0 && mathLoaded.length === mathNotes.length,
    mathLoaded.length + '/' + mathNotes.length + ' 篇');

  const mathFree = ['notes/index.html', 'about/index.html', 'links/index.html']
    .filter((rel) => (read(path.join(PUBLIC, rel)) || '').includes('MathJax'));
  check('不含公式的页面不加载 MathJax', mathFree.length === 0, mathFree.join(', ') || '（无）');

  // 取一篇真正含 \frac 的笔记做探针：只抓「第一篇含公式的笔记」会随新增笔记而误判
  const mathProbe = mathNotes.find((n) => String(n.body || '').includes('\\frac')) || mathNotes[0];
  const mathProbeHtml = mathProbe
    ? (read(path.join(PUBLIC, routePath(mathProbe.url))) || '')
    : '';
  const mathProbeBody = String((mathProbe && mathProbe.body) || '');
  check('公式分隔符与 LaTeX 命令未被 markdown 吃掉',
    mathProbeHtml.includes('$')
      && (!mathProbeBody.includes('\\frac') || mathProbeHtml.includes('\\frac')),
    mathProbe ? mathProbe.title : '没有含公式的笔记');

  // 自托管 MathJax：国内浏览器打不开 jsdelivr，公式会退化成 $...$ 原文
  const localMathjax = path.join(PUBLIC, 'js', 'mathjax', 'tex-svg.js');
  const mathjaxBytes = fs.existsSync(localMathjax) ? fs.statSync(localMathjax).size : 0;
  check('MathJax 已自托管且文件完整（>1.5 MB）', mathjaxBytes > 1.5 * 1024 * 1024,
    mathjaxBytes ? (mathjaxBytes / 1048576).toFixed(2) + ' MB' : '缺失 public/js/mathjax/tex-svg.js');
  check('公式页引用本地 MathJax，不依赖 CDN',
    mathProbeHtml.includes('/js/mathjax/tex-svg.js')
      && !mathProbeHtml.includes('cdn.jsdelivr.net/npm/mathjax'),
    mathProbeHtml.includes('/js/mathjax/tex-svg.js') ? '同源路径' : '仍指向 CDN');

  /* ---------- 汇总 ---------- */
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + '─'.repeat(56));
  console.log('共 ' + results.length + ' 项，失败 ' + failed.length + ' 项');
  if (failed.length) {
    for (const f of failed) console.log('  ✗ ' + f.name + (f.detail ? '  — ' + f.detail : ''));
    process.exit(1);
  }
  console.log('全部通过 —— 构建产物符合站点约定');
}

main();
