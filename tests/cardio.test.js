'use strict';
// 心血管（calc-cardio.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-cardio.html';
const INCOMPLETE = '請完成所有項目。';
const NO_STRAT = '本評分之規格未提供風險分層。';

describe('4-level-pulmonary-embolism-clinical-probability-score-4peps｜4PEPS', () => {
  const S = '4-level-pulmonary-embolism-clinical-probability-score-4peps';
  const run = opts => page(F).score(S, opts);
  // 選項序號：第 0 題 [<50 -2, 50-64 -1, >64 0]；第 1 題 [女 0, 男 +2]；其餘 [否, 是]
  const base = () => [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // >64 歲女性、其餘皆否 = 0

  test('文獻定義範例：55 歲女性，胸痛合併急性呼吸困難、曾有 VTE → 2 分，low CPP', () => {
    // 出處：Roy PM, et al. JAMA Cardiol 2021;6:669-677（PMC7931139 Table 3 權重；摘要：low probability if 4PEPS is 0 to 5）；
    // 依權重與分層定義建構病例：-1 + 1 + 2 = 2。
    const opts = base();
    opts[0] = 1;
    opts[4] = 1;
    opts[6] = 1;
    const o = run(opts);
    assert.equal(o.value, '2 分');
    assert.match(o.interpretation, /^Low CPP \(2-20%\)/);
  });

  test('切點：<0｜0–5｜6–12｜≥13', () => {
    const at = changes => { const o = base(); Object.entries(changes).forEach(([i, v]) => { o[i] = v; }); return run(o); };
    assert.equal(at({ 0: 0, 4: 1 }).value, '-1 分');
    assert.match(at({ 0: 0, 4: 1 }).interpretation, /^Very low CPP/);
    assert.match(at({}).interpretation, /^Low CPP/); // 0
    assert.equal(at({ 11: 1 }).value, '5 分');
    assert.match(at({ 11: 1 }).interpretation, /^Low CPP/);
    assert.equal(at({ 1: 1, 6: 1, 7: 1 }).value, '6 分');
    assert.match(at({ 1: 1, 6: 1, 7: 1 }).interpretation, /^Moderate CPP/);
    assert.equal(at({ 1: 1, 6: 1, 7: 1, 8: 1, 9: 1, 4: 1 }).value, '12 分');
    assert.match(at({ 1: 1, 6: 1, 7: 1, 8: 1, 9: 1, 4: 1 }).interpretation, /^Moderate CPP/);
    assert.equal(at({ 1: 1, 6: 1, 7: 1, 8: 1, 9: 1, 5: 1 }).value, '13 分');
    assert.match(at({ 1: 1, 6: 1, 7: 1, 8: 1, 9: 1, 5: 1 }).interpretation, /^High CPP/);
  });

  test('極端與缺值', () => {
    assert.equal(run([0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0]).value, '-4 分');
    assert.equal(run([2, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]).value, '22 分');
    const opts = base();
    opts[11] = null;
    assert.equal(run(opts).interpretation, INCOMPLETE);
  });
});

describe('cha2ds2-vasc-score-atrial-fibrillation-stroke-risk｜CHA₂DS₂-VASc', () => {
  const S = 'cha2ds2-vasc-score-atrial-fibrillation-stroke-risk';
  const run = opts => page(F).score(S, opts);
  // 第 0 題 [<65, 65-74, ≥75]；第 1 題 [女 +1, 男 0]；其餘 [否, 是]

  test('文獻表格：70 歲女性＋高血壓 → 3 分，缺血性中風 3.2%、中風/TIA/栓塞 4.6%', () => {
    // 出處：權重 Lip GY, et al. Chest 2010；風險表 Friberg L, et al. Eur Heart J 2012（原文未能取得原文；
    // 20 個數值皆與次級轉載一致：PMC5515321 Table 10「Friberg et al, 2012」）。
    const o = run([1, 0, 0, 1, 0, 0, 0]);
    assert.equal(o.value, '3 分');
    assert.match(o.interpretation, /^Risk of ischemic stroke 3\.2%; Risk of stroke\/TIA\/systemic embolism 4\.6%/);
  });

  test('權重：年齡 ≥75 與中風史各 2 分；女性 1 分', () => {
    assert.equal(run([0, 1, 0, 0, 0, 0, 0]).value, '0 分');
    assert.equal(run([0, 0, 0, 0, 0, 0, 0]).value, '1 分');
    assert.equal(run([2, 1, 0, 0, 0, 0, 0]).value, '2 分');
    assert.equal(run([0, 1, 0, 0, 1, 0, 0]).value, '2 分');
  });

  test('極端：0 分與 9 分', () => {
    assert.match(run([0, 1, 0, 0, 0, 0, 0]).interpretation, /^Risk of ischemic stroke 0\.2%; .* 0\.3%/);
    const max = run([2, 0, 1, 1, 1, 1, 1]);
    assert.equal(max.value, '9 分');
    assert.match(max.interpretation, /^Risk of ischemic stroke 12\.2%; .* 17\.4%/);
  });

  test('缺值', () => {
    assert.equal(run([0, null, 0, 0, 0, 0, 0]).interpretation, INCOMPLETE);
  });
});

describe('corrected-qt-interval-qtc｜QTc', () => {
  const S = 'corrected-qt-interval-qtc';
  const ms = (formula, hr, qt) => page(F).form(S, { formula, hr: String(hr), qt_unit: 'msec', qt: String(qt) });

  test('公式範例：QT 400 ms、HR 75（RR 0.8 s）五種公式', () => {
    // 出處：Bazett 1920（QT/√RR）、Fridericia 1920（QT/∛RR）、Framingham／Sagie 1992（QT + 0.154(1−RR)）、
    // Hodges 1983（QT + 1.75(HR−60)）、Rautaharju（QT × (120+HR)/180）；MDCalc 48 所列公式，依公式手算。
    assert.equal(ms('Bazett', 75, 400).value, '447.2 ms');
    assert.equal(ms('Fridericia', 75, 400).value, '430.9 ms');
    assert.equal(ms('Framingham', 75, 400).value, '430.8 ms');
    assert.equal(ms('Hodges', 75, 400).value, '426.3 ms');
    assert.equal(ms('Rautaharju', 75, 400).value, '433.3 ms');
  });

  test('小格換算：25 mm/s 每小格 40 ms、50 mm/s 每小格 20 ms', () => {
    const boxes = speed => page(F).form(S, { formula: 'Bazett', hr: '60', qt_unit: 'small boxes', paper_speed: speed, qt: '10' });
    assert.equal(boxes('25').value, '400.0 ms');
    assert.equal(boxes('50').value, '200.0 ms');
  });

  test('判讀切點（HR 60 時各公式 QTc＝QT）：>500、≥480、≤360、≤320', () => {
    assert.match(ms('Bazett', 60, 501).interpretation, /^A QTc >500 ms/);
    assert.match(ms('Bazett', 60, 500).interpretation, /^QTc ≥480 ms/);
    assert.match(ms('Bazett', 60, 480).interpretation, /^QTc ≥480 ms/);
    assert.match(ms('Bazett', 60, 479).interpretation, /^No numeric QTc cutoff/);
    assert.match(ms('Bazett', 60, 361).interpretation, /^No numeric QTc cutoff/);
    assert.match(ms('Bazett', 60, 360).interpretation, /^QTc ≤360 ms/);
    assert.match(ms('Bazett', 60, 321).interpretation, /^QTc ≤360 ms/);
    assert.match(ms('Bazett', 60, 320).interpretation, /^QTc ≤320 ms/);
    for (const f of ['Fridericia', 'Framingham', 'Hodges', 'Rautaharju']) assert.equal(ms(f, 60, 450).value, '450.0 ms', f);
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { formula: 'Bazett', hr: '60', qt_unit: 'msec' }).interpretation, '請完成所有適用項目。');
    assert.equal(page(F).form(S, { hr: '60', qt_unit: 'msec', qt: '400' }).interpretation, INCOMPLETE);
    assert.equal(page(F).form(S, { formula: 'Bazett', hr: '60', qt_unit: 'small boxes', qt: '10' }).interpretation, INCOMPLETE); // 缺紙速
    assert.match(ms('Bazett', 19, 400).interpretation, /需介於 20–250 beats\/min/);
    assert.match(ms('Bazett', 60, 801).interpretation, /需介於 0.5–800/);
    assert.equal(ms('Bazett', 60, 99).interpretation, 'Converted QT interval must be 100–800 ms.');
    const tooFew = page(F).form(S, { formula: 'Bazett', hr: '60', qt_unit: 'small boxes', paper_speed: '50', qt: '4' }); // 80 ms
    assert.equal(tooFew.interpretation, 'Converted QT interval must be 100–800 ms.');
    assert.equal(ms('Bazett', 250, 200).value, '408.2 ms'); // RR 0.24 s
  });
});

