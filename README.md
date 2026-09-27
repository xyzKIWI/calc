# 急診臨床計算機（ed-calc）

**72 個**急診常用評分、公式與決策規則（作者本機完整版 73 個，FLACC 因授權未收錄），做成 9 個離線單頁 HTML（不連外、無追蹤）。每項標示原始文獻、來源數與適用條件。
上線網址：<https://tools.kiwi-ai.uk/calc/>（院內網可通）｜GitHub Pages：<https://xyzkiwi.github.io/calc/>

## 收錄

| 頁面 | 項數 | 內容 |
|---|---|---|
| 核心十項 | 10 | MAP、休克指數、Parkland、4-2-1 維持輸液、qSOFA、CRB-65、NEXUS 頸椎、Ottawa 膝、sPESI、ABCD² |
| 外傷 | 12 | Canadian C-Spine／CT Head、New Orleans、NEXUS Head／Chest／Chest CT、Ottawa 踝、Pittsburgh 膝、ABC 大量輸血、STUMBL、Modified Denver、九則法 |
| 心血管 | 12 | Wells PE／DVT、PERC、Geneva、PESI、4PEPS、HEAR、TIMI STEMI、ADD-RS、CHA₂DS₂-VASc、QTc、Killip |
| 神經 | 9 | NIHSS、GCS、RACE、ICH Score、ABC/2、Hunt-Hess、mRS、Ottawa SAH、tPA 劑量 |
| 兒科 | 8 | PECARN 頭部／頸椎／腹部、BRUE／BRUE 2.0、PTS、Westley、兒童氣管內管 |
| 檢傷與流程 | 6 | NEWS／NEWS2、MEWS、RASS、IBW/ABW、尿量 |
| 呼吸／感染 | 5 | Centor/McIsaac、ROX、S/F ratio、HEAVEN、氣管內管深度 |
| 中毒／精神 | 5 | CIWA-Ar、BAWS、C-SSRS、HEADS-ED、Acetaminophen NAC |
| 腸胃／其他 | 5 | Rockall（完整／內視鏡前）、Burch-Wartofsky、West Haven、TWIST |

## 資料來源與校對

- **來源層級**：原始論文 ＞ MDCalc 操作型定義 ＞ 教科書摘要（教科書系統性把 `≥` 寫成 `>`，已逐筆比對）。
- **院內流程**：tPA 依岡山急診組套；Acetaminophen NAC 依高醫「乙醯胺酚中毒處理原則 2021/12/09」兩袋法。Tenecteplase 未收錄（院內未備藥）。
- **決策規則先問適用條件**：PECARN、Canadian C-Spine／CT Head、New Orleans（限 ≥18 歲，兒童用 PECARN）、Ottawa SAH、BRUE 2.0 不符適用族群時不輸出否定性建議。
- **不可測項目**：GCS 含 NT 不出總分、只報 E/V/M；NIHSS 的 UN 不計入總分並標示不完整。
- **判讀用原始值、顯示才四捨五入**（例：休克指數 179/200 = 0.895 不會先進位成 0.90 再比 ≥0.9）。
- **驗證**：Playwright 瀏覽器實跑 209 筆測試（含防竄改雜湊）、console／外部請求為 0；另經 Codex 與 Gemini 多輪對抗式審查。測試與規格檔留在作者本機，本 repo 只放成品。
- 資料最後校對：**2026-08-22**

### 本 repo 刻意不含的東西

- MDCalc 頁面的逐字判讀文字與 74 份規格檔（著作權考量，僅作者本機留存）；成品內保留每項的 MDCalc 連結供回查。
- FLACC 兒童疼痛量表（© University of Michigan，需授權，未收錄）。

## 授權量表

| 量表 | 狀態 |
|---|---|
| NEWS2 | Royal College of Physicians 無版權限制；須署名、不得修改（頁內已署名：Reproduced from RCP, *National Early Warning Score (NEWS) 2*, London: RCP, 2017；中文僅操作提示，未經 RCP 核准） |
| RACE | racescale.org，CC BY-NC-SA 4.0（非商業、署名） |
| CIWA-Ar | 量表本文載明不受版權限制、可自由重製 |
| C-SSRS | Columbia Lighthouse Project：醫療場域與 EHR 嵌入免特別授權 |
| NIHSS | 美國 NIH／NINDS，公共領域 |
| GCS | 官方網站無版權限制聲明 |
| RASS、HEADS-ED、BAWS | 未見明文授權條款；本站為院內非商業使用 |

## 更新方法

規格檔 → 產生器 → 兩套瀏覽器測試 → 公開版後處理（去 MDCalc 逐字、去 FLACC、加回饋窗）→ 覆蓋本 repo 的 `calc-*.html` → 更新頁尾與本 README 校對日 → push → 回 [ed-tools](https://github.com/xyzKIWI/ed-tools) 更新卡片校對日。

## 回饋

每頁右下角 💬 值班盲點回饋：背景送到與 icd10／peds-dose 共用的 Google 表單（前綴 `[ed-calc/頁名]`），並存本機備援。

## 免責聲明

本工具僅供臨床決策輔助參考，不取代臨床判斷、官方仿單、院內規範與最新指引。藥物計算僅重現公式，不構成劑量建議。使用前請自行核對原始資料來源；作者不對使用結果負責。

## License

程式碼 MIT。各評分量表之著作權屬原作者／機構，依上表條件使用。
