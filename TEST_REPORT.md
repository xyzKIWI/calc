# 測試報告（ed-calc 自動化測試）

- 產出日期：2026-10-25
- 範圍：公開版 9 頁、**72 個**計算機（README：作者本機完整版 73 個，FLACC 因授權未收錄，本 repo 沒有 FLACC，故無從測試）
- 結果：`node --test tests/*.test.js` → **282 個測試，281 通過、0 失敗、1 個 `todo`**（`todo` 是 NAC 劑量上限，見第 2.2 節）
- **修正紀錄**：第一輪只補測試、不改頁面。第二輪經 Kiwi 同意，把**原文已確認**的 8 項（7 個計算機）修進頁面，另修 2 處引用文字（第 2.1 節）。原文無法確認或屬院內決策的，維持原樣並留在報告。

> 頁面是由作者本機的規格檔與產生器生成的。第 2.1 節的修正**必須同步改回本機規格檔**，否則下次重新產生頁面時會被蓋掉。屆時這些測試會失敗，正好當作提醒。

---

## 1. 測試怎麼做

1. **不抽函式、不改頁面**。`tests/harness.js` 讀入原始 HTML，建一個極簡 DOM，用 Node 內建 `node:vm` 原封不動執行頁面第一段 `<script>`（計算引擎）。測試的動作和使用者一樣：勾選 radio、填欄位或選下拉、按「計算」或點決策樹按鈕，再讀畫面上的結果文字。所以測到的是頁面本身的程式碼，不是另寫的一份。
   - 這樣做的原因：任務要求「行為完全不變」，不抽函式就不會改動頁面行為。（第二輪的臨床修正是另外、刻意的改動，見第 2.1 節。）
   - harness 也模擬瀏覽器的兩個細節：`type=number` 欄位輸入非數字時值變成空字串；下拉選單設成不存在的值時變成空字串。
2. **與真瀏覽器交叉比對**：在本機用預裝的 Chromium（Playwright）對 20 個代表性情境（含邊界、缺值、矛盾輸入、決策樹）實際點擊，畫面輸出與 harness **20/20 完全相同**。第二輪修正後，再用 Chromium 確認修正項目的畫面輸出，並確認 9 頁載入時都沒有 JavaScript 錯誤。這只是開發時的驗證，沒有放進 CI；CI 只用 Node，無任何相依套件。
3. **每個計算機的測試至少包含**：
   - 一個有出處的範例（測試註解寫出處與類型，見第 4 節）；
   - 切點上下的邊界值（含半分、剛好等於切點、顯示四捨五入但判讀用原始值）；
   - 缺值、範圍外、極端值（最小／最大總分）。
4. **全站結構檢查**（`tests/integrity.test.js`）：
   - 每頁卡片與計算機定義一一對應，總數 72；
   - 所有選項的 HTML radio 分數＝引擎資料中的分數＝畫面顯示的分數（全部一致，未發現不符）；
   - 每個計算機都有專屬測試區塊（少一個就失敗）。
5. **文獻查證**由 AI 代理逐一查原始論文（PubMed／PMC）、MDCalc、官方網站或仿單，並引用原文片段。查證紀錄的限制見第 6 節。

執行方式：

```bash
node --test tests/*.test.js     # 或 npm test；需要 Node 20 以上
```

`.github/workflows/test.yml`：push 或 PR 時用 Node 22 跑同一個指令。

---

## 2. 與文獻不一致

### 2.1 已修正（2026-10-25，原文已確認）

共 8 項，涉及 7 個計算機（Canadian CT Head 有 2 項）。每一項都有對應測試：修正前是 `todo` 或「現況紀錄」測試，修正後改寫為檢查新行為的一般測試，已全部通過。共用計算引擎在 8 頁各有一份相同的副本，修改時 8 份一起改，修改後 8 份仍完全一致。

