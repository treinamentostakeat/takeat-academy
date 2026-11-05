'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './dropdown.css';

/* Dropdown do Takeat UI Kit (components.md §3): gatilho com visual de Input e lista Simple Dropdown.
   Substitui o <select> nativo, cuja lista aberta é desenhada pelo navegador e não segue o kit.
   A lista vai para o body (portal) para não ser cortada por tabelas, drawers e modais. */

export type Opcao = { value: string; label: string; disabled?: boolean };

export function Dropdown({ value, opcoes, onChange, id, ariaLabel, className = '', tamanho = 'padrao', disabled }: {
  value: string;
  opcoes: Opcao[];
  onChange: (valor: string) => void;
  /** liga o gatilho a um <label htmlFor> */
  id?: string;
  ariaLabel?: string;
  className?: string;
  /** "compacto" = 32px: só para o seletor de linhas da paginação (components.md §5) */
  tamanho?: 'padrao' | 'compacto';
  disabled?: boolean;
}) {
  const listaId = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const lista = useRef<HTMLUListElement>(null);
  const busca = useRef({ texto: '', ate: 0 });
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number } | null>(null);

  const atual = opcoes.find((o) => o.value === value);
  const habilitadas = opcoes.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
  const fechar = useCallback(() => { setAberto(false); setPos(null); }, []);
  const abrir = () => {
    setAtivo(Math.max(0, opcoes.findIndex((o) => o.value === value)));
    setAberto(true);
  };
  const escolher = (i: number) => {
    const o = opcoes[i];
    if (!o || o.disabled) return;
    fechar();
    if (o.value !== value) onChange(o.value);
  };
  const mover = (delta: 1 | -1) => {
    if (!habilitadas.length) return;
    const p = habilitadas.indexOf(ativo);
    const prox = p < 0 ? 0 : (p + delta + habilitadas.length) % habilitadas.length;
    setAtivo(habilitadas[prox]);
  };

  // Abre para baixo; se não couber e houver mais espaço acima, abre para cima
  useEffect(() => {
    if (!aberto) return;
    const medir = () => {
      const r = btn.current!.getBoundingClientRect();
      const margem = 8, folga = 4;
      const abaixo = innerHeight - r.bottom - margem - folga, acima = r.top - margem - folga;
      const alturaLista = lista.current?.scrollHeight ?? 0;
      const paraCima = alturaLista > abaixo && acima > abaixo;
      const largura = Math.max(r.width, 160);
      setPos({
        left: Math.max(margem, Math.min(innerWidth - largura - margem, r.left)),
        width: largura,
        maxHeight: Math.min(320, paraCima ? acima : abaixo),
        ...(paraCima ? { bottom: innerHeight - r.top + folga } : { top: r.bottom + folga }),
      });
    };
    medir();
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (!btn.current?.contains(alvo) && !lista.current?.contains(alvo)) fechar();
    };
    const rolou = (e: Event) => { if (!lista.current?.contains(e.target as Node)) fechar(); };
    document.addEventListener('mousedown', fora);
    window.addEventListener('scroll', rolou, true);
    window.addEventListener('resize', fechar);
    return () => {
      document.removeEventListener('mousedown', fora);
      window.removeEventListener('scroll', rolou, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto, fechar]);

  // Esc fecha só a lista: tratado na captura, antes do modal e do drawer que estão por baixo
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      fechar();
      btn.current?.focus();
    };
    window.addEventListener('keydown', esc, true);
    return () => window.removeEventListener('keydown', esc, true);
  }, [aberto, fechar]);

  useEffect(() => {
    if (aberto && ativo >= 0) lista.current?.children[ativo]?.scrollIntoView({ block: 'nearest' });
  }, [aberto, ativo, pos]);

  const tecla = (e: React.KeyboardEvent) => {
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir(); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); mover(1); break;
      case 'ArrowUp': e.preventDefault(); mover(-1); break;
      case 'Home': e.preventDefault(); if (habilitadas.length) setAtivo(habilitadas[0]); break;
      case 'End': e.preventDefault(); if (habilitadas.length) setAtivo(habilitadas[habilitadas.length - 1]); break;
      case 'Enter': case ' ': e.preventDefault(); escolher(ativo); break;
      case 'Tab': fechar(); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // Digitar as primeiras letras leva à opção, como no select nativo
          const agora = Date.now();
          busca.current = { texto: (agora < busca.current.ate ? busca.current.texto : '') + e.key.toLowerCase(), ate: agora + 700 };
          const i = opcoes.findIndex((o) => !o.disabled && o.label.toLowerCase().startsWith(busca.current.texto));
          if (i >= 0) setAtivo(i);
        }
    }
  };

  return (
    <>
      <button
        ref={btn}
        id={id}
        type="button"
        role="combobox"
        className={`dd-btn${tamanho === 'compacto' ? ' dd-compacto' : ''}${className ? ` ${className}` : ''}`}
        title={atual?.label}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listaId : undefined}
        aria-activedescendant={aberto && ativo >= 0 ? `${listaId}-${ativo}` : undefined}
        disabled={disabled}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={tecla}
      >
        <span className="dd-v">{atual?.label ?? ''}</span>
        <span className="icon dd-seta" aria-hidden="true">expand_more</span>
      </button>
      {aberto && createPortal(
        <ul
          ref={lista}
          id={listaId}
          className="dd-list"
          role="listbox"
          aria-label={ariaLabel}
          style={pos ? { left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.width, maxHeight: pos.maxHeight } : { visibility: 'hidden', left: 0, top: 0 }}
          // Mantém o foco no gatilho e não deixa o clique chegar ao modal ou drawer por baixo
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => e.stopPropagation()}
        >
          {opcoes.map((o, i) => (
            <li
              key={o.value}
              id={`${listaId}-${i}`}
              role="option"
              className={`dd-opt${i === ativo ? ' on' : ''}`}
              aria-selected={o.value === value}
              aria-disabled={o.disabled || undefined}
              onMouseEnter={() => { if (!o.disabled) setAtivo(i); }}
              onClick={() => escolher(i)}
            >
              <span>{o.label}</span>
              {o.value === value && <span className="icon s16" aria-hidden="true">check</span>}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </>
  );
}
