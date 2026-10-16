'use strict';

/**
 * 站内搜索数据清理
 *
 * hexo-generator-searchdb 在 search.field: all 时会把「页面」也全部索引进去，
 * 于是分区列表页（/notes/computer/ 之类）和 kb.css 都会变成搜索结果 —— 搜一个词
 * 会被同一篇笔记的分区页重复命中好几次，噪音很大。
 *
 * 这里在构建期重写 search.xml：只保留真正的笔记页与文章，去掉列表页和非 HTML 资源。
 * 规则保守 —— 任何解析异常都放弃修改，宁可留着噪音也不破坏搜索数据。
 */

const core = require('../tools/lib/notes-core');

const ENTRY = /<entry>[\s\S]*?<\/entry>\s*/g;
const URL = /<url>([\s\S]*?)<\/url>/;

function normalize(url) {
  return String(url).trim().replace(/^\/+/, '');
}

function excludedPaths() {
  const drop = new Set(['notes/index.html']);
  for (const section of core.collect().sections) {
    drop.add('notes/' + section.segs.join('/') + '/index.html');
  }
  return drop;
}

function clean(xml) {
  const drop = excludedPaths();
  let kept = 0;

  const out = xml.replace(ENTRY, (block) => {
    const m = URL.exec(block);
    if (!m) {
      kept++;
      return block;
    }
    const url = normalize(m[1]);
    const isHtml = url.endsWith('/') || url.endsWith('/index.html');
    if (!isHtml || drop.has(url)) return '';
    kept++;
    return block;
  });

  const actual = (out.match(/<entry>/g) || []).length;
  if (actual !== kept) return null;

  return { xml: out, kept, dropped: (xml.match(/<entry>/g) || []).length - kept };
}

hexo.extend.filter.register('after_generate', function () {
  const route = this.route;
  const stream = route.get('search.xml');
  if (!stream || typeof stream.on !== 'function') return;

  return new Promise((resolve) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))));
    stream.on('error', () => resolve());
    stream.on('end', () => {
      try {
        const result = clean(Buffer.concat(chunks).toString('utf8'));
        if (result) {
          route.set('search.xml', result.xml);
          if (result.dropped) {
            console.log('[search] 索引清理：保留 ' + result.kept + ' 条，剔除 ' + result.dropped + ' 条列表页/资源');
          }
        }
      } catch (err) {
        console.warn('[search] 索引清理跳过：' + err.message);
      }
      resolve();
    });
  });
});