| # | 計算機 | 修正前 | 修正後 | 依據 |
|---|---|---|---|---|
| 1 | Wells PE（三層模型） | `score<=1` 才算 Low，只有一項 1.5 分（例如 HR >100）時顯示 Moderate | `score<2` 為 Low，1.5 分顯示 Low | Wells PS, et al. Thromb Haemost 2000;83:416-420 摘要（PMID 10744147）：「low probability if the score was <2.0, moderate of the score was 2.0 to 6.0」；MDCalc 115：「low risk (<2 points)」 |
| 2 | ABCD² | 只有 0–3 分一層，4–7 分時判讀欄空白 | 新增「4–5 分：中度風險；2 日中風風險 4.1%」、「6–7 分：高風險；2 日中風風險 8.1%」 | Johnston SC, et al. Lancet 2007;369:283-292 摘要（PMID 17258668）：「high risk (score 6-7, 8.1% 2-day risk) … moderate risk (score 4-5, 4.1%) … low risk (score 0-3, 1.0%)」 |
| 3 | Ottawa SAH（適用條件） | 「Age ≥15 years」 | 「Age >15 years (≥16)」 | Perry JJ, et al. JAMA 2013 全文：規則框「For alert patients older than 15 y」、Methods「adult patients (defined as patients 16 years or older)」 |
| 4 | BRUE 2016 低風險 | 出生 ≥32 週直接通過，出生 <32 週才問矯正週數（「或」）；年齡寫「>2 months」 | 出生 ≥32 週**且**矯正（postconceptional）≥45 週才通過；年齡改為「>60 days」；卡片說明的註腳同步改寫 | AAP 指引 Tieder 2016（經 AAFP 摘要 https://www.aafp.org/pubs/afp/issues/2017/0301/p330.html 核對）：「age older than 60 days」、「birth at 32 weeks or more of gestation and corrected gestational age of at least 45 weeks」。註：MDCalc 4016 仍是「或」的寫法；README 的來源層級為原始文獻優先於 MDCalc |
| 5 | Canadian CT Head（危險機轉） | 「Dangerous mechanism? Fall from >3 feet or >5 stairs」 | 「Dangerous mechanism? Pedestrian struck by motor vehicle, occupant ejected from motor vehicle, or fall from >3 feet or >5 stairs」 | MDCalc 608 原句；Stiell 2005（經 Wikipedia 轉引）、WikEM 同義。文獻病例 Mower 2017 Box 3 Patient 1（行人被撞、GCS 15）已加入測試 |
| 6 | Canadian CT Head（適用條件） | 「Loss of consciousness and/or amnesia?」 | 「Minor head injury within 24 h with GCS 13–15 and witnessed loss of consciousness, definite amnesia, or witnessed disorientation?」 | Stiell 2001 Lancet 摘要（PubMed 11356436）：「presented with a Glasgow Coma Scale (GCS) score of 13-15 after head injury」；MDCalc 608：「within 24 hours … GCS 13-15 and at least one of: Loss of consciousness. Amnesia… Witnessed disorientation.」 |
| 7 | West Haven 第 2 級 | 「Disoriented to time/space; …」 | 「Disoriented to time; …」（分數不變） | AASLD/EASL 2014 Practice Guideline 表格（PDF 已逐字核對）：Grade II「Disoriented for time」；Grade III「Disoriented also for space」 |
| 8 | NEWS（2012）0 分 | 「NEWS 0 is below the specified NEWS 1–4 low-score band.」 | 「Low score (NEWS 0).」 | RCP 2012 NEWS 報告 Chart 2（PDF 已逐字核對）：「0 … Aggregate 1–4 → Low」 |

同時修正兩處引用文字（非臨床內容）：
- 維持輸液：Holiday → **Holliday**，並補上卷期頁碼「Pediatrics 1957;19(5):823-832」。
- Parkland：改為 Baxter 1974 在 PubMed 上的標題「Fluid volume and electrolyte changes **of** the early postburn period」，卷期改為「1(4):693–703」。

頁尾的「資料校對」日期（2026-08-22）沒有改，請在同步規格檔時一併更新。

### 2.2 未修正（測試仍為 `todo`）

| 計算機 | 輸入 | 公開指引 | 頁面 | 未修正的原因 |
|---|---|---|---|---|
| Acetaminophen NAC 兩袋法 | 體重 150 kg，標準兩袋 | 第一袋上限 22 g、第二袋上限 11 g（成人上限體重 110 kg）——Chiew AL, et al. Med J Aust 2020;212:175-183 Box 7 | 第一袋 30000 mg、第二袋 15000 mg（無上限） | 頁面依高醫院內流程（2021/12/09）。院內可能有意不設上限，這份院內文件我無法查核，需要 Kiwi 確認 |

