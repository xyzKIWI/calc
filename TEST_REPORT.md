# 測試報告（ed-calc 自動化測試）

- 產出日期：2026-10-25
- 範圍：公開版 9 頁、**72 個**計算機（README：作者本機完整版 73 個，FLACC 因授權未收錄，本 repo 沒有 FLACC，故無從測試）
- 結果：`node --test tests/*.test.js` → **286 個測試，全部通過，0 個 `todo`**
- **修正紀錄**：第一輪只補測試、不改頁面。經 Kiwi 同意後分兩批修正：第一批 8 項（第 2.1 節），第二批 11 項（第 2.2 節），每一項修改前都重讀過原文。原文無法確認、來源互相矛盾，或屬院內決策的，維持原樣，評估寫在第 3 節。

> 頁面是由作者本機的規格檔與產生器生成的。第 2.1、2.2 節的修正**必須同步改回本機規格檔**，否則下次重新產生頁面時會被蓋掉。屆時這些測試會失敗，正好當作提醒。

---

## 1. 測試怎麼做

1. **不抽函式、不改頁面**。`tests/harness.js` 讀入原始 HTML，建一個極簡 DOM，用 Node 內建 `node:vm` 原封不動執行頁面第一段 `<script>`（計算引擎）。測試的動作和使用者一樣：勾選 radio、填欄位或選下拉、按「計算」或點決策樹按鈕，再讀畫面上的結果文字。所以測到的是頁面本身的程式碼，不是另寫的一份。
   - 這樣做的原因：任務要求「行為完全不變」，不抽函式就不會改動頁面行為。（之後的臨床修正是另外、刻意的改動，見第 2 節。）
   - harness 也模擬瀏覽器的兩個細節：`type=number` 欄位輸入非數字時值變成空字串；下拉選單設成不存在的值時變成空字串。
2. **與真瀏覽器交叉比對**：在本機用預裝的 Chromium（Playwright）對 20 個代表性情境（含邊界、缺值、矛盾輸入、決策樹）實際點擊，畫面輸出與 harness **20/20 完全相同**。兩批修正後，都再用 Chromium 確認修正項目的畫面輸出（包括新增欄位的顯示與隱藏），並確認 9 頁載入時都沒有 JavaScript 錯誤。這只是開發時的驗證，沒有放進 CI；CI 只用 Node，無任何相依套件。
3. **每個計算機的測試至少包含**：
   - 一個有出處的範例（測試註解寫出處與類型，見第 4 節）；
   - 切點上下的邊界值（含半分、剛好等於切點、顯示四捨五入但判讀用原始值）；
   - 缺值、範圍外、極端值（最小／最大總分）。
4. **全站結構檢查**（`tests/integrity.test.js`）：
   - 每頁卡片與計算機定義一一對應，總數 72；
   - 所有選項的 HTML radio 分數＝引擎資料中的分數＝畫面顯示的分數（全部一致，未發現不符）；
   - 每個計算機都有專屬測試區塊（少一個就失敗）。
5. **文獻查證**由 AI 代理逐一查原始論文（PubMed／PMC）、MDCalc、官方網站或仿單，並引用原文片段；Tintinalli 9e 相關內容參考 Kiwi 的 Tintinalli 筆記站（https://tintinalli-notes.abcandxyz2.workers.dev）。查證紀錄的限制見第 6 節。

執行方式：

```bash
node --test tests/*.test.js     # 或 npm test；需要 Node 20 以上
```

`.github/workflows/test.yml`：push 或 PR 時用 Node 22 跑同一個指令。

---

## 2. 修正紀錄

共用計算引擎在 8 頁各有一份相同的副本，每次修改都 8 份一起改，修改後 8 份仍完全一致。每一項修正都有對應測試：修正前是 `todo` 或「現況紀錄」測試，修正後改寫為檢查新行為的一般測試，已全部通過。

### 2.1 第一批（8 項，涉及 7 個計算機）

