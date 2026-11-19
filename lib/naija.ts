import { supabaseRest } from './supabase-rest';
import type { Book } from './booknest';

export type LangCode = 'ha' | 'yo' | 'ig' | 'pcm' | 'enu';

export const LANGS: { code: LangCode; name: string; native: string; hello: string; helloEn: string; region: string; tint: string }[] = [
  { code: 'yo', name: 'Yorùbá', native: 'Èdè Yorùbá', hello: 'Ẹ káàbọ̀!', helloEn: 'Welcome!', region: 'South-West', tint: '#e2b65c' },
  { code: 'ha', name: 'Hausa', native: 'Harshen Hausa', hello: 'Sannu da zuwa!', helloEn: 'Welcome!', region: 'North', tint: '#6fcf97' },
  { code: 'ig', name: 'Igbo', native: 'Asụsụ Igbo', hello: 'Nnọọ!', helloEn: 'Welcome!', region: 'South-East', tint: '#ff8ac4' },
  { code: 'pcm', name: 'Pidgin', native: 'Naija', hello: 'How far!', helloEn: "What's up!", region: 'Everywhere', tint: '#8fb8ff' },
  { code: 'enu', name: 'Enuani', native: 'Asụsụ Enuani', hello: '', helloEn: '', region: 'South-South', tint: '#c4a7e7' },
];

export const langMeta = (code: string) => LANGS.find(l => l.code === code);

/** Everyday starter phrases. Shown free to everyone. */
export const PHRASES: Record<LangCode, [string, string][]> = {
  yo: [
    ['Ẹ káàárọ̀', 'Good morning (respectful)'], ['Ẹ káàsán', 'Good afternoon'], ['Ẹ kúùrọ̀lẹ́', 'Good evening'],
    ['Báwo ni?', 'How are you?'], ['Dáadáa ni', "I'm fine"], ['Ẹ ṣé', 'Thank you (respectful)'],
    ['Kí ni orúkọ rẹ?', "What's your name?"], ['Orúkọ mi ni …', 'My name is …'], ['Ẹ jọ̀ọ́', 'Please'],
    ['Bẹ́ẹ̀ ni / Rárá', 'Yes / No'], ['Ó dàbọ̀', 'Goodbye'],
  ],
  ha: [
    ['Sannu', 'Hello'], ['Ina kwana?', 'Good morning (lit. how did you sleep?)'], ['Lafiya lau', "I'm fine"],
    ['Ina wuni?', 'Good afternoon'], ['Na gode', 'Thank you'], ['Yaya sunanka?', "What's your name? (to a man)"],
    ['Sunana …', 'My name is …'], ['Don Allah', 'Please'], ['Ee / A’a', 'Yes / No'], ['Sai an jima', 'See you later'], ['Sai gobe', 'See you tomorrow'],
  ],
  ig: [
    ['Ndeewo', 'Hello / Greetings'], ['Ụtụtụ ọma', 'Good morning'], ['Kedu?', 'How are you?'], ['Ọ dị mma', "I'm fine"],
    ['Daalụ', 'Thank you'], ['Gịnị bụ aha gị?', "What's your name?"], ['Aha m bụ …', 'My name is …'], ['Biko', 'Please'],
    ['Ee / Mba', 'Yes / No'], ['Ka chi fo', 'Good night'], ['Ka ọ dị', 'Goodbye'],
  ],
  pcm: [
    ['How far?', "How are you? / What's up?"], ['I dey fine / I dey kampe', "I'm fine"], ['Wetin be your name?', "What's your name?"],
    ['My name na …', 'My name is …'], ['Abeg', 'Please'], ['Thank you well well', 'Thank you very much'], ['Wetin dey happen?', "What's going on?"],
    ['I no sabi', "I don't know"], ['Make we dey go', "Let's go"], ['No wahala', 'No problem'], ['Una well done', 'Well done, everyone'],
  ],
  // Enuani entries are deliberately left empty until checked by fluent speakers.
  enu: [],
};

export type StoryPage = { image: string | null; text: string; en: string | null };
export type LangStory = {
  id: string; lang: LangCode; story_no: string; title: string; title_en: string | null; author: string | null; illustrator: string | null;
  translator: string | null; level: number | null; license: string; source: string; cover_url: string | null; pages?: StoryPage[];
};
export type Lesson = { id: string; position: number; title: string; tracks: { label: string; url: string }[] };
export type Course = { id: string; lang: LangCode; title: string; description: string | null; source: string; book_url: string | null; free_lessons: number; booknest_lang_lessons?: Lesson[] };
export type DictionaryEntry = { id: string; term: string; definition: string; pronunciation: string | null; part_of_speech: string | null; example_native: string | null; example_en: string | null; usage_note: string | null; source: string | null };

const STORY_FIELDS = 'id,lang,story_no,title,title_en,author,illustrator,translator,level,license,source,cover_url';

export const getStories = (lang?: string) =>
  supabaseRest<LangStory[]>(`booknest_lang_stories?select=${STORY_FIELDS}${lang ? `&lang=eq.${encodeURIComponent(lang)}` : ''}&order=story_no.asc`);

export async function getStory(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const rows = await supabaseRest<LangStory[]>(`booknest_lang_stories?select=${STORY_FIELDS},pages&id=eq.${id}&limit=1`);
  return rows[0] ?? null;
}

export async function getCourse(lang: string) {
  const rows = await supabaseRest<Course[]>(`booknest_lang_courses?select=id,lang,title,description,source,book_url,free_lessons,booknest_lang_lessons(id,position,title,tracks)&lang=eq.${encodeURIComponent(lang)}&limit=1`);
  const c = rows[0];
  if (c?.booknest_lang_lessons) c.booknest_lang_lessons.sort((a, b) => a.position - b.position);
  return c ?? null;
}

export const getCourseCounts = () =>
  supabaseRest<{ lang: string; booknest_lang_lessons: { count: number }[] }[]>('booknest_lang_courses?select=lang,booknest_lang_lessons(count)');

export const getDictionaryEntries = (lang: string) =>
  supabaseRest<DictionaryEntry[]>(`booknest_lang_dictionary?select=id,term,definition,pronunciation,part_of_speech,example_native,example_en,usage_note,source&lang=eq.${encodeURIComponent(lang)}&verified=eq.true&order=term.asc`);

export const getHeritage = (lang?: string) =>
  supabaseRest<Book[]>(`booknest_books?select=id,title,author,description,cover_url,source_name,source_url,license,read_url,download_url,is_featured,publication_year,language,gutenberg_id,audience,vibe,booknest_genres(id,name,slug,icon)&naija_langs=cs.${encodeURIComponent(`{${lang ?? 'ng'}}`)}&order=title.asc`);

export function licenseUrl(license: string) {
  const m = /CC (BY(?:-[A-Z]+)*) ([\d.]+)/.exec(license);
  return m ? `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/` : 'https://creativecommons.org/licenses/';
}
