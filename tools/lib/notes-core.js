'use strict';

/**
 * 「笔记」核心逻辑（共用内核）
 *
 * 唯一真源：source/_notes/**\/*.md
 *   - 目录结构即分区（一级目录 = 大分区，二级目录 = 子分区，可继续嵌套）
 *   - 文件名即 URL 片段（保持英文），分区名另由 _sections.yml 映射成英文片段
 *   - front-matter 只写 title / date / kind / tags / excerpt / source
 *
 * 被三处共用：
 *   - tools/notes.js   构建前执行，生成 /notes/ 下的页面与首页源文件
 *   - scripts/hero.js  Hexo 构建期执行，给每个页面注入「个人介绍」区块
 *   - scripts/search.js Hexo 构建期执行，清理 search.xml 里的列表页噪音
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'source', '_notes');
const CONFIG_FILE = path.join(SRC, '_sections.yml');
const SITE_CONFIG = path.join(ROOT, '_config.yml');
const THEME_CONFIG = path.join(ROOT, '_config.butterfly.yml');

const KIND_LABEL = {
  concept: '概念卡',
  cheatsheet: '速查表',
  problem: '题解',
  pitfall: '踩坑记录',
  review: '复盘',
  note: '随笔'
};

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function fmtDate(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function kindLabel(kind) {
  return KIND_LABEL[kind] || KIND_LABEL.note;
}

function splitFrontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(text);
  if (!m) return [{}, text];
  let data = {};
  try {
    data = yaml.load(m[1]) || {};
  } catch (err) {
    console.warn('[notes] front-matter 解析失败：' + err.message);
  }
  return [data, text.slice(m[0].length)];
}

function readBase() {
  try {
    const cfg = yaml.load(fs.readFileSync(SITE_CONFIG, 'utf8')) || {};
    return String(cfg.root || '/').replace(/\/+$/, '');
  } catch (err) {
    return '';
  }
}

/**
 * 首页「个人介绍」区块的数据。
 *
 * 不新增配置文件 —— 直接复用已有的两处身份配置，避免同一份信息写两遍：
 *   _config.yml           → author（名字）、description（签名）
 *   _config.butterfly.yml → avatar.img（头像）、card_author（一句话简介 + 按钮链接）
 */
function readProfile() {
  const prof = { name: 'YueYuan', tagline: '', motto: '', avatar: '', link: '' };

  try {
    const cfg = yaml.load(fs.readFileSync(SITE_CONFIG, 'utf8')) || {};
    if (cfg.author) prof.name = String(cfg.author);
    if (cfg.description) prof.motto = String(cfg.description);
  } catch (err) {
    console.warn('[notes] _config.yml 读取个人介绍失败：' + err.message);
  }

  try {
    const th = yaml.load(fs.readFileSync(THEME_CONFIG, 'utf8')) || {};
    const avatar = th.avatar;
    if (avatar && typeof avatar === 'object' && avatar.img) prof.avatar = String(avatar.img);
    const card = th.aside && th.aside.card_author;
    if (card) {
      if (card.description) prof.tagline = String(card.description);
      const btn = card.button;
      if (btn && btn.enable && btn.link) prof.link = String(btn.link);
    }
  } catch (err) {
    console.warn('[notes] _config.butterfly.yml 读取个人介绍失败：' + err.message);
  }

  return prof;
}

function readConfig() {
  const empty = { aliases: {}, order: [] };
  if (!fs.existsSync(CONFIG_FILE)) return empty;
  let raw;
  try {
    raw = yaml.load(fs.readFileSync(CONFIG_FILE, 'utf8')) || {};
  } catch (err) {
    console.warn('[notes] _sections.yml 解析失败：' + err.message);
    return empty;
  }
  const aliases = {};
  for (const [k, v] of Object.entries(raw.aliases || {})) {
    if (typeof v === 'string' && v.trim()) aliases[String(k)] = v.trim();
  }
  const order = Array.isArray(raw.home) ? raw.home.map(String) : [];
  return { aliases, order };
}

