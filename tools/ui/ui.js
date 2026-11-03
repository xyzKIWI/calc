/* 共用介面行為。由 tools/build-ui.js 內嵌到每個 calc-*.html，放在計算引擎之後執行。
   只處理導覽、搜尋顯示、錨點與手機操作；不讀寫任何分數、公式或判讀文字。 */
(function () {
  'use strict';
  var d = document;
  var main = d.querySelector('main');
  if (!main) return;
  var cards = [].slice.call(main.querySelectorAll('section.card[data-slug]'));
  var search = d.getElementById('search');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var smooth = reduce ? 'auto' : 'smooth';

  // 搜尋用正規化：全形→半形、下標/上標→數字（CHA₂DS₂ ≈ cha2ds2）、忽略大小寫與標點空白
  function norm(s) {
    s = String(s || '');
    if (s.normalize) s = s.normalize('NFKC');
    return s.toLowerCase().replace(/[\s\-_/\\()（）\[\]{}'’‘"“”.,，、:：;；·・｜|+&]+/g, '');
  }
  function tokens(q) {
    return String(q || '').split(/[\s,，、]+/).map(norm).filter(Boolean);
  }

  function nameOf(card) {
    var h = card.querySelector('h2');
    var zh = h && h.querySelector('.zh');
    var en = '';
    var srcEn = h && h.querySelector('.source-en');
    if (srcEn) en = srcEn.textContent;
    else if (h) {
      for (var n = h.firstChild; n; n = n.nextSibling) {
        if (n.nodeType === 1 && n.tagName === 'BR') break;
        en += n.textContent;
      }
    }
    return { en: en.replace(/\s+/g, ' ').trim(), zh: zh ? zh.textContent.trim() : '' };
  }

  // ---- 提示訊息 ----
  var toast;
  function say(msg) {
    if (!toast) {
      toast = d.createElement('div');
      toast.className = 'ui-toast';
      toast.setAttribute('role', 'status');
      d.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(say.t);
    say.t = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }
  function legacyCopy(text) {
    var t = d.createElement('textarea');
    t.value = text;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px';
    d.body.appendChild(t);
    t.select();
    var ok = false;
    try { ok = d.execCommand('copy'); } catch (e) { ok = false; }
    d.body.removeChild(t);
    return ok;
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  // ---- 卡片：錨點 id、複製連結、結果區朗讀、數字鍵盤 ----
  cards.forEach(function (card) {
    if (!card.id) card.id = 'calc-' + card.dataset.slug;
    card.setAttribute('tabindex', '-1');
    var nm = nameOf(card);
    card._ui = { name: nm, hay: norm([card.dataset.search, nm.en, nm.zh].join(' ')) };
    var h = card.querySelector('h2');
    if (h && !h.querySelector('.ui-link')) {
      var a = d.createElement('a');
      a.className = 'ui-link';
      a.href = '#' + card.id;
      a.textContent = '🔗';
      a.title = '複製這個計算機的直達連結';
      a.setAttribute('aria-label', '複製「' + (nm.zh || nm.en) + '」的直達連結');
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var url = location.href.split('#')[0] + '#' + card.id;
        try { history.replaceState(null, '', '#' + card.id); } catch (err) { /* file:// 某些瀏覽器不允許 */ }
        copy(url).then(function (ok) { say(ok ? '已複製連結' : '連結已放在網址列，請手動複製'); });
      });
      h.appendChild(a);
    }
    var out = card.querySelector('.out');
    if (out) out.setAttribute('aria-live', 'polite');
    [].forEach.call(card.querySelectorAll('input[type=number]'), function (i) {
      if (!i.hasAttribute('inputmode') && !(i.min !== '' && Number(i.min) < 0)) i.setAttribute('inputmode', 'decimal');
      i.setAttribute('enterkeyhint', 'done');
    });
  });

  // ---- 搜尋：計數、找不到時連到入口全站搜尋、目錄同步 ----
  var status, toc;
  function applySearch() {
    if (!search) return;
    var q = search.value;
    var raw = q.trim().toLowerCase();
    var ts = tokens(q);
    var shown = 0;
    cards.forEach(function (card) {
      var hit = !ts.length || (raw && (card.dataset.search || '').toLowerCase().indexOf(raw) >= 0) ||
        ts.every(function (t) { return card._ui.hay.indexOf(t) >= 0; });
      card.hidden = !hit;
      if (card._toc) card._toc.hidden = !hit;
      if (hit) shown += 1;
    });
    status.textContent = '';
    if (!ts.length) return;
    status.appendChild(d.createTextNode(shown ? '本頁找到 ' + shown + ' 項。' : '本頁找不到「' + q.trim() + '」。'));
    var a = d.createElement('a');
    a.href = 'index.html#q=' + encodeURIComponent(q.trim());
    a.textContent = '在全部分科搜尋 →';
    status.appendChild(a);
  }
  if (search) {
    try { search.type = 'search'; } catch (e) { /* 舊瀏覽器 */ }
    search.setAttribute('autocomplete', 'off');
    search.setAttribute('enterkeyhint', 'search');
    search.setAttribute('placeholder', '搜尋本頁：英文、中文或縮寫皆可');
    if (!d.querySelector('label[for="search"]')) search.setAttribute('aria-label', '搜尋本頁計算機');
    status = d.createElement('div');
    status.className = 'ui-count';
    status.setAttribute('role', 'status');
    search.insertAdjacentElement('afterend', status);
    search.addEventListener('input', applySearch);
    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && search.value) { search.value = ''; search.dispatchEvent(new Event('input')); }
    });
  }

  // ---- 本頁目錄 ----
  if (cards.length > 1) {
    toc = d.createElement('details');
    toc.className = 'ui-toc';
    var sum = d.createElement('summary');
    sum.textContent = '本頁目錄（' + cards.length + ' 項）';
    toc.appendChild(sum);
    var ol = d.createElement('ol');
    cards.forEach(function (card) {
      var nm = card._ui.name;
      var li = d.createElement('li');
      var a = d.createElement('a');
      a.href = '#' + card.id;
      a.textContent = nm.zh || nm.en;
      if (nm.zh && nm.en) {
        var s = d.createElement('span');
        s.className = 'ui-en';
        s.textContent = nm.en;
        a.appendChild(s);
      }
      li.appendChild(a);
      ol.appendChild(li);
      card._toc = li;
    });
    toc.appendChild(ol);
    if (status) status.insertAdjacentElement('afterend', toc);
    else main.insertBefore(toc, main.firstChild);
    if (cards.length <= 6 || (window.matchMedia && matchMedia('(min-width: 760px)').matches)) toc.open = true;
  }

  // ---- 網址 #錨點：直達某個計算機 ----
  function goHash() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) { h = location.hash.slice(1); }
    if (!h) return;
    if (h.indexOf('q=') === 0 && search) {
      search.value = h.slice(2);
      search.dispatchEvent(new Event('input'));
      return;
    }
    var card = d.getElementById(h);
    if (!card || cards.indexOf(card) < 0) card = d.getElementById('calc-' + h);
    if (!card || cards.indexOf(card) < 0) return;
    if (card.hidden && search) { search.value = ''; search.dispatchEvent(new Event('input')); }
    card.scrollIntoView({ block: 'start' });
    try { card.focus({ preventScroll: true }); } catch (e) { /* 舊瀏覽器 */ }
    card.classList.add('ui-hit');
    setTimeout(function () { card.classList.remove('ui-hit'); }, 2000);
  }
  window.addEventListener('hashchange', goHash);
  if (location.hash) {
    if (window.requestAnimationFrame) requestAnimationFrame(goHash); else goHash();
  }

  // ---- 按「計算」：先收起鍵盤，再計算；結果不在畫面內就捲過去 ----
  function calcButton(e) {
    return e.target && e.target.closest ? e.target.closest('[data-action="calculate"]') : null;
  }
  // 捕獲階段（在引擎的計算之前）先讓輸入框失焦：失焦觸發的 change 會清掉舊結果，
  // 必須發生在計算「之前」，否則剛算好的結果會被清掉。
  main.addEventListener('click', function (e) {
    var b = calcButton(e);
    var ae = d.activeElement;
    if (b && ae && ae !== b && main.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName) && ae.blur) ae.blur();
  }, true);
  main.addEventListener('click', function (e) {
    var b = calcButton(e);
    if (!b) return;
    var card = b.closest('section.card');
    setTimeout(function () {
      var r = card && card.querySelector('.out.show, [data-role="result"]:not([hidden])');
      if (!r) return;
      var vh = window.visualViewport ? visualViewport.height : window.innerHeight;
      var rect = r.getBoundingClientRect();
      if (rect.bottom > vh - 8 || rect.top < 0) r.scrollIntoView({ block: 'nearest', behavior: smooth });
    }, 250);
  });
  // 數字欄位按 Enter（手機鍵盤的「完成」）等同按「計算」
  main.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.isComposing) return;
    var t = e.target;
    if (!t || t.tagName !== 'INPUT' || t.type !== 'number') return;
    var card = t.closest('section.card');
    var b = card && card.querySelector('[data-action="calculate"]');
    if (b) { e.preventDefault(); b.click(); }
  });

  // ---- 回到頁首（分科列、搜尋、目錄都在上面） ----
  var top = d.createElement('a');
  top.className = 'ui-top';
  top.href = '#';
  top.textContent = '↑';
  top.title = '回到頁首（分科、搜尋、目錄）';
  top.setAttribute('aria-label', '回到頁首');
  top.addEventListener('click', function (e) {
    e.preventDefault();
    try { history.replaceState(null, '', location.pathname + location.search); } catch (err) { /* 略過 */ }
    window.scrollTo({ top: 0, behavior: smooth });
  });
  d.body.appendChild(top);
  function onScroll() { top.classList.toggle('show', window.scrollY > window.innerHeight * 0.8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