describe('hear-score｜HEAR', () => {
  const S = 'hear-score';
  const run = opts => page(F).score(S, opts);

  test('文獻定義範例：中度可疑病史、ECG 正常、45–64 歲、1–2 個危險因子 → 3 分 Not low', () => {
    // 出處：Moumneh T, et al. Eur J Emerg Med 2021;28:292-298 摘要（「safety of a HEAR score <2 to rule-out non-STEMI without
    // troponin measurement」）；MDCalc 10655。依定義建構病例。
    const o = run([1, 0, 1, 1]);
    assert.equal(o.value, '3 分');
    assert.equal(o.interpretation, 'Not low');
  });

  test('切點：1｜2', () => {
    assert.equal(run([0, 0, 1, 0]).interpretation, 'Low');
    assert.equal(run([0, 0, 1, 1]).interpretation, 'Not low');
    assert.equal(run([0, 0, 0, 0]).interpretation, 'Low');
    assert.equal(run([2, 2, 2, 2]).value, '8 分');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, null, 0]).interpretation, INCOMPLETE);
  });
});

describe('killip-classification-heart-failure｜Killip', () => {
  const S = 'killip-classification-heart-failure';
  const run = i => page(F).score(S, [i]);

  test('各等級輸出（Killip T, Kimball JT. Am J Cardiol 1967；原文未能取得原文，死亡率數字未找到可驗證範例，此為現況紀錄）', () => {
    assert.equal(run(0).value, '1');
    assert.match(run(0).interpretation, /^Class I: 30-day mortality 2-3%/);
    assert.match(run(1).interpretation, /^Class II: 30-day mortality 5-12%/);
    assert.match(run(2).interpretation, /^Class III: 30-day mortality 10-20%; in-hospital mortality 38%/);
    assert.equal(run(3).value, '4');
    assert.equal(run(3).interpretation, 'Class IV: 30-day mortality 81%');
  });

  test('缺值', () => {
    assert.equal(page(F).calculate(S).interpretation, '請選擇一個等級。');
  });
});

