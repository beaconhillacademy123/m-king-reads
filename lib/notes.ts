'use client';

import { supabase } from './supabase-browser';

export type Note = { book_key: string; title: string; href: string | null; content: string; updated_at: string };

const PREFIX = 'mkr-note:';

export function readLocalNote(key: string): Note | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Note) : null;
  } catch {
    return null;
  }
}

export function writeLocalNote(note: Note) {
  try {
    if (note.content.trim()) localStorage.setItem(PREFIX + note.book_key, JSON.stringify(note));
    else localStorage.removeItem(PREFIX + note.book_key);
  } catch {
    /* storage full or blocked: cloud copy still saves for signed-in readers */
  }
}

export function listLocalNotes(): Note[] {
  const out: Note[] = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k?.startsWith(PREFIX)) continue;
      const n = readLocalNote(k.slice(PREFIX.length));
      if (n?.content.trim()) out.push(n);
    }
  } catch {
    /* ignore */
  }
  return out.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function fetchCloudNote(userId: string, key: string): Promise<Note | null> {
  const { data } = await supabase.from('booknest_notes').select('book_key,title,href,content,updated_at').eq('user_id', userId).eq('book_key', key).maybeSingle();
  return (data as Note) ?? null;
}

export async function saveCloudNote(userId: string, note: Note) {
  if (!note.content.trim()) {
    await supabase.from('booknest_notes').delete().eq('user_id', userId).eq('book_key', note.book_key);
    return;
  }
  await supabase.from('booknest_notes').upsert({ user_id: userId, ...note });
}

export async function listCloudNotes(): Promise<Note[]> {
  const { data } = await supabase.from('booknest_notes').select('book_key,title,href,content,updated_at').order('updated_at', { ascending: false }).limit(200);
  return (data as Note[]) ?? [];
}

export async function deleteNote(userId: string | null, key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
  if (userId) await supabase.from('booknest_notes').delete().eq('user_id', userId).eq('book_key', key);
}

export function downloadNote(note: Pick<Note, 'title' | 'content'>) {
  const blob = new Blob([`${note.title}\n${'='.repeat(Math.min(60, note.title.length))}\n\n${note.content}\n\n— Notes from M King Reads`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${note.title.replace(/[^\p{L}\p{N} _-]+/gu, '').trim().slice(0, 60) || 'notes'} - notes.txt`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
