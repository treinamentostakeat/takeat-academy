'use client';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

/* Modal central (classes .md-scrim/.md de equipe.css). Fecha com Esc, X e clique fora.
   Esc é tratado na captura para não fechar também o drawer que está por baixo. */
export function Modal({ titulo, onFechar, children, rodape, foco }: {
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
  rodape: React.ReactNode;
  /** seletor do elemento que recebe o foco ao abrir */
  foco?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  useEffect(() => { fechar.current = onFechar; });
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const alvo = (foco && el?.querySelector<HTMLElement>(foco)) || el?.querySelector<HTMLElement>('input, .dd-btn, textarea, .md-f .btn');
    alvo?.focus();
    const tecla = (e: KeyboardEvent) => {
      // Com uma lista de Dropdown aberta, o Esc fecha só a lista
      if (e.key === 'Escape' && !document.querySelector('.dd-list')) { e.stopPropagation(); fechar.current(); }
    };
    window.addEventListener('keydown', tecla, true);
    return () => {
      window.removeEventListener('keydown', tecla, true);
      if (anterior && document.body.contains(anterior)) anterior.focus();
    };
  }, [foco]);
  return createPortal(
    <div className="md-scrim" ref={ref} onMouseDown={(e) => { if (e.target === e.currentTarget && !document.querySelector('.dd-list')) onFechar(); }}>
      <div className="md" role="dialog" aria-modal="true" aria-labelledby={id}>
        <div className="md-h">
          <h2 id={id}>{titulo}</h2>
          <button type="button" className="xbtn" onClick={onFechar} aria-label="Fechar"><span className="icon">close</span></button>
        </div>
        <div className="md-b">{children}</div>
        <div className="md-f">{rodape}</div>
      </div>
    </div>,
    document.body,
  );
}
