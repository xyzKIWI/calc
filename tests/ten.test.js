'use strict';
// 核心十項（calc-ten.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-ten.html';
const MISSING = '請填入所有必要欄位。';
const INCOMPLETE = '請完成所有項目。';

describe('mean-arterial-pressure-map｜MAP', () => {
  const S = 'mean-arterial-pressure-map';
  const run = (sbp, dbp) => page(F).form(S, { sbp: String(sbp), dbp: String(dbp) });

  test('公式範例：120/80 → 93.3 mmHg', () => {
    // 出處：MDCalc MAP 頁公式 MAP = 1/3 × SBP + 2/3 × DBP（https://www.mdcalc.com/calc/74/mean-arterial-pressure-map）；
    // 依公式定義手算 (120 + 2×80)/3 = 93.33，非文獻列印之範例。
    const o = run(120, 80);
    assert.equal(o.value, '93.3');
    assert.equal(o.unit, 'mmHg');
    assert.match(o.interpretation, /^MAP ≥65/);
  });

  test('切點：60（含）與 65（含），以未四捨五入值判讀', () => {
    assert.match(run(100, 40).interpretation, /^MAP ≥60 mmHg：已達/); // 剛好 60.0
    assert.match(run(99, 40).interpretation, /^MAP <60/); // 59.67
    assert.match(run(105, 45).interpretation, /^MAP ≥65/); // 剛好 65.0
    assert.match(run(104, 45).interpretation, /^MAP ≥60 mmHg：已達/); // 64.67
    // 64.98 → 顯示四捨五入成 65.0，但判讀仍屬 <65（判讀用原始值）
    const o = page(F).form(S, { sbp: '104.94', dbp: '45' });
    assert.equal(o.value, '65.0');
    assert.match(o.interpretation, /^MAP ≥60 mmHg：已達/);
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { sbp: '120' }).interpretation, MISSING);
    assert.match(run(39, 20).interpretation, /需介於 40–300 mm Hg/);
    assert.match(run(120, 201).interpretation, /需介於 20–200 mm Hg/);
    assert.equal(run('abc', 80).interpretation, MISSING); // type=number 欄位的非數字輸入在瀏覽器視為空白
    assert.equal(run(300, 200).value, '233.3'); // 上限
  });
});

describe('shock-index｜休克指數', () => {
  const S = 'shock-index';
  const run = (hr, sbp) => page(F).form(S, { hr: String(hr), sbp: String(sbp) });

  test('公式範例：HR 120 / SBP 100 → 1.20；無判讀分層', () => {
    // 出處：Allgöwer M, Burri C. Dtsch Med Wochenschr 1967（MDCalc 1316）定義 SI = HR/SBP；依定義手算。
    const o = run(120, 100);
    assert.equal(o.value, '1.20');
    assert.equal(o.interpretation, ''); // 頁面未設判讀分層
  });

  test('顯示四捨五入：179/200 = 0.895 → 顯示 0.90（README 範例）', () => {
    assert.equal(run(179, 200).value, '0.90');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { hr: '80' }).interpretation, MISSING);
    assert.match(run(19, 100).interpretation, /需介於 20–250 beats\/min/);
    assert.match(run(80, 39).interpretation, /需介於 40–300 mm Hg/);
    assert.equal(run(250, 40).value, '6.25');
  });
});

describe('parkland-formula-burns｜Parkland', () => {
  const S = 'parkland-formula-burns';
  const run = (wt, tbsa) => page(F).form(S, { wt: String(wt), tbsa: String(tbsa) });

  test('公式範例：70 kg、TBSA 50% → 24 h 14000 mL，前 8 h 7000 mL', () => {
    // 出處：Baxter CR. Clin Plast Surg 1974（MDCalc 83）公式 4 mL × kg × %TBSA，前 8 小時給一半；依公式手算。
    const o = run(70, 50);
    assert.equal(o.value, '24 小時總量：14000 mL；前 8 小時：7000 mL；後 16 小時：7000 mL');
    assert.match(o.interpretation, /前 8 小時給予總量的一半/);
  });

  test('邊界：奇數總量的一半顯示四捨五入', () => {
    // 4 × 1.1 × 1.1 = 4.84 → 總量 5 mL，一半 2.42 → 2 mL
    assert.equal(run(1.1, 1.1).value, '24 小時總量：5 mL；前 8 小時：2 mL；後 16 小時：2 mL');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { wt: '70' }).interpretation, MISSING);
    assert.match(run(0.5, 10).interpretation, /需介於 1–300 kg/);
    assert.match(run(70, 101).interpretation, /需介於 1–100 %/);
    assert.match(run(300, 100).value, /^24 小時總量：120000 mL/);
  });
});

