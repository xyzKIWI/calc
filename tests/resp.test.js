'use strict';
// 呼吸／感染（calc-resp.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-resp.html';
const INCOMPLETE = '請完成所有項目。';
const NUM_MISSING = '請完成所有適用項目。';
const NO_STRAT = '本評分之規格未提供風險分層。';

describe('endotracheal-tube-ett-depth-tidal-volume-calculator｜氣管內管深度與潮氣量', () => {
  const S = 'endotracheal-tube-ett-depth-tidal-volume-calculator';
  const run = (sex, height) => page(F).form(S, { sex, height: String(height) });

  test('公式範例：男性 168 cm → 深度 20.8 cm', () => {
    // 出處：Techanivate A, et al. J Med Assoc Thai 2005;88:1838-1846（Chula formula：4 + 身高/10 cm）；
    // IBW 依 ARDSNet（男 50、女 45.5 + 2.3 ×（身高 inch − 60））；潮氣量 6–8 mL/kg IBW。依公式手算。
    const o = run('Male', 168);
    assert.equal(o.value, 'Depth 20.8 cm；IBW 64.1 kg；Tidal volume 385–513 mL');
    assert.equal(o.interpretation, NO_STRAT);
  });

  test('女性 160 cm、男性 170 cm', () => {
    assert.equal(run('Female', 160).value, 'Depth 20.0 cm；IBW 52.4 kg；Tidal volume 314–419 mL');
    assert.equal(run('Male', 170).value, 'Depth 21.0 cm；IBW 65.9 kg；Tidal volume 396–527 mL'); // 8 × 65.937 = 527.496
  });

  test('邊界：身高下限 152.4 cm（60 吋）時 IBW 等於基準值', () => {
    assert.equal(run('Male', 152.4).value, 'Depth 19.2 cm；IBW 50.0 kg；Tidal volume 300–400 mL');
    assert.equal(run('Female', 152.4).value, 'Depth 19.2 cm；IBW 45.5 kg；Tidal volume 273–364 mL');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { height: '170' }).interpretation, INCOMPLETE);
    assert.equal(page(F).form(S, { sex: 'Male' }).interpretation, NUM_MISSING);
    assert.match(run('Male', 152.3).interpretation, /需介於 152.4–230 cm/);
    assert.match(run('Male', 230).value, /^Depth 27\.0 cm/);
  });
});

describe('heaven-criteria｜HEAVEN', () => {
  const S = 'heaven-criteria';
  const run = opts => page(F).score(S, opts);

  test('計數範例：低血氧＋嘔吐/血/液體＋頸部活動受限 → 3 分，無分層', () => {
    // 出處：Davis DP, Olvera DJ. Air Med J 2017;36:195-197（六類各計 1 分）；原文未提供風險分層，故頁面只顯示計數。
    const o = run([1, 0, 0, 1, 0, 1]);
    assert.equal(o.value, '3 分');
    assert.equal(o.interpretation, NO_STRAT);
  });

  test('極端與缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, 0]).value, '0 分');
    assert.equal(run([1, 1, 1, 1, 1, 1]).value, '6 分');
    assert.equal(run([1, 1, 1, 1, 1, null]).interpretation, INCOMPLETE);
  });
});

