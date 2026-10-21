-- Asset & Life Studio — demo seed
-- Apply with: npm run db:seed
-- Safe to re-run: every statement uses deterministic ids + INSERT OR REPLACE.

INSERT OR REPLACE INTO app_settings
  (id, nickname, birth_date, nisa_target_amount, nisa_target_age, fujitsu_alert_threshold, gear_fund_target, gear_fund_saved, updated_at)
VALUES
  ('default', 'Ayumu', '1997-02-18', 18000000, 35, 0.15, 150000, 92500, '2026-10-21T00:00:00.000Z');

INSERT OR REPLACE INTO holding_stock_status
  (id, monthly_contribution, company_incentive_rate, current_accumulated_shares, latest_stock_price, target_shares, recorded_at, average_acquisition_price, carryover_amount, updated_at)
VALUES
  ('default', 33000, 0.15, 67.4, 3842, 100, '2026-09-30', 3425, 4820, '2026-10-21T00:00:00.000Z');

INSERT OR REPLACE INTO holding_withdrawals
  (id, withdrawn_at, shares, average_acquisition_price, stock_price, destination, notes, created_at, updated_at)
VALUES
  ('withdraw-2026-08', '2026-08-20', 10, 3340, 3688, 'SMBC日興証券', '単元達成を見据えて、まとまった株数を証券口座へ移した。', '2026-08-20T00:00:00.000Z', '2026-08-20T00:00:00.000Z');

INSERT OR REPLACE INTO stock_goals
  (id, code, name, account, target_shares, current_shares, target_date, minimum_purchase_unit, average_acquisition_price, current_price, monthly_budget, benefit_note, notes, auto_update_from_csv, created_at, updated_at)
VALUES
  ('goal-jr-west', '9021', '西日本旅客鉄道（JR西日本）', '楽天証券', 100, 24, '2027-03-31', 1, 2850, 3150, 30000, '100株以上でJR西日本の株主優待。1株単位で購入できるため、期限までに100株を目指す。', '2026年10月時点で24株。優待条件は公式情報を確認。', 1, '2026-10-21T00:00:00.000Z', '2026-10-21T00:00:00.000Z');

INSERT OR REPLACE INTO retirement_accounts
  (id, provider, scheme_name, balance, total_contributed, monthly_contribution, employer_contribution, valued_at, notes, updated_at)
VALUES
  ('default', 'JIS&T', '会社型確定拠出年金', 1860000, 1440000, 12000, 8000, '2026-10-21', 'JIS&Tの評価額。本人と会社の拠出を含む。', '2026-10-21T00:00:00.000Z');

DELETE FROM retirement_allocations;

INSERT OR REPLACE INTO retirement_allocations
  (id, account_id, label, ratio, sort_order)
VALUES
  ('alloc-foreign-stock', 'default', '外国株式', 50, 10),
  ('alloc-domestic-stock', 'default', '国内株式', 20, 20),
  ('alloc-foreign-bond', 'default', '外国債券', 15, 30),
  ('alloc-domestic-bond', 'default', '国内債券', 10, 40),
  ('alloc-cash', 'default', '現金・預金', 5, 50);

INSERT OR REPLACE INTO financial_accounts
  (id, name, institution, kind, role, notes, sort_order, created_at, updated_at)