describe('maintenance-fluids-calculations｜4-2-1 維持輸液', () => {
  const S = 'maintenance-fluids-calculations';
  const run = wt => page(F).form(S, { wt: String(wt) });

  test('公式範例：25 kg → 65 mL/hr', () => {
    // 出處：Holliday MA, Segar WE. Pediatrics 1957 的 100/50/20 mL/kg/day 規則換算成 4-2-1 mL/kg/hr（MDCalc 72）；
    // 依公式手算 40 + 20 + 5 = 65。
    assert.equal(run(25).value, '65');
    assert.equal(run(25).unit, 'mL/hr');
  });

  test('分段切點：10 kg 與 20 kg', () => {
    assert.equal(run(10).value, '40');
    assert.equal(run(10.1).value, '40'); // 40.2 → 40
    assert.equal(run(20).value, '60');
    assert.equal(run(20.5).value, '61'); // 60.5 → 61
    assert.equal(run(70).value, '110');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, {}).interpretation, MISSING);
    assert.match(run(0.4).interpretation, /需介於 0.5–200 kg/);
    assert.equal(run(0.5).value, '2');
    assert.equal(run(200).value, '240');
  });
});

describe('qsofa-quick-sofa-score-sepsis｜qSOFA', () => {
  const S = 'qsofa-quick-sofa-score-sepsis';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：≥2 項為高風險', () => {
    // 出處：Seymour CW, et al. JAMA 2016;315(8):762-774（Sepsis-3）：qSOFA ≥2 為院內死亡高風險；依定義建構病例。
    const o = run([1, 1, 0]); // 意識改變＋RR ≥22
    assert.equal(o.value, '2');
    assert.match(o.interpretation, /^2–3 分：院內死亡高風險/);
  });

  test('切點：1 分 vs 2 分', () => {
    assert.match(run([0, 0, 1]).interpretation, /^0–1 分：非高風險/);
    assert.match(run([0, 1, 1]).interpretation, /^2–3 分/);
    assert.equal(run([0, 0, 0]).value, '0');
    assert.equal(run([1, 1, 1]).value, '3');
  });

  test('缺值', () => {
    assert.equal(run([1, 1, null]).interpretation, INCOMPLETE);
  });
});

describe('crb-65-score-for-pneumonia-severity-crb-65｜CRB-65', () => {
  const S = 'crb-65-score-for-pneumonia-severity-crb-65';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：0 / 1–2 / 3–4 三組', () => {
    // 出處：Lim WS, et al. Thorax 2003;58:377-382；依定義建構病例（年齡 ≥65＋意識混亂 = 2）。
    const o = run([1, 0, 0, 1]);
    assert.equal(o.value, '2');
    assert.match(o.interpretation, /^1–2 分：中度風險/);
  });

  test('切點：0｜1、2｜3', () => {
    assert.match(run([0, 0, 0, 0]).interpretation, /^0 分：低死亡風險/);
    assert.match(run([0, 0, 0, 1]).interpretation, /^1–2 分/);
    assert.match(run([1, 1, 0, 1]).interpretation, /^3–4 分：高風險/);
    assert.match(run([1, 1, 1, 1]).interpretation, /^3–4 分/);
  });

  test('缺值', () => {
    assert.equal(run([null, 0, 0, 0]).interpretation, INCOMPLETE);
  });
});

describe('nexus-criteria-c-spine-imaging｜NEXUS 頸椎', () => {
  const S = 'nexus-criteria-c-spine-imaging';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：五項皆無才可臨床排除', () => {
    // 出處：Hoffman JR, et al. N Engl J Med 2000;343:94-99；依定義建構病例。
    assert.match(run([0, 0, 0, 0, 0]).interpretation, /^五項皆無/);
  });

  test('切點：任一項陽性即需影像', () => {
    for (let i = 0; i < 5; i += 1) {
      const opts = [0, 0, 0, 0, 0];
      opts[i] = 1;
      assert.match(run(opts).interpretation, /^任一項存在：不能臨床排除/, `第 ${i} 項`);
    }
    assert.equal(run([1, 1, 1, 1, 1]).value, '5');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('ottawa-knee-rule｜Ottawa 膝', () => {
  const S = 'ottawa-knee-rule';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：五項皆無則不需 X 光', () => {
    // 出處：Stiell IG, et al. Ann Emerg Med 1995;26:405-413；依定義建構病例。
    assert.match(run([0, 0, 0, 0, 0]).interpretation, /^無任一項：依 Ottawa Knee Rule 不需 X 光/);
  });

  test('切點：任一項陽性即建議 X 光', () => {
    for (let i = 0; i < 5; i += 1) {
      const opts = [0, 0, 0, 0, 0];
      opts[i] = 1;
      assert.match(run(opts).interpretation, /^任一項存在：建議膝關節 X 光/, `第 ${i} 項`);
    }
  });

  test('缺值', () => {
    assert.equal(run([null, 0, 0, 0, 0]).interpretation, INCOMPLETE);
  });
});