## 3. 需要醫師判斷的疑點（數字與來源大致相符，但有邊界、措辭或遺漏）

這些項目的測試寫的是**頁面目前的行為**（部分測試名稱標「現況紀錄」），會通過。來源互相矛盾、只有次級來源，或需要新增輸入欄位的，都沒有改，列在這裡供判斷。

**決策規則的適用條件／分支**
- **Canadian C-Spine**：危險機轉跌落高度頁面寫「≥1 Meter/5 Stairs」，Stiell 2010 CMAJ 寫「more than 3 ft (91 cm)」、MDCalc 寫「≥3 ft (0.9 m)」。適用條件沒有問年齡（原研究為成人，<16 歲排除；只核對到摘要）。
- **Canadian CT Head**：失憶頁面與 MDCalc 用「≥30 分鐘」，PubMed 摘要與 Mower 2017 寫「>30 min」（但 PubMed 版摘要也把嘔吐「≥2」寫成「>2」、年齡「≥65」寫成「>65」，疑似符號遺失，無法據此判定）；危險機轉的跌落高度，各來源也有「>3 ft」與「≥3 ft」兩種寫法。陽性時只顯示「Consider obtaining a CT scan」，不區分高風險（神經外科介入）或中風險。排除條件只有 MDCalc 的三項（<16 歲、抗凝血、傷後癲癇），原文排除條件更多。
- **Pittsburgh Knee**：機轉不是鈍傷／跌倒時顯示「Cannot be applied」；MDCalc 的說法是「Patients who do not meet the Pittsburgh decision rules do not need an x-ray」。
- **New Orleans**：適用條件沒有「簡短神經學檢查正常」與「24 小時內」（Haydel 2000、MDCalc 都有）。頁面自加的「≥18 歲」「使用抗血栓藥物 → 不適用」引自 ACEP 2023，全文未核對。
- **Ottawa SAH**：適用條件沒有「清醒（GCS 15）」與「頭痛發作 14 天內」（JAMA 2013 納入條件）。
- **Ottawa Ankle**：疼痛位置是單選，踝部與足中段同時疼痛時無法兩者都評估（MDCalc 介面相同）。
- **NEXUS Chest CT**：判讀文字寫「主要與次要條件」，原文的 major／minor 是指「傷害」而非「條件」；也沒有另外報告 Chest CT-Major 結果（不含快速減速機轉）。
- **Modified Denver**：條目與 MDCalc 相同，但省略 MDCalc 的前提「High-energy transfer mechanism with:」；頁面所引 Cothren 2004 摘要沒有列出這些篩檢條件。

