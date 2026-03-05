-- Daily cleanup for calendar-related date windows.
-- Removes records when at least one full day has passed since the period end.
-- Manual test:
--   select * from public.cleanup_expired_calendar_periods();

create extension if not exists pg_cron with schema extensions;

create or replace function public.cleanup_expired_calendar_periods(
  p_now timestamptz default now()
)
returns table (
  cleanup_date date,
  deleted_discount_periods bigint,
  deleted_pricing_periods bigint,
  deleted_blocked_dates bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := timezone('Europe/Istanbul', p_now)::date;
  v_deleted_discount bigint := 0;
  v_deleted_pricing bigint := 0;
  v_deleted_blocked bigint := 0;
begin
  -- Discount periods: delete if end_date is older than (today - 1 day).
  delete from public.villa_discount_periods
  where end_date is not null
    and end_date < (v_today - 1);
  get diagnostics v_deleted_discount = row_count;

  -- Custom pricing periods: same rule.
  delete from public.villa_pricing_periods
  where end_date is not null
    and end_date < (v_today - 1);
  get diagnostics v_deleted_pricing = row_count;

  -- Maintenance/cleaning blocked dates only (not reservation blocks).
  -- daterange is [start, end) so upper(date_range) is checkout-like exclusive day.
  -- A full day has passed since the last blocked day when upper(date_range) < today.
  delete from public.blocked_dates
  where date_range is not null
    and upper(date_range) < v_today
    and lower(coalesce(reason, '')) ~ '(temizlik|bak.m|maintenance|cleaning)';
  get diagnostics v_deleted_blocked = row_count;

  return query
  select v_today, v_deleted_discount, v_deleted_pricing, v_deleted_blocked;
end;
$$;

revoke all on function public.cleanup_expired_calendar_periods(timestamptz) from public;
grant execute on function public.cleanup_expired_calendar_periods(timestamptz) to service_role;

do $$
declare
  v_job_id bigint;
begin
  select jobid
    into v_job_id
  from cron.job
  where jobname = 'cleanup_expired_calendar_periods_daily';

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  -- Runs every day at 00:10 UTC.
  perform cron.schedule(
    'cleanup_expired_calendar_periods_daily',
    '10 0 * * *',
    $job$select public.cleanup_expired_calendar_periods();$job$
  );
end;
$$;
