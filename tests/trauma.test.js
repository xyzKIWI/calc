'use strict';
// 外傷（calc-trauma.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-trauma.html';
const INCOMPLETE = '請完成所有項目。';
const NO_STRAT = '本評分之規格未提供風險分層。';
const NOT_APPLICABLE = '本規則不適用於此病人，請依臨床判斷。';

describe('abc-score-massive-transfusion｜ABC 大量輸血', () => {
  const S = 'abc-score-massive-transfusion';
  const run = opts => page(F).score(S, opts);

  test('文獻定義範例：SBP ≤90＋HR ≥120 → 2 分，預測大量輸血', () => {
    // 出處：Nunez TC, et al. J Trauma 2009;66:346-352（摘要：「ABC score of 2 or greater was 75% sensitive and 86% specific」）。
    const o = run([0, 1, 1, 0]);
    assert.equal(o.value, '2 分');
    assert.match(o.interpretation, /^ABC ≥2：預測需要大量輸血/);
  });

  test('切點：1｜2', () => {
    assert.match(run([1, 0, 0, 0]).interpretation, /^ABC ≤1/);
    assert.match(run([0, 0, 0, 0]).interpretation, /^ABC ≤1/);
    assert.equal(run([1, 1, 1, 1]).value, '4 分');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, null, 0]).interpretation, INCOMPLETE);
  });
});

describe('nexus-head-ct-instrument｜NEXUS Head CT', () => {
  const S = 'nexus-head-ct-instrument';
  const run = yn => page(F).rule(S, yn);
  const none = () => Array(8).fill(false);

  test('文獻病例：Mower 2017 Box 3 Patient 3（59.4 歲、平地跌倒、頭皮血腫）→ 1 項陽性', () => {
    // 出處：Mower WR, et al. PLoS Med 2017;14(7):e1002313（PMC5507397）Box 3 Patient 3：
    // 「exhibited NEXUS criterion of scalp hematoma」；單次嘔吐不算 persistent vomiting。
    const yn = none();
    yn[2] = true;
    const o = run(yn);
    assert.equal(o.value, '1');
    assert.match(o.interpretation, /^NEXUS Head CT 陽性/);
  });

  test('文獻病例：Mower 2017 Box 3 Patient 1（頭皮血腫＋意識程度改變）→ 2 項', () => {
    const yn = none();
    yn[2] = true;
    yn[4] = true;
    assert.equal(run(yn).value, '2');
  });

  test('切點：0 項陰性、任一項陽性', () => {
    assert.match(run(none()).interpretation, /^NEXUS Head CT 陰性（0 項）/);
    for (let i = 0; i < 8; i += 1) {
      const yn = none();
      yn[i] = true;
      assert.match(run(yn).interpretation, /陽性/, `第 ${i} 項`);
    }
    assert.equal(run(Array(8).fill(true)).value, '8');
  });

  test('缺值', () => {
    const yn = none();
    yn[7] = null;
    assert.equal(run(yn).interpretation, INCOMPLETE);
  });
});

describe('pittsburgh-knee-rules｜Pittsburgh 膝', () => {
  const S = 'pittsburgh-knee-rules';
  const run = choices => page(F).tree(S, choices);

  test('文獻定義範例：跌倒、60 歲 → 建議 X 光', () => {
    // 出處：Seaberg DC, Jackson R. Am J Emerg Med 1994;12:541-543（摘要：鈍傷或跌倒，合併 <12 或 >50 歲或無法行走）。
    assert.equal(run(['Yes', 'No', 'Yes']).value, 'X-ray recommended');
  });

  test('各分支', () => {
    assert.equal(run(['Yes', 'Yes']).value, 'X-ray recommended'); // <12 歲
    assert.equal(run(['Yes', 'No', 'No', 'Yes']).value, 'X-ray recommended'); // 無法負重
    assert.equal(run(['Yes', 'No', 'No', 'No']).value, 'X-ray not indicated');
  });

  test('現況紀錄：非鈍傷／跌倒機轉 → 「Cannot be applied」（MDCalc 的說法是不符規則者不需 X 光，見報告）', () => {
    assert.equal(run(['No']).value, 'Cannot be applied');
  });

  test('未完成：停在中間題目時不輸出結果', () => {
    const o = run(['Yes', 'No']);
    assert.equal(o.shown, false);
    assert.equal(o.question, 'Age >50');
  });
});

