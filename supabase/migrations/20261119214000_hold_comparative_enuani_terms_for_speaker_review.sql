-- Keep the four comparative dialect terms pending native-speaker review.
update public.booknest_lang_dictionary
set verified = false
where lang = 'enu'
  and term in ('afụ', 'ashụ', 'ewu', 'okpoho');
