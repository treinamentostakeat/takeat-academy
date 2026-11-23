import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { numeroWhatsApp } from '@/lib/acesso-whatsapp';
import { autorizar, erroJson } from '@/lib/api-resposta';
import { db } from '@/lib/db';
import { enderecoBase, enviarPrimeiroAcesso } from '@/lib/envio-acesso';

/* API de integração · reenviar o primeiro acesso (documentação em docs/API.md).
   POST /api/v1/usuarios/acesso  { email, whatsapp }  →  200 { usuario, linkPrimeiroAcesso, whatsapp: { status } }
   Para quem já tem conta e ainda não criou a própria senha (ex.: contas criadas antes, na carga inicial).
   Quem já criou a senha usa POST /usuarios/senha. Só vale para contas de colaborador. */

const Corpo = z.object({
  email: z.email('Informe um e-mail válido.').trim().toLowerCase().max(200),
  whatsapp: z.string().trim().max(30).refine((v) => !!numeroWhatsApp(v), 'Informe o WhatsApp com DDD, ex. 27999998888.'),
});

export async function POST(req: NextRequest) {
  const a = autorizar(req.headers.get('authorization'), process.env.API_RPA_CHAVE_HASH);
  if (!a.ok) return erroJson(a.status, a.erro);

  const dados = await req.json().catch(() => null);
  if (!dados || typeof dados !== 'object') return erroJson(400, 'Envie um JSON no corpo da requisição.');
  const p = Corpo.safeParse({ ...dados, email: typeof dados.email === 'string' ? dados.email.trim().toLowerCase() : dados.email });
  if (!p.success) {
    const i = p.error.issues[0];
    return erroJson(400, i.message, String(i.path[0] ?? ''));
  }

  const u = await db.usuario.findUnique({ where: { email: p.data.email }, select: { id: true, nome: true, email: true, cargo: true, ativo: true, trocarSenha: true, senhaHash: true } });
  // Conta da equipe ou do RH não é tocada pela API; a resposta é a mesma de "não encontrado" para não revelar quem existe
  if (!u || u.cargo !== 'colaborador') return erroJson(404, 'Nenhum colaborador com este e-mail.', 'email');
  if (!u.ativo) return erroJson(409, 'Esta conta está desativada. Peça ao RH para reativá-la.', 'email');
  if (!u.trocarSenha) return erroJson(409, 'Esta pessoa já criou a própria senha. Para recuperar o acesso, use POST /usuarios/senha.', 'email');

  const envio = await enviarPrimeiroAcesso(u, p.data.whatsapp, enderecoBase(req.nextUrl.origin));
  return NextResponse.json(
    { usuario: { id: u.id, nome: u.nome, email: u.email }, linkPrimeiroAcesso: envio.link, whatsapp: { status: envio.status } },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
