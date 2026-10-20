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

INSERT OR REPLACE INTO asset_snapshots
  (id, year_month, cash_amount, nisa_orkan_amount, nisa_sp500_amount, nisa_contributed_principal, fujitsu_roman_stock_shares, holding_stock_shares, holding_average_acquisition_price, holding_carryover_amount, fujitsu_current_price, gear_resale_amount, notes, created_at, updated_at)
VALUES
  ('snap-2025-11', '2025-11', 2450000, 5180000, 3620000, 9480000, 8, 57.5, 3110, 1200, 3215, 612000, NULL, '2025-11-30T12:00:00.000Z', '2025-11-30T12:00:00.000Z'),
  ('snap-2025-12', '2025-12', 2680000, 5390000, 3745000, 9780000, 8, 58.4, 3125, 1850, 3288, 606000, '冬のボーナスから一部を現金で確保', '2025-12-31T12:00:00.000Z', '2025-12-31T12:00:00.000Z'),
  ('snap-2026-01', '2026-01', 2240000, 5520000, 3810000, 10080000, 8, 59.4, 3150, 2400, 3402, 598000, NULL, '2026-01-31T12:00:00.000Z', '2026-01-31T12:00:00.000Z'),
  ('snap-2026-02', '2026-02', 2390000, 5735000, 3960000, 10380000, 10, 60.2, 3180, 2800, 3365, 592000, 'NISAロマン枠で富士通を2株追加', '2026-02-28T12:00:00.000Z', '2026-02-28T12:00:00.000Z'),
  ('snap-2026-03', '2026-03', 2560000, 5980000, 4120000, 10680000, 10, 61.1, 3205, 3100, 3510, 587000, NULL, '2026-03-31T12:00:00.000Z', '2026-03-31T12:00:00.000Z'),
  ('snap-2026-04', '2026-04', 2810000, 6210000, 4285000, 10980000, 10, 62.0, 3240, 3500, 3448, 581000, '昇格に伴い積立額を増額', '2026-04-30T12:00:00.000Z', '2026-04-30T12:00:00.000Z'),
  ('snap-2026-05', '2026-05', 3020000, 6460000, 4390000, 11180000, 10, 62.9, 3270, 3900, 3690, 575000, NULL, '2026-05-31T12:00:00.000Z', '2026-05-31T12:00:00.000Z'),
  ('snap-2026-06', '2026-06', 2760000, 6720000, 4520000, 11380000, 10, 63.8, 3290, 4100, 3755, 570000, '旅行前に現金を厚めに', '2026-06-30T12:00:00.000Z', '2026-06-30T12:00:00.000Z'),
  ('snap-2026-07', '2026-07', 2940000, 6950000, 4640000, 11560000, 10, 64.7, 3315, 4300, 3812, 565000, NULL, '2026-07-31T12:00:00.000Z', '2026-07-31T12:00:00.000Z'),
  ('snap-2026-08', '2026-08', 3130000, 7110000, 4760000, 11700000, 10, 65.6, 3340, 4500, 3688, 570000, '機材の買取相場がやや回復', '2026-08-31T12:00:00.000Z', '2026-08-31T12:00:00.000Z'),
  ('snap-2026-09', '2026-09', 3260000, 7280000, 4870000, 11800000, 10, 66.5, 3385, 4680, 3910, 571000, NULL, '2026-09-30T12:00:00.000Z', '2026-09-30T12:00:00.000Z'),
  ('snap-2026-10', '2026-10', 3180000, 7420000, 4960000, 11860000, 10, 67.4, 3425, 4820, 3842, 610000, '楽天証券の評価額を月末基準で記録', '2026-10-21T03:00:00.000Z', '2026-10-21T03:00:00.000Z');

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
