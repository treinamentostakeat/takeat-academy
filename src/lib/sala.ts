'use server';
import { z } from 'zod';
import { db } from './db';
import { usuarioAtual } from './sessao';
import { livekitAtivo, liberarFala, encerrarSala } from './integracoes/livekit';
import { finalizarTurma } from './presenca';
import { demoFechar, demoSair, livekitMao, quemNaSala, salaDemo } from './sala-servidor';

/* Server Actions da sala de aula ao vivo.
   Mãos levantadas (levantarMao): com LiveKit viram o atributo "mao" do participante, gravado pelo servidor;
   todos recebem a mudança em tempo real e a mão some sozinha quando a pessoa sai da sala. Sem LiveKit
   (modo demonstração) ficam na memória do servidor. Chat: com LiveKit usa o chat do próprio LiveKit
   (canal de dados, direto entre navegadores); no modo demonstração, enviarMensagem(). */

type Resultado = { ok: true } | { ok: false; erro: string };
const id = z.string().min(1).max(64);
const papel = z.enum(['cliente', 'instrutor']);
const falha = (erro: string): Resultado => ({ ok: false, erro });

async function exigirEquipe() {
  const u = await usuarioAtual();
  if (!u) throw new Error('Entre com sua conta da equipe.');
  return u;
}

/** Cliente levanta ou abaixa a mão */
export async function levantarMao(turmaId: string, levantar: boolean): Promise<Resultado> {
  if (!id.safeParse(turmaId).success) return falha('Aula inválida.');
  const eu = await quemNaSala(turmaId, 'cliente');
  if (!eu) return falha('Você não está inscrito nesta aula.');
  if (livekitAtivo()) {
    try { await livekitMao(turmaId, eu.identidade, levantar); return { ok: true }; }
    catch { return falha('Não foi possível levantar a mão. Confira sua conexão e tente de novo.'); }
  }
  const s = salaDemo(turmaId);
  s.maos = s.maos.filter((m) => m.id !== eu.identidade);
  if (levantar && s.falando !== eu.identidade) s.maos.push({ id: eu.identidade, at: Date.now() });
  return { ok: true };
}

/** Mensagem no chat (modo demonstração) */
export async function enviarMensagem(turmaId: string, comoPapel: 'cliente' | 'instrutor', texto: string): Promise<Resultado> {
  const p = z.object({ turmaId: id, papel, texto: z.string().trim().min(1).max(300) }).safeParse({ turmaId, papel: comoPapel, texto });
  if (!p.success) return falha('Escreva uma mensagem de até 300 caracteres.');
  const eu = await quemNaSala(turmaId, p.data.papel);
  if (!eu) return falha('Você não está nesta aula.');
  const s = salaDemo(turmaId);
  s.msgs.push({ id: ++s.seq, de: eu.identidade, nome: eu.nome, restaurante: eu.restaurante, host: eu.papel === 'instrutor', at: Date.now(), tx: p.data.texto });
  if (s.msgs.length > 300) s.msgs.splice(0, s.msgs.length - 300);
  return { ok: true };
}

/** Instrutora libera o microfone (e a tela) de quem levantou a mão. Conta +1 em "dúvidas tiradas". */
export async function liberarMicrofone(turmaId: string, identidade: string, anterior?: string | null): Promise<Resultado> {
  if (!id.safeParse(turmaId).success || !id.safeParse(identidade).success) return falha('Pedido inválido.');
  await exigirEquipe();
  try {
    if (livekitAtivo()) {
      if (anterior && anterior !== identidade) await liberarFala(turmaId, anterior, false).catch(() => {});
      await liberarFala(turmaId, identidade, true);
      await livekitMao(turmaId, identidade, false).catch(() => {});
    } else {
      const s = salaDemo(turmaId);
      if (!s.pessoas.has(identidade)) return falha('Essa pessoa saiu da aula.');
      s.maos = s.maos.filter((m) => m.id !== identidade);
      s.falando = identidade;
    }
  } catch {
    return falha('Não foi possível liberar o microfone. A pessoa pode ter saído da aula.');
  }
  await db.turma.update({ where: { id: turmaId }, data: { maosLiberadas: { increment: 1 } } });
  return { ok: true };
}

/** Instrutora encerra a fala de alguém (o microfone do cliente desliga) */
export async function encerrarFala(turmaId: string, identidade: string): Promise<Resultado> {
  if (!id.safeParse(turmaId).success || !id.safeParse(identidade).success) return falha('Pedido inválido.');
  await exigirEquipe();
  return recolher(turmaId, identidade);
}

/** Cliente avisa que terminou de falar */
export async function terminarMinhaFala(turmaId: string): Promise<Resultado> {
  if (!id.safeParse(turmaId).success) return falha('Aula inválida.');
  const eu = await quemNaSala(turmaId, 'cliente');
  if (!eu) return falha('Você não está inscrito nesta aula.');
  return recolher(turmaId, eu.identidade);
}

async function recolher(turmaId: string, identidade: string): Promise<Resultado> {
  try {
    if (livekitAtivo()) await liberarFala(turmaId, identidade, false);
    else { const s = salaDemo(turmaId); if (s.falando === identidade) s.falando = null; }
    return { ok: true };
  } catch {
    return { ok: true }; // a pessoa já saiu da sala: não há o que recolher
  }
}

/** Saída da sala (botão "Sair"): grava saiuEm do cliente */
export async function registrarSaida(turmaId: string, comoPapel: 'cliente' | 'instrutor'): Promise<Resultado> {
  if (!id.safeParse(turmaId).success || !papel.safeParse(comoPapel).success) return falha('Pedido inválido.');
  const eu = await quemNaSala(turmaId, comoPapel);
  if (!eu) return { ok: true };
  if (!livekitAtivo()) demoSair(turmaId, eu.identidade);
  if (eu.inscricaoId) await db.inscricao.update({ where: { id: eu.inscricaoId }, data: { saiuEm: new Date() } });
  return { ok: true };
}

/** Avaliação do cliente no fim da aula (1 a 5 estrelas + comentário opcional) */
export async function salvarAvaliacao(turmaId: string, nota: number, comentario: string): Promise<Resultado> {
  const p = z.object({ turmaId: id, nota: z.number().int().min(1).max(5), comentario: z.string().trim().max(1000) }).safeParse({ turmaId, nota, comentario });
  if (!p.success) return falha('Escolha de 1 a 5 estrelas para enviar.');
  const eu = await quemNaSala(turmaId, 'cliente');
  if (!eu?.inscricaoId) return falha('Não encontramos sua inscrição nesta aula.');
  await db.inscricao.update({ where: { id: eu.inscricaoId }, data: { nota: p.data.nota, comentario: p.data.comentario || null } });
  return { ok: true };
}

/** Instrutora encerra a aula: fecha a sala, marca presença (quem entrou) e avisa o HubSpot */
export async function encerrarAula(turmaId: string): Promise<Resultado> {
  if (!id.safeParse(turmaId).success) return falha('Aula inválida.');
  await exigirEquipe();
  const t = await db.turma.findUnique({ where: { id: turmaId }, select: { id: true } });
  if (!t) return falha('Aula não encontrada.');
  await finalizarTurma(turmaId);
  if (livekitAtivo()) await encerrarSala(turmaId);
  else demoFechar(turmaId);
  return { ok: true };
}