VALUES
  ('rakuten-sec', '楽天証券', '楽天証券', 'brokerage', 'NISA・投資信託・個別株', 'NISAの積立と個別株の保有。保有資産CSVの取り込み先。', 10, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('smbc-nikko', 'SMBC日興証券', 'SMBC日興証券', 'brokerage', '持株会の引出し先', '富士通の持株会から引き出した株式を保管する口座。', 20, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('rakuten-bank', '楽天銀行', '楽天銀行', 'bank', 'メイン口座', '生活費と現金の中心。', 30, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('smbc', 'SMBC', '三井住友銀行', 'bank', 'サブ口座', 'サブの預金口座。', 40, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('jist', 'JIS&T', 'JIS&T', 'pension', '会社の確定拠出年金', '会社型DC。評価額と拠出額は設定の確定拠出年金で管理します。', 50, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');

INSERT OR REPLACE INTO asset_snapshots
  (id, year_month, cash_amount, nisa_orkan_amount, nisa_sp500_amount, nisa_mutual_fund_amount, nisa_individual_stock_amount, nisa_other_asset_amount, securities_cash_amount, nisa_contributed_principal, fujitsu_roman_stock_shares, holding_stock_shares, withdrawn_holding_shares, holding_average_acquisition_price, holding_carryover_amount, fujitsu_current_price, gear_resale_amount, notes, created_at, updated_at)
VALUES
  ('snap-2025-11', '2025-11', 2450000, 0, 0, 8800000, 0, 0, 0, 9480000, 8, 57.5, 0, 3110, 1200, 3215, 612000, NULL, '2025-11-30T12:00:00.000Z', '2025-11-30T12:00:00.000Z'),
  ('snap-2025-12', '2025-12', 2680000, 0, 0, 9135000, 0, 0, 0, 9780000, 8, 58.4, 0, 3125, 1850, 3288, 606000, '冬のボーナスから一部を現金で確保', '2025-12-31T12:00:00.000Z', '2025-12-31T12:00:00.000Z'),
  ('snap-2026-01', '2026-01', 2240000, 0, 0, 9330000, 0, 0, 0, 10080000, 8, 59.4, 0, 3150, 2400, 3402, 598000, NULL, '2026-01-31T12:00:00.000Z', '2026-01-31T12:00:00.000Z'),
  ('snap-2026-02', '2026-02', 2390000, 0, 0, 9695000, 0, 0, 0, 10380000, 10, 60.2, 0, 3180, 2800, 3365, 592000, 'NISAロマン枠で富士通を2株追加', '2026-02-28T12:00:00.000Z', '2026-02-28T12:00:00.000Z'),
  ('snap-2026-03', '2026-03', 2560000, 0, 0, 10100000, 0, 0, 0, 10680000, 10, 61.1, 0, 3205, 3100, 3510, 587000, NULL, '2026-03-31T12:00:00.000Z', '2026-03-31T12:00:00.000Z'),
  ('snap-2026-04', '2026-04', 2810000, 0, 0, 10495000, 0, 0, 0, 10980000, 10, 62.0, 0, 3240, 3500, 3448, 581000, '昇格に伴い積立額を増額', '2026-04-30T12:00:00.000Z', '2026-04-30T12:00:00.000Z'),
  ('snap-2026-05', '2026-05', 3020000, 0, 0, 10850000, 0, 0, 0, 11180000, 10, 62.9, 0, 3270, 3900, 3690, 575000, NULL, '2026-05-31T12:00:00.000Z', '2026-05-31T12:00:00.000Z'),
  ('snap-2026-06', '2026-06', 2760000, 0, 0, 11240000, 0, 0, 0, 11380000, 10, 63.8, 0, 3290, 4100, 3755, 570000, '旅行前に現金を厚めに', '2026-06-30T12:00:00.000Z', '2026-06-30T12:00:00.000Z'),
  ('snap-2026-07', '2026-07', 2940000, 0, 0, 11590000, 0, 0, 0, 11560000, 10, 64.7, 0, 3315, 4300, 3812, 565000, NULL, '2026-07-31T12:00:00.000Z', '2026-07-31T12:00:00.000Z'),
  ('snap-2026-08', '2026-08', 3130000, 0, 0, 11870000, 0, 0, 0, 11700000, 10, 65.6, 10, 3340, 4500, 3688, 570000, '機材の買取相場がやや回復', '2026-08-31T12:00:00.000Z', '2026-08-31T12:00:00.000Z'),
  ('snap-2026-09', '2026-09', 3260000, 0, 0, 12150000, 0, 0, 0, 11800000, 10, 66.5, 10, 3385, 4680, 3910, 571000, NULL, '2026-09-30T12:00:00.000Z', '2026-09-30T12:00:00.000Z'),
  ('snap-2026-10', '2026-10', 3180000, 0, 0, 12380000, 991600, 0, 120000, 11860000, 10, 67.4, 10, 3425, 4820, 3842, 610000, '楽天証券の保有資産CSVを取り込み', '2026-10-21T03:00:00.000Z', '2026-10-21T03:00:00.000Z');

UPDATE asset_snapshots
SET pension_balance = CASE year_month
  WHEN '2025-11' THEN 1420000
  WHEN '2025-12' THEN 1455000
  WHEN '2026-01' THEN 1490000
  WHEN '2026-02' THEN 1530000
  WHEN '2026-03' THEN 1565000
  WHEN '2026-04' THEN 1610000
  WHEN '2026-05' THEN 1650000
  WHEN '2026-06' THEN 1690000
  WHEN '2026-07' THEN 1735000
  WHEN '2026-08' THEN 1780000
  WHEN '2026-09' THEN 1820000
  WHEN '2026-10' THEN 1860000
  ELSE pension_balance
END;

INSERT OR REPLACE INTO securities_import_batches
  (id, as_of_date, account, file_name, total_value, product_value, cash_value, stock_value, fund_value, other_value, fujitsu_value, holding_count, imported_at)
VALUES
  ('batch-2026-10', '2026-10-21', '楽天証券', 'rakuten-holdings-sample.csv', 13530020, 13410020, 120000, 991600, 12380000, 0, 38420, 6, '2026-10-21T03:00:00.000Z');

INSERT OR REPLACE INTO securities_holdings
  (id, batch_id, as_of_date, account, category, type, code, name, account_type, quantity, unit, average_price, current_price, market_value, profit_loss, profit_loss_percent, cost_basis, is_fujitsu, source, imported_at)
VALUES
  ('holding-orkan', 'batch-2026-10', '2026-10-21', '楽天証券', 'fund', '投資信託', '0331418A', '楽天・オルカン', 'NISA成長投資枠', 6183333, '口', 10000, 12000, 7420000, 1236667, 0.2, 6183333, 0, 'rakuten_csv', '2026-10-21T03:00:00.000Z'),
  ('holding-sp500', 'batch-2026-10', '2026-10-21', '楽天証券', 'fund', '投資信託', '03311187', '楽天・S&P500', 'NISA成長投資枠', 1984000, '口', 22000, 25000, 4960000, 595200, 0.136, 4364800, 0, 'rakuten_csv', '2026-10-21T03:00:00.000Z'),
  ('holding-fujitsu', 'batch-2026-10', '2026-10-21', '楽天証券', 'stock', '国内株式', '6702', '富士通', 'NISA成長投資枠', 10, '株', 3425, 3842, 38420, 4170, 0.122, 34250, 1, 'rakuten_csv', '2026-10-21T03:00:00.000Z'),
  ('holding-nintendo', 'batch-2026-10', '2026-10-21', '楽天証券', 'stock', '国内株式', '7974', '任天堂', 'NISA成長投資枠', 100, '株', 7800, 8500, 850000, 70000, 0.09, 780000, 0, 'rakuten_csv', '2026-10-21T03:00:00.000Z'),
  ('holding-sony', 'batch-2026-10', '2026-10-21', '楽天証券', 'stock', '国内株式', '6758', 'ソニーグループ', 'NISA成長投資枠', 20, '株', 3000, 3300, 66000, 6000, 0.1, 60000, 0, 'rakuten_csv', '2026-10-21T03:00:00.000Z'),
  ('holding-jr-west', 'batch-2026-10', '2026-10-21', '楽天証券', 'stock', '国内株式', '9021', '西日本旅客鉄道', 'NISA成長投資枠', 24, '株', 2850, 3150, 75600, 7200, 0.105, 68400, 0, 'rakuten_csv', '2026-10-21T03:00:00.000Z');

INSERT OR REPLACE INTO camera_gears
  (id, name, category, purchased_at, purchase_price, resale_value, image_key, notes, created_at, updated_at)
VALUES
  ('gear-a7iv', 'Sony α7 IV', 'body', '2023-11-12', 328000, 235000, NULL, 'メイン機。星景とポートレートに。', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('gear-2470gm2', 'FE 24-70mm F2.8 GM II', 'lens', '2024-03-02', 268000, 205000, NULL, '旅行の標準ズーム。描写が素直。', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('gear-35gm', 'FE 35mm F1.4 GM', 'lens', '2025-01-18', 178000, 132000, NULL, 'スナップの主役。軽さが最高。', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('gear-tripod', 'Peak Design Travel Tripod', 'accessory', '2024-08-09', 62000, 38000, NULL, 'カーボン製。旅行用。', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');

INSERT OR REPLACE INTO self_investments
  (id, title, category, cost, completed_at, notes, created_at)
VALUES
  ('inv-aws-sap', 'AWS Certified Solutions Architect – Professional', 'cert', 29800, '2025-06-14', 'クラウド設計の基礎固め。', '2025-06-14T00:00:00.000Z'),
  ('inv-udemy-next', 'Udemy「Next.js 15 実践開発」', 'udemy', 2400, '2025-09-30', '個人開発の生産性が上がった。', '2025-09-30T00:00:00.000Z'),
  ('inv-book-prag', '『達人プログラマー』', 'book', 4180, '2025-12-20', '仕事の進め方を見直すきっかけ。', '2025-12-20T00:00:00.000Z'),
  ('inv-gcp-pca', 'Google Cloud Professional Cloud Architect', 'cert', 24000, '2026-03-08', NULL, '2026-03-08T00:00:00.000Z'),
  ('inv-udemy-sql', 'Udemy「SQL データ分析実践」', 'udemy', 1800, '2026-06-22', NULL, '2026-06-22T00:00:00.000Z'),
  ('inv-book-design', '『Webアプリケーション設計入門』', 'book', 3520, '2026-08-11', '設計レビューで即活用。', '2026-08-11T00:00:00.000Z');

INSERT OR REPLACE INTO career_events
  (id, occurred_at, title, annual_income_increase, notes, created_at)
VALUES
  ('career-lv7', '2025-04-01', '昇格 Lv6 → Lv7', 600000, 'テックリード就任。', '2025-04-01T00:00:00.000Z'),
  ('career-lv8', '2026-04-01', '昇格 Lv7 → Lv8', 900000, 'シニアエンジニアとして採用面接官も担当。', '2026-04-01T00:00:00.000Z');
