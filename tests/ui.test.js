'use strict';
// 介面與導覽檢查：共用介面已同步、頁首項數與實際卡片數一致、分科列正確、入口頁數量與全站搜尋資料正確。
// 計算行為由其他測試負責；這裡只檢查導覽結構。
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { page, PAGES: TEST_PAGES, ROOT } = require('./harness');
const ui = require('../tools/build-ui');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('tools/build-ui.js 的分頁清單與測試的分頁清單一致', () => {
  assert.deepEqual(ui.PAGES.map(p => p.file).sort(), [...TEST_PAGES].sort());
});

test('共用介面已同步（若失敗請執行 node tools/build-ui.js）', () => {
  assert.deepEqual(ui.build({ check: true }).changed, []);
});

describe('分頁頁首與分科列', () => {
  for (const { file, name } of ui.PAGES) {
    test(file, () => {
      const html = read(file);
      const p = page(file);
      const cards = p.doc.querySelectorAll('section.card').length;
      assert.equal(p.doc.title, `急診臨床計算機 — ${name}`, '分頁標題需與入口頁名稱一致');
      assert.equal(p.doc.querySelector('header h1').textContent, `急診臨床計算機 — ${name}`);
      assert.match(p.doc.querySelector('header p').textContent, new RegExp(`共 ${cards} 項`), '頁首項數需等於實際卡片數');
      const nav = p.doc.querySelector('nav.ui-nav');
      assert.ok(nav, '缺分科列');
      const links = nav.querySelectorAll('a').map(a => a.getAttribute('href'));
      assert.deepEqual(links, ['index.html', ...ui.PAGES.map(x => x.file)]);
      const current = nav.querySelectorAll('a[aria-current]');
      assert.equal(current.length, 1);
      assert.equal(current[0].getAttribute('href'), file);
      assert.ok(html.includes('https://github.com/xyzkiwi/calc#readme') && !html.includes('xyzKIWI/ed-calc'), '頁尾 README 連結需為新網址');
      // 共用介面在計算引擎之後、回饋視窗之前
      const engineEnd = html.indexOf('</script>');
      const assets = html.indexOf('<!-- ui:assets');
      assert.ok(assets > engineEnd && assets < html.indexOf('<!-- 臨床回饋記錄'));
    });
  }
});

describe('入口頁', () => {
  const html = read('index.html');
  const total = ui.PAGES.reduce((n, p) => n + page(p.file).defs.length, 0);

  test('標題與分類卡的項數等於實際計算機數', () => {
    assert.ok(html.includes('https://github.com/xyzkiwi/calc#readme') && !html.includes('xyzKIWI/ed-calc'), 'README 連結需為新網址');
    assert.match(html, new RegExp(`<div class="sub">${total} 個`));
    assert.match(html, new RegExp(`搜尋全部 ${total} 項`));
    for (const { file, name } of ui.PAGES) {
      const m = new RegExp(`href="${file}"><h2>${name}<span class="n">(\\d+) 項</span>`).exec(html);
      assert.ok(m, `入口頁缺 ${file} 分類卡或名稱不一致`);
      assert.equal(Number(m[1]), page(file).defs.length, `${file} 項數`);
    }
  });

  test('全站搜尋資料涵蓋每一個計算機，連結都對得到卡片', () => {
    const json = /<script type="application\/json" id="ui-calcs">([\s\S]*?)<\/script>/.exec(html)[1];
    const rows = JSON.parse(json);
    assert.equal(rows.length, total);
    for (const [file, slug, en] of rows) {
      const p = page(file);
      assert.ok(p.doc.querySelector(`[data-slug="${slug}"]`), `${file}#${slug}`);
      assert.ok(en, `${slug} 缺英文名`);
    }
  });
});
