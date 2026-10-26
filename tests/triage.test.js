'use strict';
// 檢傷與流程（calc-triage.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-triage.html';
const INCOMPLETE = '請完成所有項目。';
const NUM_MISSING = '請完成所有適用項目。';

describe('ideal-body-weight-adjusted-body-weight｜IBW／ABW', () => {
  const S = 'ideal-body-weight-adjusted-body-weight';
  const run = (sex, height, weight) => page(F).form(S, { sex, height: String(height), weight: String(weight) });

  test('公式範例：男性 175 cm、100 kg → IBW 70.5 kg、ABW 82.3 kg', () => {
    // 出處：MDCalc 68：「IBW (men) = 50 kg + 2.3 kg x (height, in - 60)」、「ABW = IBW + 0.4 x (actual body weight - IBW)」；
    // Devine BJ. Drug Intell Clin Pharm 1974 原文未能取得原文。依公式手算。
    const o = run('Male', 175, 100);
    assert.equal(o.value, 'IBW 70.5 kg；ABW 82.3 kg');
    assert.equal(o.interpretation, 'ABW applies because actual body weight > IBW.');
  });

  test('女性公式；體重 ≤ IBW 時不計 ABW', () => {
    assert.equal(run('Female', 160, 50).value, 'IBW 52.4 kg');
    assert.equal(run('Male', 175, 60).interpretation, 'ABW not applicable: actual body weight is not greater than IBW.');
  });

  test('邊界：身高 60 吋（152.4 cm）時 IBW 為 50／45.5 kg；體重剛好等於 IBW', () => {
    assert.equal(run('Male', 152.4, 50).value, 'IBW 50.0 kg');
    assert.equal(run('Male', 152.4, 50).interpretation, 'ABW not applicable: actual body weight is not greater than IBW.');
    assert.equal(run('Male', 152.4, 50.1).value, 'IBW 50.0 kg；ABW 50.0 kg');
    assert.equal(run('Female', 152.4, 80).value, 'IBW 45.5 kg；ABW 59.3 kg');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { height: '170', weight: '70' }).interpretation, INCOMPLETE);
    assert.equal(page(F).form(S, { sex: 'Male', height: '170' }).interpretation, NUM_MISSING);
    assert.match(run('Male', 150, 70).interpretation, /需介於 152.4–230 cm/);
    assert.match(run('Male', 170, 401).interpretation, /需介於 1–400 kg/);
  });
});

describe('modified-early-warning-score-mews-clinical-deterioration｜MEWS', () => {
  const S = 'modified-early-warning-score-mews-clinical-deterioration';
  const run = opts => page(F).score(S, opts);
  // 選項序號：SBP [≤70 3, 71-80 2, 81-100 1, 101-199 0, ≥200 2]；HR [<40 2, 41-50 1, 51-100 0, 101-110 1, 111-129 2, ≥130 3]；
  // RR [<9 2, 9-14 0, 15-20 1, 21-29 2, ≥30 3]；體溫 [<35 2, 35-38.4 0, ≥38.5 2]；AVPU [A 0, V 1, P 2, U 3]
  const normal = [3, 2, 1, 1, 0]; // 全部 0 分（RR 9-14）

  test('文獻切點：≥5 分死亡或入 ICU 風險增加', () => {
    // 出處：Subbe CP, et al. QJM 2001;94:521-526 摘要：「Scores of 5 or more were associated with increased risk of death」；
    // 選項分數依 MDCalc 1875（原文表格未能取得原文；其他版本見報告）。
    const o = run([2, 4, 3, 1, 0]); // 1 + 2 + 2 + 0 + 0 = 5
    assert.equal(o.value, '5 分');
    assert.equal(o.interpretation, 'Score ≥5: increased likelihood of death or ICU admission.');
  });

  test('切點：4｜5；任一單項＝3 的紅旗', () => {
    assert.equal(run([2, 4, 2, 1, 0]).value, '4 分');
    assert.equal(run([2, 4, 2, 1, 0]).interpretation, 'Score <5 and no single physiological parameter scored +3.');
    assert.equal(run([0, 2, 1, 1, 0]).interpretation, '任一單項＝3：紅旗；consider higher level of care for patient.'); // SBP ≤70
    assert.equal(run(normal).value, '0 分');
    assert.equal(run([3, 2, 2, 1, 0]).value, '1 分'); // RR 15-20 為 1 分（MEWS 特有）
  });

  test('極端與缺值', () => {
    assert.equal(run(normal).interpretation, 'Score <5 and no single physiological parameter scored +3.');
    assert.equal(run([0, 5, 4, 0, 3]).value, '14 分');
    assert.equal(run([3, 2, 1, 1, null]).interpretation, INCOMPLETE);
  });
});

