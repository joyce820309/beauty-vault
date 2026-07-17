-- 品項幣值歷史紀錄
CREATE TABLE item_exchange_rates (
  id                SERIAL PRIMARY KEY,
  item_id           INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  currency          TEXT NOT NULL,   -- USD / EUR / JPY / KRW
  rate              NUMERIC NOT NULL,       -- TWD 兌該幣別匯率
  converted_amount  NUMERIC NOT NULL,       -- 換算後金額
  fetched_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE item_exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow all" ON item_exchange_rates FOR ALL USING (true) WITH CHECK (true);
