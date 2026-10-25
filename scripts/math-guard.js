'use strict';

// 鏁板鍏紡淇濇姢灞?//
// 鑳屾櫙锛欻exo 鐨?markdown 娓叉煋鍣ㄤ細鎶娿€屽弽鏂滄潬 + ASCII 鏍囩偣銆嶅綋鎴愯浆涔夊簭鍒楀悆鎺?// 锛圽% -> %銆乗, -> ,銆乗; -> ;锛夈€備簬鏄?MathJax 鎷垮埌鐨勬槸 % 鍜?,锛?// 鍏紡閲岀殑鐧惧垎鍙疯褰撴垚 TeX 娉ㄩ噴鏁磋鍚炴帀銆佷箻鍙风殑缁嗙┖鏍煎彉鎴愰€楀彿銆?// 鍙嶅悜閲嶅缓淇℃伅宸蹭涪澶憋紝鍙兘鍦?markdown 涔嬪墠鎶婃暣娈靛叕寮忔崲鎴愬崰浣嶇锛?// 娓叉煋瀹屽啀鎶婂師鏂囨崲鍥炴潵锛岃鍏紡鍘熷皝涓嶅姩鍦颁氦缁欐祻瑙堝櫒绔殑 MathJax銆?//
// 鍗犱綅绗﹀彧鐢ㄥ瓧姣嶆暟瀛楋紝閬垮厤琚綋绮椾綋/寮鸿皟璇硶銆?
const TPL = (i) => 'MATHGUARDTPL' + i + 'ZZZ';
const TPL_RE = /MATHGUARDTPL(\d+)ZZZ/g;

function stash(text, store) {
  text = text.replace(/\$\$[\s\S]+?\$\$/g, (m) => {
    store.push(m);
    return TPL(store.length - 1);
  });
  text = text.replace(/\$(?!\$)[^$\n]+?\$/g, (m) => {
    store.push(m);
    return TPL(store.length - 1);
  });
  return text;
}

hexo.extend.filter.register('before_post_render', function (data) {
  if (typeof data.content !== 'string' || data.content.indexOf('$') < 0) return data;
  const store = [];
  // 浠ｇ爜鍧楀師鏍蜂繚鐣欙紝閬垮厤鍏紡閲岀殑 $ 涓庝唬鐮佸潡閲岀殑 $ 閰嶅
  data.content = data.content
    .split(/(```[\s\S]*?```)/g)
    .map((seg, i) => (i % 2 ? seg : stash(seg, store)))
    .join('');
  data.mathGuardStore = store;
  return data;
});

hexo.extend.filter.register('after_post_render', function (data) {
  const store = data.mathGuardStore;
  if (!store || !store.length || typeof data.content !== 'string') return data;
  data.content = data.content.replace(TPL_RE, (m, i) => {
    const v = store[Number(i)];
    return typeof v === 'string' ? v : m;
  });
  delete data.mathGuardStore;
  return data;
});