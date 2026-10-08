import { NextResponse, type NextRequest } from 'next/server';

/* Barreira rápida da área da equipe: sem cookie de sessão, vai para o login.
   A verificação real (assinatura, usuário ativo, cargo) acontece em exigirUsuario() nas páginas e ações. */
export function proxy(req: NextRequest) {
  if (!req.cookies.get('academy_equipe')) {
    const url = req.nextUrl.clone();
    url.pathname = '/equipe/entrar';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/equipe/((?!entrar).*)', '/equipe'] };
