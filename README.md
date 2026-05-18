# Linquest

Linquest 是一個結合教師帶班領地對戰與學生個人 roadmap 練習的 Expo / React Native 專案，後端使用 hosted Supabase。

## 目前狀態

- 學生端基礎流程、roadmap、territory 已有主體。
- realtime battle 與部分前端 polish 仍在進行中。
- teacher console 後端已落地，前端仍有缺口。

正式規格請看：

- `SPEC.md`
- `thought.md`
- `docs/superpowers/specs/`
- `docs/superpowers/plans/`

## 技術棧

- Expo Router
- React Native / React Native Web
- TypeScript
- Supabase Auth / Postgres / Realtime
- Jest

## 開發前置

請先確認本機已有：

- Node.js 20+
- npm
- Expo 開發環境
- 可連線的 hosted Supabase 專案

這個 repo 目前不是以本地 Supabase Docker stack 為前提，日常開發直接連 hosted Supabase。

## 環境變數

先把 `.env.example` 複製成 `.env`，再填入實際值：

```bash
cp .env.example .env
```

`.env` 需要的欄位：

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
SUPABASE_TEST_PROJECT_REF=YOUR_TEST_PROJECT_REF
EXPO_PUBLIC_GOOGLE_SHEET_SHARE_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit
```

說明：

- `EXPO_PUBLIC_SUPABASE_URL`、`EXPO_PUBLIC_SUPABASE_ANON_KEY`：app 啟動必填。
- `SUPABASE_SERVICE_ROLE_KEY`：給測試與部分 server-side service 使用，不要外洩。
- `EXPO_PUBLIC_GOOGLE_SHEET_SHARE_URL`：roadmap 題庫來源；Google Sheet 需開成「知道連結的使用者可檢視」。
- `SUPABASE_TEST_PROJECT_REF`：只有在未來有獨立 hosted 測試專案時才有用；目前 repo 沒有獨立 test project，整合測試預設不跑。

## 第一次啟動流程

1. 安裝依賴

```bash
npm install
```

2. 建立並填好 `.env`

```bash
cp .env.example .env
```

3. 啟動 Expo

```bash
npm run web
```

如果你要跑模擬器，也可以用：

```bash
npm run ios
npm run android
```

## 日常開發流程

最常用的是 web 預覽：

```bash
npm run web
```

若只想開 Metro：

```bash
npm start
```

## 資料庫 / migration 流程

SQL migration 都在 `supabase/migrations/`。

注意事項：

- migration 採 append-only，不要修改已經推過的檔案。
- schema 有變更時，新增一支新的 migration。
- 這個 repo 的工作模式是由使用者手動執行 `supabase db push`，不是由 agent 直接套用。

典型流程：

1. 在 `supabase/migrations/` 新增 migration。
2. 檢查 `.env` 指向正確的 hosted Supabase 專案。
3. 由你手動執行：

```bash
supabase db push
```

如果有 Edge Function，程式碼在 `supabase/functions/territory-tick/`。

## 測試

單元測試可直接跑：

```bash
npm test
```

或只跑 unit：

```bash
npm run test:unit
```

整合測試指令雖然存在：

```bash
npm run test:integration
```

但目前有一個實務限制：

- 這套整合測試會要求一個獨立的 hosted Supabase test project。
- 目前專案沒有另外配置該測試專案，所以不要把它指到主專案上硬跑。

## 專案結構

- `app/`：Expo Router 路由
- `components/`：共用元件
- `lib/`：服務模組、純邏輯、前端共用工具
- `supabase/migrations/`：schema 與 RPC migration
- `supabase/functions/`：Supabase Edge Functions
- `supabase/seed/`：seed 資料
- `tests/`：Jest 測試
- `docs/`：規格、設計與實作計畫

## 常用指令

```bash
npm install
npm start
npm run web
npm run ios
npm run android
npm test
npm run test:unit
```
