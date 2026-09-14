alter table public.employees
  add column if not exists deleted_at timestamptz;

create index if not exists employees_deleted_at_idx
  on public.employees (deleted_at);

comment on column public.employees.deleted_at is
  'When set, the login account is deleted and the employee is hidden while historical business records are retained.';
