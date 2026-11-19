'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Crown, Loader2, Send, X } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../lib/supabase-browser';
import { useAccount } from '../../../lib/account';

type Submission = { id: string; term: string; definition: string; status: string; reviewer_note: string | null; created_at: string };
const POS = ['Noun','Verb','Adjective','Adverb','Expression','Proverb','Other'];

export default function LanguageContribution({ lang, languageName }: { lang: string; languageName: string }) {
  const { user, plus, ready } = useAccount();
  const [term,setTerm]=useState(''); const [definition,setDefinition]=useState('');
  const [pronunciation,setPronunciation]=useState(''); const [part,setPart]=useState('');
  const [native,setNative]=useState(''); const [english,setEnglish]=useState('');
  const [rows,setRows]=useState<Submission[]>([]); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  const load=useCallback(async()=>{
    if(!user) return;
    const {data}=await supabase.from('booknest_lang_contributions').select('id,term,definition,status,reviewer_note,created_at').eq('user_id',user.id).eq('lang',lang).order('created_at',{ascending:false}).limit(8);
    setRows((data as Submission[])??[]);
  },[user,lang]);
  useEffect(()=>{void load();},[load]);
  async function submit(e:React.FormEvent){
    e.preventDefault(); setBusy(true); setMessage('');
    const {error}=await supabase.rpc('booknest_submit_language_contribution',{
      p_lang:lang,p_term:term,p_definition:definition,p_pronunciation:pronunciation||null,
      p_part_of_speech:part||null,p_example_native:native||null,p_example_en:english||null
    });
    setBusy(false);
    if(error){setMessage(error.message);return;}
    setTerm('');setDefinition('');setPronunciation('');setPart('');setNative('');setEnglish('');
    setMessage('Thank you. Your contribution has been sent for review.'); void load();
  }
  return <section className="card languageContribution" id="contribute">
    <div className="cardHead"><h3><Send size={17}/> Contribute a word</h3><span className="pill pillGold"><Crown size={12}/> Plus members</span></div>
    <p className="dim">Help grow the {languageName} dictionary. Add a word or expression with its English meaning. Our language team reviews every contribution before it appears publicly.</p>
    {!ready ? <p className="dim">Checking membership…</p> : !user ? <div className="emptyState"><strong>Sign in to contribute</strong><p>Contributions are a benefit for active Plus members.</p><Link className="btn btnGold" href={`/login?next=/naija/${lang}`}>Sign in</Link></div> : !plus ? <div className="emptyState"><strong>Reserved for Plus members</strong><p>Upgrade to M King Reads Plus to contribute words and help preserve Nigerian languages.</p><Link className="btn btnGold" href="/premium"><Crown size={14}/> Get Plus</Link></div> : <form className="formGrid" onSubmit={submit}>
      <label>Word or expression<input value={term} onChange={e=>setTerm(e.target.value)} maxLength={120} required placeholder="Enter the word in its language"/></label>
      <label>English meaning<input value={definition} onChange={e=>setDefinition(e.target.value)} maxLength={500} required placeholder="What does it mean in English?"/></label>
      <label>Pronunciation (optional)<input value={pronunciation} onChange={e=>setPronunciation(e.target.value)} maxLength={120} placeholder="How should it be pronounced?"/></label>
      <label>Word type (optional)<select value={part} onChange={e=>setPart(e.target.value)}><option value="">Choose one</option>{POS.map(p=><option key={p}>{p}</option>)}</select></label>
      <label>Example in {languageName} (optional)<textarea rows={2} value={native} onChange={e=>setNative(e.target.value)} maxLength={500} placeholder="Use the word in a sentence"/></label>
      <label>English translation of example (optional)<textarea rows={2} value={english} onChange={e=>setEnglish(e.target.value)} maxLength={500} placeholder="Translate the example sentence"/></label>
      {message && <p className={message.startsWith('Thank')?'dim':'formError'} role="status">{message}</p>}
      <button className="btn btnGold" disabled={busy||!term.trim()||!definition.trim()}>{busy?<Loader2 size={15} className="spin"/>:<Send size={15}/>} Submit for review</button>
    </form>}
    {user && rows.length>0 && <div className="contributionHistory"><h4>Your recent contributions</h4>{rows.map(r=><div className="suggestRow" key={r.id}><div><b>{r.term}</b><small>{r.definition}</small>{r.reviewer_note&&<small>{r.reviewer_note}</small>}</div><span className={`status status-${r.status==='approved'?'approved':r.status==='rejected'?'rejected':'pending'}`}>{r.status==='pending'?'In review':r.status}</span></div>)}</div>}
  </section>;
}
