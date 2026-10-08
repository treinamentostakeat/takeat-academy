import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { db } from './db';

/* Cookies assinados (HMAC). Equipe: sessão de login. Cliente: restaurante identificado pelo CNPJ (sem senha). */

const SECRET = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Defina SESSION_SECRET no .env');
  return s;
};
const sign = (v: string) => createHmac('sha256', SECRET()).update(v).digest('base64url');
export const selar = (dados: object) => { const v = Buffer.from(JSON.stringify(dados)).toString('base64url'); return `${v}.${sign(v)}`; };
export function abrir<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [v, s] = token.split('.');
  if (!v || !s) return null;
  const a = Buffer.from(sign(v)), b = Buffer.from(s);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(v, 'base64url').toString()) as T; } catch { return null; }
}

const COOKIE_EQUIPE = 'academy_equipe';
const COOKIE_CLIENTE = 'academy_cliente';
const opcoes = (dias: number) => ({ httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: dias * 86400 });

/* ---------- Equipe ---------- */
export type Cargo = 'gestor' | 'instrutor';
export type UsuarioSessao = { id: string; nome: string; email: string; cargo: Cargo };

export async function entrar(email: string, senha: string): Promise<UsuarioSessao | null> {
  const u = await db.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!u || !u.ativo || !(await bcrypt.compare(senha, u.senhaHash))) return null;
  await db.usuario.update({ where: { id: u.id }, data: { ultimoAcesso: new Date() } });
  (await cookies()).set(COOKIE_EQUIPE, selar({ id: u.id, exp: Date.now() + 14 * 86400e3 }), opcoes(14));
  return { id: u.id, nome: u.nome, email: u.email, cargo: u.cargo as Cargo };
}
export async function sair() { (await cookies()).delete(COOKIE_EQUIPE); }

export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  await connection(); // sessão e validade dependem da hora do pedido
  const s = abrir<{ id: string; exp: number }>((await cookies()).get(COOKIE_EQUIPE)?.value);
  if (!s || s.exp < Date.now()) return null;
  const u = await db.usuario.findUnique({ where: { id: s.id } });
  if (!u || !u.ativo) return null;
  return { id: u.id, nome: u.nome, email: u.email, cargo: u.cargo as Cargo };
}
/** Use no topo de páginas e ações da equipe. gestor=true restringe ao gestor. */
export async function exigirUsuario(opts: { gestor?: boolean } = {}) {
  const u = await usuarioAtual();
  if (!u) redirect('/equipe/entrar');
  if (opts.gestor && u.cargo !== 'gestor') redirect('/equipe/agenda?negado=1');
  return u;
}

/* ---------- Cliente (restaurante) ---------- */
export type ClienteSessao = { restauranteId: string; cnpj: string; nome: string; pessoa?: string; whatsapp?: string };
export async function clienteAtual(): Promise<ClienteSessao | null> {
  return abrir<ClienteSessao>((await cookies()).get(COOKIE_CLIENTE)?.value);
}
export async function identificarCliente(c: ClienteSessao) { (await cookies()).set(COOKIE_CLIENTE, selar(c), opcoes(180)); }
export async function esquecerCliente() { (await cookies()).delete(COOKIE_CLIENTE); }
