alter table items
  add column if not exists disposal_reason text check (disposal_reason in ('finished', 'discarded'));
