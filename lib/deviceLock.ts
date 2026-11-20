'use client';

import { supabase } from './supabase-browser';

/** Friendly name for this device, shown to the account owner if they try to sign in elsewhere. */
export function deviceLabel(): string {
  if (typeof navigator === 'undefined') return 'another device';
  const ua = navigator.userAgent;
  const kind = /iPhone/.test(ua) ? 'an iPhone' : /iPad/.test(ua) ? 'an iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'an Android phone' : 'an Android tablet')
    : /Macintosh/.test(ua) ? 'a Mac' : /Windows/.test(ua) ? 'a Windows computer' : /Linux/.test(ua) ? 'a Linux computer' : 'another device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return browser ? `${kind} (${browser})` : kind;
}

export type ClaimResult = { ok: boolean; device?: string; last_seen?: string };
const LOCK_MSG = 'mkr-device-lock';

export async function claimDevice(): Promise<ClaimResult> {
  const { data, error } = await supabase.rpc('booknest_device_claim', { p_label: deviceLabel() });
  if (error || !data) return { ok: true }; // never lock someone out because of a network blip
  return data as ClaimResult;
}

export function lockedMessage(r: ClaimResult) {
  return `Your Plus subscription is already in use on ${r.device || 'another device'}. Plus works on one device at a time — sign out there, then you can carry on reading here.`;
}

/** Sign out only on this device, remembering why so the login page can explain kindly. */
export async function leaveBecauseLocked(r: ClaimResult) {
  try { sessionStorage.setItem(LOCK_MSG, lockedMessage(r)); } catch {}
  await supabase.auth.signOut({ scope: 'local' });
  window.location.href = '/login?locked=1';
}

export function takeLockedMessage(): string {
  try { const m = sessionStorage.getItem(LOCK_MSG) || ''; sessionStorage.removeItem(LOCK_MSG); return m; } catch { return ''; }
}

/** Free the subscription for another device, then sign out here. */
export async function signOutAndRelease() {
  try { await supabase.rpc('booknest_device_release'); } catch {}
  await supabase.auth.signOut({ scope: 'local' });
}

let started = false;
/** Keep this device's claim fresh while the app is open; step aside if another device holds it. */
export function startDeviceHeartbeat() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const check = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session || !navigator.onLine) return;
    const r = await claimDevice();
    if (!r.ok) await leaveBecauseLocked(r);
  };
  void check();
  window.setInterval(() => void check(), 4 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void check(); });
}
