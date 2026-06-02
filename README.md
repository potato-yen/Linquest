# Linquest

Linquest 是一個把個人單字複習與班級競賽活動整合在一起的學習 app。學生可以在平時走自己的 roadmap 關卡、累積進度與複習節奏；老師則可以建立班級活動，讓學生分組進入同一張領地地圖，透過答題、拓荒、爭奪與 1v1 對戰，把學習表現轉成團隊競爭。

整個專案使用單一 Expo / React Native codebase，同時支援學生端與教師端，後端使用 hosted Supabase。

## 核心體驗

### 1. Roadmap 個人練習

- 以關卡方式推進單字學習
- 每關依照目前 stage 對應的 level 抽題
- 依作答結果解鎖下一關
- 顯示待複習題量與關卡進度
- 題庫內容來自 Google Sheets

### 2. Territory 班級領地戰

- 教師建立活動後，學生可在活動期間加入同一張六邊形地圖
- 玩家從己方領地向外拓張，攻佔一般格、倍率格與特殊格
- 一般格與倍率格以答題挑戰決定是否成功佔領
- 特殊格需要與其他組玩家進行 1v1 即時對戰
- 活動可查看地圖、排行榜與結算結果

### 3. Teacher Console

- 建立班級並產生 class code
- 建立活動 draft
- 上傳活動用自訂 CSV 題庫
- Publish 活動、查看活動 dashboard 與結算頁
- 刪除活動與相關活動資料

### 4. Realtime Battle

- 特殊格採 1v1 同步對戰
- 以 Supabase Realtime 同步房間狀態與 presence
- 對戰過程寫入 battle attempts，並在結束後回寫領地結果

## 功能範圍

### 學生端

- 註冊 / 登入 / 忘記密碼
- 首頁摘要
- Roadmap 路線圖與關卡作答
- 活動列表
- 加入班級
- Territory 地圖、排行榜、結算頁
- Battle 對戰頁

### 教師端

- 班級建立與管理
- 活動建立、發布、結束、刪除
- 自訂題庫匯入與預覽
- Dashboard 與活動統計查詢

### 系統與後端

- Supabase Auth
- PostgreSQL schema、RLS、RPC
- Realtime 對戰同步
- Edge Function 排程邏輯
- Unit / integration tests

## 技術棧

- Expo Router
- React Native / React Native Web
- TypeScript
- Supabase Auth / Postgres / Realtime / Edge Functions
- Jest

## 專案結構

- `app/`：Expo Router 頁面與 route tree
- `lib/auth`：登入與使用者相關 service
- `lib/classes`：班級建立、加入與管理
- `lib/roadmap`：roadmap 題庫、進度、抽題與解鎖邏輯
- `lib/territory`：地圖生成、佔領規則、refresh、結算與財政邏輯
- `lib/realtime-battle`：battle 房間、同步、presence 與提交流程
- `lib/teacher-console`：教師活動與 dashboard service
- `lib/teacher-console-ui`：教師端表單與畫面狀態整理
- `lib/answering`：共用答題引擎與 adapters
- `lib/ui`：共用 UI components、tokens、hooks 與 session context
- `supabase/migrations/`：資料庫 migrations
- `supabase/functions/territory-tick/`：territory / lifecycle 邏輯的 Edge Function
- `tests/unit/`：純邏輯與 service 單元測試
- `tests/integration/`：依賴 hosted Supabase 的整合測試

## 開發需求

- Node.js 20+
- npm
- Expo 開發環境
- 可連線的 hosted Supabase 專案
- 若需要推 migration，需安裝 Supabase CLI

本專案不假設有本地 Supabase Docker stack，開發時直接透過 `.env` 連線 hosted Supabase。

## 環境變數

先建立 `.env`：

```bash
cp .env.example .env
```

需要填入的欄位：

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_TEST_PROJECT_REF=YOUR_TEST_PROJECT_REF
EXPO_PUBLIC_GOOGLE_SHEET_SHARE_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
```

說明：

- `EXPO_PUBLIC_SUPABASE_URL`：Supabase 專案網址
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`：前端使用的 anon key
- `SUPABASE_SERVICE_ROLE_KEY`：測試與部分 service-side 流程使用
- `SUPABASE_TEST_PROJECT_REF`：整合測試若要指向獨立 test project 時使用
- `EXPO_PUBLIC_GOOGLE_SHEET_SHARE_URL`：roadmap 題庫來源，需可公開讀取

## 本機啟動

安裝依賴：

```bash
npm install
```

啟動 Web：

```bash
npm run web
```

其他常用指令：

```bash
npm start
npm run ios
npm run android
```

## 資料庫與 Supabase 流程

SQL migrations 都放在 `supabase/migrations/`，採 append-only。

典型流程：

1. 新增一支新的 timestamped migration
2. 確認 `.env` 指向正確的 hosted Supabase 專案
3. 由使用者手動執行：

```bash
supabase db push
```

注意：

- 不要修改已經推過的 migration
- `territory-tick` 的排程需透過 Supabase Dashboard 設定
- 這個 repo 的工作模式不是由 agent 直接套用資料庫變更

## 測試

跑全部 Jest 測試：

```bash
npm test
```

只跑 unit tests：

```bash
npm run test:unit
```

跑 integration tests：

```bash
npm run test:integration
```

Integration tests 需要一個獨立的 hosted Supabase test project；不要把它直接指到主要開發專案。