describe('national-early-warning-score-news｜NEWS（2012）', () => {
  const S = 'national-early-warning-score-news';
  const run = opts => page(F).score(S, opts);
  // 正常值選項：RR 12-20 [2]、SpO₂ ≥96 [3]、O₂ 否 [0]、體溫 36.1-38 [2]、SBP 111-219 [3]、HR 51-90 [2]、AVPU A [0]
  const normal = () => [2, 3, 0, 2, 3, 2, 0];
  const with_ = changes => { const o = normal(); Object.entries(changes).forEach(([i, v]) => { o[i] = v; }); return run(o); };

  test('官方範例：RR 21-24＋SpO₂ 94-95＋給氧 → 5 分 Medium', () => {
    // 出處：Royal College of Physicians. NEWS 2012 報告 Chart 1（權重；給氧 +2）與 Chart 2（5–6 或單項 3 → medium、≥7 → high）。
    const o = with_({ 0: 3, 1: 2, 2: 1 });
    assert.equal(o.value, '5 分');
    assert.equal(o.interpretation, 'Medium score (NEWS 5–6).');
  });

  test('切點：4｜5、6｜7；單項 3 分 → RED', () => {
    assert.equal(with_({ 0: 3, 3: 1, 5: 3 }).interpretation, 'Low score (NEWS 1–4).'); // 2 + 1 + 1 = 4
    assert.equal(with_({ 0: 3, 1: 2, 2: 1, 3: 1 }).interpretation, 'Medium score (NEWS 5–6).'); // 6
    assert.equal(with_({ 0: 3, 1: 2, 2: 1, 3: 1, 5: 3 }).interpretation, 'High score (NEWS ≥7).'); // 7
    assert.equal(with_({ 5: 5 }).interpretation, 'Medium RED score；紅旗分層。'); // HR ≥131 = 3
    assert.equal(with_({ 6: 1 }).value, '3 分');
  });

  test('0 分為 Low（RCP 2012 Chart 2：「0 … Aggregate 1–4 → Low」）（2026-10-25 修正）', () => {
    assert.equal(run(normal()).value, '0 分');
    assert.equal(run(normal()).interpretation, 'Low score (NEWS 0).');
  });

  test('極端與缺值', () => {
    assert.equal(run([0, 0, 1, 0, 0, 0, 1]).value, '20 分');
    const o = normal();
    o[6] = null;
    assert.equal(run(o).interpretation, INCOMPLETE);
  });
});

