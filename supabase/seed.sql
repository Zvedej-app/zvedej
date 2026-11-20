-- Ukázková témata výzvy Vzpěrač měsíce.
-- Téma se v aplikaci zobrazí automaticky 1. den daného měsíce (viz RLS politika).
-- Pokud pro měsíc téma chybí, aplikace použije záložní téma.
insert into public.monthly_challenges (month, title_cs, title_en, title_sk, description_cs, description_en, description_sk) values
  ('2026-12-01', 'Vánoční dvojboj', 'Christmas total', 'Vianočný dvojboj',
   'Trh i nadhoz v jednom videu.', 'Snatch and clean & jerk in one video.', 'Trh aj nadhod v jednom videu.'),
  ('2027-01-01', 'Novoroční trh', 'New Year snatch', 'Novoročný trh',
   'Ukaž svůj nejlepší trh do nového roku.', 'Show your best snatch of the new year.', 'Ukáž svoj najlepší trh do nového roka.')
on conflict (month) do nothing;
