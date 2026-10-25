/* global hexo */

/**
 * 公式页的两处提速 + 一个「正在排版」提示。
 *
 * 主题的 mathjax.pug 是 `window.addEventListener('load', loadMathjax)` —— 要等页面
 * 所有图片字体都加载完，才动态插入 <script> 去拉 2 MB 的 tex-svg.js。手机上这段时间
 * 公式一直是 $...$ 原文，既慢又让人怀疑「是不是渲染不出来」。
 *
 * 主题是 git submodule 不能改（铁律 4），所以在渲染出的 HTML 上做两件事：
 *
 *   1. 在 <head> 加一条 preload —— 解析阶段就开始下载那 2 MB，
 *      等主题插入 script 时直接命中缓存。没有公式的页面（没有 MathJax-script 标记）不加。
 *   2. 把主题的监听从 window.load 换成 DOMContentLoaded —— 不等图片字体，
 *      DOM 一就绪就插入 script 并开始排版。
 *   3. 给含公式的页面挂一个「公式排版中…」小提示，排版完成自动消失，
 *      免得用户以为公式坏了。
 */
const LOADER = "window.pjax ? loadMathjax() : window.addEventListener('load', loadMathjax)";
const FASTER = "window.pjax ? loadMathjax() : document.addEventListener('DOMContentLoaded', loadMathjax)";

const TIP = `<script>
  (function () {
    var box = document.getElementById('article-container');
    if (!box || box.textContent.indexOf('$') < 0) return;
    var tip = document.createElement('div');
    tip.className = 'kb-math-tip';
    tip.textContent = '公式排版中…';
    document.body.appendChild(tip);
    var done = false;
    function finish() {
      if (done) return;
      done = true;
      if (tip.parentNode) tip.parentNode.removeChild(tip);
    }
    function wait() {
      var mj = window.MathJax;
      if (mj && mj.startup && mj.startup.promise) {
        mj.startup.promise.then(finish, finish);
      } else if (mj && mj.typesetPromise) {
        mj.typesetPromise().then(finish, finish);
      } else {
        setTimeout(wait, 150);
      }
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', wait);
    } else {
      wait();
    }
    setTimeout(finish, 20000);
  })();
</script>`;

hexo.extend.filter.register('after_render:html', function (str) {
  if (!str.includes('MathJax-script')) return str
  let out = str
  if (!out.includes('rel="preload" as="script" href="/js/mathjax/')) {
    const tag = '<link rel="preload" as="script" href="/js/mathjax/tex-svg.js" fetchpriority="high">'
    out = out.replace('</head>', tag + '</head>')
  }
  if (out.includes(LOADER)) out = out.replace(LOADER, FASTER)
  if (!out.includes('kb-math-tip')) out = out.replace('</body>', TIP + '</body>')
  return out
})