'use server';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { refresh } from 'next/cache';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/sessao';

export type ResultadoUsuario = { ok: true; msg: string; senha?: string; email?: string } | { ok: false; erro: string; campo?: 'nome' | 'email' };

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
/** Senha provisória aleatória (12 caracteres, sem letras/números que se confundem) */
const senhaProvisoria = () => Array.from({ length: 12 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');

const Cargo = z.enum(['gestor', 'instrutor']);
const NovoSchema = z.object({
  nome: z.string().trim().min(3, 'Informe nome e sobrenome.').max(80),
  email: z.email('Informe um e-mail válido.').trim().toLowerCase(),
  cargo: Cargo,
});

export async function criarUsuario(dados: z.input<typeof NovoSchema>): Promise<ResultadoUsuario> {
  await exigirUsuario({ gestor: true });
  const p = NovoSchema.safeParse({ ...dados, email: String(dados.email || '').trim().toLowerCase() });
  if (!p.success) {
    const i = p.error.issues[0];
    return { ok: false, erro: i.message, campo: i.path[0] === 'nome' ? 'nome' : 'email' };
  }
  if (await db.usuario.findUnique({ where: { email: p.data.email } })) return { ok: false, erro: 'Este e-mail já está na equipe.', campo: 'email' };
  const senha = senhaProvisoria();
  await db.usuario.create({ data: { nome: p.data.nome, email: p.data.email, cargo: p.data.cargo, senhaHash: await bcrypt.hash(senha, 10) } });
  refresh();
  return { ok: true, msg: `${p.data.nome} foi adicionado à equipe.`, senha, email: p.data.email };
}

/** Ações sobre outra pessoa: nunca sobre si mesmo. */
async function alvo(id: string) {
  const eu = await exigirUsuario({ gestor: true });
  if (id === eu.id) return { erro: 'Você não pode mudar a própria conta por aqui. Use Minha conta.' } as const;
  const u = await db.usuario.findUnique({ where: { id } });
  if (!u) return { erro: 'Usuário não encontrado.' } as const;
  return { u } as const;
}
const ultimoGestor = async (id: string) =>
  (await db.usuario.count({ where: { cargo: 'gestor', ativo: true, id: { not: id } } })) === 0;

export async function trocarCargo(id: string, cargo: string): Promise<ResultadoUsuario> {
  const a = await alvo(id);
  if ('erro' in a) return { ok: false, erro: a.erro! };
  const c = Cargo.safeParse(cargo);
  if (!c.success) return { ok: false, erro: 'Cargo inválido.' };
  if (a.u.cargo === c.data) return { ok: true, msg: 'Nada mudou: o cargo é o mesmo.' };
  if (a.u.cargo === 'gestor' && a.u.ativo && (await ultimoGestor(id))) return { ok: false, erro: 'A equipe precisa de pelo menos um gestor ativo.' };
  await db.usuario.update({ where: { id }, data: { cargo: c.data } });
  refresh();
  return { ok: true, msg: `${a.u.nome} agora é ${c.data === 'gestor' ? 'Gestor' : 'Instrutor'}.` };
}

export async function gerarNovaSenha(id: string): Promise<ResultadoUsuario> {
  const a = await alvo(id);
  if ('erro' in a) return { ok: false, erro: a.erro! };
  if (!a.u.ativo) return { ok: false, erro: 'Reative a pessoa antes de gerar uma senha.' };
  const senha = senhaProvisoria();
  await db.usuario.update({ where: { id }, data: { senhaHash: await bcrypt.hash(senha, 10) } });
  return { ok: true, msg: `Nova senha provisória gerada para ${a.u.nome}. A senha anterior deixou de valer.`, senha, email: a.u.email };
}

export async function definirAtivo(id: string, ativo: boolean): Promise<ResultadoUsuario> {
  const a = await alvo(id);
  if ('erro' in a) return { ok: false, erro: a.erro! };
  if (a.u.ativo === ativo) return { ok: true, msg: 'Nada mudou.' };
  if (!ativo && a.u.cargo === 'gestor' && (await ultimoGestor(id))) return { ok: false, erro: 'A equipe precisa de pelo menos um gestor ativo.' };
  await db.usuario.update({ where: { id }, data: { ativo } });
  refresh();
  return { ok: true, msg: ativo ? `${a.u.nome} pode acessar a área da equipe de novo.` : `${a.u.nome} foi desativado. O histórico foi mantido.` };
}
