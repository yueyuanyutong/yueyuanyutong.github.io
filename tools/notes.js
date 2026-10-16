'use strict';

/**
 * 「笔记」栏目生成器
 *
 * 源：source/_notes/*.md          （唯一需要人工/AI 维护的地方，下划线前缀让 Hexo 忽略它）
 * 产物：source/notes/index.md     栏目首页（按时间倒序的卡片列表）
 *      source/notes/<slug>/index.md  每篇笔记一个页面
 *
 * 产物目录已加入 .gitignore，构建时自动重建，不需要手动维护。
 * 调用：npm run build / npm run server 会自动执行；也可单独 node tools/notes.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'source', '_notes');
const OUT = path.join(ROOT, 'source', 'notes');

const KIND_LABEL = {
  concept: '概念卡',
  cheatsheet: '速查表',
  pitfall: '踩坑记录',
  review: '复盘',
  note: '随笔'
};

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

function readBasePath() {
  try {
    const cfg = yaml.load(fs.readFileSync(path.join(ROOT, '_config.yml'), 'utf8')) || {};
    const root = String(cfg.root || '/');
    return root.replace(/\/+$/, '');
  } catch (err) {
    return '';
  }
}

function loadNotes() {
  if (!fs.existsSync(SRC)) return [];
  const notes = [];
  for (const file of fs.readdirSync(SRC).sort()) {
    if (!file.endsWith('.md')) continue;
    const [data, body] = splitFrontMatter(fs.readFileSync(path.join(SRC, file), 'utf8'));
    if (!data.title) {
      console.warn('[notes] 跳过（缺少 title）：' + file);
      continue;
    }
    notes.push({
      slug: String(data.slug || file.replace(/\.md$/, '')),
      title: String(data.title),
      date: data.date,
      kind: String(data.kind || 'note'),
      category: data.category ? String(data.category) : '',
      tags: Array.isArray(data.tags) ? data.tags.map(String) : (data.tags ? [String(data.tags)] : []),
      excerpt: data.excerpt ? String(data.excerpt) : '',
      source: data.source ? String(data.source) : '',
      body: body.trim()
    });
  }
  notes.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return notes;
}

function kindLabel(kind) {
  return KIND_LABEL[kind] || KIND_LABEL.note;
}

function notePage(note) {
  const meta = [kindLabel(note.kind), note.category, fmtDate(note.date)].filter(Boolean).join(' · ');
  const footer = note.source ? '\n\n> 出处：' + note.source : '';
  // 刻意不写 type：主题对未知 type 会回落到普通页面布局，正好适合笔记
  return [
    '---',
    'title: ' + JSON.stringify(note.title),
    'date: ' + (fmtDate(note.date) || '1970-01-01') + ' 00:00:00',
    '---',
    '',
    '<div class="kb-note-meta">' + esc(meta) + '</div>',
    '',
    note.body + footer,
    ''
  ].join('\n');
}

function indexPage(notes, base) {
  const cards = notes.map(note => {
    const tags = note.tags.length
      ? '<div class="kb-tags">' + note.tags.map(t => '#' + esc(t)).join(' ') + '</div>'
      : '';
    const excerpt = note.excerpt ? '<div class="kb-excerpt">' + esc(note.excerpt) + '</div>' : '';
    return [
      '<a class="kb-item" href="' + base + '/notes/' + note.slug + '/">',
      '<div class="kb-item-top"><span class="kb-badge">' + esc(kindLabel(note.kind)) + '</span>'
        + '<span class="kb-date">' + esc(fmtDate(note.date)) + '</span></div>',
      '<div class="kb-title">' + esc(note.title) + '</div>',
      excerpt,
      tags,
      '</a>'
    ].filter(Boolean).join('\n');
  }).join('\n');

  // 正文整段作为 HTML 块输出（中间不留空行），避免被 markdown 渲染器拆散
  const intro = notes.length
    ? '从对话里沉淀下来的东西：概念解释、速查表、踩坑记录。按时间倒序。'
    : '还没有笔记。在 <code>source/_notes/</code> 下放一个 .md 文件，构建时会自动出现在这里。';
  return [
    '---',
    'title: 笔记',
    '---',
    '',
    '<div class="kb-intro">' + intro + '</div>',
    '<div class="kb-list">',
    cards,
    '</div>',
    ''
  ].join('\n');
}

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function main() {
  const base = readBasePath();
  const notes = loadNotes();

  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  for (const note of notes) {
    const dir = path.join(OUT, note.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.md'), notePage(note), 'utf8');
  }

  fs.writeFileSync(path.join(OUT, 'index.md'), indexPage(notes, base), 'utf8');

  console.log('[notes] 生成 ' + notes.length + ' 篇笔记 -> source/notes/');
  if (notes.length) {
    console.log('[notes] 最新：' + notes[0].title + '（' + fmtDate(notes[0].date) + '）');
  }
}

main();
