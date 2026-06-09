alter table tools
  add column if not exists mfg_date date,
  add column if not exists exp_date date;
