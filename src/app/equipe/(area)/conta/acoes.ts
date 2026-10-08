'use server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/sessao';

export type EstadoSenha = { ok?: boolean; erro?: string; campo?: 'atual' | 'nova' | 'confirma' } | null;

/** Troca a própria senha (qualquer cargo). */
export async function trocarSenha(_prev: EstadoSenha, form: FormData): Promise<EstadoSenha> {
  const eu = await exigirUsuario();
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
  await db.usuario.update({ where: { id: eu.id }, data: { senhaHash: await bcrypt.hash(nova, 10) } });
  return { ok: true };
}
