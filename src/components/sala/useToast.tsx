'use client';
import { useCallback, useEffect, useState } from 'react';

/* Toast do protótipo (.toast). mostrar() pode ser chamado de eventos; o aviso some sozinho em 3,2 s. */
type T = { id: number; txt: string; icon: string; on: boolean };

export function useToast() {
  const [t, setT] = useState<T | null>(null);
  const mostrar = useCallback((txt: string, icon = 'check_circle') => setT((x) => ({ id: (x?.id ?? 0) + 1, txt, icon, on: true })), []);
  useEffect(() => {
    if (!t?.on) return;
    const h = setTimeout(() => setT((x) => (x && x.id === t.id ? { ...x, on: false } : x)), 3200);
    return () => clearTimeout(h);
  }, [t?.id, t?.on]);
  const el = (
    <div className={`toast${t?.on ? ' on' : ''}`} role="status" aria-live="polite">
      <span className="icon fill">{t?.icon ?? 'check_circle'}</span><span>{t?.txt}</span>
    </div>
  );
  return { el, mostrar };
}
