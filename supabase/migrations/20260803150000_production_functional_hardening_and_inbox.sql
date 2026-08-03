-- Production hardening for reservation/calendar integrity and inbound email inbox.
-- Data-safe: constraints are validated against the current dataset before becoming active.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'villa_pricing_periods_nightly_price_positive'
      and conrelid = 'public.villa_pricing_periods'::regclass
  ) then
    alter table public.villa_pricing_periods
      add constraint villa_pricing_periods_nightly_price_positive
      check (nightly_price > 0)
      not valid;

    alter table public.villa_pricing_periods
      validate constraint villa_pricing_periods_nightly_price_positive;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'villa_pricing_periods_date_order'
      and conrelid = 'public.villa_pricing_periods'::regclass
  ) then
    alter table public.villa_pricing_periods
      add constraint villa_pricing_periods_date_order
      check (start_date <= end_date)
      not valid;

    alter table public.villa_pricing_periods
      validate constraint villa_pricing_periods_date_order;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'villa_discount_periods_nightly_price_positive'
      and conrelid = 'public.villa_discount_periods'::regclass
  ) then
    alter table public.villa_discount_periods
      add constraint villa_discount_periods_nightly_price_positive
      check (nightly_price > 0)
      not valid;

    alter table public.villa_discount_periods
      validate constraint villa_discount_periods_nightly_price_positive;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'villa_discount_periods_priority_range'
      and conrelid = 'public.villa_discount_periods'::regclass
  ) then
    alter table public.villa_discount_periods
      add constraint villa_discount_periods_priority_range
      check (priority between 1 and 10)
      not valid;

    alter table public.villa_discount_periods
      validate constraint villa_discount_periods_priority_range;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'villa_discount_periods_date_order'
      and conrelid = 'public.villa_discount_periods'::regclass
  ) then
    alter table public.villa_discount_periods
      add constraint villa_discount_periods_date_order
      check (start_date <= end_date)
      not valid;

    alter table public.villa_discount_periods
      validate constraint villa_discount_periods_date_order;
  end if;
end $$;

create or replace function public.create_blocked_date(
  p_villa_id uuid,
  p_checkin date,
  p_checkout date,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_range daterange;
  v_block public.blocked_dates;
begin
  if p_villa_id is null then
    raise exception 'villa_id is required'
      using errcode = '22023';
  end if;

  if p_checkin is null or p_checkout is null or p_checkout <= p_checkin then
    raise exception 'Invalid blocked date range'
      using errcode = '22007';
  end if;

  if not exists (select 1 from public.villas where id = p_villa_id) then
    raise exception 'Villa % not found', p_villa_id
      using errcode = 'P0002';
  end if;

  v_range := daterange(p_checkin, p_checkout, '[)');

  if exists (
    select 1
    from public.blocked_dates b
    where b.villa_id = p_villa_id
      and b.date_range && v_range
  ) then
    raise exception 'Overlaps with an existing blocked date'
      using errcode = '23P01';
  end if;

  if exists (
    select 1
    from public.reservations r
    where r.villa_id = p_villa_id
      and r.status in ('pending', 'approved', 'confirmed')
      and r.date_range && v_range
  ) then
    raise exception 'Overlaps with an existing reservation'
      using errcode = '23P01';
  end if;

  insert into public.blocked_dates (
    villa_id,
    date_range,
    reason
  ) values (
    p_villa_id,
    v_range,
    nullif(trim(coalesce(p_reason, '')), '')
  )
  returning * into v_block;

  return jsonb_build_object(
    'ok', true,
    'id', v_block.id,
    'villa_id', v_block.villa_id,
    'date_range', v_block.date_range::text,
    'reason', v_block.reason,
    'created_at', v_block.created_at
  );
exception
  when exclusion_violation then
    raise exception 'Overlaps with an existing blocked date'
      using errcode = '23P01';
end;
$$;

revoke execute on function public.create_blocked_date(uuid, date, date, text)
  from public, anon, authenticated;
grant execute on function public.create_blocked_date(uuid, date, date, text)
  to service_role;

create table if not exists public.email_inbox_messages (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend',
  provider_event_id text,
  provider_email_id text,
  message_id text,
  from_email text not null default '',
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  bcc_emails text[] not null default '{}',
  received_for text[] not null default '{}',
  subject text,
  preview text,
  text_body text,
  html_body text,
  headers jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  status text not null default 'unread',
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_inbox_messages_status_check
    check (status in ('unread', 'read', 'archived'))
);

create unique index if not exists email_inbox_messages_provider_event_id_uidx
  on public.email_inbox_messages (provider_event_id)
  where provider_event_id is not null;

create unique index if not exists email_inbox_messages_provider_email_id_uidx
  on public.email_inbox_messages (provider_email_id)
  where provider_email_id is not null;

create index if not exists email_inbox_messages_received_at_idx
  on public.email_inbox_messages (received_at desc);

create index if not exists email_inbox_messages_status_idx
  on public.email_inbox_messages (status);

create or replace function public.touch_email_inbox_messages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_inbox_messages_touch_updated_at on public.email_inbox_messages;
create trigger email_inbox_messages_touch_updated_at
before update on public.email_inbox_messages
for each row
execute function public.touch_email_inbox_messages_updated_at();

alter table public.email_inbox_messages enable row level security;