describe('perc-rule-pulmonary-embolism｜PERC', () => {
  const S = 'perc-rule-pulmonary-embolism';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：八項皆陰性才為規則陰性', () => {
    // 出處：Kline JA, et al. J Thromb Haemost 2004;2:1247-1255；依定義建構病例。
    assert.match(run([0, 0, 0, 0, 0, 0, 0, 0]).interpretation, /^PERC：八項皆陰性/);
  });

  test('切點：任一項陽性即不能排除', () => {
    for (let i = 0; i < 8; i += 1) {
      const opts = Array(8).fill(0);
      opts[i] = 1;
      assert.match(run(opts).interpretation, /^PERC：任一項陽性/, `第 ${i} 項`);
    }
    assert.equal(run(Array(8).fill(1)).value, '8 分');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('pulmonary-embolism-severity-index-pesi｜PESI', () => {
  const S = 'pulmonary-embolism-severity-index-pesi';
  const NO = { male: 'No', cancer: 'No', hf: 'No', lung: 'No', pulse: 'No', sbp: 'No', rr: 'No', temp: 'No', mental: 'No', spo2: 'No' };
  const run = (age, yes = {}) => page(F).form(S, { age: String(age), ...NO, ...yes });

  test('文獻定義範例：80 歲女性、癌症、脈搏 ≥110 → 130 分 Class V', () => {
    // 出處：Aujesky D, et al. Am J Respir Crit Care Med 2005;172:1041-1046；年齡＋癌症 30＋脈搏 20 = 130；依定義建構病例。
    const o = run(80, { cancer: 'Yes', pulse: 'Yes' });
    assert.equal(o.value, '130 分');
    assert.match(o.interpretation, /^Class V, very high risk/);
  });

  test('權重：男 10、癌症 30、心衰 10、慢性肺病 10、脈搏 20、SBP 30、RR 20、體溫 20、意識 60、SaO₂ 20', () => {
    const w = { male: 10, cancer: 30, hf: 10, lung: 10, pulse: 20, sbp: 30, rr: 20, temp: 20, mental: 60, spo2: 20 };
    for (const [k, v] of Object.entries(w)) assert.equal(run(40, { [k]: 'Yes' }).value, `${40 + v} 分`, k);
  });

  test('分級切點：65｜66、85｜86、105｜106、125｜126', () => {
    const cls = age => run(age).interpretation.split(',')[0];
    assert.equal(cls(65), 'Class I');
    assert.equal(cls(66), 'Class II');
    assert.equal(cls(85), 'Class II');
    assert.equal(cls(86), 'Class III');
    assert.equal(cls(105), 'Class III');
    assert.equal(cls(106), 'Class IV');
    assert.equal(cls(125), 'Class IV');
    assert.equal(cls(126), 'Class V');
  });

  test('非整數年齡：65.5 歲 → 65.5 分，落在 Class II', () => {
    // 年齡欄位允許小數；原始量表以「年」計，頁面不取整。此為現況紀錄。
    const o = run(65.5);
    assert.equal(o.value, '65.5 分');
    assert.match(o.interpretation, /^Class II/);
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { ...NO }).interpretation, '請完成所有適用項目。');
    assert.equal(page(F).form(S, { age: '70', male: 'No' }).interpretation, INCOMPLETE);
    assert.match(run(131).interpretation, /需介於 0–130/);
    assert.equal(run(130, Object.fromEntries(Object.keys(NO).map(k => [k, 'Yes']))).value, '360 分');
  });
});

