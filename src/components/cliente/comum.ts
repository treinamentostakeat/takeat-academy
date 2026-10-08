/* Tipos e rótulos do lado do cliente (usados no servidor e no navegador). */
import { DIAS, DIAS_CURTOS, MESES, parse, rotuloDia, somaDias } from '@/lib/datas';

export const CANAIS = ['grupo', 'botao', 'avulso'] as const;
export type Canal = (typeof CANAIS)[number];
export const canalDe = (v?: string | null): Canal => ((CANAIS as readonly string[]).includes(v ?? '') ? (v as Canal) : 'avulso');

export type Situacao = 'cancelada' | 'realizada' | 'ao-vivo' | 'agendada';

/** Turma como o navegador do cliente vê */
export type TurmaCli = { id: string; data: string; hora: number; tema: string; sit: Situacao };

/** Como o restaurante está identificado: cookie, CNPJ vindo do link (grupo/botão) ou nada */
export type Ident =
  | { tipo: 'nenhum' }
  | { tipo: 'cookie'; cnpj: string; restaurante: string }
  | { tipo: 'url'; cnpj: string; restaurante: string | null };

/** Tudo o que o diálogo de inscrição precisa */
export type CtxInscricao = {
  hoje: string;
  turmas: TurmaCli[];
  /** turmas em que a pessoa (ou o restaurante, se a pessoa não é conhecida) já está inscrita */
  minhas: string[];
  /** turmaId → código do link pessoal da sala (só da própria pessoa) */
  codigos: Record<string, string>;
  ident: Ident;
  pessoa: { nome: string; whatsapp: string } | null;
  canal: Canal;
};

export type EntradaInscricao = {
  turmaId: string;
  nome: string;
  whatsapp: string;
  canal: string;
  cnpj?: string;
  restaurante?: string;
};
export type CampoInscricao = 'cnpj' | 'restaurante' | 'nome' | 'whatsapp' | 'turma';
export type ResultadoInscricao =
  | { ok: true; codigo: string; mensagem: string }
  | { ok: false; erro: string; campo?: CampoInscricao };

export type ResultadoIdentificar = { ok: boolean; erro?: string; campo?: 'cnpj' | 'restaurante'; precisaNome?: boolean };

/* ---------- Rótulos ---------- */
const amanha = (hoje: string) => somaDias(hoje, 1);
const dm = (iso: string) => { const d = parse(iso); return `${d.getUTCDate()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };

export const faixaH = (h: number) => `${h}h às ${h + 1}h`;
/** "Hoje" · "Amanhã" · "Quinta, 8 de outubro" */
export const tituloDia = (iso: string, hoje: string) => (iso === hoje ? 'Hoje' : iso === amanha(hoje) ? 'Amanhã' : rotuloDia(iso));
/** "hoje" · "amanhã" · "quinta, 8/10" */
export const diaMinusculo = (iso: string, hoje: string) => (iso === hoje ? 'hoje' : iso === amanha(hoje) ? 'amanhã' : `${DIAS[parse(iso).getUTCDay()]}, ${dm(iso)}`);
/** "Qui, 8/10" */
export const diaCurto = (iso: string) => `${DIAS_CURTOS[parse(iso).getUTCDay()]}, ${dm(iso)}`;
/** "Hoje, 15h" · "Amanhã, 9h" · "Sex, 9/10, 11h" */
export const proximaTexto = (iso: string, h: number, hoje: string) =>
  `${iso === hoje ? 'Hoje' : iso === amanha(hoje) ? 'Amanhã' : diaCurto(iso)}, ${h}h`;
/** Para o WhatsApp e o HubSpot: "quinta, 8/10 às 11h" */
export const quandoTexto = (iso: string, h: number) => `${DIAS[parse(iso).getUTCDay()]}, ${dm(iso)} às ${h}h`;
/** Chip de dia no diálogo: "8 out" */
export const diaMes = (iso: string) => { const d = parse(iso); return `${d.getUTCDate()} ${MESES[d.getUTCMonth()].slice(0, 3)}`; };
export const diaSemanaCurto = (iso: string, hoje: string) => (iso === hoje ? 'Hoje' : iso === amanha(hoje) ? 'Amanhã' : DIAS_CURTOS[parse(iso).getUTCDay()]);

/** Monta a URL mantendo canal e CNPJ do link de origem */
export function urlCom(base: string, params: Record<string, string | null | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
