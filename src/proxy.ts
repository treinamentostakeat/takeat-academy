import { NextResponse, type NextRequest } from 'next/server';

/* Barreira rápida das áreas com login: sem cookie de sessão, vai para o login da área.
   A verificação real (assinatura, usuário ativo, cargo) acontece em lib/sessao.ts, nas páginas e ações. */
export function proxy(req: NextRequest) {
  if (!req.cookies.get('academy_equipe')) {
    const url = req.nextUrl.clone();
    url.pathname = req.nextUrl.pathname.startsWith('/interno') ? '/interno/entrar' : '/equipe/entrar';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/equipe/((?!entrar).*)', '/equipe', '/interno/((?!entrar).*)', '/interno'] };
