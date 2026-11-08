-- Design review data rules (docs/design-decisions.md 45, 51), applied to the live match_place by editing its own text:
-- * a card's kind maps to the place's: bars and nightlife stay "nightlife" (the new "ברים ולילה"), experiences are
--   attractions; before, both became "other" (אחר)
-- * the card's baby line is copied into a new place's notes only when someone in the trip said they come with a baby;
--   before, it was also copied while nobody had answered "who's coming"
do $$
declare
  d text;
  was text;
begin
  d := pg_get_functiondef('public.match_place(uuid)'::regprocedure);
  was := d;
  d := replace(d, $a$case when c.category in ('food', 'sight', 'shopping') then c.category
                 when c.category = 'cafe' then 'food' else 'other' end,$a$,
                  $b$case when c.category in ('food', 'sight', 'shopping', 'nightlife') then c.category
                 when c.category = 'cafe' then 'food' when c.category = 'experience' then 'sight' else 'other' end,$b$);
  if d = was then raise exception 'place category mapping not found'; end if;
  was := d;
  d := regexp_replace(d, 'not exists \(select 1 from public\.members bm join public\.profiles bp on bp\.user_id = bm\.user_id\s+where bm\.trip_id = tid and jsonb_typeof\(bp\.answers -> ''with''\) = ''array''\)\s+or exists', 'exists');
  if d = was then raise exception 'baby rule not found'; end if;
  was := d;
  d := replace(d, $a$when c.category in ('sight', 'experience') then 'sight' else 'other' end,$a$,
                  $b$when c.category in ('sight', 'experience') then 'sight' when c.category = 'nightlife' then 'nightlife' else 'other' end,$b$);
  if d = was then raise exception 'plan item category mapping not found'; end if;
  execute d;
end
$$;
