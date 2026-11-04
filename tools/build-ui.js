#!/usr/bin/env node
'use strict';
// 把共用介面（tools/ui/ui.css、tools/ui/ui.js、分科列）同步內嵌到 9 個 calc-*.html，
// 並更新 index.html 的全站搜尋資料。每頁仍是完整的離線單檔。
//
//   node tools/build-ui.js          寫入
//   node tools/build-ui.js --check  只檢查是否同步（不同步時 exit 1）
//
// 本機產生器重新產生 calc-*.html 之後，跑一次這個指令即可補回介面。
// 只動標記區塊（<!-- ui:... --> 到 <!-- /ui:... -->）；卡片、計算引擎與臨床文字一律不碰。

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const UI = path.join(__dirname, 'ui');

// 順序與名稱同入口頁
const PAGES = [
  { file: 'calc-ten.html', name: '核心十項' },
  { file: 'calc-trauma.html', name: '外傷' },
  { file: 'calc-cardio.html', name: '心血管' },
  { file: 'calc-neuro.html', name: '神經' },
  { file: 'calc-peds.html', name: '兒科' },
  { file: 'calc-triage.html', name: '檢傷與流程' },
  { file: 'calc-resp.html', name: '呼吸／感染' },
  { file: 'calc-tox.html', name: '中毒／精神' },
  { file: 'calc-gi.html', name: '腸胃／其他' },
];

const NOTE = '由 tools/build-ui.js 產生，請勿手改';

function block(tag, body) {
  return `<!-- ui:${tag}：${NOTE} -->\n${body}\n<!-- /ui:${tag} -->`;
}
function blockRe(tag) {
  return new RegExp(`<!-- ui:${tag}[\\s\\S]*?<!-- /ui:${tag} -->`);
}

function navHtml(current) {
  const links = PAGES.map(p => `<a href="${p.file}"${p.file === current ? ' aria-current="page"' : ''}>${p.name}</a>`).join('');
  return `<nav class="ui-nav" aria-label="切換分科"><a class="ui-hub" href="../">← 急診小工具</a><a class="ui-home" href="index.html">計算機首頁</a>${links}</nav>`;
}

function assetsHtml() {
  const css = fs.readFileSync(path.join(UI, 'ui.css'), 'utf8').trim();
  const js = fs.readFileSync(path.join(UI, 'ui.js'), 'utf8').trim();
  if (/<\/(style|script)/i.test(css + js)) throw new Error('ui.css / ui.js 不可包含 </style> 或 </script>');
  return `<style>\n${css}\n</style>\n<script>\n${js}\n</script>`;
}

function upsert(html, tag, body, insert) {
  const re = blockRe(tag);
  const b = block(tag, body);
  if (re.test(html)) return html.replace(re, () => b);
  return insert(html, b);
}

function renderPage(file, html) {
  html = upsert(html, 'nav', navHtml(file), (h, b) => {
    const i = h.indexOf('</header>');
    if (i < 0) throw new Error(`${file}：找不到 </header>`);
    return h.slice(0, i + 9) + '\n' + b + '\n' + h.slice(i + 9);
  });
  html = upsert(html, 'assets', assetsHtml(), (h, b) => {
    let i = h.indexOf('<!-- 臨床回饋記錄');
    if (i < 0) i = h.lastIndexOf('</body>');
    if (i < 0) throw new Error(`${file}：找不到插入點`);
    return h.slice(0, i) + b + '\n' + h.slice(i);
  });
  return html;
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e] ?? m;
  });
}
const strip = s => decode(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

// 從頁面讀出每張卡片的 slug 與中英文名稱（只讀，不改）
function cardsOf(html) {
  const out = [];
  const re = /<section class="card"([^>]*)>\s*<h2>([\s\S]*?)<\/h2>/g;
  let m;
  while ((m = re.exec(html))) {
    const slug = /data-slug="([^"]*)"/.exec(m[1])[1];
    const h2 = m[2];
    const zhM = /<span class="zh">([\s\S]*?)<\/span>/.exec(h2);
    const enM = /<span class="source-en">([\s\S]*?)<\/span>/.exec(h2);
    const en = strip(enM ? enM[1] : h2.split(/<br\s*\/?>/i)[0]);
    out.push({ slug, en, zh: zhM ? strip(zhM[1]) : '' });
  }
  return out;
}

function indexData(pages) {
  const rows = [];
  for (const p of PAGES) {
    for (const c of cardsOf(pages[p.file])) rows.push([p.file, c.slug, c.en, c.zh]);
  }
  return rows;
}

function renderIndex(html, pages) {
  const json = JSON.stringify(indexData(pages)).replace(/</g, '\\u003c');
  const body = `<script type="application/json" id="ui-calcs">${json}</script>`;
  if (!blockRe('calcs').test(html)) throw new Error('index.html：缺少 <!-- ui:calcs --> 標記');
  return upsert(html, 'calcs', body);
}

function build({ check = false } = {}) {
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const pages = {};
  const changed = [];
  for (const p of PAGES) {
    const before = read(p.file);
    const after = renderPage(p.file, before);
    pages[p.file] = after;
    if (after !== before) changed.push(p.file);
  }
  const idxBefore = read('index.html');
  const idxAfter = renderIndex(idxBefore, pages);
  if (idxAfter !== idxBefore) changed.push('index.html');
  if (!check) {
    for (const p of PAGES) fs.writeFileSync(path.join(ROOT, p.file), pages[p.file]);
    fs.writeFileSync(path.join(ROOT, 'index.html'), idxAfter);
  }
  return { changed, pages, index: idxAfter };
}

module.exports = { PAGES, build, renderPage, renderIndex, cardsOf, navHtml };

if (require.main === module) {
  const check = process.argv.includes('--check');
  const { changed } = build({ check });
  if (check) {
    if (changed.length) {
      console.error('以下檔案與 tools/ui 不同步，請執行 node tools/build-ui.js：\n  ' + changed.join('\n  '));
      process.exit(1);
    }
    console.log('全部同步');
  } else {
    console.log(changed.length ? '已更新：' + changed.join('、') : '沒有變更');
  }
}
