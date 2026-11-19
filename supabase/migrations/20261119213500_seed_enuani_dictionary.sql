-- Seed the initial documented Enuani-English dictionary vocabulary.
insert into public.booknest_lang_dictionary
  (lang, term, definition, pronunciation, source, verified)
values
  ('enu', 'afụ', 'that (demonstrative)', null, 'https://ndinaasubia.org.ng/olu_ndigbo/', true),
  ('enu', 'agba', 'jaw', null, 'https://enuani.squarespace.com/content', true),
  ('enu', 'agwa', 'beans', null, 'https://enuani.squarespace.com/content', true),
  ('enu', 'akpa', 'bag', null, 'https://enuani.squarespace.com/content', true),
  ('enu', 'akwa', 'cloth (tone-sensitive form)', null, 'https://enuani.squarespace.com/content', true),
  ('enu', 'ákwá', 'cry', 'high tone on both syllables', 'https://enuani.squarespace.com/content', true),
  ('enu', 'àkwà', 'bed', 'low tone on both syllables', 'https://enuani.squarespace.com/content', true),
  ('enu', 'anwụ', 'sun', null, 'https://enuani.squarespace.com/content', true),
  ('enu', 'anya', 'eye', null, 'https://enuani.squarespace.com/content', true),
  ('enu', 'ashụ', 'body', null, 'https://ndinaasubia.org.ng/olu_ndigbo/', true),
  ('enu', 'ewu', 'goat', null, 'https://ndinaasubia.org.ng/olu_ndigbo/', true),
  ('enu', 'okpoho', 'girl', null, 'https://ndinaasubia.org.ng/olu_ndigbo/', true)
on conflict (lang, term) do update set
  definition = excluded.definition,
  pronunciation = coalesce(excluded.pronunciation, public.booknest_lang_dictionary.pronunciation),
  source = excluded.source,
  verified = true;
