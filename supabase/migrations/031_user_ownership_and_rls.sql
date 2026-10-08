-- Phase B + C: per-row ownership + fail-closed RLS
-- 一次性套用。建議在 Supabase SQL Editor 執行（整段為單一 transaction，失敗會整體回滾）。
-- 套用前請先備份資料庫。
--
-- Owner（單一使用者）UUID: 7cdd18d3-8b77-4c95-be19-22ec973f8507
--
-- 設計：
--   * 私人資料表新增 user_id，預設 auth.uid()（前端 insert 不需修改，DB 自動帶入登入者）
--   * 既有資料回填為 owner，設 NOT NULL，加 FK 與索引
--   * 啟用 RLS，移除舊的 USING (true) 全開政策，改為 owner-only 政策
--   * categories / channels 為全域參考資料：僅 authenticated 可讀寫，anon 全擋
--   * Edge Function 使用 service_role，會 bypass RLS，照常運作
--
-- 若改用 Supabase CLI（每個 migration 已自帶 transaction），請移除下方 begin; / commit;

begin;

-- 1) 私人、per-user 資料表 ---------------------------------------------------
do $$
declare
  t text;
  p record;
  owner_id uuid := '7cdd18d3-8b77-4c95-be19-22ec973f8507';
  private_tables text[] := array[
    'items','item_exchange_rates','skin_records','profile',
    'medication_records','medication_items',
    'treatments','treatment_purchases','treatment_sessions',
    'wishlist','wishlist_exchange_rates',
    'makeup_themes','makeup_theme_slots',
    'tools','push_subscriptions',
    'aesthetic_records','aesthetic_session_logs'
  ];
begin
  foreach t in array private_tables loop
    -- 表不存在就略過（相容已廢棄的舊表）
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists user_id uuid', t);
    execute format('alter table public.%I alter column user_id set default auth.uid()', t);
    execute format('update public.%I set user_id = %L where user_id is null', t, owner_id);
    execute format('alter table public.%I alter column user_id set not null', t);

    if not exists (select 1 from pg_constraint where conname = t || '_user_id_fkey') then
      execute format(
        'alter table public.%I add constraint %I foreign key (user_id) references auth.users(id)',
        t, t || '_user_id_fkey'
      );
    end if;

    execute format('create index if not exists %I on public.%I (user_id)', t || '_user_id_idx', t);

    execute format('alter table public.%I enable row level security', t);

    -- 移除該表所有既有政策（包含舊的 USING (true) 全開政策）
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    -- owner-only 政策
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))',
      t || '_delete_own', t);
  end loop;
end $$;

-- 2) 全域參考資料表（categories / channels）---------------------------------
--    全域共用、僅 authenticated 可讀寫（本人透過管理頁維護）、anon 全擋。
do $$
declare
  t text;
  p record;
  ref_tables text[] := array['categories','channels'];
begin
  foreach t in array ref_tables loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select_auth', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (true)', t || '_insert_auth', t);
    execute format('create policy %I on public.%I for update to authenticated using (true) with check (true)', t || '_update_auth', t);
    execute format('create policy %I on public.%I for delete to authenticated using (true)', t || '_delete_auth', t);
  end loop;
end $$;

commit;

-- ─────────────────────────────────────────────────────────────────────────
-- 驗證（套用後另外執行，非必要）：
--   -- 應列出每張私人表的 4 條 _own 政策、參考表的 4 條 _auth 政策
--   select tablename, policyname from pg_policies
--   where schemaname = 'public' order by tablename, policyname;
--
--   -- 應無任何私人表殘留 qual = 'true' 的政策
--   select tablename, policyname, qual, with_check from pg_policies
--   where schemaname = 'public' and (qual = 'true' or with_check = 'true')
--     and tablename not in ('categories','channels');
--
-- 回滾（緊急時）：停用 RLS 會讓資料再次對 anon 開放，僅在確認要還原時使用。
--   -- 例： alter table public.items disable row level security;
-- ─────────────────────────────────────────────────────────────────────────
