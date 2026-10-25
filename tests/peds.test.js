'use strict';
// 兒科（calc-peds.html）
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { page } = require('./harness');

const F = 'calc-peds.html';
const INCOMPLETE = '請完成所有項目。';
const NUM_MISSING = '請完成所有適用項目。';
const NO_STRAT = '本評分之規格未提供風險分層。';

describe('brief-resolved-unexplained-events-2.0-brue-2.0-criteria-infants｜BRUE 2.0', () => {
  const S = 'brief-resolved-unexplained-events-2.0-brue-2.0-criteria-infants';
  const KEYS = ['similar', 'multiple', 'history', 'prematurity', 'cyanosis', 'breathing', 'tone'];
  const run = (age, yes = [], applic = {}) => {
    const p = page(F);
    p.fillApplicable(S, applic);
    return p.form(S, { age: String(age), ...Object.fromEntries(KEYS.map(k => [k, yes.includes(k) ? 'Yes' : 'No'])) });
  };

  test('公式範例：60 天、其餘皆否 → 嚴重潛在疾病 4.01%、再發 5.63%', () => {
    // 出處：Nama N, et al. Hosp Pediatr 2022;12:772-785（PMID 35965279）；係數依 MDCalc 10400 公式：
    // x = -2.9 − 0.0046 × 日齡 + 1.22 × 類似事件史 + 0.35 × 異常病史；w = -2.82 + 0.65 + 0.98 + 0.28 + 0.36 + 0.16 + 0.23 各項。
    // 原文係數表未能取得原文（403），以 MDCalc 公式手算。
    const o = run(60);
    assert.equal(o.value, 'Serious underlying condition 4.01%；Recurrent event 5.63%');
    assert.equal(o.interpretation, NO_STRAT);
  });

  test('係數：0 天皆否、30 天皆是', () => {
    assert.equal(run(0).value, 'Serious underlying condition 5.22%；Recurrent event 5.63%');
    assert.equal(run(30, KEYS).value, 'Serious underlying condition 18.72%；Recurrent event 46.01%');
  });

  test('適用條件：非 <1 歲或症狀未緩解 → 不適用', () => {
    assert.equal(run(60, [], { infant: 'No' }).interpretation, '本規則不適用於此病人，請依臨床判斷。');
    assert.equal(run(60, [], { resolved_event: 'No' }).interpretation, '本規則不適用於此病人，請依臨床判斷。');
    assert.equal(page(F).form(S, { age: '60' }).interpretation, '請完成所有適用性條件。');
  });

  test('缺值與範圍外輸入', () => {
    const p = page(F);
    p.fillApplicable(S);
    assert.equal(p.form(S, { age: '60' }).interpretation, INCOMPLETE);
    assert.match(run(365).interpretation, /需介於 0–364 days/);
    assert.equal(run(364).value, 'Serious underlying condition 1.02%；Recurrent event 5.63%');
  });
});

describe('pecarn-cervical-spine-injury-prediction-rule｜PECARN 頸椎', () => {
  const S = 'pecarn-cervical-spine-injury-prediction-rule';
  const run = c => page(F).tree(S, c);

  test('文獻數字：高風險 187/1549（12.1%）、其他因子 217/7676（2.8%）、皆無 29/13205（0.2%）', () => {
    // 出處：Leonard JC, et al. Lancet Child Adolesc Health 2024;8:482-490（PMC11261431）；12.1/2.8/0.2% 見 MDCalc 10552 演算法圖；
    // 三組分母相加 22430、分子相加 433，與原文總數一致。
    const ct = run(['Yes']);
    assert.equal(ct.value, 'Consider computed tomography');
    assert.equal(ct.interpretation, 'Risk of CSI 187/1549 (12.1%)');
    const xr = run(['No', 'Yes']);
    assert.equal(xr.value, 'Consider plain radiographs');
    assert.equal(xr.interpretation, 'Risk of CSI 217/7676 (2.8%)');
    const clear = run(['No', 'No']);
    assert.equal(clear.value, 'Consider clinical clearance');
    assert.equal(clear.interpretation, 'Risk of CSI 29/13205 (0.2%)');
  });

  test('未完成時不輸出', () => {
    assert.equal(run(['No']).shown, false);
  });
});