describe('timi-risk-score-stemi｜TIMI STEMI', () => {
  const S = 'timi-risk-score-stemi';
  const run = opts => page(F).score(S, opts);

  test('文獻表格：70 歲、高血壓、前壁 STE → 4 分，30 天死亡率 7.3%', () => {
    // 出處：Morrow DA, et al. Circulation 2000;102:2031-2037（權重；0 分 <1%、>8 分 35.9% 見摘要與 ACC 摘要）；
    // 1–8 分各分數死亡率在原文圖 2，僅經次級來源核對。依權重建構病例 2 + 1 + 1 = 4。
    const o = run([1, 1, 0, 0, 0, 0, 1, 0]);
    assert.equal(o.value, '4 分');
    assert.match(o.interpretation, /^30-day mortality 7\.3% \(score 4\)/);
  });

  test('表格端點：0、8、>8', () => {
    assert.match(run([0, 0, 0, 0, 0, 0, 0, 0]).interpretation, /^30-day mortality 0\.8% \(score 0\)/);
    const eight = run([2, 0, 1, 1, 0, 0, 0, 0]); // 3 + 3 + 2
    assert.equal(eight.value, '8 分');
    assert.match(eight.interpretation, /^30-day mortality 26\.8% \(score 8\)/);
    const nine = run([2, 1, 1, 1, 0, 0, 0, 0]);
    assert.equal(nine.value, '9 分');
    assert.match(nine.interpretation, /^30-day mortality 35\.9% \(score >8\)/);
    assert.equal(run([2, 1, 1, 1, 1, 1, 1, 1]).value, '14 分');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('aortic-dissection-detection-risk-score-add-rs｜ADD-RS', () => {
  const S = 'aortic-dissection-detection-risk-score-add-rs';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：≤1 先驗 D-dimer、>1 直接影像（ADvISED 流程）', () => {
    // 出處：Rogers AM, et al. Circulation 2011（ADD-RS）；Nazerian P, et al. Circulation 2018（ADvISED）；依定義建構病例。
    assert.match(run([0, 1, 0]).interpretation, /^ADD-RS ≤1/);
    assert.match(run([1, 1, 0]).interpretation, /^ADD-RS >1/);
  });

  test('切點與極端', () => {
    assert.equal(run([0, 0, 0]).value, '0 分');
    assert.match(run([0, 0, 0]).interpretation, /^ADD-RS ≤1/);
    assert.equal(run([1, 1, 1]).value, '3 分');
    assert.match(run([1, 1, 1]).interpretation, /^ADD-RS >1/);
  });

  test('缺值', () => {
    assert.equal(run([0, null, 0]).interpretation, INCOMPLETE);
  });
});

describe('geneva-score-revised-pulmonary-embolism｜Revised Geneva', () => {
  const S = 'geneva-score-revised-pulmonary-embolism';
  const run = opts => page(F).score(S, opts);
  // 第 6 題心率 [<75 0, 75-94 3, ≥95 5]

  test('文獻定義範例：70 歲、HR 80 → 4 分，intermediate（盛行率 28%）', () => {
    // 出處：Le Gal G, et al. Ann Intern Med 2006;144:165-171；依權重與分層建構病例 1 + 3 = 4。
    const o = run([1, 0, 0, 0, 0, 0, 1, 0]);
    assert.equal(o.value, '4 分');
    assert.match(o.interpretation, /^Intermediate probability \(4–10 points\): PE prevalence 28%/);
  });

  test('切點：3｜4、10｜11', () => {
    assert.match(run([0, 1, 0, 0, 0, 0, 0, 0]).interpretation, /^Low probability/); // 3
    assert.equal(run([0, 1, 0, 0, 0, 0, 0, 0]).value, '3 分');
    const ten = run([0, 1, 1, 0, 0, 0, 2, 0]); // 3 + 2 + 5
    assert.equal(ten.value, '10 分');
    assert.match(ten.interpretation, /^Intermediate/);
    const eleven = run([1, 1, 1, 0, 0, 0, 2, 0]);
    assert.equal(eleven.value, '11 分');
    assert.match(eleven.interpretation, /^High probability \(≥11 points\): PE prevalence 74%/);
  });

  test('極端與缺值', () => {
    assert.equal(run([1, 1, 1, 1, 1, 1, 2, 1]).value, '22 分');
    assert.equal(run([0, 0, 0, 0, 0, 0, null, 0]).interpretation, INCOMPLETE);
  });
});

describe('wells-criteria-dvt｜Wells DVT', () => {
  const S = 'wells-criteria-dvt';
  const run = opts => page(F).score(S, opts);

  test('文獻定義範例：活動性癌症＋整隻腳腫 → 2 分 likely', () => {
    // 出處：Wells PS, et al. N Engl J Med 2003;349:1227-1235；兩層表依 NHS 改編版（「DVT likely 2 points or more」）。
    // 註：MDCalc 另呈現三層版本（≤0 / 1–2 / ≥3），頁面採兩層。依定義建構病例。
    const o = run([1, 0, 0, 0, 1, 0, 0, 0, 0, 0]);
    assert.equal(o.value, '2 分');
    assert.equal(o.interpretation, 'Probability of deep-vein thrombosis is likely.');
  });

  test('切點：1｜2；替代診斷 -2', () => {
    assert.equal(run([1, 0, 0, 0, 0, 0, 0, 0, 0, 0]).interpretation, 'Probability of deep-vein thrombosis is unlikely.');
    assert.equal(run([1, 0, 0, 0, 1, 0, 0, 0, 0, 1]).value, '0 分');
    assert.equal(run([0, 0, 0, 0, 0, 0, 0, 0, 0, 1]).value, '-2 分');
  });

  test('極端與缺值', () => {
    assert.equal(run([1, 1, 1, 1, 1, 1, 1, 1, 1, 0]).value, '9 分');
    assert.equal(run([0, 0, 0, 0, 0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('wells-criteria-pulmonary-embolism｜Wells PE', () => {
  const S = 'wells-criteria-pulmonary-embolism';
  const run = opts => page(F).score(S, opts);
  // 第 0、1 題 3 分；第 2–4 題 1.5 分；第 5、6 題 1 分

  test('文獻定義範例：DVT 徵象＋HR >100 → 4.5 分，moderate；PE likely', () => {
    // 出處：Wells PS, et al. Thromb Haemost 2000;83:416-420 摘要（PMID 10744147）：「low probability if the score was <2.0,
    // moderate of the score was 2.0 to 6.0 and high if the score was over 6.0」、「unlikely … scores < or =4.0」。依定義建構病例。
    const o = run([1, 0, 1, 0, 0, 0, 0]);
    assert.equal(o.value, '4.5 分');
    assert.equal(o.interpretation, 'Three-Tier Model: Moderate Risk; Two Tier Model: PE Likely (with CTPA)');
  });

  test('二層切點：4｜4.5', () => {
    assert.match(run([1, 0, 0, 0, 0, 1, 0]).interpretation, /Two Tier Model: PE Unlikely/); // 4
    assert.match(run([1, 0, 1, 0, 0, 0, 0]).interpretation, /Two Tier Model: PE Likely/); // 4.5
  });

  test('文獻定義：1.5 分（單一 1.5 分項目）為三層 Low（2026-10-25 修正，原為 Moderate）', () => {
    // 出處：Wells 2000（同上）低機率定義為 <2.0；MDCalc 115：「low risk (<2 points: 1.3% incidence PE)」。
    // 病例：僅 HR >100（1.5 分）。
    const o = run([0, 0, 1, 0, 0, 0, 0]);
    assert.equal(o.value, '1.5 分');
    assert.match(o.interpretation, /^Three-Tier Model: Low Risk; Two Tier Model: PE Unlikely/);
  });

  test('三層切點：1｜2、6｜6.5', () => {
    assert.match(run([0, 0, 0, 0, 0, 1, 0]).interpretation, /^Three-Tier Model: Low Risk/); // 1
    assert.match(run([0, 0, 0, 0, 0, 1, 1]).interpretation, /^Three-Tier Model: Moderate Risk/); // 2
    assert.match(run([1, 1, 0, 0, 0, 0, 0]).interpretation, /^Three-Tier Model: Moderate Risk/); // 6
    assert.match(run([1, 0, 1, 0, 0, 1, 1]).interpretation, /^Three-Tier Model: High Risk/); // 6.5
  });

  test('極端與缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, 0, 0]).value, '0 分');
    assert.equal(run([1, 1, 1, 1, 1, 1, 1]).value, '12.5 分');
    assert.equal(run([1, 1, 1, 1, 1, 1, null]).interpretation, INCOMPLETE);
  });
});
