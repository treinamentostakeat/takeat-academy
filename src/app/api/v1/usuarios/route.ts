import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { numeroWhatsApp } from '@/lib/acesso-whatsapp';
import { autorizar, enderecoLogin, erroJson } from '@/lib/api-resposta';
import { db } from '@/lib/db';
import { enderecoBase, enviarPrimeiroAcesso } from '@/lib/envio-acesso';
import { senhaProvisoria } from '@/lib/senha';

/* API de integração · cadastro de colaborador (documentação em docs/API.md).
   POST /api/v1/usuarios  { nome, email, departamento?, whatsapp? }
     →  201 { usuario, senhaProvisoria, endereco, linkPrimeiroAcesso, whatsapp? }
   Com whatsapp, a Academy manda sozinha o link de primeiro acesso pelo WhatsApp oficial.
   Só cria contas de colaborador: a API não dá acesso à área da equipe nem ao RH. */

const Corpo = z.object({
  nome: z.string().trim().min(3, 'Informe nome e sobrenome.').max(80, 'Use até 80 caracteres no nome.'),
  email: z.email('Informe um e-mail válido.').trim().toLowerCase().max(200),
  departamento: z.string().trim().max(60, 'Use até 60 caracteres no departamento.').optional(),
  whatsapp: z.string().trim().max(30).refine((v) => !v || !!numeroWhatsApp(v), 'Informe o WhatsApp com DDD, ex. 27999998888.').optional(),
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

  const existente = await db.usuario.findUnique({ where: { email: p.data.email }, select: { id: true, ativo: true } });
  if (existente) {
    return NextResponse.json(
      { erro: existente.ativo ? 'Já existe uma conta com este e-mail.' : 'Já existe uma conta desativada com este e-mail. Peça ao RH para reativá-la.', campo: 'email', usuarioId: existente.id },
      { status: 409, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const senha = senhaProvisoria();
  try {
    const u = await db.usuario.create({
      data: { nome: p.data.nome, email: p.data.email, departamento: p.data.departamento || null, cargo: 'colaborador', trocarSenha: true, senhaHash: await bcrypt.hash(senha, 10) },
      select: { id: true, nome: true, email: true, departamento: true, cargo: true, criadoEm: true, senhaHash: true },
    });
    const { senhaHash, ...usuario } = u;
    // Link de primeiro acesso: vai no WhatsApp (se veio o número) e também volta na resposta, para outro canal se preciso
    const envio = await enviarPrimeiroAcesso({ ...usuario, senhaHash }, p.data.whatsapp ?? '', enderecoBase(req.nextUrl.origin));
    return NextResponse.json({
      usuario, senhaProvisoria: senha, endereco: enderecoLogin(req), linkPrimeiroAcesso: envio.link,
      ...(p.data.whatsapp ? { whatsapp: { status: envio.status } } : {}),
    }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    // Duas chamadas simultâneas com o mesmo e-mail: a segunda cai aqui
    if ((e as { code?: string }).code === 'P2002') return erroJson(409, 'Já existe uma conta com este e-mail.', 'email');
    throw e;
  }
}
