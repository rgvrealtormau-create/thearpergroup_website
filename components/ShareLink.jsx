'use client';

import { useState } from 'react';
import { shareCopy } from '../lib/content';

// "Share a link to these numbers" for any calculator. href is the calculator's own page
// with its inputs in the URL fragment (see lib/calcHandoff.js). On a phone this opens the
// share sheet, so the link can go straight into a text; elsewhere it copies the link.
export default function ShareLink({ lang, href, className = '' }) {
  const t = shareCopy[lang] ?? shareCopy.en;
  const [copied, setCopied] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  async function onClick() {
    const url = window.location.origin + href;
    setManualUrl('');
    if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return; // share sheet dismissed
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setManualUrl(url); // no clipboard access: show the link to copy by hand
    }
  }

  return (
    <div className={className}>
      <button type="button" onClick={onClick} className="text-left text-sm font-medium text-petrol link-underline">
        {copied ? t.copied : t.share}
      </button>
      <span aria-live="polite" className="sr-only">{copied ? t.copied : ''}</span>
      {manualUrl && (
        <label className="mt-2 grid gap-1 text-xs text-ink/60">
          <span>{t.manual}</span>
          <input
            readOnly
            value={manualUrl}
            onFocus={(e) => e.target.select()}
            className="w-full rounded-sm border border-black/20 bg-white px-2 py-1.5 text-ink"
          />
        </label>
      )}
    </div>
  );
}