describe('simplified-pesi-pulmonary-embolism-severity-index｜sPESI', () => {
  const S = 'simplified-pesi-pulmonary-embolism-severity-index';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：0 分低風險、≥1 分高風險', () => {
    // 出處：Jiménez D, et al. Arch Intern Med 2010;170(15):1383-1389；依定義建構病例。
    const low = run([0, 0, 0, 0, 0, 0]);
    assert.equal(low.value, '0');
    assert.match(low.interpretation, /^0 分：低風險，死亡風險 1\.1%/);
    const high = run([0, 1, 0, 1, 0, 0]); // 癌症＋HR ≥110
    assert.equal(high.value, '2');
    assert.match(high.interpretation, /^≥1 分：高風險，死亡風險 8\.9%/);
  });

  test('切點：0｜1', () => {
    assert.match(run([1, 0, 0, 0, 0, 0]).interpretation, /^≥1 分/);
    assert.equal(run([1, 1, 1, 1, 1, 1]).value, '6');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('abcd2-score-tia｜ABCD²', () => {
  const S = 'abcd2-score-tia';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：0–3 分低風險，2 日中風風險 1.0%', () => {
    // 出處：Johnston SC, et al. Lancet 2007;369:283-292；依定義建構病例（年齡 ≥60＋言語障礙＋10–59 分鐘 = 3）。
    const o = run([1, 0, 1, 1, 0]);
    assert.equal(o.value, '3');
    assert.match(o.interpretation, /^0–3 分：低風險；2 日中風風險 1\.0%/);
  });

  test('權重：單側無力 2、言語障礙 1；持續 ≥60 分鐘 2、10–59 分鐘 1', () => {
    // 臨床特徵選項順序：[0] 單側無力 2、[1] 言語障礙 1、[2] 其他 0；持續時間：[0] <10 分 0、[1] 10–59 分 1、[2] ≥60 分 2
    assert.equal(run([0, 0, 2, 0, 0]).value, '0');
    assert.equal(run([0, 0, 0, 0, 0]).value, '2');
    assert.equal(run([0, 0, 2, 2, 0]).value, '2');
    assert.equal(run([1, 1, 0, 2, 1]).value, '7');
  });

  test('文獻：4–5 分 moderate（2 日 4.1%）（2026-10-25 補上分層）', () => {
    // 出處：Johnston SC, et al. Lancet 2007;369:283-292 摘要（PMID 17258668）：
    // 「2169 (45%) as moderate risk (score 4-5, 4.1%)」。病例：年齡 ≥60＋血壓 ≥140/90＋單側無力 = 4。
    const o = run([1, 1, 0, 0, 0]);
    assert.equal(o.value, '4');
    assert.match(o.interpretation, /4\.1%/);
  });

  test('分層切點：3｜4、5｜6', () => {
    assert.match(run([1, 0, 1, 1, 0]).interpretation, /^0–3 分/); // 3
    assert.match(run([1, 1, 0, 0, 0]).interpretation, /^4–5 分：中度風險；2 日中風風險 4\.1%/); // 4
    assert.match(run([1, 1, 0, 1, 0]).interpretation, /^4–5 分/); // 5
    assert.match(run([1, 1, 0, 2, 0]).interpretation, /^6–7 分：高風險；2 日中風風險 8\.1%/); // 6
  });

  test('文獻：6–7 分 high（2 日 8.1%）（2026-10-25 補上分層）', () => {
    // 出處：同上摘要：「1012 (21%) of patients were classified as high risk (score 6-7, 8.1% 2-day risk)」。
    const o = run([1, 1, 0, 2, 1]);
    assert.equal(o.value, '7');
    assert.match(o.interpretation, /8\.1%/);
  });

  test('缺值', () => {
    assert.equal(run([1, 1, 0, null, 1]).interpretation, INCOMPLETE);
  });
});
