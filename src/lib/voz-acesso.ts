import 'server-only';
import { NextResponse } from 'next/server';
import { db } from './db';
import { ErroElevenLabs } from './integracoes/elevenlabs';
import { podeClonarVoz } from './permissoes';
import { usuarioAtual } from './sessao';

/* Peças das rotas de clonagem de voz: quem pode chamar, respostas de erro e registro de auditoria. */

export const erroVoz = (status: number, erro: string) => NextResponse.json({ erro }, { status, headers: { 'Cache-Control': 'no-store' } });

/** Usuário logado com acesso à clonagem de voz, ou a resposta de erro pronta */
export async function quemPodeVoz() {
  const u = await usuarioAtual();
  if (!u) return { erro: erroVoz(401, 'Entre com sua conta da equipe.') } as const;
  if (u.trocarSenha || !podeClonarVoz(u, process.env.VOZ_ACESSO_EMAILS)) return { erro: erroVoz(403, 'Você não tem acesso à clonagem de voz.') } as const;
  return { u } as const;
}

/** Erro da ElevenLabs vira resposta com a mensagem amigável; o resto vira 500 genérico */
export function respostaDeErro(e: unknown) {
  if (e instanceof ErroElevenLabs) return erroVoz(e.status, e.message);
  return erroVoz(500, 'Não foi possível concluir. Tente de novo.');
}

/** Auditoria: quem clonou, falou ou apagou qual voz (tabela Integracao, canal "elevenlabs") */
export async function registrarVoz(tipo: 'clonagem' | 'fala' | 'exclusao', dados: Record<string, unknown>) {
  await db.integracao.create({ data: { canal: 'elevenlabs', tipo, payload: JSON.stringify({ ...dados, quando: new Date().toISOString() }), status: 'enviado' } }).catch(() => {});
}
