import 'server-only';
import { db } from './db';
import { agora, faixa, hoje, rotuloDia, salaAberta } from './datas';
import { clienteAtual, usuarioAtual } from './sessao';
import { RoomServiceClient } from 'livekit-server-sdk';
import { nomeSala } from './integracoes/livekit';

/* Sala de aula ao vivo: quem está chamando, regras de entrada e o estado do modo demonstração.
   As Server Actions ficam em ./sala.ts; aqui só funções de servidor reaproveitadas por páginas, rotas e ações. */

export type PapelSala = 'cliente' | 'instrutor';

type TurmaBase = { id: string; data: string; hora: number; tema: string; status: string; iniciadaEm: Date | null; encerradaEm: Date | null };

/** Identidade no LiveKit e no modo demonstração: c_<inscrição> para cliente, u_<usuário> para a equipe */
export const identidadeCliente = (inscricaoId: string) => `c_${inscricaoId}`;
export const identidadeEquipe = (usuarioId: string) => `u_${usuarioId}`;

/** Inscrição do cliente identificado neste aparelho para a turma (prefere a pessoa do WhatsApp do cookie) */
export async function inscricaoDoCliente(turmaId: string) {
  const c = await clienteAtual();
  if (!c) return null;
  const lista = await db.inscricao.findMany({
    where: { turmaId, restauranteId: c.restauranteId },
    include: { restaurante: true },
    orderBy: { criadoEm: 'asc' },
  });
  return lista.find((i) => c.whatsapp && i.whatsapp === c.whatsapp) ?? lista[0] ?? null;
}

/** Resolve quem está chamando nesta turma, no papel pedido. null = não pode. */
export async function quemNaSala(turmaId: string, papel: PapelSala) {
  if (papel === 'instrutor') {
    const u = await usuarioAtual();
    if (!u) return null;
    return { papel, identidade: identidadeEquipe(u.id), nome: u.nome, restaurante: 'Takeat', inscricaoId: null as string | null, usuario: u };
  }
  const i = await inscricaoDoCliente(turmaId);
  if (!i) return null;
  return { papel, identidade: identidadeCliente(i.id), nome: i.nome, restaurante: i.restaurante.nome, inscricaoId: i.id as string | null, usuario: null };
}

/** Pode conectar agora: sala aberta (10 min antes até o fim) ou aula já iniciada hoje e não encerrada */
export function podeEntrar(t: TurmaBase) {
  if (t.status === 'cancelada' || t.encerradaEm) return false;
  return salaAberta(t) || (!!t.iniciadaEm && t.data === hoje());
}

/** Rótulo do horário para cabeçalhos: "Hoje · 13h às 14h" ou "Qui, 8 de outubro · 13h às 14h" */
export function rotuloHorario(t: { data: string; hora: number }) {
  return `${t.data === hoje() ? 'Hoje' : rotuloDia(t.data)} · ${faixa(t.hora)}`;
}
export const quandoTexto = (t: { data: string; hora: number }) => `${rotuloDia(t.data)}, ${faixa(t.hora)}`;

/** Segundos do relógio das aulas até data/hora (negativo se já passou). Respeita RELOGIO. */
export function segundosAte(data: string, hora: number) {
  let hoje_: string, seg: number;
  if (process.env.RELOGIO) {
    const a = agora();
    hoje_ = a.data; seg = Math.round(a.hora * 3600);
  } else {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date())
      .reduce<Record<string, string>>((acc, x) => ((acc[x.type] = x.value), acc), {});
    hoje_ = `${p.year}-${p.month}-${p.day}`;
    seg = Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second);
  }
  const dias = (Date.parse(data + 'T00:00:00Z') - Date.parse(hoje_ + 'T00:00:00Z')) / 86400e3;
  return Math.round(dias * 86400 + hora * 3600 - seg);
}

