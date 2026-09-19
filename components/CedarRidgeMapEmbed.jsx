'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const BUILDHERE_ORIGIN = 'https://subdivision-plat-app.vercel.app';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COPY = {
  en: { inventory: 'View full inventory', help: 'Choose a lot on the map for current details.' },
  es: { inventory: 'Ver inventario completo', help: 'Selecciona un lote en el mapa para ver los detalles actuales.' },
};

export default function CedarRidgeMapEmbed({ baseUrl, embedTitle, inventoryPath, lang = 'en' }) {
  const copy = COPY[lang] || COPY.en;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);
  const requestedLot = searchParams.get('lot');
  const initialLotId = UUID_RE.test(requestedLot || '') ? requestedLot : null;
  const [selectedLotId, setSelectedLotId] = useState(initialLotId);

  const iframeSrc = useMemo(() => {
    const url = new URL(baseUrl);
    url.searchParams.set('embed', '1');
    url.searchParams.set('view', 'explorer');
    if (initialLotId) url.searchParams.set('lot', initialLotId);
    return url.toString();
  }, [baseUrl, initialLotId]);

  const fullInventoryHref = selectedLotId
    ? `${inventoryPath}?lot=${encodeURIComponent(selectedLotId)}`
    : inventoryPath;

  useEffect(() => {
    function receive(event) {
      if (event.origin !== BUILDHERE_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.source !== 'BUILDHERE' || message.version !== 1) return;

      if (message.type === 'BUILDHERE_READY' && selectedLotId) {
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'BUILDHERE_PARENT', version: 1, type: 'BUILDHERE_SELECT_LOT', lotId: selectedLotId },
          BUILDHERE_ORIGIN,
        );
      }

      if (message.type === 'BUILDHERE_LOT_SELECTED') {
        const lotId = typeof message.lotId === 'string' && UUID_RE.test(message.lotId) ? message.lotId : null;
        setSelectedLotId(lotId);
        const url = new URL(window.location.href);
        if (lotId) url.searchParams.set('lot', lotId);
        else url.searchParams.delete('lot');
        url.pathname = pathname;
        url.hash = 'availability';
        window.history.replaceState(null, '', url);
        window.dispatchEvent(new CustomEvent('cedar-ridge:lot-selected', { detail: { lotId } }));
      }
    }

    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [pathname, selectedLotId]);

  return (
    <div className="mt-8">
      <p className="mb-3 text-sm text-crivory/65">{copy.help}</p>
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title={embedTitle}
        loading="eager"
        allowFullScreen
        width="100%"
        height={760}
        className="h-[620px] w-full rounded-sm border border-crivory/15 bg-white md:h-[760px]"
      />
      <div className="mt-6 flex justify-center">
        <a
          href={fullInventoryHref}
          className="inline-flex items-center justify-center rounded-sm bg-crbrass px-6 py-3 text-sm font-semibold text-crnavy transition-colors hover:bg-[#c49a5e]"
        >
          {copy.inventory} →
        </a>
      </div>
    </div>
  );
}
