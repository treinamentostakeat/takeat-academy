import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { autorizar, enderecoLogin, erroJson } from '@/lib/api-resposta';
import { db } from '@/lib/db';
import { senhaProvisoria } from '@/lib/senha';

/* API de integração · recuperar senha (documentação em docs/API.md).
   POST /api/v1/usuarios/senha  { email }  →  200 { usuario, senhaProvisoria, endereco }
   Gera uma nova senha provisória; a anterior deixa de valer e a pessoa cria uma nova no próximo acesso.
   Só vale para contas de colaborador. */

const Corpo = z.object({ email: z.email('Informe um e-mail válido.').trim().toLowerCase().max(200) });

export async function POST(req: NextRequest) {
  const a = autorizar(req.headers.get('authorization'), process.env.API_RPA_CHAVE_HASH);
  if (!a.ok) return erroJson(a.status, a.erro);

  const dados = await req.json().catch(() => null);
  const p = Corpo.safeParse(dados && typeof dados === 'object' ? { email: typeof dados.email === 'string' ? dados.email.trim().toLowerCase() : dados.email } : {});
  if (!p.success) return erroJson(400, p.error.issues[0].message, 'email');

  const u = await db.usuario.findUnique({ where: { email: p.data.email }, select: { id: true, nome: true, email: true, cargo: true, ativo: true } });
  // Conta da equipe ou do RH não é alterada pela API; a resposta é a mesma de "não encontrado" para não revelar quem existe
  if (!u || u.cargo !== 'colaborador') return erroJson(404, 'Nenhum colaborador com este e-mail.', 'email');
  if (!u.ativo) return erroJson(409, 'Esta conta está desativada. Peça ao RH para reativá-la.', 'email');

  const senha = senhaProvisoria();
  await db.usuario.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(senha, 10), trocarSenha: true, falhasLogin: 0, bloqueadoAte: null } });
  return NextResponse.json({ usuario: { id: u.id, nome: u.nome, email: u.email }, senhaProvisoria: senha, endereco: enderecoLogin(req) }, { headers: { 'Cache-Control': 'no-store' } });
}
