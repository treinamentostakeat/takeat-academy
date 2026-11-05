/* Os 6 temas das aulas ao vivo. Cores vêm dos tokens (tokens.css); ícones são SVG de traço (24×24). */
import type { CSSProperties } from 'react';

export const TEMAS = [
  'Salão/Balcão',
  'Delivery',
  'Cardápio',
  'Configuração do sistema',
  'Financeiro',
  'CRM/Cashback',
] as const;

export type Tema = (typeof TEMAS)[number];

type InfoTema = { cor: string; tint: string; descricao: string; icone: string; slug: string };

export const TEMA: Record<Tema, InfoTema> = {
  'Salão/Balcão': {
    cor: 'var(--brand)', tint: 'var(--brand-tint)', slug: 'salao-balcao',
    descricao: 'Vendas e configuração do salão e do balcão',
    icone: '<path d="M3 19h18"/><path d="M4.5 16.5h15"/><path d="M5.5 16.5a6.5 6.5 0 0 1 13 0"/><path d="M12 10V8.5"/><circle cx="12" cy="7" r="1.25"/>',
  },
  Delivery: {
    cor: 'var(--orange)', tint: 'var(--orange-tint)', slug: 'delivery',
    descricao: 'Vendas e configuração do delivery',
    icone: '<path d="M7.5 9h11l-1.2 11H8.7z"/><path d="M10 9V7.5a3 3 0 0 1 6 0V9"/><path d="M2.5 12.5h3"/><path d="M1.5 15.5h4"/><path d="M3 18.5h3"/>',
  },
  'Cardápio': {
    cor: 'var(--yellow-ink)', tint: 'var(--yellow-tint)', slug: 'cardapio',
    descricao: 'Produtos, estoque e fiscal',
    icone: '<path d="M5 4.5h12.5A1.5 1.5 0 0 1 19 6v14H6.5A1.5 1.5 0 0 1 5 18.5z"/><path d="M5 18.5A1.5 1.5 0 0 1 6.5 17H19"/><path d="M9 8.5h6"/><path d="M9 11.5h6"/><path d="M9 14h3.5"/>',
  },
  'Configuração do sistema': {
    cor: 'var(--blue)', tint: 'var(--blue-tint)', slug: 'configuracao-do-sistema',
    descricao: 'Cadastro de funções e ajustes do sistema',
    icone: '<path d="M4 6.5h9"/><path d="M17 6.5h3"/><circle cx="15" cy="6.5" r="2"/><path d="M4 12h3"/><path d="M11 12h9"/><circle cx="9" cy="12" r="2"/><path d="M4 17.5h11"/><path d="M19 17.5h1"/><circle cx="17" cy="17.5" r="2"/>',
  },
  Financeiro: {
    cor: 'var(--green)', tint: 'var(--green-tint)', slug: 'financeiro',
    descricao: 'Caixa e gestão financeira do restaurante',
    icone: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01"/><path d="M17.5 14.5h.01"/>',
  },
  'CRM/Cashback': {
    cor: 'var(--teal)', tint: 'var(--teal-tint)', slug: 'crm-cashback',
    descricao: 'Relacionamento com clientes e cashback',
    icone: '<path d="M20 12a8 8 0 1 1-2.35-5.65"/><path d="M20 4.5v4h-4"/><path d="M12 8.5v7"/><path d="M14.25 10H11a1.25 1.25 0 0 0 0 2.5h2a1.25 1.25 0 0 1 0 2.5H9.75"/>',
  },
};

export const isTema = (t: unknown): t is Tema => typeof t === 'string' && (TEMAS as readonly string[]).includes(t);
export const temaPorSlug = (s: string | null | undefined): Tema | null =>
  (TEMAS.find((t) => TEMA[t].slug === s) as Tema | undefined) ?? null;

/** Estilo inline com as variáveis do tema (usado por .ti e blocos coloridos) */
export const temaVars = (t: string) => {
  const info = TEMA[t as Tema];
  return info ? ({ '--tc': info.cor, '--tt': info.tint } as CSSProperties) : undefined;
};

/** Grade modelo inicial (25 turmas/semana): diaSemana 1–5 → [hora, tema] */
export const GRADE_INICIAL: Record<number, [number, Tema][]> = {
  1: [[9, 'Salão/Balcão'], [11, 'Delivery'], [13, 'Configuração do sistema'], [15, 'Cardápio'], [17, 'CRM/Cashback']],
  2: [[9, 'Financeiro'], [11, 'Salão/Balcão'], [13, 'Delivery'], [15, 'Configuração do sistema'], [17, 'Cardápio']],
  3: [[9, 'Configuração do sistema'], [11, 'Cardápio'], [13, 'Delivery'], [15, 'Salão/Balcão'], [17, 'Financeiro']],
  4: [[9, 'Salão/Balcão'], [11, 'Delivery'], [13, 'CRM/Cashback'], [15, 'Cardápio'], [17, 'Salão/Balcão']],
  5: [[9, 'Delivery'], [11, 'Configuração do sistema'], [13, 'Salão/Balcão'], [15, 'Financeiro'], [17, 'Delivery']],
};

export const HORARIOS = [9, 11, 13, 15, 17] as const;