describe('pecarn-pediatric-intra-abdominal-injury-iai-algorithm｜PECARN 腹部', () => {
  const S = 'pecarn-pediatric-intra-abdominal-injury-iai-algorithm';
  const run = c => page(F).tree(S, c);
  const neg = ['No or Unknown', '14-15', 'None', 'No', 'No or Unable to assess', 'No or Unknown'];

  test('文獻順序：腹壁外傷/安全帶痕 → 5.7%；七項皆陰性 → 0.1%', () => {
    // 出處：Holmes JF, et al. Ann Emerg Med 2013;62:107-116（摘要列出七項之重要性順序；NPV 5028/5034 ≈ 0.1% 風險）；
    // 各節點百分比僅見於次級來源（Pediatric EM Morsels），原文圖未能取得原文。
    assert.equal(run(['Yes']).value, '5.7% IAI with intervention');
    assert.equal(run([...neg, 'No or Unknown']).value, '0.1% IAI with intervention');
  });

  test('各節點', () => {
    assert.equal(run(['No or Unknown', '3-13']).value, '4.6% IAI with intervention');
    assert.equal(run(['No or Unknown', '14-15', 'Mild or Moderate or Severe']).value, '1.4% IAI with intervention');
    assert.equal(run(['No or Unknown', '14-15', 'None', 'Yes']).value, '0.6% IAI with intervention');
    assert.equal(run(['No or Unknown', '14-15', 'None', 'No', 'Yes']).value, '0.7% IAI with intervention');
    assert.equal(run(['No or Unknown', '14-15', 'None', 'No', 'No or Unable to assess', 'Yes']).value, '2.9% IAI with intervention');
    assert.equal(run([...neg, 'Yes']).value, '0.5% IAI with intervention');
  });
});

describe('brief-resolved-unexplained-events-brue-criteria-infants｜BRUE 2016', () => {
  const S = 'brief-resolved-unexplained-events-brue-criteria-infants';
  const run = c => page(F).tree(S, c);
  const entry = ['Yes', 'Yes', 'Yes', 'Yes'];

  test('指引定義範例：符合 BRUE、<1 分鐘、>2 個月、≥32 週出生、首次、無 CPR → Lower-risk', () => {
    // 出處：Tieder JS, et al. Pediatrics 2016;137(5):e20160590（AAP 指引）；MDCalc 4016。
    assert.equal(run([...entry, 'Yes', 'Yes', 'Yes', 'Yes', 'Yes']).value, 'Lower-risk BRUE');
  });

  test('任一高風險條件 → Higher-risk；入口任一否 → Not BRUE', () => {
    assert.equal(run([...entry, 'No']).value, 'Higher-risk BRUE'); // ≥1 分鐘
    assert.equal(run([...entry, 'Yes', 'No']).value, 'Higher-risk BRUE'); // ≤2 個月
    assert.equal(run([...entry, 'Yes', 'Yes', 'Yes', 'No']).value, 'Higher-risk BRUE'); // 曾有 BRUE
    assert.equal(run([...entry, 'Yes', 'Yes', 'Yes', 'Yes', 'No']).value, 'Higher-risk BRUE'); // 需 CPR
    assert.equal(run([...entry, 'Yes', 'Yes', 'No', 'No']).value, 'Higher-risk BRUE'); // <32 週且 PCA <45 週
    for (let i = 0; i < 4; i += 1) {
      const c = ['Yes', 'Yes', 'Yes', 'Yes'].slice(0, i).concat('No');
      assert.equal(run(c).value, 'Not BRUE', `入口第 ${i} 題`);
    }
  });

  test('現況紀錄：<32 週出生但 PCA ≥45 週 → 可為 Lower-risk（與 MDCalc 相同）', () => {
    assert.equal(run([...entry, 'Yes', 'Yes', 'No', 'Yes', 'Yes', 'Yes']).value, 'Lower-risk BRUE');
  });

  test('與 AAP 指引不一致：≥32 週出生者未再確認 PCA ≥45 週', { todo: '見 TEST_REPORT.md：BRUE 2016 早產條件' }, () => {
    // 出處：Tieder 2016 AAP 指引（經 AAFP 摘要 https://www.aafp.org/pubs/afp/issues/2017/0301/p330.html）：低風險需
    // 「32 weeks or more of gestation」且「corrected gestational age of at least 45 weeks」（兩者皆須成立）。
    // 病例：61 天大、33 週出生（PCA ≈ 41.7 週），依 AAP 應為 higher-risk；頁面在「Born at ≥32 weeks? Yes」後直接跳到「No prior BRUE」。
    const o = run([...entry, 'Yes', 'Yes', 'Yes']);
    assert.match(o.question, /45 weeks/);
  });
});

describe('pecarn-pediatric-head-injury-trauma-algorithm｜PECARN 頭部', () => {
  const S = 'pecarn-pediatric-head-injury-trauma-algorithm';
  const run = c => page(F).tree(S, c);

  test('文獻定義範例：GCS 14 → CT recommended；GCS 15、<2 歲、無任何因子 → CT not recommended', () => {
    // 出處：Kuppermann N, et al. Lancet 2009;374:1160-1170（適用 GCS 14–15）；MDCalc 589 分支結構。
    assert.equal(run(['GCS 14']).value, 'CT recommended');
    assert.equal(run(['GCS 15', '<2 years', 'No', 'No']).value, 'CT not recommended');
  });

  test('各分支', () => {
    assert.equal(run(['GCS 15', '<2 years', 'Yes']).value, 'CT recommended');
    assert.equal(run(['GCS 15', '<2 years', 'No', 'Yes']).value, 'Observation versus CT on the basis of other clinical factors');
    assert.equal(run(['GCS 15', '≥2 years', 'Yes']).value, 'CT recommended');
    assert.equal(run(['GCS 15', '≥2 years', 'No', 'Yes']).value, 'Observation versus CT on the basis of other clinical factors');
    assert.equal(run(['GCS 15', '≥2 years', 'No', 'No']).value, 'CT not recommended');
  });

  test('不適用：GCS ≤13', () => {
    const o = run(['GCS 13 or lower']);
    assert.equal(o.value, 'Rule not applicable');
    assert.match(o.interpretation, /GCS 14–15/);
  });
});