| # | 計算機 | 修正前 | 修正後 | 依據 |
|---|---|---|---|---|
| 1 | Wells PE（三層模型） | `score<=1` 才算 Low，只有一項 1.5 分（例如 HR >100）時顯示 Moderate | `score<2` 為 Low，1.5 分顯示 Low | Wells PS, et al. Thromb Haemost 2000;83:416-420 摘要（PMID 10744147）：「low probability if the score was <2.0, moderate of the score was 2.0 to 6.0」；MDCalc 115：「low risk (<2 points)」 |
| 2 | ABCD² | 只有 0–3 分一層，4–7 分時判讀欄空白 | 新增「4–5 分：中度風險；2 日中風風險 4.1%」、「6–7 分：高風險；2 日中風風險 8.1%」 | Johnston SC, et al. Lancet 2007;369:283-292 摘要（PMID 17258668）：「high risk (score 6-7, 8.1% 2-day risk) … moderate risk (score 4-5, 4.1%) … low risk (score 0-3, 1.0%)」 |
| 3 | Ottawa SAH（適用條件） | 「Age ≥15 years」 | 「Age >15 years (≥16)」 | Perry JJ, et al. JAMA 2013 全文：規則框「For alert patients older than 15 y」、Methods「adult patients (defined as patients 16 years or older)」 |
| 4 | BRUE 2016 低風險 | 出生 ≥32 週直接通過，出生 <32 週才問矯正週數（「或」）；年齡寫「>2 months」 | 出生 ≥32 週**且**矯正（postconceptional）≥45 週才通過；年齡改為「>60 days」；卡片說明的註腳同步改寫 | **AAP 原文**（Pediatrics 2016;137(5):e20160591，AAP 指引執行摘要 PDF）：「(1) age >60 days; (2) gestational age ≥32 weeks and postconceptional age ≥45 weeks」；Tintinalli Ch117 同義（「GA ≥ 32 wk + post-conceptual ≥ 45 wk」）。MDCalc 4016 仍是「或」的寫法；README 的來源層級為原始文獻優先 |
| 5 | Canadian CT Head（危險機轉） | 「Dangerous mechanism? Fall from >3 feet or >5 stairs」 | 加上「Pedestrian struck by motor vehicle, occupant ejected from motor vehicle」（跌落高度於第二批再修正） | **Stiell 團隊規則卡**（CMAJ 2010;182:1527-1532 Figure 1，作者研究實際使用版本）：「Dangerous Mechanism: pedestrian struck by motor vehicle; occupant ejected from motor vehicle; fall from elevation ≥ 3 feet or 5 stairs」。文獻病例 Mower 2017 Box 3 Patient 1（行人被撞、GCS 15）已加入測試 |
| 6 | Canadian CT Head（適用條件） | 「Loss of consciousness and/or amnesia?」 | 「Minor head injury within 24 h with GCS 13–15 and witnessed loss of consciousness, definite amnesia, or witnessed disorientation?」 | Stiell 2005 JAMA 摘要（PMID 16189364）：「blunt head trauma resulting in witnessed loss of consciousness, disorientation, or definite amnesia and a GCS score of 13 to 15」；CMAJ 2010 規則卡：「GCS score of 13-15 after witnessed loss of consciousness, amnesia, or confusion」；CMAJ 2010 Methods：受傷 24 小時內 |
| 7 | West Haven 第 2 級 | 「Disoriented to time/space; …」 | 「Disoriented to time; …」（分數不變） | AASLD/EASL 2014 Practice Guideline 表格（PDF 逐字核對）：Grade II「Disoriented for time」；Grade III「Disoriented also for space」 |
| 8 | NEWS（2012）0 分 | 「NEWS 0 is below the specified NEWS 1–4 low-score band.」 | 「Low score (NEWS 0).」 | RCP 2012 NEWS 報告 Chart 2（PDF 逐字核對）：「0 … Aggregate 1–4 → Low」 |

同時修正兩處引用文字（非臨床內容）：
- 維持輸液：Holiday → **Holliday**，並補上卷期頁碼「Pediatrics 1957;19(5):823-832」。
- Parkland：改為 Baxter 1974 在 PubMed 上的標題「Fluid volume and electrolyte changes **of** the early postburn period」，卷期改為「1(4):693–703」。

