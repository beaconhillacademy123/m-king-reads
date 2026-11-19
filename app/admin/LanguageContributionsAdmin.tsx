'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase-browser';
import { LANGS } from '../../lib/naija';

type Row={id:string;user_id:string;lang:string;term:string;definition:string;pronunciation:string|null;part_of_speech:string|null;example_native:string|null;example_en:string|null;status:string;created_at:string};
export default function LanguageContributionsAdmin({flash}:{flash:(value:string)=>void}){
 const [rows,setRows]=useState<Row[]>([]);const [busy,setBusy]=useState('');
 const load=useCallback(async()=>{const {data,error}=await supabase.from('booknest_lang_contributions').select('*').order('created_at',{ascending:false}).limit(200);if(error){flash(error.message);return;}setRows((data as Row[])??[]);},[flash]);
 useEffect(()=>{void load();},[load]);
 async function decide(id:string,decision:'approved'|'rejected'){
  setBusy(id);const {error}=await supabase.rpc('booknest_admin_review_language_contribution',{p_id:id,p_decision:decision,p_note:null});setBusy('');
  if(error){flash(error.message);return;}flash(decision==='approved'?'Word added to the public dictionary.':'Contribution rejected.');void load();
 }
 const pending=rows.filter(r=>r.status==='pending');
 return <section className="card">
  <div className="cardHead"><h3>Language contributions ({pending.length} awaiting review)</h3><button className="btn btnGhost btnSmall" onClick={()=>void load()}><RefreshCw size={14}/> Refresh</button></div>
  <p className="dim small">Check the spelling, meaning and example against reliable language knowledge or a fluent speaker before approving. Approved entries become visible in the relevant public dictionary.</p>
  {rows.length===0?<p className="dim">No contributions yet.</p>:rows.map(r=><article className="suggestRow languageContributionReview" key={r.id}>
   <div className="contributionReviewBody"><b>{r.term}</b><span className="pill">{LANGS.find(l=>l.code===r.lang)?.name??r.lang}</span><p>{r.definition}</p>
    {r.pronunciation&&<small>Pronunciation: {r.pronunciation}</small>}{r.part_of_speech&&<small>Type: {r.part_of_speech}</small>}
    {r.example_native&&<p><i>{r.example_native}</i>{r.example_en?' — '+r.example_en:''}</p>}
    <small>Submitted {new Date(r.created_at).toLocaleString('en-NG')} · {r.user_id.slice(0,8)}</small>
   </div><div className="contributionReviewActions"><span className={'status status-'+(r.status==='approved'?'approved':r.status==='rejected'?'rejected':'pending')}>{r.status}</span>
    {r.status==='pending'&&<div className="row"><button className="btn btnGold btnSmall" disabled={busy===r.id} onClick={()=>void decide(r.id,'approved')}><Check size={14}/> Approve</button><button className="btn btnGhost btnSmall" disabled={busy===r.id} onClick={()=>void decide(r.id,'rejected')}><X size={14}/> Reject</button></div>}
   </div>
  </article>)}
 </section>;
}