function walk(dir, segs, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return out;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
  for (const ent of entries) {
    const name = ent.name;
    if (name.startsWith('.') || name.startsWith('_')) continue;
    const full = path.join(dir, name);
    if (ent.isDirectory()) {
      walk(full, segs.concat(name), out);
    } else if (/\.md$/i.test(name)) {
      out.push({ full, segs, slug: name.replace(/\.md$/i, '') });
    }
  }
  return out;
}

function makeNode(name, slug, segs) {
  return {
    name,
    slug,
    segs,
    children: new Map(),
    own: [],
    notes: [],
    count: 0,
    url: '/notes/' + segs.join('/') + '/'
  };
}

function buildTree(notes) {
  const root = makeNode('', '', []);
  for (const note of notes) {
    let node = root;
    const chain = [];
    for (const seg of note.segs) {
      chain.push(seg.slug);
      if (!node.children.has(seg.name)) {
        node.children.set(seg.name, makeNode(seg.name, seg.slug, chain.slice()));
      }
      node = node.children.get(seg.name);
    }
    node.own.push(note);
  }
  (function roll(node) {
    node.notes = node.own.slice();
    for (const child of node.children.values()) node.notes = node.notes.concat(roll(child));
    node.notes.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    node.count = node.notes.length;
    return node.notes;
  })(root);
  return root;
}

function flattenSections(root) {
  const out = [];
  (function go(node) {
    for (const child of node.children.values()) {
      out.push(child);
      go(child);
    }
  })(root);
  return out;
}

function collect() {
  const cfg = readConfig();
  const slugOf = (name) => cfg.aliases[name] || name;

  const notes = [];
  for (const file of walk(SRC, [], [])) {
    const [data, body] = splitFrontMatter(fs.readFileSync(file.full, 'utf8'));
    if (!data.title) {
      console.warn('[notes] 跳过（缺少 title）：' + path.relative(SRC, file.full));
      continue;
    }
    const segs = file.segs.map((name) => ({ name, slug: slugOf(name) }));
    const parts = segs.map((s) => s.slug).concat(file.slug);
    notes.push({
      slug: file.slug,
      title: String(data.title),
      date: data.date,
      kind: String(data.kind || 'note'),
      tags: Array.isArray(data.tags)
        ? data.tags.map(String)
        : (data.tags ? [String(data.tags)] : []),
      excerpt: data.excerpt ? String(data.excerpt) : '',
      source: data.source ? String(data.source) : '',
      body: body.trim(),
      segs,
      sectionPath: segs.map((s) => s.name).join(' / '),
      url: '/notes/' + parts.join('/') + '/'
    });
  }
  notes.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const tree = buildTree(notes);

  const found = [...tree.children.values()];
  const rank = (name) => {
    const i = cfg.order.indexOf(name);
    return i === -1 ? cfg.order.length : i;
  };
  found.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name, 'zh'));

  return {
    base: readBase(),
    profile: readProfile(),
    notes,
    tree,
    sections: flattenSections(tree),
    topSections: found,
    order: cfg.order
  };
}

function href(base, url) {
  return esc(encodeURI(base + url));
}

function renderCard(note, base) {
  const excerpts = note.excerpt
    ? '<div class="kb-excerpt">' + esc(note.excerpt) + '</div>'
    : '';
  const metaBits = [];
  if (note.sectionPath) metaBits.push('<span class="kb-crumb">' + esc(note.sectionPath) + '</span>');
  for (const tag of note.tags) metaBits.push('<span class="kb-tag">#' + esc(tag) + '</span>');
  const meta = metaBits.length
    ? '<div class="kb-meta-line">' + metaBits.join('') + '</div>'
    : '';

  return [
    '<a class="kb-item" href="' + href(base, note.url) + '">',
    '<div class="kb-item-top"><span class="kb-badge">' + esc(kindLabel(note.kind)) + '</span>'
      + '<span class="kb-date">' + esc(fmtDate(note.date)) + '</span></div>',
    '<div class="kb-title">' + esc(note.title) + '</div>',
    excerpts,
    meta,
    '</a>'
  ].filter(Boolean).join('\n');
}

function renderList(notes, base) {
  return '<div class="kb-list">\n'
    + notes.map((n) => renderCard(n, base)).join('\n')
    + '\n</div>';
}