### 2.2 第二批（11 項，由疑點評估後修正）

| # | 計算機 | 修正前 | 修正後 | 依據 |
|---|---|---|---|---|
| 1 | ROX | 沒有時間點欄位，一律用 12 小時的 <3.85 | 新增「Time since HFNC initiation」（2 h／6 h／12 h），失敗切點依時間點為 <2.85／<3.47／<3.85；≥4.88 三個時間點都適用 | Roca O, et al. AJRCCM 2019;199:1368-1376 摘要（PMID 30576221）：「A ROX less than 2.85, less than 3.47, and less than 3.85 at 2, 6, and 12 hours … were predictors of HFNC failure」 |
| 2 | S/F ratio | 插管模式沒有問 PEEP | 新增「Intubated PEEP」欄位（只在選 Intubated 時出現）；PEEP <5 時不套用 ARDS 分級 | Matthay MA, et al. Global ARDS definition, AJRCCM 2024（PMC10870872）Table 1 註腳：「For all severity categories of intubated ARDS, a minimum PEEP of 5 cm H2O is required.」 |
| 3 | 尿量 | 「<0.5 oliguria／0.5–1.0 Reduced／>1.0 Normal」，不看時數；後兩層找不到來源 | 改依 KDIGO 2012 尿量分期：<0.5 持續 6–12 h → Stage 1；<0.5 持續 ≥12 h → Stage 2；<0.3 持續 ≥24 h 或無尿 ≥12 h → Stage 3；<0.5 但未滿 6 h 或 ≥0.5 → 未達標準。註明「以輸入時段的平均值判讀」 | KDIGO Clinical Practice Guideline for AKI 2012, Table 2（經 Merck Manual、PMC3603696 等多個轉載一致核對） |
| 4 | Canadian CT Head | 跌落高度「>3 feet or >5 stairs」 | 「fall from elevation ≥3 feet or 5 stairs」 | CMAJ 2010 Figure 1 規則卡（同 2.1 #5）。失憶「≥30 minutes」也與規則卡一致，未改 |
| 5 | Canadian C-Spine | 跌落高度「≥1 Meter/5 Stairs」；適用條件沒有年齡 | 「Fall From Elevation ≥3 ft (0.9 m) or 5 Stairs」；適用條件加入「Age ≥16 years」 | Stiell IG, et al. N Engl J Med 2003;349:2510-2518 Figure 1：「a fall from an elevation ≥3 ft or 5 stairs」；Methods：「adults (defined as persons 16 years old or older)」 |
| 6 | New Orleans | 適用條件沒有「神經學檢查正常」與「24 小時內」 | 新增兩個適用條件：「Normal findings on a brief neurologic examination」「Presented within 24 hours of injury」 | Haydel MJ, et al. N Engl J Med 2000;343:100-105：「normal findings on a brief neurologic examination」、「presented within 24 hours after the injury」 |
| 7 | Ottawa SAH | 適用條件沒有「清醒」 | 新增「Alert (GCS 15)」 | Perry 2013 JAMA 規則框：「For alert patients older than 15 y …」 |
| 8 | BRUE 2016 | 只有 5 條低風險條件 | 補上第 (6)(7) 條「No concerning historical features and no concerning physical examination findings」；「No prior BRUE」改為「No prior BRUE (first event, not occurring in clusters)」 | AAP 原文 (3)「occurrence of only 1 BRUE (no prior BRUE ever and not occurring in clusters)」、(6)「no concerning historical features」、(7)「no concerning physical examination findings」；Tintinalli Ch117 也列 7 條 |
| 9 | PESI | 年齡可輸入小數（65.5 歲落在 Class II） | 年齡須為整數 | Aujesky 2005 Table 2（PMC2718410）以「年」計分，分級界線為整數 |
| 10 | NEXUS Chest CT | 判讀寫「主要與次要條件」 | 改為「四類條件皆無 → 不需胸部 CT（Chest CT-All）」／「有條件成立 → 無法排除胸部傷害（Chest CT-All）」 | Rodriguez RM, et al. PLoS Med 2015（PMC4595216）：major／minor 是用來分類「傷害」，不是「條件」 |
| 11 | 九則法 | 結果顯示「31.5 分」 | 顯示「31.5%」 | 九則法的結果是 %TBSA |

