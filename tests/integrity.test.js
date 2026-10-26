'use strict';
// 全站結構檢查：頁面可載入、HTML 選項分數與引擎資料一致、每個計算機都有測試。
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { page, PAGES, ROOT } = require('./harness');

describe('頁面載入', () => {
  for (const file of PAGES) {
    test(`${file}：計算引擎可執行，卡片與定義一一對應`, () => {
      const p = page(file);
      const cardSlugs = p.doc.querySelectorAll('section.card').map(c => c.getAttribute('data-slug')).sort();
      const defSlugs = p.defs.map(d => d.slug).sort();
      assert.deepEqual(cardSlugs, defSlugs);
      for (const slug of cardSlugs) {
        assert.ok(p.card(slug).querySelector('[data-role="value"]'), `${slug} 缺結果欄位`);
      }
    });
  }

  test('公開版共 72 個計算機（README：作者本機完整版 73 個，FLACC 因授權未收錄）', () => {
    const total = PAGES.reduce((n, f) => n + page(f).defs.length, 0);
    assert.equal(total, 72);
    const all = PAGES.flatMap(f => page(f).defs.map(d => d.slug));
    assert.equal(new Set(all).size, all.length, 'slug 不可重複');
    assert.ok(!all.some(s => /flacc/i.test(s)));
  });
});

describe('選項分數一致性（HTML radio value＝引擎資料＝畫面顯示分數）', () => {
  for (const file of PAGES) {
    test(file, () => {
      const p = page(file);
      for (const d of p.defs) {
        if (!d.items) continue;
        d.items.forEach((item, i) => {
          if (!item.options) return; // rule_any 項目為 Yes/No，NEWS2 的高碳酸血症題為下拉選單
          if (d.type === 'news2' && i === 1) return;
          const radios = p.radioGroup(d.slug, i);
          assert.equal(radios.length, item.options.length, `${d.slug} 第 ${i} 題選項數`);
          item.options.forEach((opt, j) => {
            const html = radios[j].value;
            if (opt.value === 'UN') {
              assert.equal(html, 'UN', `${d.slug} 第 ${i} 題選項 ${j}`);
              return;
            }
            assert.equal(Number(html), Number(opt.value), `${d.slug} 第 ${i} 題選項 ${j}（${opt.text_en}）`);
            const label = radios[j].closest('label');
            const pts = label && (label.querySelector('b') || label.querySelector('.points'));
            assert.ok(pts, `${d.slug} 第 ${i} 題選項 ${j} 無顯示分數`);
            assert.equal(Number(pts.textContent.replace('+', '').replace('−', '-')), Number(html), `${d.slug} 第 ${i} 題選項 ${j} 顯示分數與實際分數不同`);
          });
        });
      }
    });
  }
});

describe('測試覆蓋：每個計算機都有專屬測試區塊', () => {
  const testSources = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.test.js') && f !== 'integrity.test.js')
    .map(f => fs.readFileSync(path.join(__dirname, f), 'utf8'))
    .join('\n');
  for (const file of PAGES) {
    test(file, () => {
      for (const d of page(file).defs) {
        assert.ok(testSources.includes(`describe('${d.slug}`), `${d.slug} 沒有對應的 describe 區塊`);
      }
    });
  }
  test('頁面檔案存在', () => {
    for (const f of PAGES) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
  });
});