**切點、分層與數字**
- **ROX**：「<3.85 高失敗風險」是 Roca 2019 的 **12 小時**切點；2 小時、6 小時分別是 <2.85、<3.47。頁面沒有時間點輸入，一律用 3.85。例：6 小時 ROX 3.60 頁面判高風險，但依 6 小時切點並未低於 3.47。（≥4.88 在 2／6／12 小時都適用，沒問題。）
- **S/F ratio**：2024 Global ARDS 定義要求插管病人 PEEP ≥5 cm H₂O，頁面在「Intubated」模式沒有問 PEEP；高海拔校正、估算 FiO₂ 也未實作。所有切點（148／235／315、SpO₂ ≤97%、HFNC ≥30 L/min、NIV ≥5）與原文一致。
- **MEWS**：選項與 MDCalc 輸入完全相同，但 MDCalc 自己的說明表（>130、>30、>38.5、111-129）以及 PMC6526008 的版本（HR ≤39／40–50；RR 10–18／19–20）不一樣。**HR 剛好 40 次／分沒有對應選項**（<40 與 41-50 之間）。Subbe 2001 原始表格未能取得原文。
- **尿量**：<0.5 mL/kg/hr 與 KDIGO 數字相同，但 KDIGO 要求持續 ≥6 小時，頁面任何時數都套用。「0.5–1.0 Reduced」「>1.0 Normal」兩層**未找到可驗證來源**。
- **NIHSS**：頁面用「<4 預後良好」並標「原文唯一切點」；MDCalc 同時有「<4」與「4 or less」兩種寫法，剛好 4 分的歸屬有爭議。NIH 表單本身沒有判讀切點。（截肢／插管項記為 UN，與 NIH 表單一致；MDCalc 則記 0 分。）
- **Rockall（完整）**：只有 0 分加註「Low Risk」；Rockall 1996 原文是把 0–2 分一起描述為風險極低。
- **Rockall（內視鏡前）**：6 分頁面用 Table IV(A) 的 48.9%；同一篇的 Table V(A) 為 72/141 = 51.1%（原文自身不一致）。
- **PESI**：年齡欄允許小數，65.5 歲會落在 Class II；原文分級以整數年齡計。
- **Wells DVT**：頁面採 Wells 2003 兩層（≥2 likely）；MDCalc 目前顯示三層（≤0／1–2／≥3）。
- **Pediatric Trauma Score**：頁面說「原文未再給切點」，MDCalc 提到 PTS <0 死亡率 100%。
- **兒童氣管內管**：沒有取整到 0.5 mm（1 歲顯示 4.3／3.8 mm）。
- **CIWA-Ar**：≤8／9–19／≥20 三層與 MDCalc 相同；量表原文只說「<10 通常不需額外藥物」。
- **Centor／McIsaac**：百分比用原文 Table 2 的合併值（2.5／5.1／11.2／27.8／52.8%，相符）；原文附圖則是區間（2-3／4-6／10-12／27-28／38-63）。
- **STUMBL**：原文 Methods 寫最高組「≥30」，Table 5 寫「31+」；頁面依 Table 5，30 分落在 26–30 組。原文以「每降 5% 加 2 分」計 SpO₂，頁面最低只到 80–84%。
- **ABC score**：頁面依 Nunez 2009 與 MDCalc（SBP ≤90、HR ≥120）；Cotton 2010 驗證研究摘要寫「<90」「>120」。
- **Killip**：Class I／II 院內死亡率頁面寫「<6%」「<17%」，次級來源（引 Killip 1967）為 6%、17%；Class IV 寫「30-day mortality 81%」，但 81% 在該來源是 1967 年的院內死亡率；30 天死亡率區間（2-3／5-12／10-20%）**未找到可驗證來源**。

**措辭與其他**
- **West Haven**：第 0 級實為 AASLD/EASL 的「Minimal／covert」，沒有「Unimpaired（完全正常）」選項。（第 2 級措辭已修正，見 2.1。）
- **TWIST**：高風險「surgical exploration recommended」的措辭在 Barbosa 2013 摘要中找不到（摘要只說 ≥5 分 PPV 100%、超音波只用於中風險）；切點 2／5 相符。
- **Burch-Wartofsky**：25–44 分 MDCalc 寫「impending」，部分次級來源寫「supports the diagnosis」；切點相同。原始 1993 文獻未能取得原文。
- **QTc**：Rautaharju 公式頁面用 QT × (120+HR)/180（ACEP 2021 文章所列）；Vandenberk 2016 JAHA 用的是另一個同名公式（QT − 0.185(RR−1) + k，分性別）。
- **GCS**：「含 NT 不加總」與 MDCalc（引 Teasdale 2014）相同，但頁面標註的出處 glasgowcomascale.org 上查到的頁面沒有這句話。Rosen 10e／Tintinalli 9e 的嚴重度分級這次仍無法取得教科書內容核對（見第 5 節）。
- **mRS**：van Swieten 1988 原文為 0–5 六級；頁面與 MDCalc 加了 6＝死亡。
- **Hunt-Hess**：沒有 MDCalc 的死亡率欄，也沒有原文「嚴重全身疾病或血管痙攣時往下調一級」的規則。
- **BRUE 2.0**：「Prematurity」欄位沒有定義（MDCalc：<32 週，或 32–38 週且矯正 <45 週）。原文摘要說 >60 天者嚴重疾病比例較高（OR 1.43），但公式的年齡係數為負（越大風險越低），屬原文內部矛盾。
- **NAC 兩袋法**：兒童稀釋液固定 500／1000 mL（Chiew 2020：7 mL/kg 上限 500 mL、14 mL/kg 上限 1000 mL）；續用門檻頁面為「>10 μg/mL」、Chiew 為「≥10 mg/L」；頁面引用的 Rumack 1981 是口服方案，並非兩袋法的出處。
- **九則法**：結果單位顯示「分」（例如「31.5 分」），實際是 %TBSA。

