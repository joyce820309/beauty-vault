# BeautyVault 資安補足計畫

> 狀態：規劃筆記，尚未執行 Auth、資料庫 migration、RLS 或 Supabase Dashboard 設定。
>
> 範圍：依需求不執行「立即下線／撤銷公開存取」等第一階段緊急止血。本文件規劃其餘長期補足工作。實際開始前仍需在 Supabase Dashboard 核對遠端 schema、grants、RLS、Storage bucket 與 Auth 設定；repository migrations 不一定等同目前遠端狀態。

---

## 目標與威脅模型

BeautyVault 目前是單一私人使用者 App，目標是只有該使用者登入後能讀寫自己的品項、膚況、用藥、醫美、採購清單、工具與妝容等資料。即使目前只有一個帳號，仍須以使用者身分作為資料邊界，避免任何知道專案 URL、anon key 的人直接經由 Supabase API 讀寫資料。

Supabase URL 與 anon/publishable key 是前端可見資訊，不應視為密碼。安全邊界必須由 Auth、資料庫權限、RLS 與 Storage policies 建立。前端路由隱藏、按鈕禁用或只改 URL 都不是資料存取控制。

## Repository 現況（需以遠端設定再核對）

- `src/lib/supabase/client.ts` 以 `VITE_SUPABASE_ANON_KEY` 建立瀏覽器 client；目前程式未找到 Supabase 登入／session 驗證流程。
- 初始 migration 中的 `items`、`skin_records`、`profile`、舊醫美紀錄、分類及用藥表未見啟用 RLS。
- `wishlist` policy 對 `anon` 與 `authenticated` 使用 `true` 條件；`channels`、醫美新表、妝容主題與槽位、匯率表亦有無條件 policy。這些條件不是 owner 隔離。
- 各私人資料表目前未建立一致的 `user_id` ownership 模型。
- Storage 上傳流程使用 `product-images` bucket 的 public URL；需確認 bucket visibility 和 `storage.objects` policies。
- Edge Function `notify-expiry` 使用 service-role key，並以未分使用者的方式查詢訂閱與到期品項；必須確認其排程入口、資料表與遠端設定。
- `push_subscriptions` 和 `tools` 在目前 migrations 中沒有可確認的完整建表 migration，需先核對部署端實際 schema。

## 實作原則

1. 對外暴露的每張資料表都要明確決定：私人資料、使用者自有資料、或唯讀共用參考資料；不得留下未分類的 public table。
2. 私人資料以 `auth.uid()` 與 `user_id` 比對；INSERT 與 UPDATE 均須有 `WITH CHECK` 驗證資料歸屬。
3. `anon` 不得存取私人資料；關閉未使用的 grants、RPC 與寫入路徑。service-role key 僅能留在可信任的 server/Edge Function secrets。
4. 先確認現有資料歸屬，再加 `NOT NULL` ownership 欄位；禁止用隨機 UUID 假裝既有資料擁有者。
5. 每個變更以新的、版本不重複的 migration 管理；同步更新 `docs/DATABASE_SCHEMA.md` 和型別定義。

---

## 階段 A：建立單一使用者 Supabase Auth

### Supabase 專案設定

- 在 Supabase Auth 建立唯一的個人使用者。建議透過 Dashboard 邀請／管理員建立帳號，不提供公開註冊頁。
- 關閉公開 sign-up；確認 Email confirmation、密碼重設 redirect URL、Site URL 及允許 redirect URLs 僅指向自己的正式／本機開發網域。
- 使用高強度、唯一密碼；在 Supabase 帳號與 GitHub 帳號開啟 MFA/2FA。
- 確認 anon/publishable key 僅在瀏覽器使用。檢查 repo、部署環境與 workflow logs，確保 service-role key 不曾放入 `VITE_*`、前端 bundle、Git 或 GitHub Actions log。若曾暴露，立刻輪替該 secret。

### 前端 Auth

- 新增 Auth context/provider 管理初始 session 載入、`onAuthStateChange`、登入、登出與 session 更新。
- 新增登入頁（Email + Password；若選 Magic Link，需設定安全 redirect）。顯示載入／錯誤狀態，避免 session 還沒載入就短暫顯示私人資料。
- 以受保護路由阻擋未登入使用者進入 App 私人頁面；未登入導向登入頁。此路由保護只負責 UX，不能取代 RLS。
- App 啟動時呼叫 `getSession()` 恢復登入；登出後清除使用者狀態、私有快取及敏感本機暫存。
- 關閉公開註冊後，確認忘記密碼流程只讓既有帳號可恢復存取。

