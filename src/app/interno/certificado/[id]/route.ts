import { NextResponse, type NextRequest } from 'next/server';
import { gerarCertificado } from '@/lib/certificado';
import { db } from '@/lib/db';
import { jogoDe } from '@/lib/gamificacao';
import { podeEditarConteudo } from '@/lib/permissoes';
import { usuarioAtual } from '@/lib/sessao';

const TZ = () => process.env.TZ_AULAS || 'America/Sao_Paulo';
const porExtenso = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ() });
const nomeDoArquivo = (titulo: string) => `certificado-${titulo.normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'takeat'}.pdf`;

/* Certificado em PDF de uma trilha.
   - Normal: baixa o certificado da pessoa logada, só se ela concluiu todos os cursos da trilha.
   - ?previa=1: quem edita conteúdo vê o modelo da trilha (com o próprio nome e a data de hoje), aberto no navegador. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioAtual();
  if (!u) return NextResponse.redirect(new URL('/interno/entrar', req.url));
  const { id } = await params;

  if (req.nextUrl.searchParams.get('previa') === '1') {
    if (!podeEditarConteudo(u.cargo)) return new NextResponse('Só quem edita o conteúdo pode ver a prévia do certificado.', { status: 403 });
    const trilha = await db.trilha.findUnique({ where: { id }, select: { titulo: true } });
    if (!trilha) return new NextResponse('Trilha não encontrada.', { status: 404 });
    const pdf = await gerarCertificado({ nome: u.nome, trilha: trilha.titulo, data: porExtenso(new Date()), codigo: '', validarEm: '', previa: true });
    return new NextResponse(Buffer.from(pdf), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="previa-${nomeDoArquivo(trilha.titulo)}"`, 'Cache-Control': 'private, no-store' },
    });
  }

  const cert = (await jogoDe(u)).certificados.find((c) => c.trilhaId === id);
  if (!cert) return new NextResponse('Certificado disponível só depois de concluir todos os cursos da trilha.', { status: 404 });
  const validarEm = `${req.nextUrl.origin}/certificado/${cert.codigo}`;
  const pdf = await gerarCertificado({ nome: u.nome, trilha: cert.titulo, data: porExtenso(cert.em), codigo: cert.codigo, validarEm });
  return new NextResponse(Buffer.from(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${nomeDoArquivo(cert.titulo)}"`, 'Cache-Control': 'private, no-store' },
  });
}
