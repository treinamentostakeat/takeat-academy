import { NextResponse, type NextRequest } from 'next/server';

/* Respostas padrão da API de integração. Nada de cache: as respostas podem trazer senha provisória. */

export { autorizar } from './api';

export const erroJson = (status: number, erro: string, campo?: string) =>
  NextResponse.json(campo ? { erro, campo } : { erro }, { status, headers: { 'Cache-Control': 'no-store' } });

/** Endereço que a pessoa usa para entrar (o mesmo que o RH repassa) */
export const enderecoLogin = (req: NextRequest) => `${(process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, '')}/interno/entrar`;
