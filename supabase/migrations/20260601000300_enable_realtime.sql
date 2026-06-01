-- Explicitly add territory tables to the supabase_realtime publication
-- Without this, Supabase will not broadcast postgres_changes over websockets,
-- causing clients to rely entirely on polling and resulting in sync delays.

alter publication supabase_realtime add table public.hex_tiles;
alter publication supabase_realtime add table public.battles;
alter publication supabase_realtime add table public.territory_events;
