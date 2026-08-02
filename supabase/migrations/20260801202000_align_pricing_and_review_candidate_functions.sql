-- Align pricing-related RPCs and repair review candidate discovery.
-- Data-safe migration: replaces function definitions only.

create or replace function public.villa_daily_prices(
  p_villa_id uuid,
  p_checkin date,
  p_checkout date
)
returns table (
  day date,
  nightly_price numeric,
  source text
)
language sql
security definer
set search_path = public
as $$
  with days as (
    select generate_series(
      p_checkin,
      p_checkout - interval '1 day',
      interval '1 day'
    )::date as day
    where p_villa_id is not null
      and p_checkin is not null
      and p_checkout is not null
      and p_checkout > p_checkin
  )
  select
    d.day,
    coalesce(discount_period.nightly_price, pricing_period.nightly_price) as nightly_price,
    case
      when discount_period.nightly_price is not null then 'discount'
      when pricing_period.nightly_price is not null then 'period'
      else 'missing'
    end as source
  from days d
  left join lateral (
    select vdp.nightly_price
    from public.villa_discount_periods vdp
    where vdp.villa_id = p_villa_id
      and d.day between vdp.start_date and vdp.end_date
    order by vdp.priority asc, vdp.created_at asc
    limit 1
  ) discount_period on true
  left join lateral (
    select vpp.nightly_price
    from public.villa_pricing_periods vpp
    where vpp.villa_id = p_villa_id
      and d.day between vpp.start_date and vpp.end_date
    order by vpp.created_at asc
    limit 1
  ) pricing_period on true
  order by d.day;
$$;

create or replace function public.compute_reservation_total(
  p_villa uuid,
  p_range daterange
)
returns numeric
language sql
stable
set search_path = public
as $$
  with prices as (
    select nightly_price
    from public.villa_daily_prices(
      p_villa,
      lower(p_range)::date,
      upper(p_range)::date
    )
  )
  select
    case
      when count(*) = 0 then null
      when count(*) filter (where nightly_price is null) > 0 then null
      else sum(nightly_price)
    end
  from prices;
$$;

create or replace function public.villa_total_price(
  p_villa_id uuid,
  p_checkin date,
  p_checkout date
)
returns numeric
language sql
security definer
set search_path = public
as $$
  with input as (
    select
      p_villa_id as villa_id,
      p_checkin as checkin_date,
      p_checkout as checkout_date,
      greatest((p_checkout - p_checkin), 0) as nights
  ),
  subtotal as (
    select
      i.*,
      public.compute_reservation_total(
        i.villa_id,
        daterange(i.checkin_date, i.checkout_date, '[)')
      ) as base_total
    from input i
    where i.villa_id is not null
      and i.checkin_date is not null
      and i.checkout_date is not null
      and i.checkout_date > i.checkin_date
  ),
  priced as (
    select
      s.nights,
      s.base_total,
      case when s.nights >= 14 then round(s.base_total * 0.05) else 0 end as stay_discount,
      case when s.nights < 7 then coalesce(v.cleaning_fee, 0)::numeric else 0 end as cleaning_fee
    from subtotal s
    join public.villas v on v.id = s.villa_id
  )
  select
    case
      when base_total is null then null
      else greatest(base_total - stay_discount + cleaning_fee, 0)
    end
  from priced;
$$;

create or replace function public.approve_pending_reservation(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_villa uuid;
  v_range daterange;
  v_total numeric;
begin
  select r.villa_id, r.date_range
    into v_villa, v_range
  from public.reservations r
  where r.id = p_id
    and r.status = 'pending'
  for update;

  if not found then
    raise exception 'Pending reservation % not found', p_id
      using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.reservations c
    where c.villa_id = v_villa
      and c.status = 'confirmed'
      and c.date_range && v_range
  ) then
    raise exception 'Overlaps with a confirmed reservation'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.blocked_dates b
    where b.villa_id = v_villa
      and b.date_range && v_range
  ) then
    raise exception 'Overlaps with a blocked date'
      using errcode = '23514';
  end if;

  v_total := public.villa_total_price(
    v_villa,
    lower(v_range)::date,
    upper(v_range)::date
  );

  update public.reservations
  set status = 'confirmed',
      total_price = v_total,
      approved_at = now()
  where id = p_id;

  return jsonb_build_object(
    'ok', true,
    'id', p_id,
    'total_price', v_total
  );
end;
$$;

create or replace function public.get_review_candidates()
returns table (
  reservation_id uuid,
  villa_id uuid,
  guest_email text,
  guest_name text,
  villa_name text,
  checkout_date date
)
language sql
stable
set search_path = public
as $$
  select
    r.id as reservation_id,
    r.villa_id,
    r.guest_email,
    r.guest_name,
    v.name as villa_name,
    upper(r.date_range)::date as checkout_date
  from public.reservations r
  join public.villas v on v.id = r.villa_id
  where r.status = 'confirmed'
    and r.guest_email is not null
    and length(trim(r.guest_email)) > 0
    and upper(r.date_range)::date <= current_date
    and not exists (
      select 1
      from public.email_logs el
      where el.reservation_id = r.id
        and el.email_type = 'review_request'
        and (
          el.status in ('pending', 'sent')
          or el.sent_at is not null
        )
    )
  order by checkout_date asc;
$$;
