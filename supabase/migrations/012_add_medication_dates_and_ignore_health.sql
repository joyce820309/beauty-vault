-- medication_items 加製造/有效期限
alter table medication_items
  add column if not exists mfg_date date,
  add column if not exists exp_date date;

-- items 加忽略健康度欄位
alter table items
  add column if not exists ignore_health boolean not null default false;
