import { supabase } from './supabase-browser';

export type ListBook = { ref: string; title: string; author: string | null; cover: string | null };
export type ReadingList = {
  id: string; title: string; class_name: string | null; note: string | null; teacher_name: string | null;
  share_code: string; opens: number; created_at: string; updated_at: string;
};
export type ListItem = { id: string; list_id: string; position: number; book_ref: string; title: string; author: string | null; cover_url: string | null };
export type PublicList = {
  title: string; class_name: string | null; note: string | null; teacher_name: string | null; share_code: string; updated_at: string;
  items: { book_ref: string; title: string; author: string | null; cover_url: string | null }[];
};

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://mkingreads.promisevisuals.com';

/** Where a list item opens: curated books have /book pages, open-collection books /free-books pages. */
export function bookHref(ref: string) {
  if (ref.startsWith('cat:')) return `/book/${ref.slice(4)}`;
  if (ref.startsWith('gut:')) return `/free-books/${ref.slice(4)}`;
  return '/explore';
}
export function readHref(ref: string) {
  if (ref.startsWith('cat:')) return `/read/${ref.slice(4)}`;
  if (ref.startsWith('gut:')) return `/free-books/${ref.slice(4)}/read`;
  return '/explore';
}
export const listUrl = (code: string) => `${SITE}/list/${code}`;

function safeCover(url: string | null | undefined) {
  return url && /^https:\/\//.test(url) && url.length <= 500 ? url : null;
}

const LIST_FIELDS = 'id,title,class_name,note,teacher_name,share_code,opens,created_at,updated_at';

export async function myLists() {
  const { data, error } = await supabase.from('booknest_reading_lists').select(LIST_FIELDS).order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReadingList[];
}

export async function createList(input: { title: string; class_name?: string; teacher_name?: string; note?: string }) {
  const { data, error } = await supabase.from('booknest_reading_lists').insert({
    title: input.title.trim().slice(0, 120),
    class_name: input.class_name?.trim().slice(0, 80) || null,
    teacher_name: input.teacher_name?.trim().slice(0, 80) || null,
    note: input.note?.trim().slice(0, 600) || null,
  }).select(LIST_FIELDS).single();
  if (error) throw error;
  return data as ReadingList;
}

export async function updateList(id: string, input: { title: string; class_name: string; teacher_name: string; note: string }) {
  const { error } = await supabase.from('booknest_reading_lists').update({
    title: input.title.trim().slice(0, 120), class_name: input.class_name.trim().slice(0, 80) || null,
    teacher_name: input.teacher_name.trim().slice(0, 80) || null, note: input.note.trim().slice(0, 600) || null,
  }).eq('id', id);
  if (error) throw error;
}

export async function deleteList(id: string) {
  const { error } = await supabase.from('booknest_reading_lists').delete().eq('id', id);
  if (error) throw error;
}

export async function listItems(listId: string) {
  const { data, error } = await supabase.from('booknest_reading_list_items').select('id,list_id,position,book_ref,title,author,cover_url')
    .eq('list_id', listId).order('position').order('added_at');
  if (error) throw error;
  return (data ?? []) as ListItem[];
}

export async function addToList(listId: string, book: ListBook) {
  const { data: last } = await supabase.from('booknest_reading_list_items').select('position').eq('list_id', listId).order('position', { ascending: false }).limit(1).maybeSingle();
  const { error } = await supabase.from('booknest_reading_list_items').insert({
    list_id: listId, book_ref: book.ref, title: book.title.slice(0, 300), author: book.author?.slice(0, 200) || null,
    cover_url: safeCover(book.cover), position: ((last as { position: number } | null)?.position ?? -1) + 1,
  });
  if (error && error.code === '23505') return 'exists' as const;
  if (error) throw error;
  return 'added' as const;
}

export async function removeItem(id: string) {
  const { error } = await supabase.from('booknest_reading_list_items').delete().eq('id', id);
  if (error) throw error;
}

export async function reorder(items: ListItem[]) {
  await Promise.all(items.map((item, position) => supabase.from('booknest_reading_list_items').update({ position }).eq('id', item.id)));
}

export function shareMessage(list: Pick<ReadingList, 'title' | 'class_name' | 'teacher_name' | 'share_code'>) {
  const who = list.teacher_name ? ` from ${list.teacher_name}` : '';
  const forClass = list.class_name ? ` for ${list.class_name}` : '';
  return `📚 Reading list${forClass}${who}: ${list.title}\nOpen it and read free on M King Reads: ${listUrl(list.share_code)}`;
}