describe('spo2-fio2-ratio｜S/F ratio', () => {
  const S = 'spo2-fio2-ratio';
  const run = values => page(F).form(S, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, String(v)])));

  test('文獻定義範例：插管 SpO₂ 94%、FiO₂ 40% → 235.0，moderate（235 為含）', () => {
    // 出處：Matthay MA, et al. A New Global Definition of ARDS. Am J Respir Crit Care Med 2024（PMC10870872）Table 1：
    // 插管 mild 235 < S/F ≤ 315、moderate 148 < S/F ≤ 235、severe S/F ≤ 148（SpO₂ ≤97%）。依定義建構病例。
    const o = run({ support: 'Intubated', spo2: 94, fio2: 40 });
    assert.equal(o.value, '235.0');
    assert.equal(o.interpretation, '>148 and ≤235 moderate intubated ARDS S/F threshold');
  });

  test('插管分級切點：148、235、315', () => {
    assert.equal(run({ support: 'Intubated', spo2: 88, fio2: 60 }).interpretation, '≤148 severe intubated ARDS S/F threshold'); // 146.7
    assert.equal(run({ support: 'Intubated', spo2: 74, fio2: 50 }).interpretation, '≤148 severe intubated ARDS S/F threshold'); // 148.0
    assert.equal(run({ support: 'Intubated', spo2: 89, fio2: 60 }).interpretation, '>148 and ≤235 moderate intubated ARDS S/F threshold'); // 148.3
    assert.equal(run({ support: 'Intubated', spo2: 95, fio2: 40 }).interpretation, '>235 and ≤315 mild intubated ARDS S/F threshold'); // 237.5
    const mild = run({ support: 'Intubated', spo2: 63, fio2: 21 });
    assert.equal(mild.value, '300.0');
    assert.equal(mild.interpretation, '>235 and ≤315 mild intubated ARDS S/F threshold');
    assert.equal(run({ support: 'Intubated', spo2: 97, fio2: 30 }).interpretation, 'Above 315; no listed intubated ARDS S/F category'); // 323.3
  });

  test('非插管前提：HFNC ≥30 L/min、NIV/CPAP ≥5 cm H₂O、SpO₂ ≤97%', () => {
    assert.equal(run({ support: 'HFNC', flow: 40, spo2: 94, fio2: 30 }).interpretation, '≤315 nonintubated ARDS S/F threshold'); // 313.3
    assert.equal(run({ support: 'HFNC', flow: 30, spo2: 94, fio2: 30 }).interpretation, '≤315 nonintubated ARDS S/F threshold');
    assert.equal(run({ support: 'HFNC', flow: 29, spo2: 94, fio2: 30 }).interpretation, 'ARDS S/F categories not applied: HFNC flow is below 30 L/min.');
    assert.equal(run({ support: 'NIV/CPAP', pressure: 5, spo2: 94, fio2: 50 }).interpretation, '≤315 nonintubated ARDS S/F threshold');
    assert.equal(run({ support: 'NIV/CPAP', pressure: 4, spo2: 94, fio2: 50 }).interpretation, 'ARDS S/F categories not applied: end-expiratory pressure is below 5 cm H2O.');
    assert.equal(run({ support: 'Intubated', spo2: 98, fio2: 50 }).interpretation, 'ARDS S/F categories not applied: SpO2 >97%.');
    assert.equal(run({ support: 'Intubated', spo2: 97, fio2: 50 }).interpretation, '>148 and ≤235 moderate intubated ARDS S/F threshold'); // 194.0
    assert.equal(run({ support: 'Resource-limited setting', spo2: 90, fio2: 30 }).interpretation, '≤315 modified resource-limited ARDS S/F threshold');
    assert.equal(run({ support: 'Other', spo2: 90, fio2: 30 }).interpretation, 'ARDS S/F categories not applied: specified respiratory-support prerequisites are not met.');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(run({ spo2: 90, fio2: 30 }).interpretation, INCOMPLETE);
    assert.equal(run({ support: 'HFNC', spo2: 90, fio2: 30 }).interpretation, NUM_MISSING); // 缺流量
    assert.equal(run({ support: 'Intubated', spo2: 90 }).interpretation, NUM_MISSING);
    assert.match(run({ support: 'Intubated', spo2: 90, fio2: 20 }).interpretation, /需介於 21–100 %/);
    assert.match(run({ support: 'Intubated', spo2: 49, fio2: 30 }).interpretation, /需介於 50–100 %/);
    assert.equal(run({ support: 'Intubated', spo2: 50, fio2: 100 }).value, '50.0');
  });
});

