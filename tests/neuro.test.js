'use strict';
// 神經（calc-neuro.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-neuro.html';
const INCOMPLETE = '請完成所有項目。';
const NUM_MISSING = '請完成所有適用項目。';
const NO_STRAT = '本評分之規格未提供風險分層。';

describe('modified-rankin-scale-neurologic-disability｜mRS', () => {
  const S = 'modified-rankin-scale-neurologic-disability';
  const run = i => page(F).score(S, [i]);

  test('官方選項：3 分＝moderate disability；6 分＝Dead', () => {
    // 出處：MDCalc 1890 選項表；van Swieten JC, et al. Stroke 1988;19:604-607（原文 0–5 六級，6＝死亡為 MDCalc 延伸，見報告）。
    assert.equal(run(3).value, '3');
    assert.equal(run(3).interpretation, 'Moderate disability; requiring some help, but able to walk without assistance');
    assert.equal(run(6).value, '6');
    assert.equal(run(6).interpretation, 'Dead');
    assert.equal(run(0).interpretation, 'No symptoms at all');
  });

  test('缺值', () => {
    assert.equal(page(F).calculate(S).interpretation, '請選擇一個等級。');
  });
});

describe('rapid-arterial-occlusion-evaluation-race-scale-stroke｜RACE', () => {
  const S = 'rapid-arterial-occlusion-evaluation-race-scale-stroke';
  const run = v => page(F).form(S, { facial: v[0], arm: v[1], leg: v[2], gaze: v[3], side: v[4], cortical: v[5] });

  test('文獻定義範例：各項最重 → 9 分，≥5', () => {
    // 出處：Pérez de la Ossa N, et al. Stroke 2014;45:87-91（摘要：「A RACE scale≥5 had sensitivity 0.85, specificity 0.68」）；
    // racescale.org「total score of 0-9」。
    const o = run(['2', '2', '2', '1', 'Right', '2']);
    assert.equal(o.value, '9 分');
    assert.match(o.interpretation, /^RACE Scale score ≥5/);
  });

  test('切點：4｜5', () => {
    assert.equal(run(['1', '1', '1', '1', 'Left', '0']).interpretation, 'RACE Scale score <5.');
    assert.match(run(['2', '2', '1', '0', 'Left', '0']).interpretation, /^RACE Scale score ≥5/);
    assert.equal(run(['0', '0', '0', '0', 'Left', '0']).value, '0 分');
  });

  test('偏癱側切換：左側 → Agnosia、右側 → Aphasia，並清空已選答案', () => {
    const p = page(F);
    p.fill(S, { side: 'Right' });
    const card = p.card(S);
    assert.match(card.querySelector('[data-field-label="cortical"]').childNodes[0].nodeValue, /^Aphasia/);
    assert.equal(card.querySelector('[data-input-id="cortical"]').options[1].textContent, 'Performs both tasks correctly');
    p.fill(S, { cortical: '1', side: 'Left' });
    assert.equal(card.querySelector('[data-input-id="cortical"]').value, '');
    assert.match(card.querySelector('[data-field-label="cortical"]').childNodes[0].nodeValue, /^Agnosia/);
  });

  test('缺值', () => {
    assert.equal(page(F).form(S, { facial: '1', arm: '1', leg: '1', gaze: '1', side: 'Left' }).interpretation, INCOMPLETE);
  });
});

