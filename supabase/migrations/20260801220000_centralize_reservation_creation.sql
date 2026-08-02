create or replace function public.create_reservation(
  p_villa_id uuid,
  p_checkin date,
  p_checkout date,
  p_guest_name text,
  p_guest_phone text,
  p_guest_email text default null,
  p_notes text default null,
  p_status text default 'pending'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_range daterange;
  v_total numeric;
  v_reservation public.reservations;
begin
  if p_villa_id is null then
    raise exception 'villa_id is required'
      using errcode = '22023';
  end if;

  if p_checkin is null or p_checkout is null or p_checkout <= p_checkin then
    raise exception 'Invalid reservation date range'
      using errcode = '22007';
  end if;

  if p_guest_name is null or length(trim(p_guest_name)) = 0 then
    raise exception 'guest_name is required'
      using errcode = '22023';
  end if;

  if p_guest_phone is null or length(trim(p_guest_phone)) = 0 then
    raise exception 'guest_phone is required'
      using errcode = '22023';
  end if;

  if p_status not in ('pending', 'confirmed', 'cancelled') then
    raise exception 'Unsupported reservation status %', p_status
      using errcode = '23514';
  end if;

  if not exists (select 1 from public.villas where id = p_villa_id) then
    raise exception 'Villa % not found', p_villa_id
      using errcode = 'P0002';
  end if;

  v_range := daterange(p_checkin, p_checkout, '[)');
  v_total := public.villa_total_price(p_villa_id, p_checkin, p_checkout);

  if v_total is null or v_total <= 0 then
    raise exception 'No pricing defined for selected dates'
      using errcode = 'P0001';
  end if;

  if p_status in ('pending', 'confirmed') then
    if exists (
      select 1
      from public.blocked_dates b
      where b.villa_id = p_villa_id
        and b.date_range && v_range
    ) then
      raise exception 'Overlaps with a blocked date'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from public.reservations r
      where r.villa_id = p_villa_id
        and r.status in ('pending', 'confirmed')
        and r.date_range && v_range
    ) then
      raise exception 'Overlaps with an existing reservation'
        using errcode = '23P01';
    end if;
  end if;

  insert into public.reservations (
    villa_id,
    date_range,
    guest_name,
    guest_email,
    guest_phone,
    total_price,
    status,
    notes,
    checkout_date
  ) values (
    p_villa_id,
    v_range,
    trim(p_guest_name),
    nullif(trim(coalesce(p_guest_email, '')), ''),
    trim(p_guest_phone),
    v_total,
    p_status,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_checkout
  )
  returning * into v_reservation;

  return jsonb_build_object(
    'ok', true,
    'reservation_id', v_reservation.id,
    'villa_id', v_reservation.villa_id,
    'status', v_reservation.status,
    'total_price', v_reservation.total_price,
    'date_range', v_reservation.date_range::text
  );
exception
  when exclusion_violation then
    raise exception 'Overlaps with an existing reservation'
      using errcode = '23P01';
end;
$$;

revoke execute on function public.create_reservation(
  uuid,
  date,
  date,
  text,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.create_reservation(
  uuid,
  date,
  date,
  text,
  text,
  text,
  text,
  text
) to service_role;
