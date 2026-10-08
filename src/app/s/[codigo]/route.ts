import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { identificarCliente } from '@/lib/sessao';

/* Link pessoal da aula (vai no WhatsApp): /s/<codigo>
   Identifica o cliente neste aparelho e leva direto para a sala. Código inválido → /s (aviso amigável). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await ctx.params;
  const i = /^[\w-]{4,64}$/.test(codigo)
    ? await db.inscricao.findUnique({ where: { codigo }, include: { restaurante: true } })
    : null;
  if (!i) return NextResponse.redirect(new URL('/s', req.url));
  await identificarCliente({ restauranteId: i.restauranteId, cnpj: i.restaurante.cnpj, nome: i.restaurante.nome, pessoa: i.nome, whatsapp: i.whatsapp });
  return NextResponse.redirect(new URL(`/sala/${i.turmaId}`, req.url));
}
