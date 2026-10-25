'use strict';
// 中毒／精神（calc-tox.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-tox.html';
const INCOMPLETE = '請完成所有項目。';
const NUM_MISSING = '請完成所有適用項目。';

describe('brief-alcohol-withdrawal-scale-baws｜BAWS', () => {
  const S = 'brief-alcohol-withdrawal-scale-baws';
  const run = opts => page(F).score(S, opts);

  test('文獻切點：≥3 預測 CIWA-Ar ≥8（敏感度 85.3%、特異度 65.8%）', () => {
    // 出處：Rastegar DA, et al. Subst Abus 2017;38:394-400 摘要：「A BAWS score of 3 or more predicted CIWA-Ar score ≥8 with a
    // sensitivity of 85.3% and specificity of 65.8%」。
    const o = run([1, 1, 1, 0, 0]);
    assert.equal(o.value, '3 分');
    assert.match(o.interpretation, /^BAWS ≥3: predicted CIWA-Ar ≥8 with sensitivity 85\.3% and specificity 65\.8%/);
  });

  test('切點：2｜3', () => {
    assert.match(run([1, 1, 0, 0, 0]).interpretation, /^BAWS <3/);
    assert.equal(run([0, 0, 0, 0, 0]).value, '0 分');
    assert.equal(run([3, 3, 3, 3, 3]).value, '15 分');
  });

  test('缺值', () => {
    assert.equal(run([1, 1, 1, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('ciwa-ar-alcohol-withdrawal｜CIWA-Ar', () => {
  const S = 'ciwa-ar-alcohol-withdrawal';
  const run = opts => page(F).score(S, opts);
  const at = total => { // 依序把分數填進前幾題（每題 0–7，第 9 題 0–4）
    const opts = Array(10).fill(0);
    let left = total;
    for (let i = 0; i < 10 && left > 0; i += 1) { const max = i === 9 ? 4 : 7; opts[i] = Math.min(max, left); left -= opts[i]; }
    return run(opts);
  };

  test('MDCalc 分層範例：9 分 → Mild to moderate', () => {
    // 出處：Sullivan JT, et al. Br J Addict 1989;84:1353-1357（量表本文最高 67 分）；分層依 MDCalc 1736（≤8 / 9–19 / ≥20）。
    assert.equal(at(9).value, '9 分');
    assert.equal(at(9).interpretation, 'Mild to moderate withdrawal');
  });

  test('切點：8｜9、19｜20', () => {
    assert.equal(at(8).interpretation, 'Absent or minimal withdrawal');
    assert.equal(at(19).interpretation, 'Mild to moderate withdrawal');
    assert.equal(at(20).interpretation, 'Severe withdrawal');
  });

  test('極端與缺值', () => {
    assert.equal(at(0).value, '0 分');
    assert.equal(at(67).value, '67 分');
    assert.equal(run([0, 0, 0, 0, 0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('columbia-suicide-severity-rating-scale-c-ssrs｜C-SSRS', () => {
  const S = 'columbia-suicide-severity-rating-scale-c-ssrs';
  const run = c => page(F).tree(S, c);

  test('MDCalc 分級表範例', () => {
    // 出處：MDCalc 10169（C-SSRS 急診篩檢版）：Q1/Q2 only → Low；Q3 或 Q6 >3 個月 → Moderate；Q4/Q5 或 Q6 3 個月內 → High。
    assert.equal(run(['YES', 'NO', 'No']).value, 'Low suicide risk');
    assert.equal(run(['YES', 'YES', 'YES', 'NO', 'NO', 'No']).value, 'Moderate suicide risk');
    assert.equal(run(['NO', 'NO', 'Yes — more than 3 months ago']).value, 'Moderate suicide risk');
    assert.equal(run(['NO', 'YES', 'NO', 'YES', 'NO', 'No']).value, 'High suicide risk');
    assert.equal(run(['NO', 'NO', 'Yes — within the past 3 months']).value, 'High suicide risk');
  });

  test('Q2 為 YES 時才問 Q3–Q5；全否 → 無風險分級', () => {
    const o = run(['NO', 'NO']);
    assert.match(o.question, /^6\./);
    assert.equal(run(['NO', 'NO', 'No']).value, 'No listed C-SSRS risk tier');
    assert.equal(run(['YES', 'YES', 'NO', 'NO', 'NO', 'No']).value, 'Low suicide risk');
    assert.equal(run(['YES', 'YES', 'NO', 'NO', 'YES', 'No']).value, 'High suicide risk');
  });

  test('處置建議文字', () => {
    assert.equal(run(['YES', 'NO', 'No']).interpretation, 'Behavioral health referral at discharge');
    assert.equal(run(['NO', 'NO', 'Yes — within the past 3 months']).interpretation, 'Immediate notification of physician and/or behavioral health and patient safety precautions');
  });
});

describe('heads-ed｜HEADS-ED', () => {
  const S = 'heads-ed';
  const run = opts => page(F).score(S, opts);
  const MET = /^HEADS-ED：總分 ≥8 或自殺項＝2 → 達專科/;
  const NOT = /^HEADS-ED：未達轉介門檻/;

  test('MDCalc 定義範例：總分 ≥8 或自殺項＝2 即達轉介門檻', () => {
    // 出處：Cappelli M, et al. Pediatrics 2012;130:e321-e327；門檻文字依 MDCalc 10463。
    assert.match(run([1, 1, 1, 1, 2, 1, 0]).interpretation, MET); // 7 分但自殺項＝2
    assert.match(run([2, 1, 1, 1, 1, 1, 1]).interpretation, MET); // 8 分
  });

  test('切點：7 分且自殺項 <2 → 未達', () => {
    assert.match(run([2, 1, 1, 1, 1, 1, 0]).interpretation, NOT);
    assert.equal(run([2, 1, 1, 1, 1, 1, 0]).value, '7 分');
    assert.match(run([0, 0, 0, 0, 0, 0, 0]).interpretation, NOT);
    assert.equal(run([2, 2, 2, 2, 2, 2, 2]).value, '14 分');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('acetaminophen-overdose-nac-dosing｜Acetaminophen NAC 兩袋法', () => {
  const S = 'acetaminophen-overdose-nac-dosing';
  const STD = 'Standard acetylcysteine infusion';
  const DBL = 'Double dose acetylcysteine infusion';
  const run = (regimen, w) => page(F).form(S, { regimen, weight: String(w) });

  test('公開文獻範例：70 kg 標準兩袋 → 14000 mg / 7000 mg', () => {
    // 出處：Wong A, Graudins A. Clin Toxicol 2016;54:115-119（「200 mg/kg over 4 h followed by 100 mg/kg over 16 h」）；
    // Chiew AL, et al. Med J Aust 2020;212:175-183 Box 7。院內流程（高醫 2021/12/09）本身無法查核。
    const o = run(STD, 70);
    assert.equal(o.value, '第一袋 14000 mg（Encore 300 mg/3 mL ≈ 46.7 支）in D5W/NS 500 mL IVD over 4 h；第二袋 7000 mg（≈ 23.3 支）in D5W/NS 1000 mL IVD over 16 h');
    assert.match(o.interpretation, /GPT>50 U\/L 或 Acetaminophen>10 μg\/mL → 續 12 h/);
  });

  test('加倍劑量：第二袋改 200 mg/kg（Chiew 2020：「doubled to 200 mg/kg … over 16 hours」）', () => {
    assert.match(run(DBL, 70).value, /^第一袋 14000 mg.*第二袋 14000 mg（≈ 46.7 支）/);
  });

  test('邊界：110 kg 時與 ANZ 指引上限相同', () => {
    assert.match(run(STD, 110).value, /^第一袋 22000 mg.*第二袋 11000 mg/);
  });

  test('與 ANZ 指引不一致：體重 >110 kg 時無 22 g／11 g 上限', { todo: '見 TEST_REPORT.md：NAC 無劑量上限（院內流程可能有意不同）' }, () => {
    // 出處：Chiew 2020 Box 7：「acetylcysteine 200 mg/kg (maximum 22 g)」、「100 mg/kg (maximum 11 g)」，成人體重上限 110 kg。
    assert.match(run(STD, 150).value, /^第一袋 22000 mg.*第二袋 11000 mg/);
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { weight: '70' }).interpretation, INCOMPLETE);
    assert.equal(page(F).form(S, { regimen: STD }).interpretation, NUM_MISSING);
    assert.match(run(STD, 4).interpretation, /需介於 5–300 kg/);
    assert.match(run(STD, 5).value, /^第一袋 1000 mg.*第二袋 500 mg/);
  });
});
