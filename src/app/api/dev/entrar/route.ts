import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { selar } from '@/lib/sessao';

/* SÓ DESENVOLVIMENTO: entra como um usuário da equipe sem senha, para testes automatizados.
   Desligado em produção e quando DEV_LOGIN != "1". Uso: /api/dev/entrar?email=...&ir=/equipe/agenda */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' || process.env.DEV_LOGIN !== '1') return new NextResponse('Não encontrado', { status: 404 });
  const email = req.nextUrl.searchParams.get('email') || '';
  const u = await db.usuario.findUnique({ where: { email } });
  if (!u) return new NextResponse('Usuário não existe', { status: 404 });
  (await cookies()).set('academy_equipe', selar({ id: u.id, exp: Date.now() + 86400e3 }), { httpOnly: true, sameSite: 'lax', path: '/' });
  return NextResponse.redirect(new URL(req.nextUrl.searchParams.get('ir') || '/equipe/agenda', req.url));
}
