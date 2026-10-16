'use strict';

/**
 * 「笔记」核心逻辑（共用内核）
 *
 * 唯一真源：source/_notes/**\/*.md
 *   - 目录结构即分区（一级目录 = 大分区，二级目录 = 子分区，可继续嵌套）
 *   - 文件名即 URL 片段（保持英文），分区名另由 _sections.yml 映射成英文片段
 *   - front-matter 只写 title / date / kind / tags / excerpt / source
 *
 * 被两处共用：
 *   - tools/notes.js   构建前执行，生成 /notes/ 下的页面
 *   - scripts/home.js  Hexo 构建期执行，把首页改成知识库入口
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'source', '_notes');
const CONFIG_FILE = path.join(SRC, '_sections.yml');

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
    const cfg = yaml.load(fs.readFileSync(path.join(ROOT, '_config.yml'), 'utf8')) || {};
    return String(cfg.root || '/').replace(/\/+$/, '');
  } catch (err) {
    return '';
  }
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
 * 站点首页的源文件内容。
 *
 * 文章体系退役后 _posts 为空，hexo-generator-index 便不再产出 index.html
 * （hexo-pagination 在 perPage 与 length 均为 0 时循环体一次都不执行），
 * 首页由这里直接接管。
 */
function homePage(data) {
  return ['---', 'title: 知识库', '---', '', renderHomeBlock(data), ''].join('\n');
}

function notePage(note) {
  const meta = [kindLabel(note.kind), note.sectionPath, fmtDate(note.date)]
    .filter(Boolean).join(' · ');
  const source = note.source ? '\n\n> 出处：' + note.source : '';
  return [
    '---',
    'title: ' + JSON.stringify(note.title),
    'date: ' + (fmtDate(note.date) || '1970-01-01') + ' 00:00:00',
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
  KIND_LABEL,
  collect,
  esc,
  fmtDate,
  kindLabel,
  renderCard,
  renderList,
  renderChips,
  renderHomeBlock,
  homePage,
  notePage,
  sectionPage,
  indexPage
};
