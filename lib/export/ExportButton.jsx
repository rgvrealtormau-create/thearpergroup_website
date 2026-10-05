'use client';

import { useState } from 'react';
import { exportCopy } from '../content';

// "Download PDF" for any calculator. getPayload() runs only on click, and the PDF
// library is loaded with a dynamic import at the same moment, so neither touches
// the page's initial bundle. Nothing leaves the visitor's browser.
export default function ExportButton({ lang, getPayload, className = '' }) {
  const t = exportCopy[lang] ?? exportCopy.en;
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setBusy(true);
    setFailed(false);
    try {
      const { downloadPdf } = await import('./pdf');
      await downloadPdf(getPayload());
    } catch (err) {
      console.error('PDF export failed', err);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="w-full rounded-sm border border-petrol px-5 py-2.5 text-sm font-medium text-petrol hover:bg-petrol hover:text-cream disabled:opacity-60"
      >
        {busy ? t.preparing : t.download}
      </button>
      <p className="mt-2 text-center text-xs text-ink/50">{t.privacy}</p>
      {failed && <p className="mt-2 text-sm text-red-700">{t.error}</p>}
    </div>
  );
}