另外把 BRUE 2.0 的「Prematurity」欄位補上定義（「<32 wk, or 32–38 wk and corrected <45 wk」），與同一張卡片的公式說明一致；這不改變計算。

頁尾的「資料校對」日期（2026-08-22）沒有改，請在同步規格檔時一併更新。

### 2.3 Acetaminophen NAC：依院內流程核對，計算不修改

Kiwi 提供高醫「Acetaminophen(乙醯胺酚)中毒處理原則」2021/12/09 版 PDF，逐項核對：

| 項目 | 院內流程 | 頁面 | 結果 |
|---|---|---|---|
| Standard | 第一袋 200 mg/kg in D5W or N/S 500 mL over 4 h；第二袋 100 mg/kg in 1000 mL over 16 h | 相同 | 一致 |
| Double dose | 第二袋 200 mg/kg in 1000 mL over 16 h；適用 Acetaminophen >300 μg/mL 或 double nomogram line 以上 | 相同（適用條件寫在卡片說明） | 一致 |
| 速算支數 | Encore 300 mg/3 mL；第一袋＝2/3 × kg、第二袋＝1/3 × kg | 劑量 ÷ 300 mg | 一致 |
| 續用 | 結束前 2 h re-check；GPT >50 U/L 或 Acetaminophen >10 μg/mL → 續 12 h | 相同 | 一致 |
| 停藥 | GPT 下降、INR <2.0、Acetaminophen <10 μg/mL、病人無症狀，4 個條件都要符合 | 相同 | 一致 |
| 劑量／體重上限 | 未載明 | 無上限；卡片已提醒「澳紐指引以 110 kg 計算上限，超重病人請依藥局／毒物科意見」 | 一致 |
| 兒童稀釋液 | 固定 500／1000 mL | 相同 | 一致 |

原本的 `todo` 測試（150 kg 應封頂 22 g／11 g）改為「依院內流程不設上限」的一般測試，另新增續用／停藥文字的測試。

唯一修改的是卡片引用：原本引用 Rumack 1981（口服 72 小時方案），改為院內流程所列的參考文獻 Chiew AL, et al. Med J Aust 2020;212(4):175-183（澳紐指引）。

供參考（不影響頁面）：院內流程所引用的澳紐指引本身有 22 g／11 g 上限，兒童稀釋液為 7 mL/kg（上限 500 mL）、14 mL/kg（上限 1000 mL）；院內流程沒有採用這兩點。

---

## 3. 疑點評估：查證後決定不修改的項目

