-- 白班售前和售后客服工资制度配置
-- 在 Supabase SQL Editor 中执行后，再发布本次前端改动。

begin;

alter table public.salary_templates
  add column if not exists policy_type text not null default 'legacy',
  add column if not exists policy_config jsonb not null default '{}'::jsonb;

alter table public.salary_settlements
  add column if not exists performance_amount numeric not null default 0,
  add column if not exists policy_snapshot jsonb not null default '{}'::jsonb;

insert into public.salary_templates (
  template_key,
  template_name,
  base_salary,
  full_attendance_bonus,
  net_target,
  tier1_threshold,
  tier1_rate,
  tier2_threshold,
  tier2_rate,
  is_configured,
  sort_order,
  policy_type,
  policy_config
)
values
  (
    'day_pre_sales_customer_service',
    '白班售前客服',
    3000,
    0,
    20000,
    20000,
    20,
    40000,
    30,
    true,
    10,
    'day_pre_sales',
    '{"version":"2026-09","performance_tiers":[{"min":0,"max_exclusive":7000,"amount":0},{"min":7000,"max_exclusive":10000,"amount":600},{"min":10000,"max_exclusive":15000,"amount":800},{"min":15000,"max_exclusive":20000,"amount":900},{"min":20000,"amount":1000}],"commission_tiers":[{"min_exclusive":20000,"max":40000,"rate":0.02},{"min_exclusive":40000,"rate":0.03}]}'::jsonb
  ),
  (
    'day_after_sales_customer_service',
    '白班售后客服',
    4000,
    0,
    0,
    0,
    0,
    0,
    0,
    true,
    20,
    'day_after_sales',
    '{"version":"2026-09","performance_caps":{"follow_up":200,"quality":200,"improvement":100,"refund_control":300},"performance_max":800}'::jsonb
  )
on conflict (template_key) do update set
  template_name = excluded.template_name,
  base_salary = excluded.base_salary,
  full_attendance_bonus = excluded.full_attendance_bonus,
  net_target = excluded.net_target,
  tier1_threshold = excluded.tier1_threshold,
  tier1_rate = excluded.tier1_rate,
  tier2_threshold = excluded.tier2_threshold,
  tier2_rate = excluded.tier2_rate,
  is_configured = excluded.is_configured,
  sort_order = excluded.sort_order,
  policy_type = excluded.policy_type,
  policy_config = excluded.policy_config;

commit;