---

## 4. 各計算機結果一覽

範例類型：
- **A**＝文獻或官方網站直接列出的計算範例或病例
- **B**＝文獻表格中的數值（如「3 分 → 死亡率 72%」）
- **C**＝依查證過的權重與切點建構的病例
- **D**＝只依公式定義手算（公式本身已查證）
- 「未找到」＝判讀切點或數字找不到可驗證來源

狀態：**通過**＝頁面與查到的來源一致；**已修正**＝第 2.1 節，2026-10-25 已改；**不一致**＝第 2.2 節，未改；**疑點**＝第 3 節。

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
| 外傷 | ABC 大量輸血 | 通過（疑點） | C：Nunez 2009 摘要 |
| 外傷 | NEXUS Head CT | 通過 | A：Mower 2017 Box 3 病例 1、3 |
| 外傷 | Pittsburgh 膝 | 疑點 | C：Seaberg 1994 摘要 |
| 外傷 | 九則法 | 通過（顯示單位） | C：StatPearls Rule of Nines |
| 外傷 | STUMBL | 通過（疑點） | **A：Battle 2014 文中範例（67 歲、3 根肋骨、COPD、SpO₂ 87% → 24 分）**＋B：12、36 分 |
| 外傷 | Canadian C-Spine | 疑點 | C：Stiell 2001 JAMA 摘要 |
| 外傷 | Canadian CT Head | **已修正**（另有疑點） | A：Mower 2017 Box 3 病例 1＋C：Stiell 2001 Lancet 摘要 |
| 外傷 | Modified Denver | 疑點 | C：MDCalc 10653（原始文獻未找到可驗證範例） |
| 外傷 | New Orleans | 疑點 | C：Haydel 2000 NEJM |
| 外傷 | NEXUS Chest CT | 通過（措辭） | A：Rodriguez 2015 文中唯一漏失病例（規則陰性）＋C |
| 外傷 | NEXUS Chest | 通過 | C：Rodriguez 2013 JAMA Surg 摘要 |
| 外傷 | Ottawa 踝 | 通過 | C：MDCalc 1670（Stiell 1993 摘要不含條件全文） |
| 心血管 | 4PEPS | 通過 | C：Roy 2021 JAMA Cardiol Table 3（PMC7931139） |
| 心血管 | CHA₂DS₂-VASc | 通過 | B：Friberg 2012 風險表（原文未能取得，20 個數值與次級轉載一致） |
| 心血管 | QTc | 通過（判讀切點未找到） | D：五種公式（Vandenberk 2016、ACEP 2021、MDCalc 48）；>500／≥480／≤360／≤320 ms 切點未找到可驗證範例 |
| 心血管 | HEAR | 通過 | C：Moumneh 2021 Eur J Emerg Med 摘要（<2） |
| 心血管 | Killip | 疑點 | 分級名稱 MDCalc；死亡率數字**未找到** |
| 心血管 | PERC | 通過 | C：Kline 2004 摘要 |
| 心血管 | PESI | 通過（小數年齡） | C：Aujesky 2005 Table 2（PMC2718410） |
| 心血管 | TIMI STEMI | 通過 | B：Morrow 2000（0 分、>8 分見原文；1–8 分僅經次級來源核對） |
| 心血管 | ADD-RS | 通過 | C：Rogers 2011、Nazerian 2018（ADvISED）摘要 |
| 心血管 | Revised Geneva | 通過 | B：Le Gal 2006 摘要盛行率 8／28／74% |
| 心血管 | Wells DVT | 通過（疑點） | C：Wells 2003 NEJM（兩層表依 NHS 改編版） |
| 心血管 | Wells PE | **已修正** | C：Wells 2000 Thromb Haemost 摘要 |
| 神經 | mRS | 通過 | C：MDCalc 1890 |
| 神經 | RACE | 通過 | C：Pérez de la Ossa 2014 摘要（≥5）、racescale.org |
| 神經 | tPA | 通過 | D：FDA Activase 仿單 2015 |
| 神經 | ABC/2 | 通過 | D：Kothari 1996、Huttner 2006（ABC/3） |
| 神經 | GCS | 通過（教科書分級未找到） | A：glasgowcomascale.org「E2V4M6 = 12」；Rosen／Tintinalli 分級未能取得原文 |
| 神經 | Hunt-Hess | 通過 | B：MDCalc 404 分級表 |
| 神經 | ICH Score | 通過 | B：Hemphill 2001 摘要（0 分、5 分）；1–4 分依 MDCalc |
| 神經 | NIHSS | 疑點 | C：NIH/NINDS 量表表單逐項 |
| 神經 | Ottawa SAH | **已修正**（另有疑點） | C：Perry 2013 JAMA 規則框 |
| 兒科 | BRUE 2.0 | 通過（疑點） | D：MDCalc 10400 公式（Nama 2022 原文係數表未能取得原文） |
| 兒科 | PECARN 頸椎 | 通過 | B：Leonard 2024（187/1549、217/7676、29/13205） |
| 兒科 | PECARN 腹部 | 通過 | B：Holmes 2013 順序＋各節點百分比（僅次級來源） |
| 兒科 | BRUE 2016 | **已修正** | C：Tieder 2016 AAP（經 AAFP 摘要） |
| 兒科 | PECARN 頭部 | 通過 | C：Kuppermann 2009 摘要、MDCalc 589 |
| 兒科 | 兒童氣管內管 | 通過（未取整） | D：MDCalc 58 |
| 兒科 | PTS | 通過 | C：MDCalc 10185（Tepas） |
| 兒科 | Westley | 通過 | C：MDCalc 677（分層出自 Bjornson 2005） |
| 檢傷 | IBW／ABW | 通過 | D：MDCalc 68（Devine 原文未能取得原文） |
| 檢傷 | MEWS | 疑點 | C：Subbe 2001 摘要（≥5）；選項依 MDCalc |
| 檢傷 | NEWS | **已修正**（0 分） | C：RCP 2012 Chart 1／2 |
| 檢傷 | NEWS2 | 通過 | C：RCP 2017 Chart 1／2 |
| 檢傷 | 尿量 | 疑點 | D：算術定義；0.5–1.0／>1.0 分層**未找到** |
| 檢傷 | RASS | 通過 | C：Ely 2003 JAMA RASS 表＋MDCalc 目標值 |
| 呼吸 | 氣管內管深度 | 通過 | D：Techanivate 2005（Chula formula）＋ARDSNet IBW |
| 呼吸 | HEAVEN | 通過 | C：Davis 2017（計數；原文無分層。≤93%、≤8 歲定義僅 MDCalc） |
| 呼吸 | S/F ratio | 疑點 | C：Matthay 2024 Global ARDS 定義 Table 1 |
| 呼吸 | Centor／McIsaac | 通過 | B：McIsaac 1998 CMAJ Table 2 |
| 呼吸 | ROX | 疑點 | C：Roca 2016、2019 摘要 |
| 中毒 | BAWS | 通過 | B：Rastegar 2017 摘要（≥3；85.3%／65.8%） |
| 中毒 | CIWA-Ar | 疑點 | C：MDCalc 1736 分層（Sullivan 1989 原文無分層） |
| 中毒 | C-SSRS | 通過 | C：MDCalc 10169 急診篩檢版分級表 |
| 中毒 | HEADS-ED | 通過 | C：MDCalc 10463（≥8 或自殺項＝2） |
| 中毒 | Acetaminophen NAC | **不一致**（相對公開指引） | C：Wong 2016、Chiew 2020；院內流程**未找到可驗證範例** |
| 腸胃 | Rockall（完整） | 通過（標籤疑點） | B：Rockall 1996 Table IV(B) |
| 腸胃 | Rockall（內視鏡前） | 通過（原文自相矛盾） | B：Rockall 1996 Table IV(A) |
| 腸胃 | West Haven | **已修正**（第 2 級措辭；第 0 級疑點） | C：AASLD/EASL 2014 指引表 |
| 腸胃 | Burch-Wartofsky | 通過 | C：MDCalc 3816（1993 原文未能取得原文） |
| 腸胃 | TWIST | 通過（措辭） | C：Barbosa 2013 摘要（切點 2／5） |