describe('tpa-tissue-plasminogen-activator-dosing-stroke-calculator｜Alteplase', () => {
  const S = 'tpa-tissue-plasminogen-activator-dosing-stroke-calculator';
  const run = w => page(F).form(S, { weight: String(w) });

  test('仿單範例：70 kg → 總量 63 mg，bolus 6.3 mg', () => {
    // 出處：FDA Activase label 2015（https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/103172s5203lbl.pdf）：
    // 「0.9 mg/kg (not to exceed 90 mg total dose) … with 10% of the total dose administered as an initial bolus」；依仿單手算。
    const o = run(70);
    assert.equal(o.value, 'Total 63.0 mg；Bolus 6.3 mg；Infusion 56.7 mg；Waste 37.0 mg');
    assert.equal(o.interpretation, NO_STRAT);
  });

  test('上限 90 mg：100 kg 起封頂', () => {
    assert.equal(run(100).value, 'Total 90.0 mg；Bolus 9.0 mg；Infusion 81.0 mg；Waste 10.0 mg');
    assert.equal(run(99).value, 'Total 89.1 mg；Bolus 8.9 mg；Infusion 80.2 mg；Waste 10.9 mg');
    assert.equal(run(120).value, 'Total 90.0 mg；Bolus 9.0 mg；Infusion 81.0 mg；Waste 10.0 mg');
    assert.equal(run(300).value, 'Total 90.0 mg；Bolus 9.0 mg；Infusion 81.0 mg；Waste 10.0 mg');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, {}).interpretation, NUM_MISSING);
    assert.match(run(0.5).interpretation, /需介於 1–300 kg/);
    assert.match(run(301).interpretation, /需介於 1–300 kg/);
    assert.equal(run(1).value, 'Total 0.9 mg；Bolus 0.1 mg；Infusion 0.8 mg；Waste 99.1 mg');
  });
});

describe('abc2-formula-intracerebral-hemorrhage-volume｜ABC/2', () => {
  const S = 'abc2-formula-intracerebral-hemorrhage-volume';
  const run = (shape, l, w, n, t) => page(F).form(S, { shape, length: String(l), width: String(w), slices: String(n), thickness: String(t) });

  test('公式範例：圓形 4 × 3 cm、6 層 × 5 mm → 18.0 mL；不規則 → 12.0 mL（ABC/3）', () => {
    // 出處：Kothari RU, et al. Stroke 1996;27:1304-1305（ABC/2）；Huttner HB, et al. Stroke 2006（不規則形改除以 3）；MDCalc 2031。
    assert.equal(run('Round or Ellipsoid', 4, 3, 6, 5).value, '18.0 mL');
    assert.equal(run('Irregular, Separated, or Multinodular', 4, 3, 6, 5).value, '12.0 mL');
  });

  test('加權層數可為 0.5', () => {
    assert.equal(run('Round or Ellipsoid', 2, 2, 0.5, 10).value, '1.0 mL');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { length: '4', width: '3', slices: '6', thickness: '5' }).interpretation, INCOMPLETE);
    assert.equal(page(F).form(S, { shape: 'Round or Ellipsoid', length: '4', width: '3', slices: '6' }).interpretation, NUM_MISSING);
    assert.match(run('Round or Ellipsoid', 0, 3, 6, 5).interpretation, /需介於 0.1–30 cm/);
    assert.match(run('Round or Ellipsoid', 4, 3, 0.4, 5).interpretation, /需介於 0.5–100 slices/);
    assert.equal(run('Round or Ellipsoid', 30, 30, 100, 20).value, '90000.0 mL'); // 30 × 30 × 200 cm / 2
  });
});

