'use strict';

/**
 * 「个人介绍」区块注入
 *
 * 主题在 ≤900px 时会把整列侧栏挪到正文之后（themes/butterfly 的 aside.styl，
 * maxWidth900 断点），排在侧栏第一张的作者卡因此沉到页面中段 —— 首页、
 * /notes/、各分区页、笔记正文页、/about/、/links/ 全都是这个表现。
 *
 * 这里在构建期把个人介绍插进每个页面 #page 的最前面；显示与否交给
 * source/css/kb.css：宽屏 display:none（作者卡仍在侧边栏，视觉效果与
 * 改动前一致），≤900px display:flex 并隐藏侧边栏里重复的作者卡。
 *
 * 为什么用「注入」而不是写进各页 markdown：
 *   - /about/、/links/ 是手写页面，注入后自动获得，无需改内容；
 *   - 个人介绍的文字只存在配置里一份（见 tools/lib/notes-core.js 的 readProfile）；
 *   - 将来新增任何页面都自动带上，不用记得加。
 *
 * 注意：这里注入的是 HTML 字符串，加在 Hexo 渲染之后，所以不参与 markdown 解析。
 */

const core = require('../tools/lib/notes-core');

// #page 是主题的内容卡片（.layout > div:first-child，带背景与内边距），
// 页面标题 .page-title 与正文容器 #article-container 都在它里面。
const PAGE = /<div id="page"[^>]*>/;
const HERO_MARK = 'class="kb-hero"';

hexo.extend.filter.register('after_render:html', function (html, data) {
  const routePath = data && data.path;
  // 只管 HTML 路由；search.xml 之类交给 scripts/search.js
  if (!routePath || !/\.html$/i.test(routePath)) return html;
  // 幂等：万一将来某页自己写了一份，就不重复注入
  if (html.indexOf(HERO_MARK) !== -1) return html;

  const found = PAGE.exec(html);
  if (!found) return html;

  const at = found.index + found[0].length;
  return html.slice(0, at) + core.heroBlock() + html.slice(at);
});