describe('pediatric-endotracheal-tube-ett-size｜兒童氣管內管', () => {
  const S = 'pediatric-endotracheal-tube-ett-size';
  const run = age => page(F).form(S, { age: String(age) });

  test('公式範例：4 歲 → 無氣囊 5.0 mm、有氣囊 4.5 mm', () => {
    // 出處：MDCalc 58（Uncuffed = Age/4 + 4；Cuffed = Age/4 + 3.5；適用 1–12 歲）；依公式手算。
    assert.equal(run(4).value, 'Uncuffed 5.0 mm；Cuffed 4.5 mm');
    assert.equal(run(6).value, 'Uncuffed 5.5 mm；Cuffed 5.0 mm');
  });

  test('邊界：1 歲與 12 歲；未取整到 0.5 mm', () => {
    assert.equal(run(1).value, 'Uncuffed 4.3 mm；Cuffed 3.8 mm'); // 4.25 / 3.75，顯示一位小數（見報告）
    assert.equal(run(12).value, 'Uncuffed 7.0 mm；Cuffed 6.5 mm');
  });

  test('缺值與範圍外輸入', () => {
    assert.equal(page(F).form(S, {}).interpretation, NUM_MISSING);
    assert.match(run(0.5).interpretation, /需介於 1–12 years/);
    assert.match(run(13).interpretation, /需介於 1–12 years/);
  });
});

describe('pediatric-trauma-score-pts｜PTS', () => {
  const S = 'pediatric-trauma-score-pts';
  const run = opts => page(F).score(S, opts);
  // 每題選項 [+2, +1, -1]

  test('文獻定義：PTS >8 原研究無死亡', () => {
    // 出處：Tepas JJ, et al. J Pediatr Surg 1987（MDCalc 10185：「no deaths were seen in patients with scores >8」）。
    const o = run([0, 0, 0, 0, 0, 0]);
    assert.equal(o.value, '12 分');
    assert.match(o.interpretation, /^PTS >8/);
  });

  test('切點：8｜9', () => {
    assert.equal(run([1, 1, 1, 0, 0, 0]).value, '9 分');
    assert.match(run([1, 1, 1, 0, 0, 0]).interpretation, /^PTS >8/);
    assert.equal(run([1, 1, 1, 1, 0, 0]).value, '8 分');
    assert.match(run([1, 1, 1, 1, 0, 0]).interpretation, /^PTS ≤8/);
  });

  test('極端與缺值', () => {
    assert.equal(run([2, 2, 2, 2, 2, 2]).value, '-6 分');
    assert.equal(run([0, 0, 0, 0, 0, null]).interpretation, INCOMPLETE);
  });
});

describe('westley-croup-score｜Westley', () => {
  const S = 'westley-croup-score';
  const run = opts => page(F).score(S, opts);

  test('MDCalc 分層範例：輕度凹陷＋休息時喘鳴 → 3 分 Moderate', () => {
    // 出處：權重 Westley CR, et al. Am J Dis Child 1978；分層 Bjornson 2005（MDCalc 677：0–2 / 3–5 / 6–11 / 12–17）。
    const o = run([1, 2, 0, 0, 0]);
    assert.equal(o.value, '3 分');
    assert.equal(o.interpretation, 'Moderate');
  });

  test('切點：2｜3、5｜6、11｜12', () => {
    assert.equal(run([1, 1, 0, 0, 0]).interpretation, 'Mild');
    assert.equal(run([3, 2, 0, 0, 0]).interpretation, 'Moderate'); // 5
    assert.equal(run([3, 2, 0, 0, 1]).interpretation, 'Severe'); // 6
    assert.equal(run([3, 2, 0, 0, 1]).value, '6 分');
    assert.equal(run([0, 2, 0, 1, 0]).value, '7 分');
    assert.equal(run([2, 2, 0, 1, 2]).value, '11 分');
    assert.equal(run([2, 2, 0, 1, 2]).interpretation, 'Severe');
    assert.equal(run([3, 2, 0, 1, 2]).value, '12 分');
    assert.equal(run([3, 2, 0, 1, 2]).interpretation, 'Impending Respiratory Failure');
  });

  test('極端與缺值', () => {
    assert.equal(run([0, 0, 0, 0, 0]).value, '0 分');
    assert.equal(run([3, 2, 2, 1, 2]).value, '17 分');
    assert.equal(run([3, 2, 2, 1, null]).interpretation, INCOMPLETE);
  });
});
