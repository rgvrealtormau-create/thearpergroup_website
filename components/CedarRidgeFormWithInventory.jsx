'use client';

import { useEffect, useState } from 'react';
import CedarRidgeForm from './CedarRidgeForm';

export default function CedarRidgeFormWithInventory({ initialInventory, lang, copy }) {
  const [inventory, setInventory] = useState(initialInventory);

  useEffect(() => {
    if (initialInventory) return undefined;
    let active = true;

    fetch('/api/cedar-ridge-inventory', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data) setInventory(data); })
      .catch(() => {});

    return () => { active = false; };
  }, [initialInventory]);

  return <CedarRidgeForm lang={lang} copy={copy} inventory={inventory} />;
}
