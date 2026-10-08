'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef } from 'react';

/* Drawer lateral controlado pela URL (classes .dw de equipe.css).
   Fechar (Esc, X, scrim) troca a URL para `fecharHref` e devolve o foco a quem abriu ([data-abre=<origem>]). */
export function Drawer({ titulo, subtitulo, fecharHref, origem, rodape, children }: {
  titulo: string;
  subtitulo?: string;
  fecharHref: string;
  origem?: string;
  rodape?: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const id = useId();
  const xRef = useRef<HTMLButtonElement>(null);
  const fechar = useCallback(() => router.replace(fecharHref, { scroll: false }), [router, fecharHref]);

  useEffect(() => {
    xRef.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      if (origem) setTimeout(() => document.querySelector<HTMLElement>(`[data-abre="${origem}"]`)?.focus(), 0);
    };
  }, [fechar, origem]);

  return (
    <>
      <div className="dw-scrim" onClick={fechar} />
      <aside className="dw wide" role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="dw-h">
          <div><h2 id={id}>{titulo}</h2>{subtitulo && <p>{subtitulo}</p>}</div>
          <button ref={xRef} type="button" className="xbtn" onClick={fechar} aria-label="Fechar"><span className="icon">close</span></button>
        </div>
        <div className="dw-b">{children}</div>
        {rodape && <div className="dw-f">{rodape}</div>}
      </aside>
    </>
  );
}
