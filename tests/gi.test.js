'use strict';
// 腸胃／其他（calc-gi.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-gi.html';
const INCOMPLETE = '請完成所有項目。';

describe('rockall-score-upper-gi-bleeding-complete｜Rockall（完整）', () => {
  const S = 'rockall-score-upper-gi-bleeding-complete';
  const run = opts => page(F).score(S, opts);
  // 選項序號：年齡 [<60, 60-79, ≥80]；休克 [無, 心跳快, 低血壓]；共病 [無, 一般 2, 腎/肝衰竭或轉移癌 3]；
  // 診斷 [Mallory-Weiss 0, 無病灶 0, 其他 1, 上消化道惡性 2]；SRH [無 0, 黑點 0, 血 2, 血塊 2, 可見血管 2]

  test('文獻表格：≥80 歲＋「其他診斷」→ 3 分，再出血 11.2%、死亡 2.9%', () => {
    // 出處：Rockall TA, et al. Gut 1996;38:316-321, Table IV(B)（https://pmc.ncbi.nlm.nih.gov/articles/PMC1383057/）。
    const o = run([2, 0, 0, 2, 0]);
    assert.equal(o.value, '3 分');
    assert.equal(o.interpretation, 'Rebleeding 11.2%; Mortality 2.9% (Rockall 1996 Table IV(B), score 3)');
  });

  test('表格端點：0 分與 8+ 合併', () => {
    // Rockall 1996：「Scores of 8 or more are considered as one category」
    assert.equal(run([0, 0, 0, 0, 0]).interpretation, 'Rebleeding 4.9%; Mortality 0% (Rockall 1996 Table IV(B), score 0); Low Risk');
    const seven = run([2, 2, 1, 2, 1]); // 2+2+2+1+0 = 7
    assert.equal(seven.value, '7 分');
    assert.match(seven.interpretation, /^Rebleeding 43\.8%; Mortality 27% /);
    const eight = run([2, 2, 2, 2, 1]); // 2+2+3+1+0 = 8
    assert.equal(eight.value, '8 分');
    assert.match(eight.interpretation, /^Rebleeding 41\.8%; Mortality 41\.1% .*score 8\+\)$/);
    const max = run([2, 2, 2, 3, 4]); // 2 + 2 + 3 + 2 + 2 = 11（論文：Maximum additive score following diagnosis = 11）
    assert.equal(max.value, '11 分');
    assert.match(max.interpretation, /score 8\+\)$/);
  });

  test('權重：Mallory-Weiss 與無病灶 0 分；黑點 0、其餘 SRH 2', () => {
    assert.equal(run([0, 0, 0, 1, 1]).value, '0 分');
    assert.equal(run([0, 0, 0, 1, 3]).value, '2 分');
    assert.equal(run([0, 0, 1, 0, 0]).value, '2 分');
    assert.equal(run([0, 0, 2, 0, 0]).value, '3 分');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('rockall-score-upper-gi-bleeding-pre-endoscopy｜Rockall（內視鏡前）', () => {
  const S = 'rockall-score-upper-gi-bleeding-pre-endoscopy';
  const run = opts => page(F).score(S, opts);

  test('文獻表格：60–79 歲＋低血壓＋腎衰竭 → 6 分，死亡率 48.9%', () => {
    // 出處：Rockall 1996 Table IV(A)（同上）。註：同文 Table V(A) 的 score 6 為 72/141 = 51.1%，見報告。
    const o = run([1, 2, 2]);
    assert.equal(o.value, '6 分');
    assert.equal(o.interpretation, '48.9% chance of mortality');
  });

  test('表格各分數', () => {
    const expected = { 0: '0.2', 1: '2.4', 2: '5.6', 3: '11', 4: '24.6', 5: '39.6', 7: '50' };
    const cases = { 0: [0, 0, 0], 1: [1, 0, 0], 2: [0, 0, 1], 3: [1, 0, 1], 4: [2, 2, 0], 5: [1, 1, 2], 7: [2, 2, 2] };
    for (const [score, opts] of Object.entries(cases)) {
      const o = run(opts);
      assert.equal(o.value, `${score} 分`);
      assert.equal(o.interpretation, `${expected[score]}% chance of mortality`);
    }
  });

  test('缺值', () => {
    assert.equal(run([0, null, 0]).interpretation, INCOMPLETE);
  });
});

describe('west-haven-criteria｜West Haven', () => {
  const S = 'west-haven-criteria';
  const run = i => page(F).score(S, [i]);

  test('官方分級：Grade IV＝Coma', () => {
    // 出處：Vilstrup H, et al. AASLD/EASL Practice Guideline. Hepatology 2014;60:715-735 Table（Grade IV: Coma）；MDCalc 674。
    assert.equal(run(4).value, '4');
    assert.equal(run(4).interpretation, 'Coma');
  });

  test('各等級數值即等級', () => {
    for (let i = 0; i <= 4; i += 1) assert.equal(run(i).value, String(i));
    assert.match(run(0).interpretation, /^Abnormal psychometric/);
    // AASLD/EASL 2014：Grade II「Disoriented for time」；「Disoriented also for space」屬 Grade III（2026-10-25 修正措辭）
    assert.match(run(2).interpretation, /^Disoriented to time; /);
  });

  test('缺值', () => {
    assert.equal(page(F).calculate(S).interpretation, '請選擇一個等級。');
  });
});

describe('burch-wartofsky-point-scale-bwps-thyrotoxicosis｜Burch-Wartofsky', () => {
  const S = 'burch-wartofsky-point-scale-bwps-thyrotoxicosis';
  const run = opts => page(F).score(S, opts);
  // 選項序號：體溫 0–6 → 0/5/10/15/20/25/30；CNS 0–3 → 0/10/20/30；GI 0–2 → 0/10/20；
  // HR 0–5 → 0/5/10/15/20/25；CHF 0–3 → 0/5/10/15；AF、誘因 [否, 是 10]

  test('MDCalc 分層範例：101–101.9°F＋HR 120–129 → 30 分，suggestive of impending', () => {
    // 出處：MDCalc 3816（<25 unlikely、25–44 impending、≥45 highly suggestive）；依分層建構病例。原始 1993 文獻未能取得原文。
    const o = run([3, 0, 0, 3, 0, 0, 0]);
    assert.equal(o.value, '30 分');
    assert.equal(o.interpretation, 'Suggestive of impending thyroid storm');
  });

  test('切點：<25｜25、≤44｜≥45（實際分數為 20｜25、40｜45）', () => {
    const at = (opts, score) => { const o = run(opts); assert.equal(o.value, `${score} 分`); return o.interpretation; };
    assert.equal(at([0, 2, 0, 0, 0, 0, 0], 20), 'Unlikely to represent thyroid storm');
    assert.equal(at([1, 0, 0, 0, 0, 1, 0], 15), 'Unlikely to represent thyroid storm');
    assert.equal(at([4, 0, 0, 0, 1, 0, 0], 25), 'Suggestive of impending thyroid storm'); // 20 + 5
    assert.equal(at([0, 2, 0, 1, 0, 0, 0], 25), 'Suggestive of impending thyroid storm'); // 20 + 5
    assert.equal(at([3, 2, 0, 0, 0, 0, 0], 35), 'Suggestive of impending thyroid storm'); // 15 + 20
    assert.equal(at([4, 2, 0, 0, 0, 0, 0], 40), 'Suggestive of impending thyroid storm'); // 20 + 20
    assert.equal(at([4, 2, 0, 1, 0, 0, 0], 45), 'Highly suggestive of thyroid storm'); // 20 + 20 + 5
    assert.equal(at([0, 0, 0, 0, 0, 0, 0], 0), 'Unlikely to represent thyroid storm');
  });

  test('所有權重皆為 5 的倍數，實際可出現的邊界為 20｜25、40｜45', () => {
    const values = [0, 1, 2, 3, 4, 5, 6].flatMap(i => page(F).optionValues(S, i).map(Number));
    assert.ok(values.every(v => v % 5 === 0));
  });

  test('權重：各項最高分', () => {
    assert.equal(run([6, 0, 0, 0, 0, 0, 0]).value, '30 分');
    assert.equal(run([0, 3, 0, 0, 0, 0, 0]).value, '30 分');
    assert.equal(run([0, 0, 2, 0, 0, 0, 0]).value, '20 分');
    assert.equal(run([0, 0, 0, 5, 0, 0, 0]).value, '25 分');
    assert.equal(run([0, 0, 0, 0, 3, 0, 0]).value, '15 分');
    assert.equal(run([0, 0, 0, 0, 0, 1, 1]).value, '20 分');
    assert.equal(run([6, 3, 2, 5, 3, 1, 1]).value, '140 分');
  });

  test('缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('testicular-workup-ischemia-suspected-torsion-twist｜TWIST', () => {
  const S = 'testicular-workup-ischemia-suspected-torsion-twist';
  const run = opts => page(F).score(S, opts);

  test('文獻定義範例：睪丸腫＋硬＋提睪反射消失 → 5 分 high', () => {
    // 出處：Barbosa JA, et al. J Urol 2013;189:1859-1864（摘要：腫 2、硬 2、提睪反射消失 1、噁吐 1、高位 1；low/high 切點 2 與 5）。
    const o = run([1, 1, 1, 0, 0]);
    assert.equal(o.value, '5 分');
    assert.equal(o.interpretation, 'High, surgical exploration recommended');
  });

  test('切點：2｜3、4｜5', () => {
    assert.equal(run([1, 0, 0, 0, 0]).interpretation, 'Low, no recommendation for ultrasound');
    assert.equal(run([1, 0, 0, 1, 0]).interpretation, 'Intermediate, ultrasound indicated');
    assert.equal(run([1, 1, 0, 0, 0]).interpretation, 'Intermediate, ultrasound indicated');
    assert.equal(run([0, 0, 0, 0, 0]).interpretation, 'Low, no recommendation for ultrasound');
    assert.equal(run([1, 1, 1, 1, 1]).value, '7 分');
  });

  test('缺值', () => {
    assert.equal(run([1, null, 0, 0, 0]).interpretation, INCOMPLETE);
  });
});
