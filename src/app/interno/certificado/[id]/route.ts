import { NextResponse, type NextRequest } from 'next/server';
import { gerarCertificado } from '@/lib/certificado';
import { jogoDe } from '@/lib/gamificacao';
import { usuarioAtual } from '@/lib/sessao';

/* Baixa o certificado em PDF de uma trilha concluída pela pessoa logada. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.redirect(new URL('/interno/entrar', req.url));
  const { id } = await params;
  const cert = (await jogoDe(u)).certificados.find((c) => c.trilhaId === id);
  if (!cert) return new NextResponse('Certificado disponível só depois de concluir todos os cursos da trilha.', { status: 404 });

  const data = cert.em.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo' });
  const validarEm = `${req.nextUrl.origin}/certificado/${cert.codigo}`;
  const pdf = await gerarCertificado({ nome: u.nome, trilha: cert.titulo, data, codigo: cert.codigo, validarEm });
  const arquivo = `certificado-${cert.titulo.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'takeat'}.pdf`;
  return new NextResponse(Buffer.from(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${arquivo}"`, 'Cache-Control': 'private, no-store' },
  });
}