| 計算機 | 疑點 | 評估 | 決定 |
|---|---|---|---|
| MEWS | 心率剛好 40 次／分沒有對應選項（<40 與 41–50 之間） | 多數轉載（MDCalc、ScienceDirect、MDApp 等）都是「<40／41–50」，看起來原版就有這個空隙；Subbe 2001 原始表格在付費牆後。有少數計算機改寫為「≤40」，但沒有原文依據 | 不改。遇到心率剛好 40 時由醫師判斷選哪一格 |
| NIHSS | 「<4 預後良好」或「≤4」 | MDCalc 兩種寫法都有，NIH 表單本身沒有判讀切點，找不到原始出處決定 | 不改 |
| Killip | Class I／II 寫「<6%」「<17%」；Class IV 寫「30-day mortality 81%」 | 次級來源（引 Killip 1967）81% 是**院內**死亡率；MDCalc 頁面沒有任何死亡率數字；1967 原文無法取得 | Kiwi 確認不處理，維持原樣 |
| Pittsburgh Knee | 機轉不是鈍傷／跌倒時顯示「Cannot be applied」 | MDCalc 說「不符規則者不需 X 光」；Seaberg 1998 提到規則有適用步驟，但全文未見 | 不改 |
| Modified Denver | 少了 MDCalc 的前提「High-energy transfer mechanism with:」 | 只有 MDCalc 可核對，原始文獻沒有列出篩檢條件 | 不改 |
| CIWA-Ar | ≤8／9–19／≥20 三層 | 與 MDCalc 相同；量表原文只說「<10 通常不需額外藥物」，沒有分層 | 不改 |
| Rockall（完整） | 只有 0 分標「Low Risk」 | Rockall 1996 文字說 0–2 分「rebleeding occurs in less than 5%」，但同篇 Table IV(B) 的 2 分再出血是 5.3%，原文自相矛盾 | 不改 |
| Rockall（內視鏡前） | 6 分 48.9% | 同篇 Table IV(A) 48.9%、Table V(A) 51.1%，原文自相矛盾；頁面用 Table IV(A) | 不改 |
| Wells DVT | 兩層（≥2 likely） | 頁面引用的 Wells 2003 就是兩層；MDCalc 另有三層版本 | 不改 |
| Pediatric Trauma Score | 頁面說「原文未再給切點」 | MDCalc 提到 PTS <0 死亡率 100%，原文未核對；Tintinalli Ch110「PTS ≤ 8 → transfer」與頁面一致 | 不改 |
| 兒童氣管內管 | 沒有取整到 0.5 mm | 公式來源（MDCalc、Tintinalli Ch113）只給公式，沒有規定取整方向 | 不改 |
| Centor／McIsaac、STUMBL、ABC score | 原文內部或不同來源寫法不同 | 頁面都採原始論文的表格或主要定義 | 不改 |
| Canadian CT Head | 陽性時不區分高風險／中風險 | 結論同樣是 Consider CT；區分層級需要改輸出設計 | 不改 |
| Canadian C-Spine | 未列其他排除條件（穿刺傷、急性癱瘓、已知脊椎疾病、>48 h） | 規則卡本身只寫適用於 alert、stable；這些是研究排除條件 | 不改 |
| Ottawa SAH | 未問「頭痛發作 14 天內」 | 只出現在 JAMA 2013 Methods，不在規則框內 | 不改 |
| S/F ratio | 高海拔校正、估算 FiO₂ | 只適用於海拔 >1000 m 或無 FiO₂ 讀數的情況 | 不改 |
| Ottawa Ankle | 疼痛位置單選 | 介面限制，MDCalc 介面相同 | 不改 |
| West Haven 第 0 級 | 實為 minimal／covert，沒有「完全正常」選項 | 與 MDCalc 相同 | 不改 |
| TWIST、Burch-Wartofsky | 判讀措辭與摘要或部分來源不同 | 切點相同，只是措辭 | 不改 |
| QTc | Rautaharju 公式有兩個同名版本 | 頁面用 ACEP 2021 所列的 QT × (120+HR)/180 | 不改 |
| GCS | 「含 NT 不加總」標註出處 glasgowcomascale.org | 與 MDCalc（引 Teasdale 2014）相同，但在 glasgowcomascale.org 上沒找到這句話 | 不改 |
| mRS、Hunt-Hess | 6＝死亡；未列死亡率與「往下調一級」規則 | 與 MDCalc 相同 | 不改 |
| BRUE 2.0 | 原文摘要說 >60 天者風險較高，但公式年齡係數為負 | 原文內部矛盾，頁面照公式 | 不改 |

---

## 4. 各計算機結果一覽

範例類型：
- **A**＝文獻或官方網站直接列出的計算範例或病例
- **B**＝文獻表格中的數值（如「3 分 → 死亡率 72%」）
- **C**＝依查證過的權重與切點建構的病例
- **D**＝只依公式定義手算（公式本身已查證）
- 「未找到」＝判讀切點或數字找不到可驗證來源

狀態：**通過**＝頁面與查到的來源一致；**已修正**＝第 2 節；**疑點**＝第 3 節，評估後不改。

