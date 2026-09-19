'use client';

import { useCallback, useEffect, useState } from 'react';
import CedarRidgeAvailabilityMap from './CedarRidgeAvailabilityMap';
import CedarRidgeForm from './CedarRidgeForm';

const COPY = {
  en: { loading: 'Loading current inventory…', retry: 'Try again' },
  es: { loading: 'Cargando el inventario actual…', retry: 'Intentar de nuevo' },
};

export default function CedarRidgeInventoryExperience({ initialInventory, lang, communityCopy, embedUrl, unavailableMessage }) {
  const [inventory, setInventory] = useState(initialInventory);
  const [loading, setLoading] = useState(!initialInventory);
  const [failed, setFailed] = useState(false);
  const copy = COPY[lang] || COPY.en;

  const loadInventory = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch('/api/cedar-ridge-inventory', { cache: 'no-store' });
      if (!response.ok) throw new Error('Inventory request failed');
      setInventory(await response.json());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialInventory) loadInventory();
  }, [initialInventory, loadInventory]);

  return (
    <>
      <section id="availability" className="scroll-mt-16 bg-crnavy text-crivory">
        <div className="wrap pb-16 md:pb-24">
          {inventory ? (
            <CedarRidgeAvailabilityMap baseUrl={embedUrl} embedTitle={communityCopy.availability.embedTitle} inventory={inventory} lang={lang} />
          ) : (
            <div className="rounded-sm border border-dashed border-crivory/25 bg-crivory/5 px-6 py-16 text-center text-crivory/70" aria-live="polite">
              <p>{loading ? copy.loading : unavailableMessage}</p>
              {failed ? (
                <button type="button" onClick={loadInventory} className="mt-4 rounded-sm border border-crivory/30 px-4 py-2 text-sm text-crivory hover:border-crivory">
                  {copy.retry}
                </button>
              ) : null}
            </div>
          )}
          <p className="mt-6 max-w-3xl text-xs text-crivory/50">{communityCopy.availability.estimateNote}</p>
        </div>
      </section>

      <section id="contact" className="scroll-mt-16 bg-crivory">
        <div className="wrap grid gap-10 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-crbrass">{communityCopy.contact.eyebrow}</p>
            <h2 className="mt-3 font-crserif text-3xl md:text-5xl">{communityCopy.contact.title}</h2>
            <p className="mt-4 max-w-sm text-crnavy/70">{communityCopy.contact.lede}</p>
            <div className="mt-8 space-y-1 text-sm text-crnavy/70">
              <p>Mauricio · (956) 517-5223</p>
              <p>Pamela · (956) 414-6128</p>
              <p>The Arper Group · 4900 N 10th St Ste. B4, McAllen, TX 78504</p>
              <p>rgvrealtormau@gmail.com</p>
            </div>
          </div>
          <CedarRidgeForm lang={lang} copy={communityCopy.contact} inventory={inventory} />
        </div>
      </section>
    </>
  );
}
