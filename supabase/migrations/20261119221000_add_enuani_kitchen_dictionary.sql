-- Dedicated Enuani kitchen and food vocabulary.
alter table public.booknest_lang_dictionary
  add column if not exists category text;

insert into public.booknest_lang_dictionary
  (lang, term, definition, pronunciation, part_of_speech, example_native, example_en, usage_note, source, verified, category)
values
  ('enu', 'ofe', 'soup or sauce eaten with a swallow such as fufu', null, 'Food / dish', null, 'Soup or sauce', 'Enuani descriptions explain that soup is commonly used as a dipping sauce for a ball of fufu, rather than simply sipped.', 'Atụtụ inu — Enuani proverbs and food culture: https://enuani.squarespace.com/enuaniaudio', true, 'kitchen'),
  ('enu', 'agbono', 'ogbono soup', null, 'Food / dish', null, 'Ogbono soup', 'Named as one of the soups eaten in Enuani food culture.', 'Atụtụ inu — Enuani proverbs and food culture: https://enuani.squarespace.com/enuaniaudio', true, 'kitchen'),
  ('enu', 'egusi', 'egusi soup', null, 'Food / dish', null, 'Egusi soup', 'Named as one of the soups eaten in Enuani food culture.', 'Atụtụ inu — Enuani proverbs and food culture: https://enuani.squarespace.com/enuaniaudio', true, 'kitchen'),
  ('enu', 'nsala', 'nsala soup', null, 'Food / dish', null, 'Nsala soup', 'Named as one of the soups eaten in Enuani food culture.', 'Atụtụ inu — Enuani proverbs and food culture: https://enuani.squarespace.com/enuaniaudio', true, 'kitchen'),
  ('enu', 'Ilọma', 'snail', null, 'Ingredient / food', null, 'Snail', 'The Enuani source describes snails as a valued food and explains a traditional way small snails may be roasted over a fire.', 'Atụtụ inu — Enuani proverbs and food culture: https://enuani.squarespace.com/enuaniaudio', true, 'kitchen'),
  ('enu', 'ọka akamkpolo', 'hard, dry corn on the cob', null, 'Ingredient / food', null, 'Hard dry corn', 'The source describes this corn being roasted close to the embers of a kitchen fire.', 'Atụtụ inu — Enuani proverbs and food culture: https://enuani.squarespace.com/enuaniaudio', true, 'kitchen'),
  ('enu', 'mmanụ', 'oil; cooking oil in food context', null, 'Ingredient', null, 'Oil', 'The Enuani tale study uses mmanụ in a food context when describing oil dripping from meat over a fire.', 'Tradition and Individual Creativity in Enuani Tales: https://eprints.soas.ac.uk/28524/1/10672683.pdf', true, 'kitchen'),
  ('enu', 'si', 'to cook', null, 'Cooking action', null, 'Cook', 'A linguistic study records si as the Enuani verb for cook.', 'Nwachukwu et al., Igbo verbal studies (1983): https://manfredi.mayfirst.org/NwachukwuEtAl1983.pdf', true, 'kitchen'),
  ('enu', 'ri', 'to eat', null, 'Cooking / eating action', null, 'Eat', 'A linguistic study records ri as the Enuani verb for eat.', 'Nwachukwu et al., Igbo verbal studies (1983): https://manfredi.mayfirst.org/NwachukwuEtAl1983.pdf', true, 'kitchen'),
  ('enu', 'bàchà-rà', 'to peel', null, 'Food preparation action', null, 'Peel', 'Recorded in an Enuani linguistic study in the sequence of peeling cassava and then soaking it.', 'University of Benin repository — Syntactic Analysis of Serial Verb Constructions in Enuani: https://repository.uniben.edu/sites/default/files/2026-03/SSE.pdf', true, 'kitchen'),
  ('enu', 'jìapụ', 'to soak', null, 'Food preparation action', null, 'Soak', 'Recorded in an Enuani linguistic study in the sequence of peeling cassava and then soaking it in water.', 'University of Benin repository — Syntactic Analysis of Serial Verb Constructions in Enuani: https://repository.uniben.edu/sites/default/files/2026-03/SSE.pdf', true, 'kitchen')
on conflict (lang, term) do update set
  definition = excluded.definition,
  part_of_speech = excluded.part_of_speech,
  example_en = excluded.example_en,
  usage_note = excluded.usage_note,
  source = excluded.source,
  verified = excluded.verified,
  category = excluded.category;
