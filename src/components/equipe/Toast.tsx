'use client';
import { useEffect, useState } from 'react';
import './equipe-comp.css';

/* Toast da área da equipe (classe .toast de sala.css). Chame toast('…') de qualquer componente cliente
   e coloque <Toaster /> uma vez na página. */

type Msg = { id: number; texto: string; icone: string };
const ouvintes = new Set<(m: Msg) => void>();
let seq = 0;

export function toast(texto: string, icone = 'check_circle') {
  const m = { id: ++seq, texto, icone };
  ouvintes.forEach((f) => f(m));
}

export function Toaster() {
  const [msg, setMsg] = useState<Msg | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | undefined;
    const f = (m: Msg) => {
      setMsg(m);
      setOn(true);
      clearTimeout(t1);
      t1 = setTimeout(() => setOn(false), 4200);
    };
    ouvintes.add(f);
    return () => { ouvintes.delete(f); clearTimeout(t1); };
  }, []);
  return (
    <div className={`toast eq-toast${on ? ' on' : ''}`} role="status" aria-live="polite" style={{ '--chrome': '64px' } as React.CSSProperties}>
      {msg && <><span className="icon">{msg.icone}</span><span>{msg.texto}</span></>}
    </div>
  );
}
