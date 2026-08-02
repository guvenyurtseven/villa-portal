create or replace function public.reject_pending_reservation(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.reservations
    where id = p_id
      and status = 'pending'
  ) then
    raise exception 'Pending reservation % not found', p_id
      using errcode = 'P0002';
  end if;

  delete from public.email_logs
  where reservation_id = p_id;

  delete from public.reservations
  where id = p_id
    and status = 'pending';

  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;
