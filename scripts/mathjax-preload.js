/* global hexo */

/**
 * 让公式页在解析阶段就开始下载 MathJax。
 *
 * 主题的 mathjax.pug 是 `window.addEventListener('load', loadMathjax)` —— 要等页面
 * 所有图片字体都加载完，才动态插入 <script> 去拉 2 MB 的 tex-svg.js。手机上这段时间
 * 公式一直是 $...$ 原文，看起来就是「渲染很慢」。
 *
 * 这里给真正会加载 MathJax 的页面加一条 preload：浏览器解析到 <head> 就开始下载，
 * 等主题插入 script 时直接命中缓存。没有公式的页面（没有 MathJax-script 标记）不加，
 * 不浪费带宽。
 */
hexo.extend.filter.register('after_render:html', function (str) {
  if (!str.includes('MathJax-script')) return str
  if (str.includes('rel="preload" as="script" href="/js/mathjax/')) return str
  const tag = '<link rel="preload" as="script" href="/js/mathjax/tex-svg.js" fetchpriority="high">'
  return str.replace('</head>', tag + '</head>')
})
