'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Reads ?lot=<uuid> from a BuildHere QR code and hands it to the embed so it
// opens with that lot pre-selected — via the URL on first load, and via a
// postMessage handshake as a fallback in case BuildHere is already up and
// running before it emits BUILDHERE_READY. BuildHere stays the only source
// of lot data; nothing about the lot beyond its id passes through this page.
export default function CedarRidgeAvailabilityMap({ baseUrl, embedTitle }) {
  const searchParams = useSearchParams();
  const iframeRef = useRef(null);

  const rawLot = searchParams.get('lot');
  const lotId = rawLot && UUID_RE.test(rawLot) ? rawLot : null;
  const origin = useMemo(() => new URL(baseUrl).origin, [baseUrl]);

  const src = useMemo(() => {
    const url = new URL(baseUrl);
    url.searchParams.set('embed', '1');
    if (lotId) url.searchParams.set('lot', lotId);
    return url.toString();
  }, [baseUrl, lotId]);

  useEffect(() => {
    if (!lotId) return;

    function onMessage(event) {
      if (event.origin !== origin) return;
      const frame = iframeRef.current;
      if (!frame || event.source !== frame.contentWindow) return;
      if (event.data?.type !== 'BUILDHERE_READY') return;

      frame.contentWindow.postMessage(
        { source: 'BUILDHERE_PARENT', version: 1, type: 'BUILDHERE_SELECT_LOT', lotId },
        origin
      );
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [lotId, origin]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={embedTitle}
      loading="lazy"
      allowFullScreen
      width="100%"
      height={800}
      className="mt-8 w-full rounded-xl border-0"
    />
  );
}