| 頁 | 計算機 | 狀態 | 範例類型與出處 |
|---|---|---|---|
| 核心十項 | MAP | 通過 | C／D：MDCalc 74 公式與 60、65 mmHg 切點 |
| 核心十項 | 休克指數 | 通過 | D：MDCalc 1316 公式（頁面無判讀分層） |
| 核心十項 | Parkland | 通過（引用已修正） | D：MDCalc 83 |
| 核心十項 | 4-2-1 維持輸液 | 通過（引用已修正） | D：MDCalc 72 |
| 核心十項 | qSOFA | 通過 | C：Seymour 2016 JAMA 摘要 |
| 核心十項 | CRB-65 | 通過 | C：Lim 2003 Thorax 摘要（項目）＋MDCalc（分層） |
| 核心十項 | NEXUS 頸椎 | 通過 | C：Hoffman 2000 NEJM 摘要 |
| 核心十項 | Ottawa 膝 | 通過 | C：Stiell 1995 Ann Emerg Med 摘要 |
| 核心十項 | sPESI | 通過 | B：Jiménez 2010 摘要 1.1%／8.9%（「1.5% 復發」僅見於 MDCalc，未核對原文） |
| 核心十項 | ABCD² | **已修正** | B：Johnston 2007 摘要三層風險 |
| 外傷 | ABC 大量輸血 | 通過 | C：Nunez 2009 摘要 |
| 外傷 | NEXUS Head CT | 通過 | A：Mower 2017 Box 3 病例 1、3 |
| 外傷 | Pittsburgh 膝 | 疑點 | C：Seaberg 1994 摘要 |
| 外傷 | 九則法 | **已修正**（顯示單位） | C：StatPearls Rule of Nines |
| 外傷 | STUMBL | 通過 | **A：Battle 2014 文中範例（67 歲、3 根肋骨、COPD、SpO₂ 87% → 24 分）**＋B：12、36 分 |
| 外傷 | Canadian C-Spine | **已修正** | C：Stiell 2003 NEJM Figure 1 |
| 外傷 | Canadian CT Head | **已修正** | A：Mower 2017 Box 3 病例 1＋C：CMAJ 2010 規則卡 |
| 外傷 | Modified Denver | 疑點 | C：MDCalc 10653（原始文獻未找到可驗證範例） |
| 外傷 | New Orleans | **已修正** | C：Haydel 2000 NEJM |
| 外傷 | NEXUS Chest CT | **已修正**（措辭） | A：Rodriguez 2015 文中唯一漏失病例（規則陰性）＋C |
| 外傷 | NEXUS Chest | 通過 | C：Rodriguez 2013 JAMA Surg 摘要 |
| 外傷 | Ottawa 踝 | 通過 | C：MDCalc 1670（Stiell 1993 摘要不含條件全文） |
| 心血管 | 4PEPS | 通過 | C：Roy 2021 JAMA Cardiol Table 3（PMC7931139） |
| 心血管 | CHA₂DS₂-VASc | 通過 | B：Friberg 2012 風險表（原文未能取得，20 個數值與次級轉載一致） |
| 心血管 | QTc | 通過（判讀切點未找到） | D：五種公式（Vandenberk 2016、ACEP 2021、MDCalc 48）；>500／≥480／≤360／≤320 ms 切點未找到可驗證範例 |
| 心血管 | HEAR | 通過 | C：Moumneh 2021 Eur J Emerg Med 摘要（<2） |
| 心血管 | Killip | 疑點 | 分級名稱 MDCalc；死亡率數字**未找到** |
| 心血管 | PERC | 通過 | C：Kline 2004 摘要 |
| 心血管 | PESI | **已修正**（整數年齡） | C：Aujesky 2005 Table 2（PMC2718410） |
| 心血管 | TIMI STEMI | 通過 | B：Morrow 2000（0 分、>8 分見原文；1–8 分僅經次級來源核對） |
| 心血管 | ADD-RS | 通過 | C：Rogers 2011、Nazerian 2018（ADvISED）摘要 |
| 心血管 | Revised Geneva | 通過 | B：Le Gal 2006 摘要盛行率 8／28／74% |
| 心血管 | Wells DVT | 通過 | C：Wells 2003 NEJM（兩層表依 NHS 改編版） |
| 心血管 | Wells PE | **已修正** | C：Wells 2000 Thromb Haemost 摘要 |
| 神經 | mRS | 通過 | C：MDCalc 1890 |
| 神經 | RACE | 通過 | C：Pérez de la Ossa 2014 摘要（≥5）、racescale.org |
| 神經 | tPA | 通過 | D：FDA Activase 仿單 2015 |
| 神經 | ABC/2 | 通過 | D：Kothari 1996、Huttner 2006（ABC/3） |
| 神經 | GCS | 通過 | A：glasgowcomascale.org「E2V4M6 = 12」；Tintinalli 9e 分級（mild 14–15／moderate 9–13／severe ≤8）經 Tintinalli 筆記站 Ch257 核對一致；Rosen 10e 分級未核對 |
| 神經 | Hunt-Hess | 通過 | B：MDCalc 404 分級表 |
| 神經 | ICH Score | 通過 | B：Hemphill 2001 摘要（0 分、5 分）；1–4 分依 MDCalc |
| 神經 | NIHSS | 疑點 | C：NIH/NINDS 量表表單逐項 |
| 神經 | Ottawa SAH | **已修正** | C：Perry 2013 JAMA 規則框 |
| 兒科 | BRUE 2.0 | **已修正**（欄位定義） | D：MDCalc 10400 公式（Nama 2022 原文係數表未能取得原文） |
| 兒科 | PECARN 頸椎 | 通過 | B：Leonard 2024（187/1549、217/7676、29/13205） |
| 兒科 | PECARN 腹部 | 通過 | B：Holmes 2013 順序＋各節點百分比（僅次級來源） |
| 兒科 | BRUE 2016 | **已修正** | C：AAP 2016 原文 7 條低風險條件 |
| 兒科 | PECARN 頭部 | 通過 | C：Kuppermann 2009 摘要、MDCalc 589 |
| 兒科 | 兒童氣管內管 | 通過（未取整，不改） | D：MDCalc 58、Tintinalli Ch113 |
| 兒科 | PTS | 通過 | C：MDCalc 10185（Tepas）；Tintinalli Ch110 |
| 兒科 | Westley | 通過 | C：MDCalc 677（分層出自 Bjornson 2005） |
| 檢傷 | IBW／ABW | 通過 | D：MDCalc 68（Devine 原文未能取得原文） |
| 檢傷 | MEWS | 疑點 | C：Subbe 2001 摘要（≥5）；選項依 MDCalc |
| 檢傷 | NEWS | **已修正**（0 分） | C：RCP 2012 Chart 1／2 |
| 檢傷 | NEWS2 | 通過 | C：RCP 2017 Chart 1／2 |
| 檢傷 | 尿量 | **已修正** | C：KDIGO 2012 尿量分期 |
| 檢傷 | RASS | 通過 | C：Ely 2003 JAMA RASS 表＋MDCalc 目標值 |
| 呼吸 | 氣管內管深度 | 通過 | D：Techanivate 2005（Chula formula）＋ARDSNet IBW |
| 呼吸 | HEAVEN | 通過 | C：Davis 2017（計數；原文無分層。≤93%、≤8 歲定義僅 MDCalc） |
| 呼吸 | S/F ratio | **已修正** | C：Matthay 2024 Global ARDS 定義 Table 1 |
| 呼吸 | Centor／McIsaac | 通過 | B：McIsaac 1998 CMAJ Table 2 |
| 呼吸 | ROX | **已修正** | C：Roca 2019 摘要 |
| 中毒 | BAWS | 通過 | B：Rastegar 2017 摘要（≥3；85.3%／65.8%） |
| 中毒 | CIWA-Ar | 疑點 | C：MDCalc 1736 分層（Sullivan 1989 原文無分層） |
| 中毒 | C-SSRS | 通過 | C：MDCalc 10169 急診篩檢版分級表 |
| 中毒 | HEADS-ED | 通過 | C：MDCalc 10463（≥8 或自殺項＝2） |
| 中毒 | Acetaminophen NAC | 通過（依院內流程；引用已修正） | A：高醫院內流程 2021/12/09（含速算支數）；Wong 2016、Chiew 2020 |
| 腸胃 | Rockall（完整） | 通過（原文自相矛盾，不改） | B：Rockall 1996 Table IV(B) |
| 腸胃 | Rockall（內視鏡前） | 通過（原文自相矛盾，不改） | B：Rockall 1996 Table IV(A) |
| 腸胃 | West Haven | **已修正**（第 2 級措辭） | C：AASLD/EASL 2014 指引表 |
| 腸胃 | Burch-Wartofsky | 通過 | C：MDCalc 3816（1993 原文未能取得原文） |
| 腸胃 | TWIST | 通過 | C：Barbosa 2013 摘要（切點 2／5） |

