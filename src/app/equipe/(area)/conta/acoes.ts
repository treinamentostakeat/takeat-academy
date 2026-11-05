'use server';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { inicioDe } from '@/lib/permissoes';
import { usuarioAtual } from '@/lib/sessao';

export type EstadoSenha = { ok?: boolean; destino?: string; erro?: string; campo?: 'atual' | 'nova' | 'confirma' } | null;

/** Troca a própria senha (qualquer cargo). Também encerra a troca obrigatória da senha provisória. */
export async function trocarSenha(_prev: EstadoSenha, form: FormData): Promise<EstadoSenha> {
  const eu = await usuarioAtual();
  if (!eu) redirect('/interno/entrar');
  const atual = String(form.get('atual') || '');
  const nova = String(form.get('nova') || '');
  const confirma = String(form.get('confirma') || '');
  if (!atual) return { erro: 'Informe a senha atual.', campo: 'atual' };
  if (nova.length < 8) return { erro: 'A nova senha precisa ter pelo menos 8 caracteres.', campo: 'nova' };
  if (nova.length > 200) return { erro: 'A nova senha é longa demais.', campo: 'nova' };
  if (nova !== confirma) return { erro: 'A confirmação não é igual à nova senha.', campo: 'confirma' };
  const u = await db.usuario.findUnique({ where: { id: eu.id } });
  if (!u || !(await bcrypt.compare(atual, u.senhaHash))) return { erro: 'Senha atual incorreta.', campo: 'atual' };
  if (atual === nova) return { erro: 'A nova senha precisa ser diferente da atual.', campo: 'nova' };
  await db.usuario.update({ where: { id: eu.id }, data: { senhaHash: await bcrypt.hash(nova, 10), trocarSenha: false } });
  return { ok: true, destino: inicioDe(eu.cargo) };
}