describe('glasgow-coma-scale-score-gcs｜GCS', () => {
  const S = 'glasgow-coma-scale-score-gcs';
  const run = opts => page(F).score(S, opts);
  // 選項序號：E [4,3,2,1,NT]；V [5,4,3,2,1,NT]；M [6,5,4,3,2,1,NT]

  test('官方範例：E2V4M6 = 12', () => {
    // 出處：glasgowcomascale.org Recording GCS（https://www.glasgowcomascale.org/recording-gcs/）：「E2V4M6 = 12」。
    const o = run([2, 1, 0]);
    assert.equal(o.value, '12 分');
    assert.match(o.interpretation, /^Rosen 10e: moderate \(9–12\)；Tintinalli 9e: moderate \(9–13\)/);
  });

  test('教科書分級邊界並陳：13、14、8、9', () => {
    assert.match(run([1, 1, 0]).interpretation, /Rosen 10e: mild .*Tintinalli 9e: moderate/); // 3+4+6 = 13
    assert.match(run([0, 1, 0]).interpretation, /Rosen 10e: mild .*Tintinalli 9e: mild/); // 14
    assert.equal(run([3, 3, 1]).value, '8 分'); // 1 + 2 + 5
    assert.match(run([3, 3, 1]).interpretation, /Rosen 10e: severe .*Tintinalli 9e: severe/);
    assert.equal(run([3, 3, 0]).value, '9 分');
    assert.match(run([3, 3, 0]).interpretation, /Rosen 10e: moderate .*Tintinalli 9e: moderate/);
  });

  test('極端：3 與 15', () => {
    assert.equal(run([3, 4, 5]).value, '3 分');
    assert.equal(run([0, 0, 0]).value, '15 分');
  });

  test('Not testable：不加總，只報分項', () => {
    // 依 MDCalc 64（引 Teasdale 2014）：「summation of the findings into a total Glasgow Coma Score is invalid」。
    const o = run([0, 5, 0]);
    assert.equal(o.value, '— 總分不可計（1 項 UN）');
    assert.match(o.interpretation, /^E4 V\(NT\) M6；/);
    assert.equal(run([4, 5, 6]).value, '— 總分不可計（3 項 UN）');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('hunt-hess-classification-subarachnoid-hemorrhage｜Hunt & Hess', () => {
  const S = 'hunt-hess-classification-subarachnoid-hemorrhage';
  const run = i => page(F).score(S, [i]);

  test('官方分級：Grade III、Grade V', () => {
    // 出處：MDCalc 404 分級表；NIH/NLM CDE「Hunt and Hess scale」。
    assert.equal(run(2).value, '3');
    assert.equal(run(2).interpretation, 'Lethargy or Confusion, Mild Focal Neurological Deficits');
    assert.equal(run(4).value, '5');
    assert.match(run(4).interpretation, /^Comatose/);
    assert.equal(run(0).value, '1');
  });

  test('缺值', () => {
    assert.equal(page(F).calculate(S).interpretation, '請選擇一個等級。');
  });
});

describe('intracerebral-hemorrhage-ich-score｜ICH Score', () => {
  const S = 'intracerebral-hemorrhage-ich-score';
  const run = opts => page(F).score(S, opts);
  // 第 0 題 GCS [3-4 → 2, 5-12 → 1, 13-15 → 0]

  test('文獻：0 分全部存活、5 分全部死亡', () => {
    // 出處：Hemphill JC 3rd, et al. Stroke 2001;32:891-897 摘要：「All 26 patients with an ICH Score of 0 survived, and all 6
    // patients with an ICH Score of 5 died.」
    assert.match(run([2, 0, 0, 0, 0]).interpretation, /^30-day mortality 0%/);
    const five = run([1, 1, 1, 1, 1]);
    assert.equal(five.value, '5 分');
    assert.match(five.interpretation, /^30-day mortality 100%/);
  });

  test('死亡率表（1–4 分依 MDCalc 402 所列 13/26/72/97%）', () => {
    assert.match(run([1, 0, 0, 0, 0]).interpretation, /^30-day mortality 13%/);
    assert.match(run([1, 1, 0, 0, 0]).interpretation, /^30-day mortality 26%/);
    assert.match(run([0, 1, 0, 0, 0]).interpretation, /^30-day mortality 72%/); // GCS 3–4 (2) + 年齡 ≥80 = 3
    assert.match(run([0, 1, 1, 0, 0]).interpretation, /^30-day mortality 97%/);
  });

  test('6 分：原研究無此分數病例', () => {
    const o = run([0, 1, 1, 1, 1]);
    assert.equal(o.value, '6 分');
    assert.match(o.interpretation, /^Score 6: no patients/);
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('nih-stroke-scale-score-nihss｜NIHSS', () => {
  const S = 'nih-stroke-scale-score-nihss';
  const run = opts => page(F).score(S, opts);
  const zero = () => Array(15).fill(0);

  test('官方表單範例：1a=1、5A=1、9=1、10=1 → 4 分（落在 ≥4）', () => {
    // 出處：NIH/NINDS NIH Stroke Scale（https://www.ninds.nih.gov/sites/default/files/documents/NIH_Stroke_Scale_508C.pdf）各項分數；
    // <4 切點依 MDCalc 715（MDCalc 另有「4 or less」寫法，見報告）。
    const o = zero();
    o[0] = 1;
    o[6] = 1;
    o[12] = 1;
    o[13] = 1;
    const out = run(o);
    assert.equal(out.value, '4 分');
    assert.match(out.interpretation, /^NIHSS ≥4/);
  });

  test('切點：3｜4', () => {
    const o = zero();
    o[0] = 1;
    o[6] = 1;
    o[12] = 1;
    assert.match(run(o).interpretation, /^NIHSS <4/);
    assert.equal(run(zero()).value, '0 分');
  });

  test('昏迷病人：1a=3、8=2、9=3（NIH 表單：昏迷時自動給分）', () => {
    const o = zero();
    o[0] = 4;
    o[11] = 5;
    o[12] = 4;
    assert.equal(run(o).value, '8 分');
  });

  test('UN（截肢/關節融合、插管）：不計入總分並標示不完整', () => {
    const o = zero();
    o[6] = 6; // 5A 截肢
    const out = run(o);
    assert.equal(out.value, '0 分（1 項 UN）');
    assert.match(out.interpretation, /^不完整分數：因含 1 項不可測/);
  });

  test('第 3 項選 visual extinction 時第 11 項不可為 No abnormality', () => {
    const o = zero();
    o[4] = 5;
    assert.match(run(o).interpretation, /^第 3 項已選 visual extinction/);
    o[14] = 2;
    assert.equal(run(o).value, '2 分');
  });

  test('極端與缺值', () => {
    const max = [4, 2, 2, 3, 3, 3, 5, 5, 5, 5, 2, 3, 3, 2, 3];
    assert.equal(run(max).value, '42 分');
    const o = zero();
    o[14] = null;
    assert.equal(run(o).interpretation, INCOMPLETE);
  });
});

describe('ottawa-subarachnoid-hemorrhage-sah-rule-for-headache-evaluation｜Ottawa SAH', () => {
  const S = 'ottawa-subarachnoid-hemorrhage-sah-rule-for-headache-evaluation';
  const run = (opts, overrides) => {
    const p = page(F);
    p.fillApplicable(S, overrides);
    return p.score(S, opts);
  };

  test('文獻定義：六項皆陰性 → 規則陰性；年齡 ≥40 → 無法排除', () => {
    // 出處：Perry JJ, et al. JAMA 2013;310:1248-1255，The Ottawa SAH Rule 框：「Investigate if ≥1 high-risk variables present」。
    assert.match(run(Array(6).fill(0)).interpretation, /^Ottawa SAH：六項皆陰性/);
    const o = run([1, 0, 0, 0, 0, 0]);
    assert.equal(o.value, '1 分');
    assert.match(o.interpretation, /^Ottawa SAH：任一條件陽性/);
  });

  test('每一項單獨陽性', () => {
    for (let i = 0; i < 6; i += 1) {
      const opts = Array(6).fill(0);
      opts[i] = 1;
      assert.match(run(opts).interpretation, /任一條件陽性/, `第 ${i} 項`);
    }
  });

  test('適用條件：新神經缺損、曾動脈瘤 → 不適用；未填 → 要求填寫', () => {
    assert.equal(run(Array(6).fill(0), { neuro_deficit: 'Yes' }).interpretation, '本規則不適用於此病人，請依臨床判斷。');
    assert.equal(run(Array(6).fill(0), { prior_aneurysm: 'Yes' }).interpretation, '本規則不適用於此病人，請依臨床判斷。');
    assert.equal(run(Array(6).fill(0), { age15: 'No' }).interpretation, '本規則不適用於此病人，請依臨床判斷。');
    // 2026-10-25 新增：Perry 2013 JAMA 規則框「For alert patients older than 15 y …」
    assert.equal(run(Array(6).fill(0), { alert: 'No' }).interpretation, '本規則不適用於此病人，請依臨床判斷。');
    assert.equal(page(F).score(S, Array(6).fill(0)).interpretation, '請完成所有適用性條件。');
  });

  test('年齡適用條件為 >15 歲（≥16 歲）（2026-10-25 修正，原為 ≥15 歲）', () => {
    // 出處：Perry 2013 JAMA 規則框「For alert patients older than 15 y」；Methods「adult patients (defined as patients 16 years
    // or older)」；Perry 2010 BMJ（PMC2966872）「We included alert patients aged ≥16」。
    const label = page(F).def(S).applicability.find(a => a.id === 'age15').label_en;
    assert.match(label, />15|≥16|16 years/);
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});