**完成條件：** 未登入時不能進入私人畫面；只有預先建立的個人帳號能登入；登入與登出後 session 狀態正確。

---

## 階段 B：規劃既有資料 ownership migration

### 個人資料表清單

至少需盤點並決定 ownership 的資料：

- 美妝品項與工具：`items`、`tools`。
- 個人/健康資料：`profile`、`skin_records`、`medication_records`、`medication_items`。
- 醫美資料：`aesthetic_records`、`aesthetic_session_logs`、`treatments`、`treatment_purchases`、`treatment_sessions`。
- 私人清單與妝容：`wishlist`、`makeup_themes`、`makeup_theme_slots`。
- 從屬紀錄：`item_exchange_rates`、`wishlist_exchange_rates`、`push_subscriptions`（若遠端存在）。
- 其他 migration、Supabase Dashboard 建立或程式碼實際使用的 public tables、views、RPC/functions 亦須納入盤點。

### Ownership schema 設計

- 為每張使用者擁有的主表新增 `user_id UUID REFERENCES auth.users(id)`。
- 從屬表可採直接儲存 `user_id` 並以一致性機制確保等於 parent owner；或使用 parent FK 的 ownership policy。選定一種可被 RLS 安全驗證的模式，避免只靠前端傳入 owner id。
- `profile` 若維持每人單筆，新增 `UNIQUE (user_id)`。
- `categories`、`channels` 要先決定是否為全域預設參考資料或個人設定。全域參考資料只允許必要角色 SELECT；個人自訂值需有 owner 欄位及 owner policy，不能繼續用無條件寫入 policy。
- 匯率表需透過 parent record owner 限制，避免猜測 `item_id` 或 `wishlist_id` 就讀寫他人紀錄。

### 安全回填與約束順序

1. 從 Auth Dashboard 取得唯一使用者 UUID；以 migration 的受控設定或明確替換步驟回填既有資料，不把 UUID 放在前端程式碼。
2. 先新增 nullable `user_id`，將所有舊資料指派給唯一使用者；驗證沒有 NULL、孤兒子表或錯誤 owner。
3. 建立 FK、索引與必要 unique constraint，再把 `user_id` 改為 `NOT NULL`。
4. 對所有子表驗證 owner 必須與 parent 一致；考慮複合 FK、trigger 或以 parent `EXISTS` 的 policy，避免使用者把子列掛到別人的 parent。
5. 針對 Auth user 刪除行為明確決定 `ON DELETE CASCADE` / `RESTRICT`；私人資料建議避免未經確認就自動清除整個資料集。

**完成條件：** 每筆私人資料與子資料都有唯一、可驗證的 owner；遷移前後總筆數與關聯一致。

---

## 階段 C：以 migration 建立 fail-closed RLS

- 對所有可由 API 暴露的私人資料表啟用 RLS；逐表建立 `SELECT`、`INSERT`、`UPDATE`、`DELETE` policy，角色僅包含 `authenticated`。
- owner predicate 統一基於 `auth.uid() = user_id`。INSERT 的 `WITH CHECK` 與 UPDATE 的 `USING` / `WITH CHECK` 都要限制 owner，防止更新時把列轉移給其他 user。
- 不使用 `USING (true)` 或 `WITH CHECK (true)` 作為私人資料的 policy；刪除現有開放 policies，留意 PostgreSQL permissive policies 會以 OR 合併，新增一條安全 policy 並不會抵消舊的 `true` policy。
- `anon` 不授予私人表、sequence、view、RPC 的必要以外權限；逐項檢查 schema/table/sequence grants 及 default privileges。只開啟 RLS 而不檢查 grants/policies 不算完成。
- 共享參考表採最小權限唯讀；只有可信任管理流程能改變分類／全域資料。
- 檢查 views 的 security invoker/definer 行為、Postgres functions 的 `SECURITY DEFINER`、search_path、execute grants，以及 triggers 是否在 RLS 下仍能安全完成工作。
- 對敏感表考慮 `FORCE ROW LEVEL SECURITY`，但先測試 migrations、trigger 與維運流程；service-role/bypassrls 執行仍需另外控管。

範例政策形狀（實作時要依表逐一建立，不可未補 ownership 欄位就直接套用）：

```sql
CREATE POLICY "owner can read own rows"
ON public.items FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "owner can insert own rows"
ON public.items FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "owner can update own rows"
ON public.items FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "owner can delete own rows"
ON public.items FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);
```

**完成條件：** API 暴露的每張表都有已審核的 RLS/grants；無未分類表、無私人資料的 anon 權限、無開放 `true` policy。