describe('national-early-warning-score-news-2｜NEWS2', () => {
  const S = 'national-early-warning-score-news-2';
  // 正常值：RR 12-20 [2]、Scale 1 ≥96 [3]、空氣 [1]、體溫 36.1-38 [2]、SBP 111-219 [3]、HR 51-90 [2]、Alert [0]
  const scale1 = (changes = {}) => {
    const o = [2, null, 3, null, 1, 2, 3, 2, 0];
    Object.entries(changes).forEach(([i, v]) => { o[i] = v; });
    return page(F).score(S, o, { hypercapnic: 'No' });
  };
  const scale2 = (changes = {}) => {
    const o = [2, null, null, 7, 1, 2, 3, 2, 0];
    Object.entries(changes).forEach(([i, v]) => { o[i] = v; });
    return page(F).score(S, o, { hypercapnic: 'Yes' });
  };

  test('官方範例：RR 21-24＋SpO₂ 94-95（Scale 1）→ 3 分 Low', () => {
    // 出處：RCP. NEWS2 2017 Chart 1（https://www.rcp.ac.uk/media/alxev00t/news2-chart-1_the-news-scoring-system_0_0.pdf）
    // 與 Chart 2（0–4 Low、單項 3 Low–medium、5–6 Medium、≥7 High）。依定義建構病例。
    const o = scale1({ 0: 3, 2: 2 });
    assert.equal(o.value, '3 分');
    assert.equal(o.interpretation, 'Low');
  });

  test('切點：4｜5、6｜7；單項 3 → Low-medium', () => {
    assert.equal(scale1({ 0: 3, 2: 2, 5: 3 }).interpretation, 'Low'); // 4
    assert.equal(scale1({ 0: 3, 2: 2, 7: 4 }).interpretation, 'Medium'); // 2 + 1 + 2 = 5
    assert.equal(scale1({ 0: 3, 2: 2, 7: 5 }).value, '6 分');
    assert.equal(scale1({ 0: 3, 2: 2, 7: 5 }).interpretation, 'Medium');
    assert.equal(scale1({ 0: 3, 2: 2, 4: 0, 7: 5 }).interpretation, 'High'); // + 給氧 2 = 8
    assert.equal(scale1({ 8: 1 }).interpretation, '任一單項＝3：Low-medium red-flag branch'); // 新發意識混亂
    assert.equal(scale1().value, '0 分');
    assert.equal(scale1().interpretation, 'Low');
  });

  test('Scale 2（高碳酸血症呼吸衰竭）', () => {
    assert.equal(scale2().value, '0 分'); // ≥93% on room air
    assert.equal(scale2({ 3: 3 }).value, '0 分'); // 88-92%
    const o2 = scale2({ 3: 5, 4: 0 }); // 95-96% on O₂（2）＋給氧（2）
    assert.equal(o2.value, '4 分');
    assert.equal(o2.interpretation, 'Low');
    assert.equal(scale2({ 3: 6, 4: 0, 0: 3 }).interpretation, 'High'); // 3 + 2 + 2 = 7
    assert.equal(scale2({ 3: 0 }).interpretation, '任一單項＝3：Low-medium red-flag branch'); // ≤83%
  });

  test('Scale 2 與給氧狀態矛盾時拒絕計算', () => {
    assert.equal(scale2({ 4: 0 }).interpretation, 'SpO₂ Scale 2 與氧氣狀態矛盾，請重新選擇。'); // ≥93% on room air 卻勾給氧
    assert.equal(scale2({ 3: 4 }).interpretation, 'SpO₂ Scale 2 與氧氣狀態矛盾，請重新選擇。'); // 93-94% on O₂ 卻勾空氣
  });

  test('缺值', () => {
    assert.equal(page(F).score(S, [2, null, 3, null, 1, 2, 3, 2, 0]).interpretation, INCOMPLETE); // 未答高碳酸血症
    assert.equal(scale1({ 2: null }).interpretation, '請完成目前尺度的所有項目。');
    assert.equal(scale2({ 3: null }).interpretation, '請完成目前尺度的所有項目。');
  });
});

