-- CS-omkalibrering 2026-11-07 (issue #69): lokal sökning av CS_WEIGHTS direkt i Supabase.
-- Speglar lib/formscore.ts → computeComponents för alla komponenter utom spår
-- (verifierat: samma CS som lagrad formscore för 3 545 av 3 546 hästar i lopp
-- utan strukna, och samma värden på fyra decimaler för kusk/galopp/klass/tid/vinst%).
-- Komponentordning i viktvektorn: form, winRate, odds, time, consistency,
-- distance, streck, driver, gallop, klass. Testdelen = omgångar från 2026-08-26.
-- Körs med Supabase SQL-editorn eller MCP (execute_sql); läser bara.
with recursive
base as (
  select s.*, r.id as rid, coalesce(r.distance, 2140) as rdist, coalesce(r.start_method, 'auto') as rsm,
         g.date as gdate, g.id as gid,
         bool_or(coalesce(s.odds, 0) > 0) over (partition by r.id) as odds_open
  from starters s join races r on r.id = s.race_id join games g on g.id = r.game_id
),
act as (select * from base where not (odds_open and coalesce(odds, 0) <= 0)),
raw as (
  select a.rid, a.gid, a.gdate, a.start_number, (a.finish_position = 1) as won,
    -- form
    case when jsonb_typeof(a.last_5_results) = 'array' and jsonb_array_length(a.last_5_results) > 0 then
      (select sum(coalesce((array[0.40,0.25,0.15,0.11,0.09])[e.i], 0) *
         case e.v->>'place' when '1' then 10 when '2' then 7 when '3' then 5 when '4' then 2 when '5' then 2 else 0 end)
       from jsonb_array_elements(a.last_5_results) with ordinality e(v, i)) / 10.0
    else
      case when coalesce(a.starts_current_year,0) >= 2 then coalesce(a.wins_current_year,0)::float / a.starts_current_year
           when coalesce(a.starts_current_year,0) + coalesce(a.starts_prev_year,0) > 0 then
             (coalesce(a.wins_current_year,0) + coalesce(a.wins_prev_year,0))::float / (coalesce(a.starts_current_year,0) + coalesce(a.starts_prev_year,0))
           when coalesce(a.starts_total,0) > 0 then coalesce(a.wins_total,0)::float / a.starts_total
           else 0 end
    end as c_form,
    -- winRate
    case when coalesce(a.starts_current_year,0) >= 2 then coalesce(a.wins_current_year,0)::float / a.starts_current_year
         when coalesce(a.starts_current_year,0) + coalesce(a.starts_prev_year,0) > 0 then
           (coalesce(a.wins_current_year,0) + coalesce(a.wins_prev_year,0))::float / (coalesce(a.starts_current_year,0) + coalesce(a.starts_prev_year,0))
         else 0 end as c_win,
    case when coalesce(a.odds,0) > 0 then a.odds::float end as odds_v,
    (select m[1]::int * 60 + m[2]::int + m[3]::int / 10.0 from regexp_match(a.best_time, '(\d+):(\d+)[,.](\d+)') m) as time_v,
    -- consistency
    case when coalesce(a.starts_total,0) = 0 then 0 else
      0.6 * coalesce(a.wins_total,0)::float / a.starts_total +
      0.4 * (coalesce(a.wins_total,0) + coalesce(a.places_2nd,0) + coalesce(a.places_3rd,0))::float / a.starts_total end as c_cons,
    -- distance factor
    (with lr as (
       select e->>'start_method' as sm, (e->>'place')::float as pl
       from jsonb_array_elements(case when jsonb_typeof(a.life_records) = 'array' then a.life_records else '[]'::jsonb end) e
       where e->>'distance' = case when a.rdist <= 1800 then 'short' when a.rdist <= 2400 then 'medium' else 'long' end)
     select case
       when not exists (select 1 from lr) then 0.6
       when exists (select 1 from lr where sm = a.rsm) then
         case (select min(pl) from lr where sm = a.rsm and pl > 0 and pl < 99)
           when 1 then 1.35 else case when (select min(pl) from lr where sm = a.rsm and pl > 0 and pl < 99) <= 3 then 1.1 else 0.9 end end
       else
         case (select min(pl) from lr where sm is distinct from a.rsm and pl > 0 and pl < 99)
           when 1 then 1.2 else case when (select min(pl) from lr where sm is distinct from a.rsm and pl > 0 and pl < 99) <= 3 then 1.05 else 0.85 end end
     end) as dist_f,
    coalesce(a.bet_distribution, 0)::float as streck_v,
    a.driver_win_pct::float as driver_v,
    case when jsonb_typeof(a.last_5_results) = 'array' and jsonb_array_length(a.last_5_results) > 0 then
      1 - (select count(*) filter (where coalesce(e->>'place', 'undefined') ~* '[a-zåäö]') from jsonb_array_elements(a.last_5_results) e)::float
          / jsonb_array_length(a.last_5_results)
    else 0.5 end as c_gallop,
    case when coalesce(a.starts_total,0) > 0 and coalesce(a.earnings_total,0) > 0 then ln(1 + a.earnings_total::float / a.starts_total) else 0 end as klass_v
  from act a
),
mm as (
  select r.*,
    min(odds_v) over w as o_min, max(odds_v) over w as o_max,
    min(time_v) over w as t_min, max(time_v) over w as t_max,
    min(streck_v) over w as s_min, max(streck_v) over w as s_max,
    min(driver_v) over w as d_min, max(driver_v) over w as d_max,
    min(klass_v) over w as k_min, max(klass_v) over w as k_max,
    count(*) over w as n, count(*) filter (where won) over w as nwin
  from raw r window w as (partition by rid)
),
comp_all as (
  select rid, gid, gdate, start_number, won, n,
    c_form, c_win,
    case when odds_v is null then 0 when o_max = o_min then 0.5 else 1 - greatest(0, least(1, (odds_v - o_min) / (o_max - o_min))) end as c_odds,
    case when time_v is null then 0 when t_max = t_min then 0.5 else 1 - greatest(0, least(1, (time_v - t_min) / (t_max - t_min))) end as c_time,
    c_cons,
    greatest(0, least(1, (dist_f - 0.6) / 0.75)) as c_dist,
    case when s_max = s_min then 0.5 else greatest(0, least(1, (streck_v - s_min) / (s_max - s_min))) end as c_streck,
    case when driver_v is null then 0 when d_max = d_min then 0.5 else greatest(0, least(1, (driver_v - d_min) / (d_max - d_min))) end as c_driver,
    c_gallop,
    case when k_max = k_min then 0.5 else greatest(0, least(1, (klass_v - k_min) / (k_max - k_min))) end as c_klass
  from mm where nwin = 1 and n >= 2
)
, comp as materialized (
  select rid, won, n, (gdate >= '2026-08-26') as is_test,
    c_form as c1, c_win as c2, c_odds as c3, c_time as c4, c_cons as c5, c_dist as c6,
    c_streck as c7, c_driver as c8, c_gallop as c9, c_klass as c10
  from comp_all
),
tr as materialized (select * from comp where not is_test),
starts(sid, w) as (values
  (1, array[0.05,0,0.10,0,0.10,0.20,0.55,0,0,0]::float8[]),
  (2, array[0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1]::float8[]),
  (3, array[0,0,0,0,0,0,1,0,0,0]::float8[])),
climb(sid, iter, w, ll, improved) as (
  select sid, 0, w, null::float8, true from starts
  union all
  select c.sid, c.iter + 1, b.w, b.ll, (c.ll is null or b.ll < c.ll - 1e-9)
  from climb c
  cross join lateral (
    select cand.w, avg(-ln(greatest(case when x.fs > 0 then x.ws / x.fs else 1.0 / x.n end, 1e-12))) as ll
    from (
      select c.w as w
      union all
      select (select array_agg(round((case when k = i then c.w[k] - 0.05 when k = j then c.w[k] + 0.05 else c.w[k] end)::numeric, 2)::float8 order by k) from generate_series(1, 10) k)
      from generate_series(1, 10) i, generate_series(1, 10) j where i <> j and c.w[i] >= 0.05 - 1e-9
    ) cand
    cross join lateral (
      select t.rid, max(t.n) as n,
        sum(cand.w[1]*c1 + cand.w[2]*c2 + cand.w[3]*c3 + cand.w[4]*c4 + cand.w[5]*c5 + cand.w[6]*c6 + cand.w[7]*c7 + cand.w[8]*c8 + cand.w[9]*c9 + cand.w[10]*c10) as fs,
        sum(case when t.won then cand.w[1]*c1 + cand.w[2]*c2 + cand.w[3]*c3 + cand.w[4]*c4 + cand.w[5]*c5 + cand.w[6]*c6 + cand.w[7]*c7 + cand.w[8]*c8 + cand.w[9]*c9 + cand.w[10]*c10 else 0 end) as ws
      from tr t group by t.rid
    ) x
    group by cand.w order by ll limit 1
  ) b
  where c.improved and c.iter < 40
)
select sid, iter, w, round(ll::numeric, 4) ll from climb where not improved or iter = 0 order by sid, iter;
