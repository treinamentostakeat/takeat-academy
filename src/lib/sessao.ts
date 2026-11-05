import 'server-only';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { aposFalhaDeLogin, cargoValido, ehEquipe, inicioDe, podeEditarConteudo, podeGerirPessoas, type Cargo } from './permissoes';
import { abrir, selar } from './selo';

export { abrir, selar };

/* Pessoas com conta (equipe, RH, colaborador): sessão de login. Cliente: restaurante identificado pelo CNPJ (sem senha). */

const COOKIE_EQUIPE = 'academy_equipe';
const COOKIE_CLIENTE = 'academy_cliente';
const opcoes = (dias: number) => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: dias * 86400 });

/* ---------- Pessoas com conta ---------- */
export type { Cargo };
export type UsuarioSessao = { id: string; nome: string; email: string; cargo: Cargo; trocarSenha: boolean };

export async function entrar(email: string, senha: string): Promise<UsuarioSessao | null> {
  const u = await db.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!u || !u.ativo) return null;
  if (u.bloqueadoAte && u.bloqueadoAte > new Date()) return null;
  if (!(await bcrypt.compare(senha, u.senhaHash))) {
    await db.usuario.update({ where: { id: u.id }, data: aposFalhaDeLogin(u.falhasLogin, new Date()) });
    return null;
  }
  await db.usuario.update({ where: { id: u.id }, data: { ultimoAcesso: new Date(), falhasLogin: 0, bloqueadoAte: null } });
  (await cookies()).set(COOKIE_EQUIPE, selar({ id: u.id, exp: Date.now() + 14 * 86400e3 }), opcoes(14));
  return { id: u.id, nome: u.nome, email: u.email, cargo: cargoValido(u.cargo), trocarSenha: u.trocarSenha };
}
export async function sair() { (await cookies()).delete(COOKIE_EQUIPE); }

export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  await connection(); // sessão e validade dependem da hora do pedido
  const s = abrir<{ id: string; exp: number }>((await cookies()).get(COOKIE_EQUIPE)?.value);
  if (!s || s.exp < Date.now()) return null;
  const u = await db.usuario.findUnique({ where: { id: s.id } });
  if (!u || !u.ativo) return null;
  return { id: u.id, nome: u.nome, email: u.email, cargo: cargoValido(u.cargo), trocarSenha: u.trocarSenha };
}

/** Use no topo de páginas e ações da equipe. Quem não é da equipe vai para a área interna. gestor=true restringe ao gestor. */
export async function exigirUsuario(opts: { gestor?: boolean } = {}) {
  const u = await usuarioAtual();
  if (!u) redirect('/equipe/entrar');
  if (!ehEquipe(u.cargo)) redirect(inicioDe(u.cargo));
  if (u.trocarSenha) redirect('/interno/senha');
  if (opts.gestor && u.cargo !== 'gestor') redirect('/equipe/agenda?negado=1');
  return u;
}

/** Use no topo de páginas e ações da área interna: qualquer pessoa com conta ativa. */
export async function exigirPessoa() {
  const u = await usuarioAtual();
  if (!u) redirect('/interno/entrar');
  if (u.trocarSenha) redirect('/interno/senha');
  return u;
}

/** Só quem cadastra e gerencia pessoas (gestor e RH). */
export async function exigirGestaoPessoas() {
  const u = await exigirPessoa();
  if (!podeGerirPessoas(u.cargo)) redirect('/interno?negado=1');
  return u;
}

/** Só quem cria e edita trilhas, cursos e perguntas (gestor e RH). */
export async function exigirEditorConteudo() {
  const u = await exigirPessoa();
  if (!podeEditarConteudo(u.cargo)) redirect('/interno?negado=1');
  return u;
}

/* ---------- Cliente (restaurante) ---------- */
export type ClienteSessao = { restauranteId: string; cnpj: string; nome: string; pessoa?: string; whatsapp?: string };
export async function clienteAtual(): Promise<ClienteSessao | null> {
  return abrir<ClienteSessao>((await cookies()).get(COOKIE_CLIENTE)?.value);
}
export async function identificarCliente(c: ClienteSessao) { (await cookies()).set(COOKIE_CLIENTE, selar(c), opcoes(180)); }
export async function esquecerCliente() { (await cookies()).delete(COOKIE_CLIENTE); }
