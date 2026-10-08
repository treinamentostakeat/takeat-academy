import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { cnpjValido, soNumeros } from '@/lib/formato';
import { clienteAtual, identificarCliente } from '@/lib/sessao';

/* Link por CNPJ, enviado nos grupos de WhatsApp: /i/12345678000190 (botão no sistema: /i/12345678000190?canal=botao)
   Restaurante já cadastrado → fica identificado neste aparelho. Sempre segue para /aulas?canal=grupo&cnpj=...
   (o diálogo de inscrição usa o CNPJ do link; se o restaurante é novo, pede só o nome dele). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ cnpj: string }> }) {
  const cnpj = soNumeros(decodeURIComponent((await params).cnpj));
  const url = req.nextUrl.clone();
  url.pathname = '/aulas';
  url.search = '';
  const canal = req.nextUrl.searchParams.get('canal') === 'botao' ? 'botao' : 'grupo';
  url.searchParams.set('canal', canal);
  if (!cnpjValido(cnpj)) {
    url.searchParams.set('link', 'invalido');
    return NextResponse.redirect(url);
  }
  url.searchParams.set('cnpj', cnpj);
  const r = await db.restaurante.findUnique({ where: { cnpj } });
  if (r) {
    const atual = await clienteAtual();
    const mesmo = atual?.restauranteId === r.id;
    await identificarCliente({ restauranteId: r.id, cnpj: r.cnpj, nome: r.nome, pessoa: mesmo ? atual?.pessoa : undefined, whatsapp: mesmo ? atual?.whatsapp : undefined });
  }
  const res = NextResponse.redirect(url);
  // Lembra a origem por 2 dias, para a inscrição contar o canal mesmo se a pessoa navegar pelo menu antes
  res.cookies.set('academy_canal', canal, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 2 * 86400 });
  return res;
}