describe('rule-nines｜九則法', () => {
  const S = 'rule-nines';
  const run = opts => page(F).score(S, opts);
  // 選項序號：頭 [0, 4.5, 9]；軀幹前、背 [0, 9, 18]；左右手 [0, 4.5, 9]；會陰 [0, 1]；左右腿 [0, 9, 18]

  test('文獻定義範例：頭 9＋軀幹前 18＋右手 4.5 → 31.5', () => {
    // 出處：Moore RA, et al. Rule of Nines. StatPearls（PMID 30020659）各區百分比；依定義建構病例。
    const o = run([2, 2, 0, 1, 0, 0, 0, 0]);
    assert.equal(o.value, '31.5%');
    assert.equal(o.interpretation, NO_STRAT);
  });

  test('全身合計 100%', () => {
    assert.equal(run([2, 2, 2, 2, 2, 1, 2, 2]).value, '100%');
    assert.equal(run([0, 0, 0, 0, 0, 0, 0, 0]).value, '0%');
  });

  test('結果單位顯示為 %TBSA（2026-10-25 修正，原為「分」）', () => {
    assert.equal(run([0, 0, 0, 0, 0, 1, 0, 0]).value, '1%');
  });

  test('缺值', () => {
    assert.equal(run([2, 2, 2, 2, 2, 1, 2, null]).interpretation, INCOMPLETE);
  });
});

describe('stumbl-battle-score｜STUMBL', () => {
  const S = 'stumbl-battle-score';
  const run = (age, ribs, lung, anticoag, spo2) => page(F).form(S, { age: String(age), ribs: String(ribs), lung, anticoag, spo2 });

  test('文獻計算範例：67 歲、3 根肋骨骨折、慢性肺病、SpO₂ 87% → 24 分，21–25: 70 ± 6%', () => {
    // 出處：Battle C, et al. Crit Care 2014;18:R98（PMC4095687）文中範例：「a 67-year-old (score 6) patient with three rib
    // fractures (score 9), a history of chronic lung disease (score 5) and oxygen saturations of 87% (score 4) would have a final
    // risk score of 24 points」；分層依 Table 5。
    const o = run(67, 3, 'Yes', 'No', '85-89%');
    assert.equal(o.value, '24 分');
    assert.equal(o.interpretation, '21-25: 70 ± 6%');
  });

  test('文獻文字：12 分 → 29% ± 8；36 分 → 88% ± 7', () => {
    // 同上文：「a patient who scores 12 has a 29% (±8) probability … a final risk score of 36 who has an 88% (±7)」
    const twelve = run(30, 3, 'No', 'No', '≥95%');
    assert.equal(twelve.value, '12 分');
    assert.equal(twelve.interpretation, '11-15: 29 ± 8%');
    const thirtySix = run(50, 6, 'Yes', 'Yes', '85-89%');
    assert.equal(thirtySix.value, '36 分');
    assert.equal(thirtySix.interpretation, '≥31: 88 ± 7%');
  });

  test('分層切點：10｜11、15｜16、20｜21、25｜26、30｜31', () => {
    const at = (age, ribs, extra = {}) => run(age, ribs, extra.lung || 'No', extra.anticoag || 'No', extra.spo2 || '≥95%');
    assert.equal(at(40, 2).interpretation, '0-10: 13 ± 6%'); // 4 + 6 = 10
    assert.equal(at(50, 2).interpretation, '11-15: 29 ± 8%'); // 11
    assert.equal(at(60, 3).interpretation, '11-15: 29 ± 8%'); // 15
    assert.equal(at(70, 3).interpretation, '16-20: 52 ± 8%'); // 16
    assert.equal(at(50, 5).interpretation, '16-20: 52 ± 8%'); // 20
    assert.equal(at(60, 5).interpretation, '21-25: 70 ± 6%'); // 21
    assert.equal(at(70, 6).interpretation, '21-25: 70 ± 6%'); // 25
    assert.equal(at(80, 6).interpretation, '26-30: 80 ± 6%'); // 26
    assert.equal(at(90, 7).interpretation, '26-30: 80 ± 6%'); // 30
    assert.equal(at(100, 7).interpretation, '≥31: 88 ± 7%'); // 31
  });

  test('年齡以每 10 歲 1 分（無條件捨去）', () => {
    assert.equal(run(69.9, 0, 'No', 'No', '≥95%').value, '6 分');
    assert.equal(run(10, 0, 'No', 'No', '≥95%').value, '1 分');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, { age: '67', ribs: '3', lung: 'Yes', anticoag: 'No' }).interpretation, INCOMPLETE);
    assert.equal(page(F).form(S, { ribs: '3', lung: 'Yes', anticoag: 'No', spo2: '≥95%' }).interpretation, '請完成所有適用項目。');
    assert.match(run(9, 0, 'No', 'No', '≥95%').interpretation, /需介於 10–120/);
    assert.equal(run(40, 2.5, 'No', 'No', '≥95%').interpretation, 'Number of rib fractures must be an integer.');
    assert.equal(run(120, 30, 'Yes', 'Yes', '80-84%').value, '117 分');
  });
});

