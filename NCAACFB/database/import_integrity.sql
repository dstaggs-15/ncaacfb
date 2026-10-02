-- Existing duplicate seasons in other dynasties are left untouched.
-- Serialize creation/renaming of seasons and reject duplicate dynasty/year pairs.
create or replace function public.prevent_duplicate_season()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' and new.dynasty_id is not distinct from old.dynasty_id and new.year = old.year then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(new.dynasty_id::text || ':' || new.year::text, 0));
  if exists (select 1 from public.seasons s where s.dynasty_id = new.dynasty_id and s.year = new.year and s.id <> new.id) then
    raise exception 'Season % already exists for this dynasty. Select the existing season.', new.year using errcode = '23505';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_duplicate_season() from public;
create trigger seasons_reject_duplicates before insert or update of dynasty_id, year on public.seasons
for each row execute function public.prevent_duplicate_season();

-- Guest profiles represent coaches, not login accounts. Scope them to one dynasty.
alter table public.profiles add column guest_dynasty_id uuid references public.dynasties(id);
alter table public.profiles add constraint guest_profiles_not_commissioners check (guest_dynasty_id is null or (is_commissioner = false and display_name is not null));
create unique index guest_profile_names on public.profiles (guest_dynasty_id, lower(display_name)) where guest_dynasty_id is not null;
create policy "Members can create guest coaches" on public.profiles for insert to authenticated
with check (guest_dynasty_id is not null and id <> (select auth.uid()) and is_commissioner = false
and exists (select 1 from public.dynasty_members dm where dm.dynasty_id = guest_dynasty_id and dm.profile_id = (select auth.uid())));
create policy "Members can insert season assignments" on public.season_team_control for insert to authenticated
with check (exists (select 1 from public.seasons s join public.teams t on t.id = team_id and t.dynasty_id = s.dynasty_id
join public.dynasty_members dm on dm.dynasty_id = s.dynasty_id and dm.profile_id = (select auth.uid())
where s.id = season_id));
create policy "Members can update season assignments" on public.season_team_control for update to authenticated
using (exists (select 1 from public.seasons s join public.dynasty_members dm on dm.dynasty_id = s.dynasty_id and dm.profile_id = (select auth.uid()) where s.id = season_id))
with check (exists (select 1 from public.seasons s join public.teams t on t.id = team_id and t.dynasty_id = s.dynasty_id
join public.dynasty_members dm on dm.dynasty_id = s.dynasty_id and dm.profile_id = (select auth.uid()) where s.id = season_id));
-- Legacy games without labels are excluded; new imports always have labels.
create unique index games_import_identity on public.games (season_id, lower(home_team), lower(away_team), coalesce(week, -1), lower(game_type), lower(week_label)) where week_label is not null;