統計：通過 53（其中多項附小註記，詳見第 3 節）、已修正 7、疑點 11、不一致（未修正）1，合計 72。

---

## 5. 未找到可驗證範例（或只能用次級來源核對）

以下數字或文字找不到原始文獻或官方來源可以逐字核對。測試照頁面現況寫，並在註解標明：

- 尿量「0.5–1.0 Reduced」「>1.0 Normal」分層
- Killip 30 天死亡率區間，以及 Class I／II 的「<」寫法
- QTc 判讀切點（>500、≥480、≤360、≤320 ms）；50 mm/s 每小格 20 ms 由紙速推得，來源文字未明寫
- GCS 的 Rosen 10e／Tintinalli 9e 嚴重度分級：這次的雲端工作環境沒有先前用過的 Tintinalli 網站或本機教科書檔，無法核對。頁面 `sources` 欄位引用的 `Tintinalli/…/chapter.md` 是作者本機的檔案，不在 repo 裡
- MEWS 原始 Subbe 2001 表格（付費牆）
- Modified Denver 篩檢條件的原始文獻（只核對到 MDCalc）
- Acetaminophen NAC 的高醫院內流程（2021/12/09），以及 Encore 300 mg/3 mL 規格
- HEAVEN 各項定義中的數字（≤93%、≤8 歲）只在 MDCalc 找到
- sPESI「1.5% 復發性血栓栓塞或非致命性出血」只在 MDCalc 找到
- 只能用次級來源核對：CHA₂DS₂-VASc 的 Friberg 2012 風險表、TIMI STEMI 1–8 分死亡率、ICH Score 1–4 分死亡率、PECARN 腹部各節點百分比、PECARN 頸椎的 187、217 兩個分子
- 原文未能取得原文（只讀到摘要或沒有摘要）：Burch-Wartofsky 1993、Devine 1974、Allgöwer 1967、Holliday-Segar 1957、Baxter 1974、Hunt-Hess 1968、Killip 1967、van Swieten 1988 全文、Nama 2022 全文、Tieder 2016 全文、Stiell 2001 Lancet 全文