describe('canadian-c-spine-rule｜Canadian C-Spine', () => {
  const S = 'canadian-c-spine-rule';
  const run = choices => page(F).tree(S, choices);

  test('文獻定義範例：70 歲（高風險因子）→ Radiography', () => {
    // 出處：Stiell IG, et al. JAMA 2001;286:1841-1848（摘要：三題結構；age ≥65 為高風險因子）；
    // Stiell IG, et al. N Engl J Med 2003;349:2510-2518 Figure 1（適用於 alert、stable；納入 ≥16 歲；
    // 「A dangerous mechanism is considered to be a fall from an elevation ≥3 ft or 5 stairs」）。
    assert.equal(run(['Yes — age ≥16, GCS 15 and stable', 'Yes']).value, 'Radiography');
  });

  test('各分支', () => {
    assert.equal(run(['Yes — age ≥16, GCS 15 and stable', 'No', 'No']).value, 'Radiography'); // 無低風險因子
    assert.equal(run(['Yes — age ≥16, GCS 15 and stable', 'No', 'Yes', 'Unable']).value, 'Radiography');
    assert.equal(run(['Yes — age ≥16, GCS 15 and stable', 'No', 'Yes', 'Able']).value, 'No Radiography');
  });

  test('不適用：<16 歲、非清醒或不穩定 → 不輸出否定性建議（2026-10-25 適用條件加入年齡）', () => {
    const o = run(['No — age <16, not alert, or unstable']);
    assert.equal(o.value, 'Rule not applicable');
    assert.match(o.interpretation, /requires an alert \(GCS=15\), stable trauma patient aged ≥16 years/);
    assert.match(run([]).question, /^Applicability: Age ≥16 years, alert/);
  });

  test('危險機轉跌落高度為 ≥3 ft（0.9 m）或 5 階（2026-10-25 修正，原為 ≥1 m）', () => {
    assert.match(run(['Yes — age ≥16, GCS 15 and stable']).question, /Fall From Elevation ≥3 ft \(0\.9 m\) or 5 Stairs/);
  });
});

describe('canadian-ct-head-injury-trauma-rule｜Canadian CT Head', () => {
  const S = 'canadian-ct-head-injury-trauma-rule';
  const run = choices => page(F).tree(S, choices);
  const enter = ['Yes', 'No', 'No', 'No']; // 有 LOC/失憶；非 <16 歲、未用抗凝血劑、傷後無癲癇

  test('文獻定義範例：LOC、70 歲 → Consider CT', () => {
    // 出處：Stiell IG, et al. Lancet 2001;357:1391-1396（摘要：five high-risk factors … age ≥65 years）。
    assert.equal(run([...enter, 'No', 'No', 'No', 'No', 'Yes']).value, 'Consider obtaining a CT scan');
  });

  test('各危險因子皆導向 CT；全部否 → CT Unnecessary', () => {
    for (let k = 0; k < 7; k += 1) {
      const answers = Array(k).fill('No').concat('Yes');
      assert.equal(run([...enter, ...answers]).value, 'Consider obtaining a CT scan', `第 ${k} 個危險因子`);
    }
    assert.equal(run([...enter, ...Array(7).fill('No')]).value, 'CT Unnecessary');
  });

  test('排除條件：無 LOC/失憶、<16 歲、抗凝血劑、傷後癲癇 → 不適用', () => {
    assert.match(run(['No']).value, /^Rule not applicable/);
    assert.match(run(['Yes', 'Yes']).value, /^Rule not applicable/);
    assert.match(run(['Yes', 'No', 'Yes']).value, /^Rule not applicable/);
    assert.match(run(['Yes', 'No', 'No', 'Yes']).value, /^Rule not applicable/);
  });

  test('「危險機轉」題目含 pedestrian struck／occupant ejected（2026-10-25 修正）', () => {
    // 出處：Stiell IG, et al. CMAJ 2010;182:1527-1532 Figure 1（作者研究所用的規則卡）：「** Dangerous Mechanism: pedestrian struck
    // by motor vehicle; occupant ejected from motor vehicle; fall from elevation ≥ 3 feet or 5 stairs」。
    const o = run([...enter, 'No', 'No', 'No', 'No', 'No', 'No']);
    assert.match(o.question, /Pedestrian struck by motor vehicle, occupant ejected from motor vehicle, or fall from elevation ≥3 feet or 5 stairs/);
  });

  test('文獻病例：Mower 2017 Box 3 Patient 1（16.5 歲行人被車撞、短暫 LOC、GCS 15）→ Consider CT', () => {
    // 出處：Mower WR, et al. PLoS Med 2017（PMC5507397）Box 3 Patient 1；此病例無高風險因子，靠危險機轉（行人被撞）判為需 CT。
    assert.equal(run([...enter, 'No', 'No', 'No', 'No', 'No', 'No', 'Yes']).value, 'Consider obtaining a CT scan');
  });

  test('失憶門檻為 ≥30 分鐘（與 CMAJ 2010 規則卡「Amnesia before impact ≥ 30 minutes」一致，未修改）', () => {
    assert.match(run([...enter, 'No', 'No', 'No', 'No', 'No']).question, /≥ 30 minutes/);
  });

  test('適用條件含 GCS 13–15 與 witnessed disorientation（2026-10-25 修正）', () => {
    // 出處：Stiell 2005 JAMA 摘要（PMID 16189364）：「blunt head trauma resulting in witnessed loss of consciousness, disorientation,
    // or definite amnesia and a GCS score of 13 to 15」；CMAJ 2010 Figure 1：「GCS score of 13-15 after witnessed loss of
    // consciousness, amnesia, or confusion」。
    // 出處：MDCalc 608：「Apply only to patients presenting within 24 hours of injury with a … GCS score of 13-15 and at least one
    // of the following: Loss of consciousness. Amnesia to the head injury event. Witnessed disorientation.」
    const o = run([]);
    assert.match(o.question, /disorientation/i);
    assert.match(o.question, /13/);
  });
});

