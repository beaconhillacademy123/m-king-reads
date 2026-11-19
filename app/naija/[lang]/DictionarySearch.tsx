'use client';

import { useMemo, useState } from 'react';
import type { DictionaryEntry } from '../../../lib/naija';

export default function DictionarySearch({ entries }: { entries: DictionaryEntry[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return entries;
    return entries.filter(entry =>
      [entry.term, entry.definition, entry.pronunciation, entry.part_of_speech, entry.example_native, entry.example_en]
        .some(value => value?.toLocaleLowerCase().includes(q))
    );
  }, [entries, query]);

  return (
    <div>
      <label className="srOnly" htmlFor="enuani-dictionary-search">Search the Enuani dictionary</label>
      <input
        id="enuani-dictionary-search"
        className="dictionarySearch"
        type="search"
        value={query}
        onChange={event => setQuery(event.target.value)}
        placeholder="Search Enuani → English or English → Enuani…"
      />
      {entries.length === 0 ? (
        <div className="dictionaryEmpty" role="status">
          <strong>The Enuani dictionary is being compiled.</strong>
          <p>Verified entries will appear here with their English meanings and pronunciation.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dictionaryEmpty" role="status">No matching words found.</div>
      ) : (
        <div className="dictionaryList" aria-live="polite">
          {filtered.map(entry => {
            const sourceUrl = entry.source?.match(/https?:\/\/\S+/)?.[0];
            return (
              <article className="dictionaryEntry" key={entry.id}>
                <div className="dictionaryEntryHead">
                  <strong lang="enu">{entry.term}</strong>
                  {entry.part_of_speech && <small>{entry.part_of_speech}</small>}
                </div>
                {entry.pronunciation && <span className="dictionaryPronunciation">Pronunciation: {entry.pronunciation}</span>}
                <span>{entry.definition}</span>
                {entry.example_native && (
                  <div className="dictionaryExample">
                    <span lang="enu">{entry.example_native}</span>
                    {entry.example_en && <span>{entry.example_en}</span>}
                  </div>
                )}
                {sourceUrl && <a className="dictionarySource" href={sourceUrl} target="_blank" rel="noreferrer">Source reference</a>}
                {entry.source && !sourceUrl && <small className="dictionarySource">Source: {entry.source}</small>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
