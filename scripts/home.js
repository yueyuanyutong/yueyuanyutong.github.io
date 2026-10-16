'use strict';

/**
 * 首页改造：把 Hexo 默认的文章列表首页变成「知识库入口」
 *
 * 做法：Hexo 构建期在 index.html 的正文容器开头插入一个区块
 *      （分区入口 + 最新笔记），原有文章列表保留在下方。
 *
 * 为什么用脚本而不是改主题：主题是 git submodule，任何本地改动都会在
 * 下次升级时冲突。这里只是纯追加，不改主题一个字节。
 */

const core = require('../tools/lib/notes-core');

const MARKER = '<main class="layout" id="content-inner">';

let cached = null;

function block(hasPosts) {
  if (!cached) cached = core.renderHomeBlock(core.collect(), { hasPosts });
  return cached;
}

hexo.extend.filter.register('after_render:html', function (str, data) {
  if (!data || data.path !== 'index.html') return str;
  const at = str.indexOf(MARKER);
  if (at === -1) return str;
  const cut = at + MARKER.length;
  const hasPosts = str.indexOf('recent-post-item', cut) !== -1;
  return str.slice(0, cut) + block(hasPosts) + str.slice(cut);
});