describe('centor-score-modified-mcisaac-strep-pharyngitis｜Centor／McIsaac', () => {
  const S = 'centor-score-modified-mcisaac-strep-pharyngitis';
  const run = opts => page(F).score(S, opts);
  // 年齡選項 [3-14 +1, 15-44 0, ≥45 -1]；咳嗽 [有 0, 無 +1]

  test('文獻表格：15–44 歲，扁桃腺滲出＋頸淋巴結腫痛＋無咳嗽 → 3 分，GAS 27.8%', () => {
    // 出處：McIsaac WJ, et al. CMAJ 1998;158:75-83, Table 2（PMC1228750）。
    const o = run([1, 1, 1, 0, 1]);
    assert.equal(o.value, '3 分');
    assert.match(o.interpretation, /^GAS culture-positive 27\.8% .*obtain a throat swab but wait for culture results/);
  });

  test('分數 <0 視為 0、>4 視為 4（McIsaac 1998 原文規則）', () => {
    const neg = run([2, 0, 0, 0, 0]);
    assert.equal(neg.value, '-1 分');
    assert.match(neg.interpretation, /^GAS culture-positive 2\.5% .*neither a throat swab nor antibiotic/);
    const five = run([0, 1, 1, 1, 1]);
    assert.equal(five.value, '5 分');
    assert.match(five.interpretation, /^GAS culture-positive 52\.8% .*penicillin/);
  });

  test('各分數百分比：0→2.5、1→5.1、2→11.2、3→27.8、4→52.8', () => {
    assert.match(run([1, 0, 0, 0, 0]).interpretation, /^GAS culture-positive 2\.5%/);
    assert.match(run([1, 0, 0, 0, 1]).interpretation, /^GAS culture-positive 5\.1%.*score 0 or 1/);
    assert.match(run([1, 1, 0, 0, 1]).interpretation, /^GAS culture-positive 11\.2%.*score 2 or 3/);
    assert.match(run([1, 1, 1, 1, 1]).interpretation, /^GAS culture-positive 52\.8%.*score 4/);
  });

  test('缺值', () => {
    assert.equal(run([1, 1, 1, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('rox-index-intubation-hfnc｜ROX', () => {
  const S = 'rox-index-intubation-hfnc';
  const run = (spo2, fio2, rr) => page(F).form(S, { spo2: String(spo2), fio2: String(fio2), rr: String(rr) });

  test('文獻定義範例：SpO₂ 88%、FiO₂ 60%、RR 30 → 4.89，≥4.88 較低插管風險', () => {
    // 出處：Roca O, et al. J Crit Care 2016;35:200-205；Am J Respir Crit Care Med 2019;199:1368-1376
    // （≥4.88 於 2、6、12 小時皆與較低插管風險相關；<3.85 為 12 小時的失敗預測值）。依定義建構病例。
    const o = run(88, 60, 30);
    assert.equal(o.value, '4.89');
    assert.equal(o.interpretation, 'ROX Index ≥4.88: associated with lower risk for intubation');
  });

  test('切點：4.88（含）與 3.85（不含）', () => {
    assert.equal(run(61, 25, 50).value, '4.88');
    assert.equal(run(61, 25, 50).interpretation, 'ROX Index ≥4.88: associated with lower risk for intubation'); // 4.88 整
    assert.equal(run(92, 60, 35).interpretation, 'ROX Index 3.85 to <4.88'); // 4.38
    assert.equal(run(77, 25, 80).interpretation, 'ROX Index 3.85 to <4.88'); // 3.85 整
    assert.equal(run(90, 80, 30).interpretation, 'ROX Index <3.85: high risk of HFNC failure'); // 3.75
  });

  test('現況紀錄：頁面無時間點輸入，<3.85 一律套用（Roca 2019 的 2 h／6 h 切點為 2.85／3.47，見報告）', () => {
    const o = run(90, 70, 35.7); // 3.60：6 小時時不低於 3.47，但頁面仍判為高風險
    assert.equal(o.value, '3.60');
    assert.equal(o.interpretation, 'ROX Index <3.85: high risk of HFNC failure');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { spo2: '90', fio2: '40' }).interpretation, NUM_MISSING);
    assert.match(run(90, 40, 4).interpretation, /需介於 5–80 breaths\/min/);
    assert.equal(run(100, 21, 5).value, '95.24');
  });
});