/** Números da aula para a tela final da instrutora */
export async function resumoAula(turmaId: string) {
  const t = await db.turma.findUnique({ where: { id: turmaId }, include: { inscricoes: { select: { entrouEm: true, presente: true, nota: true } } } });
  if (!t) return null;
  const notas = t.inscricoes.map((i) => i.nota).filter((n): n is number => n != null);
  const presentes = t.encerradaEm ? t.inscricoes.filter((i) => i.presente).length : t.inscricoes.filter((i) => i.entrouEm).length;
  const duracao = t.iniciadaEm && t.encerradaEm ? Math.max(1, Math.round((t.encerradaEm.getTime() - t.iniciadaEm.getTime()) / 60000)) : null;
  return {
    inscritos: t.inscricoes.length,
    presentes,
    duvidas: t.maosLiberadas,
    duracaoMin: duracao,
    media: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
    respostas: notas.length,
  };
}

/* ------------------------------------------------------------------
   MODO DEMONSTRAÇÃO (sem LIVEKIT_* no .env)
   Chat, mãos e quem está falando ficam na MEMÓRIA DO PROCESSO do servidor (globalThis),
   e as abas consultam por polling (GET /api/sala/estado). Serve para testar e demonstrar
   num servidor só; se o processo reiniciar, o chat e a fila de mãos começam vazios.
   Presença, dúvidas tiradas, encerramento e avaliação vão para o banco de verdade.
   ------------------------------------------------------------------ */

export type PessoaDemo = { id: string; nome: string; restaurante: string; papel: PapelSala; visto: number };
export type MsgDemo = { id: number; de: string; nome: string; restaurante: string; host: boolean; at: number; tx: string };
type SalaDemo = { pessoas: Map<string, PessoaDemo>; maos: { id: string; at: number }[]; falando: string | null; msgs: MsgDemo[]; seq: number };

const AUSENTE_MS = 12_000; // sem consultar o estado por 12 s = saiu da sala
const g = globalThis as unknown as { __salasDemo?: Map<string, SalaDemo> };
const salas = () => (g.__salasDemo ??= new Map<string, SalaDemo>());

export function salaDemo(turmaId: string) {
  let s = salas().get(turmaId);
  if (!s) { s = { pessoas: new Map(), maos: [], falando: null, msgs: [], seq: 0 }; salas().set(turmaId, s); }
  // Limpa quem fechou a aba: sai da lista, da fila de mãos e perde a fala
  const limite = Date.now() - AUSENTE_MS;
  for (const [id, p] of s.pessoas) if (p.visto < limite) s.pessoas.delete(id);
  s.maos = s.maos.filter((m) => s!.pessoas.has(m.id));
  if (s.falando && !s.pessoas.has(s.falando)) s.falando = null;
  return s;
}

export function demoVisto(turmaId: string, p: Omit<PessoaDemo, 'visto'>) {
  const s = salaDemo(turmaId);
  s.pessoas.set(p.id, { ...p, visto: Date.now() });
  return s;
}

/** Aula encerrada: libera a memória da sala (quem ainda consulta vê encerradaEm no banco) */
export const demoFechar = (turmaId: string) => { salas().delete(turmaId); };

export function demoSair(turmaId: string, id: string) {
  const s = salaDemo(turmaId);
  s.pessoas.delete(id);
  s.maos = s.maos.filter((m) => m.id !== id);
  if (s.falando === id) s.falando = null;
}

/* ------------------------------------------------------------------
   LIVEKIT: mão levantada = atributo "mao" (timestamp do servidor) no participante.
   Quem grava é o servidor (RoomService), não o navegador: a ordem da fila usa um relógio só,
   e não depende da permissão canUpdateMetadata do cliente (que liberarFala() não repassa).
   ------------------------------------------------------------------ */
const roomService = () => new RoomServiceClient(process.env.LIVEKIT_URL!.replace(/^wss?:/, 'https:'), process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);

export async function livekitMao(turmaId: string, identidade: string, levantar: boolean) {
  await roomService().updateParticipant(nomeSala(turmaId), identidade, { attributes: { mao: levantar ? String(Date.now()) : '' } });
}