describe('urine-output-fluid-balance｜尿量與輸入輸出', () => {
  const S = 'urine-output-fluid-balance';
  const run = (weight, urine, hours, intake) => page(F).form(S, { weight: String(weight), urine: String(urine), hours: String(hours), intake: String(intake) });

  const NOTE = '（以輸入時段的平均值判讀，無法排除其中較短時段已符合 KDIGO 標準或更高分期；KDIGO 2012）';
  const SOURCE = 'KDIGO Acute Kidney Injury Work Group. KDIGO Clinical Practice Guideline for Acute Kidney Injury. Kidney Int Suppl. 2012;2(1):1-138.';

  test('公式範例：70 kg、12 h 尿 420 mL、輸入 1000 mL → 0.50 mL/kg/hr、+580 mL', () => {
    // 尿量＝尿量 / 體重 / 小時、平衡＝輸入 − 尿量（算術定義）。
    // 判讀依 KDIGO 2012 AKI 指引尿量分期（2026-10-25 修正；原本的「0.5–1.0 Reduced」「>1.0 Normal」找不到來源，且未考慮持續時間）：
    // Stage 1 <0.5 mL/kg/h 持續 6–12 h；Stage 2 <0.5 持續 ≥12 h；Stage 3 <0.3 持續 ≥24 h 或無尿 ≥12 h。
    const o = run(70, 420, 12, 1000);
    assert.equal(o.value, '0.50 mL/kg/hr；Fluid balance +580 mL');
    assert.equal(o.interpretation, '≥0.5 mL/kg/hr: average over this period does not meet the KDIGO urine-output criterion' + NOTE);
  });

  test('KDIGO 分期：持續時間 6、12、24 小時與 0.5、0.3 mL/kg/hr', () => {
    assert.equal(run(70, 419, 12, 0).interpretation, 'KDIGO stage 2 urine-output criterion: <0.5 mL/kg/hr for ≥12 h' + NOTE); // 0.499
    assert.equal(run(70, 200, 6, 0).interpretation, 'KDIGO stage 1 urine-output criterion: <0.5 mL/kg/hr for 6–12 h' + NOTE); // 0.48
    assert.equal(run(70, 200, 11.5, 0).interpretation, 'KDIGO stage 1 urine-output criterion: <0.5 mL/kg/hr for 6–12 h' + NOTE);
    assert.equal(run(70, 200, 5.9, 0).interpretation, '<0.5 mL/kg/hr, but KDIGO requires ≥6 h of low output' + NOTE);
    assert.equal(run(70, 500, 24, 0).interpretation, 'KDIGO stage 3 urine-output criterion: <0.3 mL/kg/hr for ≥24 h' + NOTE); // 0.298
    assert.equal(run(70, 510, 24, 0).interpretation, 'KDIGO stage 2 urine-output criterion: <0.5 mL/kg/hr for ≥12 h' + NOTE); // 0.304
    assert.equal(run(70, 400, 20, 0).interpretation, 'KDIGO stage 2 urine-output criterion: <0.5 mL/kg/hr for ≥12 h' + NOTE); // 0.29 但未滿 24 h
    assert.equal(run(70, 0, 12, 0).interpretation, 'KDIGO stage 3 urine-output criterion: anuria for ≥12 h' + NOTE);
    assert.equal(run(70, 0, 11, 0).interpretation, 'KDIGO stage 1 urine-output criterion: <0.5 mL/kg/hr for 6–12 h' + NOTE);
    assert.equal(run(70, 840, 12, 0).interpretation, '≥0.5 mL/kg/hr: average over this period does not meet the KDIGO urine-output criterion' + NOTE); // 1.00
  });

  test('長時段平均的限制：平均未達標準時，判讀不可寫成「已排除」', () => {
    // 70 kg、24 h 共 1000 mL → 平均 0.60，但其中可能含連續 12 h 無尿（KDIGO stage 3），所以措辭只說「此時段平均未達標準」，並由 NOTE 提醒。
    const o = run(70, 1000, 24, 0);
    assert.equal(o.value, '0.60 mL/kg/hr；Fluid balance -1000 mL');
    assert.equal(o.interpretation, '≥0.5 mL/kg/hr: average over this period does not meet the KDIGO urine-output criterion' + NOTE);
  });

  test('引用出處為 KDIGO 2012', () => {
    // 產生器格式：「採用來源；原始文獻」
    assert.equal(page(F).card(S).querySelector('[data-role="sources"]').textContent, 'KDIGO 2012；' + SOURCE);
    assert.equal(page(F).def(S).source_citation, SOURCE);
    assert.equal(page(F).card(S).querySelector('[data-role="source-count"]').textContent, '1');
  });

  test('負平衡與零尿量', () => {
    assert.equal(run(70, 0, 6, 500).value, '0.00 mL/kg/hr；Fluid balance +500 mL');
    assert.equal(run(70, 1500, 6, 500).value, '3.57 mL/kg/hr；Fluid balance -1000 mL');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { weight: '70', urine: '500', hours: '12' }).interpretation, NUM_MISSING);
    assert.match(run(70, 500, 0.4, 0).interpretation, /需介於 0.5–168 hours/);
    assert.match(run(0.4, 500, 12, 0).interpretation, /需介於 0.5–300 kg/);
  });
});

describe('richmond-agitation-sedation-scale-rass｜RASS', () => {
  const S = 'richmond-agitation-sedation-scale-rass';
  const run = i => page(F).score(S, [i]);
  // 選項序號 0 → +4、4 → 0、6 → −2、9 → −5

  test('量表定義與 MDCalc 目標（−2 至 0）', () => {
    // 出處：Ely EW, et al. JAMA 2003;289:2983-2991 RASS 表（十個等級）；目標 −2 至 0 依 MDCalc 1872。
    assert.equal(run(6).value, '-2');
    assert.equal(run(6).interpretation, 'Target score of −2 to 0 avoids both over and under sedation.');
    assert.equal(run(4).value, '0');
    assert.equal(run(4).interpretation, 'Target score of −2 to 0 avoids both over and under sedation.');
  });

  test('切點：+1 與 −3 不在目標內', () => {
    assert.equal(run(3).value, '1');
    assert.equal(run(3).interpretation, 'Outside the specified target score of −2 to 0.');
    assert.equal(run(7).value, '-3');
    assert.equal(run(7).interpretation, 'Outside the specified target score of −2 to 0.');
    assert.equal(run(0).value, '4');
    assert.equal(run(9).value, '-5');
  });

  test('缺值', () => {
    assert.equal(page(F).calculate(S).interpretation, '請選擇一個等級。');
  });
});
