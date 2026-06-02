-- Preserve multiplier tiles when older resolve_challenge implementations settle
-- multiplier challenges. Refresh waves still clear/reassign multipliers because
-- they do not run while active_challenge_kind is a multiplier challenge.

create or replace function public.preserve_multiplier_tile_resolution()
returns trigger as $$
begin
  if old.kind = 'multiplier'
    and old.active_challenge_kind in (
      'capture_multiplier',
      'reverse_multiplier',
      'self_recapture_multiplier'
    )
  then
    new.kind := old.kind;
    new.multiplier := old.multiplier;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists preserve_multiplier_tile_resolution on public.hex_tiles;
create trigger preserve_multiplier_tile_resolution
before update on public.hex_tiles
for each row
execute function public.preserve_multiplier_tile_resolution();