統計：通過 50、已修正 16、疑點（評估後不改）6，合計 72。

---

## 5. 未找到可驗證範例（或只能用次級來源核對）

以下數字或文字找不到原始文獻或官方來源可以逐字核對。測試照頁面現況寫，並在註解標明：

- Killip 30 天死亡率區間，以及 Class I／II 的「<」寫法
- QTc 判讀切點（>500、≥480、≤360、≤320 ms）；50 mm/s 每小格 20 ms 由紙速推得，來源文字未明寫
- GCS 的 Rosen 10e 嚴重度分級（Tintinalli 9e 分級已經由筆記站核對）
- MEWS 原始 Subbe 2001 表格（付費牆）
- Modified Denver 篩檢條件的原始文獻（只核對到 MDCalc）
- HEAVEN 各項定義中的數字（≤93%、≤8 歲）只在 MDCalc 找到
- sPESI「1.5% 復發性血栓栓塞或非致命性出血」只在 MDCalc 找到
- 只能用次級來源核對：CHA₂DS₂-VASc 的 Friberg 2012 風險表、TIMI STEMI 1–8 分死亡率、ICH Score 1–4 分死亡率、PECARN 腹部各節點百分比、PECARN 頸椎的 187、217 兩個分子、KDIGO 2012 尿量分期（多個轉載一致，原 PDF 未直接讀取）
- 原文未能取得原文（只讀到摘要或沒有摘要）：Burch-Wartofsky 1993、Devine 1974、Allgöwer 1967、Holliday-Segar 1957、Baxter 1974、Hunt-Hess 1968、Killip 1967、van Swieten 1988 全文、Nama 2022 全文、Stiell 2001 Lancet 全文（但 Stiell 團隊 2010 年研究使用的規則卡已讀到）

