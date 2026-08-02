do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reservations_status_check'
      and conrelid = 'public.reservations'::regclass
  ) then
    alter table public.reservations
      add constraint reservations_status_check
      check (
        status is null
        or status in ('pending', 'approved', 'confirmed', 'completed', 'cancelled')
      )
      not valid;

    alter table public.reservations validate constraint reservations_status_check;
  end if;
end $$;

create or replace function public.cancel_reservation(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status
  from public.reservations
  where id = p_id;

  if not found then
    raise exception 'Reservation % not found', p_id
      using errcode = 'P0002';
  end if;

  if v_status = 'cancelled' then
    return jsonb_build_object('ok', true, 'id', p_id, 'status', 'cancelled', 'already_cancelled', true);
  end if;

  if v_status not in ('pending', 'approved', 'confirmed') then
    raise exception 'Reservation % with status % cannot be cancelled', p_id, v_status
      using errcode = '23514';
  end if;

  update public.reservations
  set status = 'cancelled'
  where id = p_id;

  return jsonb_build_object('ok', true, 'id', p_id, 'status', 'cancelled');
end;
$$;

create or replace function public.archive_past_reservations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today_tr date := (now() at time zone 'Europe/Istanbul')::date;
begin
  with moved as (
    delete from public.reservations r
    where r.date_range is not null
      and upper(r.date_range)::date < today_tr
      and r.status in ('confirmed', 'completed')
    returning r.id, r.guest_name, r.guest_phone, r.total_price, r.villa_id, r.date_range
  )
  insert into public.past_reservations
    (guest_name, guest_phone, total_price, villa_name, checkout_date, archived_at)
  select
    coalesce(m.guest_name, '-'),
    coalesce(m.guest_phone, '-'),
    coalesce(m.total_price, 0),
    v.name as villa_name,
    (upper(m.date_range)::date - 1),
    now() at time zone 'Europe/Istanbul'
  from moved m
  join public.villas v on v.id = m.villa_id;
end;
$$;

create or replace function public.process_daily_checkout_reviews()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  checkout_count integer := 0;
  error_count integer := 0;
  checkout_reservation record;
  token_result jsonb;
begin
  for checkout_reservation in
    select
      r.id as reservation_id,
      r.guest_email,
      r.guest_name,
      r.villa_id,
      v.name as villa_name
    from public.reservations r
    join public.villas v on r.villa_id = v.id
    where (
        (r.checkout_date is not null and r.checkout_date::date = current_date)
        or (r.checkout_date is null and upper(r.date_range)::date = current_date)
      )
      and r.status in ('confirmed', 'completed')
      and coalesce(r.review_reminder_sent, false) = false
      and r.guest_email is not null
      and length(trim(r.guest_email)) > 0
  loop
    begin
      token_result := public.generate_review_token(checkout_reservation.reservation_id);

      insert into public.email_logs (
        recipient,
        email_type,
        villa_id,
        reservation_id,
        token,
        status,
        created_at
      ) values (
        checkout_reservation.guest_email,
        'review_request',
        checkout_reservation.villa_id,
        checkout_reservation.reservation_id,
        token_result->>'access_token',
        'pending',
        now()
      )
      on conflict do nothing;

      update public.reservations
      set
        review_reminder_sent = true,
        status = case
          when status = 'confirmed' then 'completed'
          else status
        end
      where id = checkout_reservation.reservation_id;

      checkout_count := checkout_count + 1;
    exception when others then
      error_count := error_count + 1;
      raise warning 'Error processing reservation %: %', checkout_reservation.reservation_id, sqlerrm;
    end;
  end loop;

  return jsonb_build_object(
    'processed', checkout_count,
    'errors', error_count,
    'timestamp', now()
  );
end;
$$;

create or replace function public.sync_villa_features_from_boolean_columns(p_villa_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  delete from public.villa_features vf
  where p_villa_id is null
     or vf.villa_id = p_villa_id;

  insert into public.villa_features (villa_id, feature_id)
  select v.id, f.id
  from public.villas v
  cross join lateral (
    values
      ('heated_pool', v.heated_pool),
      ('sheltered_pool', v.sheltered_pool),
      ('tv_satellite', v.tv_satellite),
      ('master_bathroom', v.master_bathroom),
      ('jacuzzi', v.jacuzzi),
      ('fireplace', v.fireplace),
      ('children_pool', v.children_pool),
      ('in_site', v.in_site),
      ('private_pool', v.private_pool),
      ('playground', v.playground),
      ('internet', v.internet),
      ('security', v.security),
      ('sauna', v.sauna),
      ('hammam', v.hammam),
      ('indoor_pool', v.indoor_pool),
      ('baby_bed', v.baby_bed),
      ('high_chair', v.high_chair),
      ('foosball', v.foosball),
      ('table_tennis', v.table_tennis),
      ('underfloor_heating', v.underfloor_heating),
      ('generator', v.generator),
      ('billiards', v.billiards),
      ('pet_friendly', v.pet_friendly)
  ) as vf(feature_key, enabled)
  join public.features f on f.key = vf.feature_key
  where (p_villa_id is null or v.id = p_villa_id)
    and coalesce(vf.enabled, false) = true
    and coalesce(f.is_active, true) = true
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object('ok', true, 'inserted', v_inserted);
end;
$$;

create or replace function public.refresh_villa_features_from_boolean_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.sync_villa_features_from_boolean_columns(new.id);
  return new;
end;
$$;

drop trigger if exists villas_sync_features_after_write on public.villas;

create trigger villas_sync_features_after_write
after insert or update of
  heated_pool,
  sheltered_pool,
  tv_satellite,
  master_bathroom,
  jacuzzi,
  fireplace,
  children_pool,
  in_site,
  private_pool,
  playground,
  internet,
  security,
  sauna,
  hammam,
  indoor_pool,
  baby_bed,
  high_chair,
  foosball,
  table_tennis,
  underfloor_heating,
  generator,
  billiards,
  pet_friendly
on public.villas
for each row
execute function public.refresh_villa_features_from_boolean_columns();

select public.sync_villa_features_from_boolean_columns(null);

revoke execute on function public.approve_pending_reservation(uuid) from public, anon, authenticated;
revoke execute on function public.reject_pending_reservation(uuid) from public, anon, authenticated;
revoke execute on function public.cancel_reservation(uuid) from public, anon, authenticated;
revoke execute on function public.archive_past_reservations() from public, anon, authenticated;
revoke execute on function public.process_daily_checkout_reviews() from public, anon, authenticated;
revoke execute on function public.generate_review_token(uuid) from public, anon, authenticated;
revoke execute on function public.ensure_review_token_for_reservation(uuid) from public, anon, authenticated;
revoke execute on function public.get_pending_review_emails() from public, anon, authenticated;
revoke execute on function public.get_review_candidates() from public, anon, authenticated;
revoke execute on function public.cleanup_expired_calendar_periods(timestamptz) from public, anon, authenticated;
revoke execute on function public.sync_villa_features_from_boolean_columns(uuid) from public, anon, authenticated;
revoke execute on function public.test_review_process(uuid) from public, anon, authenticated;

grant execute on function public.approve_pending_reservation(uuid) to service_role;
grant execute on function public.reject_pending_reservation(uuid) to service_role;
grant execute on function public.cancel_reservation(uuid) to service_role;
grant execute on function public.archive_past_reservations() to service_role;
grant execute on function public.process_daily_checkout_reviews() to service_role;
grant execute on function public.generate_review_token(uuid) to service_role;
grant execute on function public.ensure_review_token_for_reservation(uuid) to service_role;
grant execute on function public.get_pending_review_emails() to service_role;
grant execute on function public.get_review_candidates() to service_role;
grant execute on function public.cleanup_expired_calendar_periods(timestamptz) to service_role;
grant execute on function public.sync_villa_features_from_boolean_columns(uuid) to service_role;
grant execute on function public.test_review_process(uuid) to service_role;
