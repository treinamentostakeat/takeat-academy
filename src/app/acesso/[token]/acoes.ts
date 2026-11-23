'use server';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { inicioDe, cargoValido } from '@/lib/permissoes';
import { idDoToken, lerTokenDeAcesso } from '@/lib/primeiro-acesso';
import { iniciarSessao } from '@/lib/sessao';

export type EstadoAcesso = { erro?: string; campo?: 'nova' | 'confirma' } | null;

/** Cria a senha pelo link de primeiro acesso e já entra. O link deixa de valer na hora (a senha mudou). */
export async function criarSenhaPeloLink(token: string, _prev: EstadoAcesso, form: FormData): Promise<EstadoAcesso> {
  const nova = String(form.get('nova') || '');
  const confirma = String(form.get('confirma') || '');
  if (nova.length < 8) return { erro: 'A senha precisa ter pelo menos 8 caracteres.', campo: 'nova' };
  if (nova.length > 200) return { erro: 'A senha é longa demais.', campo: 'nova' };
  if (nova !== confirma) return { erro: 'A confirmação não é igual à senha.', campo: 'confirma' };

  const id = idDoToken(token);
  const u = id ? await db.usuario.findUnique({ where: { id }, select: { id: true, cargo: true, ativo: true, senhaHash: true } }) : null;
  if (!u || !u.ativo || !lerTokenDeAcesso(token, () => u.senhaHash)) return { erro: 'Este link venceu ou já foi usado. Entre com seu e-mail e senha, ou peça um novo link ao RH.' };

  await db.usuario.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(nova, 10), trocarSenha: false } });
  await iniciarSessao(u.id);
  redirect(inicioDe(cargoValido(u.cargo)));
}
