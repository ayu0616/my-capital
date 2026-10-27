INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-bank-' || id || '-rakuten', 'rakuten_bank', valued_at, value, notes, created_at, updated_at
FROM asset_entries
WHERE item_key = 'bank_cash';
--> statement-breakpoint
INSERT OR IGNORE INTO asset_entries (id, item_key, valued_at, value, notes, created_at, updated_at)
SELECT 'mig-bank-' || id || '-smbc', 'smbc_bank', valued_at, 0, NULL, created_at, updated_at
FROM asset_entries
WHERE item_key = 'bank_cash';
--> statement-breakpoint
DELETE FROM asset_entries WHERE item_key = 'bank_cash';