---

## 6. 限制

- 文獻查證由 AI 代理執行，引用的原文片段來自當次實際讀到的網頁、摘要或 PDF。部分 MDCalc 頁面是用摘要式工具讀取，引文可能是轉述而非逐字；Rockall 1996 的 PDF 是掃描檔，表格數字經 OCR。
- 第 2 節的 19 項修正，修改前都重讀過原文：JAMA 2013 全文、AASLD PDF、RCP PDF、AAP 2016 執行摘要 PDF、Stiell 2003 NEJM PDF、CMAJ 2010 規則卡圖、Global ARDS 定義全文，以及 PubMed 摘要。KDIGO 分期是經多個轉載交叉確認，沒有直接讀 KDIGO 原 PDF。**上線前仍建議以原文再確認一次。**
- Tintinalli 筆記站是 Kiwi 自己整理的 Tintinalli 9e 摘要，屬於次級資料，不等同教科書原文。
- 「C 類」範例是依查證過的定義建構的病例，不是論文印出來的病例；它驗證的是「頁面照文獻定義計算」，不代表該病例在原研究中的結果。
- 測試鎖定頁面**目前**的輸出文字。之後若 Kiwi 決定修改判讀文字、切點或院內流程，相關測試也要跟著改。
- harness 是極簡 DOM，只實作頁面用到的功能（選擇器子集、radio 互斥、input／change 事件、inline onclick）。已用真 Chromium 抽樣比對全部一致，但不保證涵蓋所有瀏覽器行為（例如版面、CSS）。
- 沒有測試回饋視窗（第二段 `<script>`，會送 Google 表單），因為與計算無關，且測試時不應對外送資料。
