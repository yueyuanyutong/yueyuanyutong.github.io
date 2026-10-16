'use strict';

/**
 * 「笔记」页面生成器
 *
 * 源（唯一需要人工/AI 维护的地方）：
 *   source/_notes/<分区>/<子分区>/<slug>.md    目录结构即分区
 *   source/_notes/_sections.yml                分区的英文别名与首页排序
 *
 * 产物（已写入 .gitignore，构建时自动重建）：
 *   source/index.md                                站点首页（知识库入口）
 *   source/notes/index.md                          笔记总览 + 分区筛选
 *   source/notes/<分区>/index.md                   一级分区页
 *   source/notes/<分区>/<子分区>/index.md          二级分区页
 *   source/notes/<分区>/.../<slug>/index.md        笔记正文
 *
 * 调用：npm run build / npm run server 会自动执行；也可单独 node tools/notes.js
 */

const fs = require('fs');
const path = require('path');
const core = require('./lib/notes-core');

const OUT = path.join(core.ROOT, 'source', 'notes');

function rmrf(target) {
  if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

function writePage(dir, content) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.md'), content, 'utf8');
}

function main() {
  const data = core.collect();

  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  for (const note of data.notes) {
    const dir = path.join(OUT, ...note.segs.map((s) => s.slug), note.slug);
    writePage(dir, core.notePage(note));
  }

  for (const section of data.sections) {
    const dir = path.join(OUT, ...section.segs);
    writePage(dir, core.sectionPage(data, section));
  }

  writePage(OUT, core.indexPage(data));

  // 站点首页。文章体系退役后 _posts 为空，hexo-generator-index 不再产出
  // index.html，首页由这里直接接管。
  fs.writeFileSync(path.join(core.ROOT, 'source', 'index.md'), core.homePage(data), 'utf8');

  const parts = data.topSections
    .filter((s) => s.count)
    .map((s) => s.name + ' ' + s.count);

  console.log('[notes] ' + data.notes.length + ' 篇笔记 -> source/notes/');
  if (parts.length) console.log('[notes] 分区：' + parts.join('、'));
  if (data.notes.length) {
    console.log('[notes] 最新：' + data.notes[0].title + '（' + core.fmtDate(data.notes[0].date) + '）');
  }
}

main();