describe('modified-denver-criteria-bcvi｜Modified Denver', () => {
  const S = 'modified-denver-criteria-bcvi';
  const run = yn => page(F).rule(S, yn);

  test('MDCalc 定義範例：Le Fort II 骨折 → 1 項，考慮頸部 CTA', () => {
    // 出處：MDCalc 10653（「If any single criterion is met, consider further evaluation for possible BCVI with CTA of the neck」）。
    // 頁面所引 Cothren 2004 摘要未列出篩檢條件，未找到可驗證的原始文獻範例。
    const o = run([true, false, false, false, false]);
    assert.equal(o.value, '1');
    assert.match(o.interpretation, /考慮頸部 CTA/);
  });

  test('切點與極端', () => {
    assert.equal(run([false, false, false, false, false]).interpretation, 'Modified Denver：無任一條件成立。');
    assert.equal(run([true, true, true, true, true]).value, '5');
  });

  test('缺值', () => {
    assert.equal(run([false, false, null, false, false]).interpretation, INCOMPLETE);
  });
});

describe('new-orleans-charity-head-trauma-injury-rule｜New Orleans', () => {
  const S = 'new-orleans-charity-head-trauma-injury-rule';
  const run = (opts, overrides) => {
    const p = page(F);
    p.fillApplicable(S, overrides);
    return p.score(S, opts);
  };

  test('文獻定義：七項皆無 → 不需 CT；任一項 → 需 CT', () => {
    // 出處：Haydel MJ, et al. N Engl J Med 2000;343:100-105（「All patients with positive CT scans had at least one of the findings」）。
    assert.match(run(Array(7).fill(0)).interpretation, /^New Orleans：七項皆無/);
    const o = run([0, 0, 1, 0, 0, 0, 0]); // 年齡 >60
    assert.equal(o.value, '1 分');
    assert.match(o.interpretation, /^New Orleans：任一項陽性/);
  });

  test('每一項單獨陽性皆需 CT', () => {
    for (let i = 0; i < 7; i += 1) {
      const opts = Array(7).fill(0);
      opts[i] = 1;
      assert.match(run(opts).interpretation, /任一項陽性/, `第 ${i} 項`);
    }
    assert.equal(run(Array(7).fill(1)).value, '7 分');
  });

  test('適用條件：任一不符 → 不適用；未填 → 要求填寫', () => {
    assert.equal(run(Array(7).fill(0), { gcs15: 'No' }).interpretation, NOT_APPLICABLE);
    assert.equal(run(Array(7).fill(0), { adult: 'No' }).interpretation, NOT_APPLICABLE);
    assert.equal(run(Array(7).fill(0), { antithrombotic: 'Yes' }).interpretation, NOT_APPLICABLE);
    // 2026-10-25 新增：Haydel 2000「normal findings on a brief neurologic examination」、「presented within 24 hours after the injury」
    assert.equal(run(Array(7).fill(0), { normal_neuro: 'No' }).interpretation, NOT_APPLICABLE);
    assert.equal(run(Array(7).fill(0), { within24h: 'No' }).interpretation, NOT_APPLICABLE);
    assert.equal(page(F).score(S, Array(7).fill(0)).interpretation, '請完成所有適用性條件。');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('nexus-chest-ct-decision-instrument-ct-imaging｜NEXUS Chest CT', () => {
  const S = 'nexus-chest-ct-decision-instrument-ct-imaging';
  const run = yn => page(F).rule(S, yn);

  test('文獻定義：Chest CT-All 四類皆無 → 不需 CT', () => {
    // 出處：Rodriguez RM, et al. PLoS Med 2015;12(10):e1001883（PMC4595216）；胸壁／胸骨／胸椎／肩胛壓痛原文允許合併評估。
    // 文中唯一漏失的重大傷害病例（80 歲、跌下七階樓梯、無任何 DI 條件）規則輸出即為陰性。
    assert.match(run([false, false, false, false]).interpretation, /^NEXUS Chest CT：四類條件皆無 → 規則判定不需胸部 CT（Chest CT-All）/);
  });

  test('任一項陽性 → 無法排除', () => {
    for (let i = 0; i < 4; i += 1) {
      const yn = [false, false, false, false];
      yn[i] = true;
      assert.match(run(yn).interpretation, /^NEXUS Chest CT：有條件成立/, `第 ${i} 項`);
    }
  });

  test('缺值', () => {
    assert.equal(run([true, null, false, false]).interpretation, INCOMPLETE);
  });
});

describe('nexus-chest-decision-instrument-blunt-chest-trauma｜NEXUS Chest', () => {
  const S = 'nexus-chest-decision-instrument-blunt-chest-trauma';
  const run = opts => page(F).score(S, opts);

  test('文獻定義：七項皆無 → 不需胸部影像；胸痛 → 有條件成立', () => {
    // 出處：Rodriguez RM, et al. JAMA Surg 2013;148:940-946（摘要列出 7 項條件）。
    assert.match(run(Array(7).fill(0)).interpretation, /^NEXUS Chest：七項皆無/);
    assert.match(run([0, 0, 1, 0, 0, 0, 0]).interpretation, /^NEXUS Chest：有條件成立/);
  });

  test('每一項單獨陽性', () => {
    for (let i = 0; i < 7; i += 1) {
      const opts = Array(7).fill(0);
      opts[i] = 1;
      assert.match(run(opts).interpretation, /有條件成立/, `第 ${i} 項`);
    }
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, null, 0, 0, 0]).interpretation, INCOMPLETE);
  });
});

describe('ottawa-ankle-rule｜Ottawa 踝', () => {
  const S = 'ottawa-ankle-rule';
  const run = choices => page(F).tree(S, choices);

  test('MDCalc 定義範例：踝部壓痛於外踝尖 → 踝 X 光', () => {
    // 出處：MDCalc 1670（「tenderness over the posterior 6 cm or tip of the lateral or medial malleolus, then ankle x-ray」）；
    // Stiell IG, et al. JAMA 1993 摘要未含條件全文。
    assert.equal(run(['Malleolar', 'Yes', 'No']).value, 'Ankle x-ray indicated');
    assert.equal(run(['Malleolar', 'Yes', 'Yes']).value, 'Ankle x-ray indicated');
  });

  test('踝部：無壓痛但無法負重 → X 光；無壓痛且可負重 → 不需', () => {
    assert.equal(run(['Malleolar', 'No', 'Yes']).value, 'Ankle x-ray indicated');
    assert.equal(run(['Malleolar', 'No', 'No']).value, 'X-ray not indicated');
  });

  test('足中段：舟狀骨或第五蹠骨基部壓痛 → 足 X 光', () => {
    assert.equal(run(['Midfoot', 'Yes', 'No']).value, 'Foot x-ray indicated');
    assert.equal(run(['Midfoot', 'No', 'Yes', 'No']).value, 'Foot x-ray indicated');
    assert.equal(run(['Midfoot', 'No', 'No', 'Yes']).value, 'Foot x-ray indicated');
    assert.equal(run(['Midfoot', 'No', 'No', 'No']).value, 'X-ray not indicated');
  });

  test('未完成：只選位置時不輸出結果', () => {
    assert.equal(run(['Midfoot']).shown, false);
  });
});