---

## 6. 限制

- 文獻查證由 AI 代理執行，引用的原文片段來自當次實際讀到的網頁、摘要或 PDF。部分 MDCalc 頁面是用摘要式工具讀取，引文可能是轉述而非逐字；Rockall 1996 的 PDF 是掃描檔，表格數字經 OCR。第 2.1 節的 8 項修正，修改前已親自重讀原文（JAMA 全文、AASLD PDF、RCP PDF、PubMed 摘要、AAFP 指引摘要）。其中 BRUE 只讀到 AAFP 的指引摘要，AAP 全文被網站拒絕存取；Canadian CT Head 的危險機轉定義是由 MDCalc、Wikipedia（引 Stiell 2005）、WikEM 三方一致確認，Lancet 全文沒有讀到。**上線前仍建議以原文再確認一次。**
- 「C 類」範例是依查證過的定義建構的病例，不是論文印出來的病例；它驗證的是「頁面照文獻定義計算」，不代表該病例在原研究中的結果。
- 測試鎖定頁面**目前**的輸出文字。之後若 Kiwi 決定修改判讀文字或切點，相關測試也要跟著改；第 2.2 節 NAC 的 `todo` 測試，若決定加上劑量上限，改完後會變成通過，屆時把 `todo` 拿掉即可；若確認院內刻意不設上限，請改寫該測試。
- harness 是極簡 DOM，只實作頁面用到的功能（選擇器子集、radio 互斥、input／change 事件、inline onclick）。已用真 Chromium 抽樣 20 個情境比對全部一致，但不保證涵蓋所有瀏覽器行為（例如版面、CSS）。
- 沒有測試回饋視窗（第二段 `<script>`，會送 Google 表單），因為與計算無關，且測試時不應對外送資料。