function renderChips(data, currentUrl) {
  const chip = (label, url, active) =>
    '<a class="kb-chip' + (active ? ' kb-chip-on' : '') + '" href="' + href(data.base, url) + '">'
    + esc(label) + '</a>';

  const items = [chip('全部 ' + data.notes.length, '/notes/', currentUrl === '/notes/')];
  for (const sec of data.topSections) {
    if (!sec.count) continue;
    items.push(chip(sec.name + ' ' + sec.count, sec.url, currentUrl === sec.url));
  }
  return '<div class="kb-chips">' + items.join('') + '</div>';
}

/**
 * 页面的「个人介绍」区块。
 *
 * 每个页面都有（由 scripts/hero.js 注入到 #page 顶部），但只在窄屏显示：
 * 宽屏时个人介绍由侧边栏的作者卡承担；窄屏（CSS 里 ≤900px）主题会把整列侧栏
 * 挪到正文之后，作者卡会沉到页面中段，这时才由这个区块出头顶到正文最前面
 * （同时隐藏侧栏里重复的作者卡）。
 * 数据全部来自现有配置（见 readProfile），改名字/签名/头像只需改配置文件。
 */
function renderHero(data) {
  const prof = data.profile;
  if (!prof) return '';

  const avatar = prof.avatar
    ? '<img class="kb-hero-avatar" src="' + esc(prof.avatar) + '" alt="' + esc(prof.name) + '">'
    : '';

  const links = [];
  if (prof.link) {
    links.push('<a class="kb-hero-link" href="' + esc(prof.link) + '" target="_blank" rel="noopener">'
      + '<i class="fab fa-github"></i> GitHub</a>');
  }
  links.push('<a class="kb-hero-link" href="' + href(data.base, '/about/') + '">关于笔者</a>');

  return [
    '<div class="kb-hero">',
    avatar,
    '<div class="kb-hero-body">',
    '<div class="kb-hero-name">' + esc(prof.name) + '</div>',
    prof.tagline ? '<div class="kb-hero-tagline">' + esc(prof.tagline) + '</div>' : '',
    prof.motto ? '<div class="kb-hero-motto">' + esc(prof.motto) + '</div>' : '',
    '<div class="kb-hero-links">' + links.join('') + '</div>',
    '</div>',
    '</div>'
  ].filter(Boolean).join('\n');
}

function renderHomeBlock(data) {
  if (!data.notes.length) {
    return '<div class="kb-home"><div class="kb-heading">知识库</div>'
      + '<div class="kb-intro">还没有笔记。在 <code>source/_notes/</code> 下建个文件夹、放一个 .md 文件，'
      + '构建时会自动出现在这里。</div></div>';
  }

  const cards = data.topSections.filter((sec) => sec.count).map((sec) =>
    '<a class="kb-section-card" href="' + href(data.base, sec.url) + '">'
    + '<span class="kb-section-name">' + esc(sec.name) + '</span>'
    + '<span class="kb-section-count">' + sec.count + '</span>'
    + '</a>'
  ).join('');

  const recent = data.notes.slice(0, 6);

  return [
    '<div class="kb-home">',
    '<div class="kb-heading">分区</div>',
    '<div class="kb-sections">' + cards + '</div>',
    '<div class="kb-heading-row">',
    '<span class="kb-heading">最新笔记</span>',
    '<a class="kb-more" href="' + href(data.base, '/notes/') + '">全部 ' + data.notes.length + ' 条</a>',
    '</div>',
    renderList(recent, data.base),
    '</div>'
  ].join('\n');
}

/**
 * 供构建期过滤器（scripts/hero.js）调用：读配置 + 渲染个人介绍区块。
 * 每个页面的 #page 顶部都会被注入这一块。
 */
function heroBlock() {
  return renderHero({ profile: readProfile(), base: readBase() });
}

