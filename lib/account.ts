'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase-browser';

export type Billing = {
  plus_monthly_ngn: number; plus_yearly_ngn: number; sponsor_weekly_ngn: number;
  payment_enabled: boolean; bank_name: string | null; account_name: string | null; account_number: string | null;
  support_email: string | null;
};

export const DEFAULT_BILLING: Billing = {
  plus_monthly_ngn: 1000, plus_yearly_ngn: 9000, sponsor_weekly_ngn: 5000,
  payment_enabled: false, bank_name: null, account_name: null, account_number: null, support_email: null,
};

export type Subscription = { plan: string; status: string; expires_at: string | null; billing_period: string | null };

const PLUS_CACHE = 'mkr-plus-until';

export function isPlusActive(sub: Subscription | null) {
  return !!sub && sub.plan === 'plus' && sub.status === 'active' && !!sub.expires_at && new Date(sub.expires_at).getTime() > Date.now();
}

/** Cached locally so Plus features (ad-free, offline) keep working without a connection. */
export function cachedPlus() {
  try {
    const until = Number(localStorage.getItem(PLUS_CACHE) || 0);
    return until > Date.now();
  } catch { return false; }
}

const subCache = new Map<string, { at: number; promise: Promise<Subscription | null> }>();

export function fetchSubscription(userId: string, fresh = false): Promise<Subscription | null> {
  const hit = subCache.get(userId);
  if (!fresh && hit && Date.now() - hit.at < 60000) return hit.promise;
  const promise = loadSubscription(userId);
  subCache.set(userId, { at: Date.now(), promise });
  return promise;
}

async function loadSubscription(userId: string): Promise<Subscription | null> {
  const { data } = await supabase.from('booknest_subscriptions').select('plan,status,expires_at,billing_period').eq('user_id', userId).maybeSingle();
  const sub = (data as Subscription | null) ?? null;
  try {
    if (isPlusActive(sub)) localStorage.setItem(PLUS_CACHE, String(new Date(sub!.expires_at!).getTime()));
    else localStorage.removeItem(PLUS_CACHE);
  } catch {}
  return sub;
}

let billingCache: Promise<Billing> | null = null;
export function fetchBilling(): Promise<Billing> {
  if (!billingCache) billingCache = loadBilling().catch(() => { billingCache = null; return DEFAULT_BILLING; });
  return billingCache;
}

async function loadBilling(): Promise<Billing> {
  const { data, error } = await supabase.rpc('booknest_public_billing');
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return DEFAULT_BILLING;
  return row as Billing;
}

export function useAccount() {
  const [session, setSession] = useState<Session | null>(null);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [ready, setReady] = useState(false);
  const [plus, setPlus] = useState(false);

  useEffect(() => {
    setPlus(cachedPlus());
    let alive = true;
    async function load(s: Session | null) {
      if (!alive) return;
      setSession(s);
      if (s) {
        const next = await fetchSubscription(s.user.id).catch(() => null);
        if (!alive) return;
        setSub(next);
        setPlus(isPlusActive(next) || (!next && cachedPlus()));
      } else {
        setSub(null);
        setPlus(false);
        try { localStorage.removeItem(PLUS_CACHE); } catch {}
      }
      setReady(true);
    }
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => { void load(s); });
    return () => { alive = false; listener.subscription.unsubscribe(); };
  }, []);

  return { session, user: session?.user ?? null, sub, plus, ready };
}

export const PLUS_FEATURES = [
  { title: 'No ads, ever', text: 'A calm, distraction-free library and reader.' },
  { title: 'Read offline', text: 'Download books to your phone and read with no data.' },
  { title: 'Listen with Read-Aloud', text: 'Have any chapter read to you, at your own speed.' },
  { title: 'Premium reading themes', text: 'Night, Paper and Midnight themes plus extra fonts.' },
  { title: 'Reading stats & streaks', text: 'Daily goals, streaks and time spent reading.' },
  { title: 'Support African reading', text: 'Your plan funds new books and local writers.' },
];
