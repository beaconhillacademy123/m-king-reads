-- Add contextual usage notes and source-attributed Enuani sayings.
alter table public.booknest_lang_dictionary
  add column if not exists usage_note text;

-- Keep general Igbo lexicon entries out of the Enuani-specific public dictionary
-- until an Enuani community or specialist source confirms the forms.
update public.booknest_lang_dictionary
set verified = false
where lang = 'enu'
  and source = 'https://ndinaasubia.org.ng/olu_ndigbo/';

insert into public.booknest_lang_dictionary
  (lang, term, definition, pronunciation, part_of_speech, example_native, example_en, usage_note, source, verified)
values
  ('enu', 'Abụzụ gba nkịtị na-atụ ọnụ', 'Do not mistake a quiet person for an inactive person.', null, 'Proverb', null, 'Literally: The cricket that stays quiet is digging a hole.', 'Use when someone remains quiet while carefully thinking or preparing a response.', 'Atụtụ inu — Enuani proverbs: https://enuani.squarespace.com/enuaniaudio', true),
  ('enu', 'Anya adị afụ ntị', 'Some things are simply impossible or cannot happen.', null, 'Proverb', null, 'Literally: Your eyes can never see your ears.', 'Use when describing something impossible, forbidden or out of the ordinary.', 'Atụtụ inu — Enuani proverbs: https://enuani.squarespace.com/enuaniaudio', true),
  ('enu', 'Be onye bi ka ọwachi', 'Look after your home and responsibilities before taking care of matters farther away.', null, 'Proverb', null, 'Literally: It is the place where you live that receives your roof-mending attention.', 'Use when encouraging someone to put their immediate family or community responsibilities first.', 'Atụtụ inu — Enuani proverbs: https://enuani.squarespace.com/enuaniaudio', true),
  ('enu', 'Mmụta abụna ngala', 'Using knowledge gained through learning is not the same as showing off.', null, 'Proverb', null, 'Literally: Knowledge acquired through learning is not pride.', 'Use when someone is being modest about applying a skill or sharing what they have learned.', 'Atụtụ inu — Enuani proverbs: https://enuani.squarespace.com/enuaniaudio', true),
  ('enu', 'Ụtọmị na awele', 'Long life and good fortune; a wish for long life and prosperity.', null, 'Expression', null, 'Long life and good fortune.', 'A blessing used to wish someone well on a special occasion or during an ordinary encounter.', 'Atụtụ inu — Enuani proverbs: https://enuani.squarespace.com/enuaniaudio', true)
on conflict (lang, term) do update set
  definition = excluded.definition,
  part_of_speech = excluded.part_of_speech,
  example_en = excluded.example_en,
  usage_note = excluded.usage_note,
  source = excluded.source,
  verified = excluded.verified;
