-- Seed a small, source-attributed Enuani starter vocabulary.
-- Entries are transcribed from the Atụtụ inu Enuani phonetics reference;
-- this does not claim validation across every town or sub-dialect.
insert into public.booknest_lang_dictionary
  (lang, term, definition, pronunciation, part_of_speech, example_native, example_en, source, verified)
values
  ('enu', 'agba', 'jaw', null, null, null, null, 'Atụtụ inu — Enuani phonetics and orthography: https://enuani.squarespace.com/content', true),
  ('enu', 'agwa', 'beans', null, null, null, null, 'Atụtụ inu — Enuani phonetics and orthography: https://enuani.squarespace.com/content', true),
  ('enu', 'akwa', 'cloth (tone-sensitive form)', null, null, null, null, 'Atụtụ inu — Enuani phonetics and orthography: https://enuani.squarespace.com/content', true),
  ('enu', 'akpa', 'bag', null, null, null, null, 'Atụtụ inu — Enuani phonetics and orthography: https://enuani.squarespace.com/content', true),
  ('enu', 'anwụ', 'sun', null, null, null, null, 'Atụtụ inu — Enuani phonetics and orthography: https://enuani.squarespace.com/content', true),
  ('enu', 'anya', 'eye', null, null, null, null, 'Atụtụ inu — Enuani phonetics and orthography: https://enuani.squarespace.com/content', true),
  ('enu', 'àkwà', 'bed', 'low tone on both syllables', null, null, null, 'Atụtụ inu — Enuani phonetics and orthography: https://enuani.squarespace.com/content', true),
  ('enu', 'ákwá', 'cry', 'high tone on both syllables', null, null, null, 'Atụtụ inu — Enuani phonetics and orthography: https://enuani.squarespace.com/content', true)
on conflict (lang, term) do update set
  definition = excluded.definition,
  pronunciation = excluded.pronunciation,
  source = excluded.source,
  verified = excluded.verified;
