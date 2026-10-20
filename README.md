# Asset & Life Studio

金融資産・持株会・カメラ機材・人的資本をひとつの台帳にまとめる、個人用の資産ダッシュボードです。

- **金融資産**: 真の純資産、NISA 1,800万円までの進捗、必要な月額積立、ポートフォリオ比率
- **持株会**: 富士通100株までのカウントダウン、奨励金込みの実質単価、到達後のリバランス提案
- **実物資産**: カメラ機材の購入額・リセール価値・残存率、R2 に保存する機材写真
- **人的資本**: 資格・講座・書籍への投資履歴と、キャリアイベントによる ROI
- **毎月の記録**: 12か月の資産推移、配分のドーナツチャート、スナップショットの作成・編集・削除

## 技術スタック

| 領域 | 採用技術 |
| --- | --- |
| フレームワーク | TanStack Start (React 19 / TypeScript) |
| ホスティング | Cloudflare Workers |
| データベース | Cloudflare D1 + Drizzle ORM |
| 画像ストレージ | Cloudflare R2 |
| UI | Tailwind CSS v4、自作の shadcn/ui 風コンポーネント |
| チャート | Recharts |
| アイコン | Lucide |

## ローカル起動

```bash
npm install
npm run db:migrate   # ローカル D1 にマイグレーションを適用
npm run db:seed      # 任意: デモデータを投入
npm run dev          # http://localhost:3000
```

`npm run db:seed` は何度実行しても重複しません。

### パスコード認証（任意）

公開時は `APP_PASSCODE` を設定すると、ログイン画面なしでは台帳を開けなくなります。

```bash
# ローカル
cp .dev.vars.example .dev.vars
# .dev.vars の APP_PASSCODE を変更してから npm run dev

# 本番
npx wrangler secret put APP_PASSCODE
```

- セッションは HMAC 署名付きの HttpOnly Cookie として30日間保持されます。
- パスコードは推測されにくい12文字以上を推奨します。セッション署名鍵は PBKDF2 で導出しています。
- 設定を空にすると認証は無効になり、これまでどおりオープンアクセスで動作します。
- 画像配信 API とアップロード API も、認証が有効なときは同じセッションを要求します。

## Cloudflare へのデプロイ

```bash
npx wrangler login

# 1. D1 を作成し、表示された database_id を wrangler.jsonc に貼り付ける
npx wrangler d1 create my-capital-db

# 2. R2 バケットを作成
npx wrangler r2 bucket create my-capital-gear

# 3. 本番 D1 にマイグレーションを適用
npm run db:migrate:remote

# 4. 必要ならデモデータを投入（本番では通常不要）
# npm run db:seed:remote

# 5. パスコードを設定してデプロイ
npx wrangler secret put APP_PASSCODE
npm run deploy
```

`wrangler.jsonc` の `database_id` はプレースホルダーのままなので、デプロイ前に必ず置き換えてください。

## 主なファイル

```text
src/
├── routes/
│   ├── index.tsx            # ダッシュボード
│   ├── assets.tsx           # 資産の記録・スナップショット CRUD
│   ├── gear.tsx             # 機材台帳・画像アップロード
│   ├── self-investment.tsx  # 自己投資とキャリア ROI
│   ├── settings.tsx         # プロフィール・目標・持株会設定
│   ├── login.tsx            # パスコードログイン
│   └── api/                 # R2 アップロード / 画像配信
├── components/              # UI、ダッシュボードカード、各ダイアログ
├── lib/finance.ts           # NISA・持株会・ポートフォリオ・ROI の計算
├── server/                  # サーバー関数、D1 クエリ、認証
└── db/                      # Drizzle スキーマとクライアント
drizzle/                     # 生成済みマイグレーション
seeds/seed.sql               # デモデータ
```

サーバー専用モジュールは `*.server.ts` として分離しています。TanStack Start のクライアントバンドルに `cloudflare:workers` が混入しないための構成です。

## 計算の前提

- **真の純資産** = 現預金 + NISA 評価額 + 持株会・ロマン枠の評価額 + 機材のリセール価値
- **NISA 進捗** は累計元本ベース。目標額と目標年齢から、達成に必要な月額を逆算します。
- **持株会** は月次拠出額と奨励金率から月あたりの獲得株数を算出し、100株までの残月数を表示します。
- **富士通比率** が設定した安全弁（初期値15%）を超えると、ダッシュボードに警告が出ます。
- **投資 ROI** = キャリアイベントによる年収増加額の合計 ÷ 自己投資コスト。税・手取りは考慮しません。

## スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run typecheck` | TypeScript 型チェック |
| `npm run db:migrate` | ローカル D1 へマイグレーション適用 |
| `npm run db:seed` | ローカル D1 へデモデータ投入 |
| `npm run db:migrate:remote` | 本番 D1 へマイグレーション適用 |
| `npm run deploy` | ビルドして Workers へデプロイ |

## データモデル

D1 のテーブルはすべて単一ユーザー前提のシングルトン、または履歴テーブルです。将来のマルチテナント化を見据えて、各テーブルには `user_id` を追加できる形にしています。

- `app_settings` — ニックネーム、生年月日、NISA 目標、安全弁、レンズ積立
- `holding_stock_status` — 持株会の拠出額・奨励金率・保有株数
- `asset_snapshots` — 月次の資産スナップショット
- `camera_gears` — 機材台帳（R2 の画像キーを含む）
- `self_investments` — 資格・講座・書籍の記録
- `career_events` — 昇格・昇給などのキャリアイベント