/**
 * 站点首页的源文件内容。
 *
 * 文章体系退役后 _posts 为空，hexo-generator-index 便不再产出 index.html
 * （hexo-pagination 在 perPage 与 length 均为 0 时循环体一次都不执行），
 * 首页由这里直接接管。
 *
 * 个人介绍区块不写在这里 —— scripts/hero.js 会把它注入到每个页面，
 * 首页只是其中之一，避免同一份 HTML 出现两次。
 * top_img 是主题的逐页配置：只有首页的「知识库」抬头铺图，其余页面保持原样。
 * 若想让 /notes/、/about/ 等所有页面都用同一张图，把 _config.butterfly.yml 的
 * default_top_img 指向 HEADER_IMG 即可，这里的 front-matter 就可以删掉。
 */
const HEADER_IMG = '/img/header.webp';

function homePage(data) {
  return [
    '---',
    'title: 知识库',
    'top_img: ' + HEADER_IMG,
    '---',
    '',
    renderHomeBlock(data),
    ''
  ].join('\n');
}

// 正文里是否出现数学公式：用于决定这一页要不要在 front-matter 打开 mathjax。
// 匹配 $...$（行内）与 $$...$$（块级），不跨行匹配 $，避免把"$100"这类文本当成公式。
const MATH_RE = /\$\$[\s\S]*?\$\$|\$[^$\n]{2,}\$/;

function hasMath(text) {
  return MATH_RE.test(String(text || ''));
}

function notePage(note) {
  const meta = [kindLabel(note.kind), note.sectionPath, fmtDate(note.date)]
    .filter(Boolean).join(' · ');
  const source = note.source ? '\n\n> 出处：' + note.source : '';
  return [
    '---',
    'title: ' + JSON.stringify(note.title),
    'date: ' + (fmtDate(note.date) || '1970-01-01') + ' 00:00:00',
    // 只有含公式的笔记才加载 MathJax（主题 math.per_page 为 false 时靠这个开关）
    ...(hasMath(note.body) ? ['mathjax: true'] : []),
    '---',
    '',
    '<div class="kb-note-meta">' + esc(meta) + '</div>',
    '',
    note.body + source,
    ''
  ].join('\n');
}

function sectionPage(data, section) {
  const parentUrl = section.segs.length > 1
    ? '/notes/' + section.segs.slice(0, -1).join('/') + '/'
    : '/notes/';
  const header = [
    '<div class="kb-path"><a href="' + href(data.base, parentUrl) + '">返回</a>'
      + '<span class="kb-path-sep">/</span>'
      + esc(section.name)
      + '<span class="kb-path-count">' + section.count + ' 条</span></div>'
  ];

  const children = [...section.children.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh'));
  const subChips = children.length
    ? '<div class="kb-chips">' + children.map((c) =>
        '<a class="kb-chip" href="' + href(data.base, c.url) + '">'
        + esc(c.name) + ' ' + c.count + '</a>').join('') + '</div>'
    : '';

  const body = section.notes.length
    ? renderList(section.notes, data.base)
    : '<div class="kb-intro">这个分区还没有笔记。</div>';

  const parts = ['---', 'title: ' + JSON.stringify(section.name), '---', '', header.join('')];
  if (subChips) parts.push('', subChips);
  parts.push('', body, '');
  return parts.join('\n');
}

function indexPage(data) {
  const intro = data.notes.length
    ? '从对话里沉淀下来的东西。按时间倒序，最新的在上面。'
    : '还没有笔记。在 <code>source/_notes/</code> 下建个文件夹、放一个 .md 文件，构建时会自动出现在这里。';

  const parts = ['---', 'title: 笔记', '---', '', '<div class="kb-intro">' + intro + '</div>'];
  if (data.notes.length) {
    parts.push('', renderChips(data, '/notes/'));
    parts.push('', renderList(data.notes, data.base));
  }
  parts.push('');
  return parts.join('\n');
}

module.exports = {
  ROOT,
  SRC,
  CONFIG_FILE,
  SITE_CONFIG,
  THEME_CONFIG,
  KIND_LABEL,
  collect,
  esc,
  fmtDate,
  kindLabel,
  renderCard,
  renderList,
  renderChips,
  renderHero,
  heroBlock,
  renderHomeBlock,
  homePage,
  notePage,
  sectionPage,
  indexPage
};