---

## 階段 D：Storage 與圖片存取

- 檢查 `product-images` bucket 是否為 public；public bucket 中已知 URL 的物件可公開讀取，資料表 RLS 不會保護物件本身。
- 將私人圖片 bucket 改為 private。物件路徑採穩定 owner 前綴，例如 `<auth.uid()>/items/<object-id>.jpg`；不要信任由 client 任意傳來的 owner ID。
- 設定 `storage.objects` 的 SELECT/INSERT/UPDATE/DELETE policies，驗證 bucket ID 與第一層路徑 owner 都符合登入者。限制允許的 MIME type、檔案大小與用途路徑。
- 前端改以 authenticated storage API 讀取，必要時產生短效 signed URL；不再使用 `getPublicUrl()` 存取私人照片。
- 設計既有公開圖片的遷移：盤點引用、複製/移動到 owner 路徑、更新資料庫 URLs、驗證圖片後才切 private；評估 CDN/cache 舊 URL 的失效時間。

**完成條件：** 未登入者不能列出或下載私人圖片；另一個測試使用者即使猜到 object path 也無法讀寫。

---

## 階段 E：Edge Functions、推播與 service role

- `notify-expiry` 的 service-role key 保留在 Supabase Function secrets，不得暴露至 Vite client、GitHub secrets 日誌或 repository。
- 查明 `push_subscriptions` 遠端 schema；若存在，新增並填入 `user_id`，對 endpoint 建立合理唯一限制，啟用 RLS 並僅允許本人管理自己的訂閱。
- 到期通知依 `user_id` 分組查詢品項與訂閱，絕不把一位使用者的品項名稱、到期日或 URL 傳送給另一位訂閱者。
- 函式入口若由 cron 呼叫，限制為 Supabase Cron/可信任 scheduler 可觸發；若允許客戶端呼叫，驗證 JWT、owner，並限制可執行操作。避免未驗證 HTTP request 觸發 service-role 批次操作。
- 過期或失效的 push endpoint 僅刪除該 owner 的訂閱；加入錯誤處理與不含敏感 payload 的安全日誌。

**完成條件：** 未授權呼叫不能觸發高權限操作；每則推播只含該訂閱者自己的資料。

---

## 階段 F：跨角色測試與上線驗收

### 必測角色

1. **Anon（無 JWT）**：對每張私人表執行 SELECT/INSERT/UPDATE/DELETE，全部應被拒絕或不可見；Storage 同樣拒絕。
2. **使用者 A**：可對自己資料執行預期 CRUD；不能藉由在 request body 改寫 `user_id` 建立或轉移資料。
3. **使用者 B（測試帳號）**：嘗試讀取、修改、刪除 A 的每種主表與子表資料，均不能成功；不能透過 parent ID、exchange-rate ID、Storage path 旁路。
4. **Service role / Edge Function**：僅在預期的 server-side job 可用；檢查 secrets 和日誌沒有洩露。
5. **回歸測試**：登入、重新整理、登出、密碼重設、資料匯出、圖片上傳、推播、關聯 CRUD 與 PWA 啟動。

### 上線門檻

- [ ] 唯一使用者帳號可登入，公開註冊關閉。
- [ ] 所有私人資料已有 user ownership；所有 API-exposed tables 已盤點。
- [ ] `anon` 無私人資料 CRUD；沒有 `USING (true)` / `WITH CHECK (true)` 私人政策。
- [ ] Authenticated user 只能操作自己的列與子列，更新不能改 owner。
- [ ] Storage policies 已驗證；私人圖片不再靠公開 URL 保護。
- [ ] Edge Function / push 的 owner 隔離與觸發驗證完成。
- [ ] 以 anon、本人與第二測試使用者完成負向測試並保存結果。
- [ ] 更新 `docs/DATABASE_SCHEMA.md`、TypeScript database types、部署與回復步驟。

## 建議交付切片

1. Auth 登入頁、Auth provider、關閉公開註冊（尚不移除舊政策前，避免誤以為已安全）。
2. 遠端 schema/grants/policies inventory 與 owner mapping，形成 migration 前檢查表。
3. Ownership 欄位及舊資料回填 migration。
4. RLS/grants hardening migration 與 policy 測試。
5. Storage private bucket/path/policy 與既有圖片遷移。
6. Edge Function/push owner isolation。
7. 安全回歸測試與部署驗收。

> 重要：只有登入 UI 而沒有 RLS 不構成修復；只啟用 RLS 但保留 `USING (true)` policy 也不構成修復。完成前，不應宣稱私人資料已被帳號隔離。
