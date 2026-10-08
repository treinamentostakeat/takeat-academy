import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { demoVisto, quemNaSala } from '@/lib/sala-servidor';

/* MODO DEMONSTRAÇÃO: estado da sala lido da memória do servidor (polling a cada ~1,5 s).
   GET /api/sala/estado?turma=ID&papel=cliente|instrutor
   Cada consulta também vale como "estou na sala" (some da lista após 12 s sem consultar).
   O cliente vê só a própria mão e a própria posição na fila; a instrutora vê a fila inteira. */

export async function GET(req: NextRequest) {
  const turmaId = req.nextUrl.searchParams.get('turma') || '';
  const papel = req.nextUrl.searchParams.get('papel') === 'instrutor' ? 'instrutor' : 'cliente';
  const turma = turmaId ? await db.turma.findUnique({ where: { id: turmaId }, select: { encerradaEm: true, status: true } }) : null;
  if (!turma) return NextResponse.json({ erro: 'Aula não encontrada.' }, { status: 404 });
  const eu = await quemNaSala(turmaId, papel);
  if (!eu) return NextResponse.json({ erro: 'Sem acesso a esta aula.' }, { status: 403 });

  const s = demoVisto(turmaId, { id: eu.identidade, nome: eu.nome, restaurante: eu.restaurante, papel });
  const pessoa = (pid: string | null) => { const p = pid ? s.pessoas.get(pid) : null; return p ? { id: p.id, nome: p.nome, restaurante: p.restaurante } : null; };
  const clientes = [...s.pessoas.values()].filter((p) => p.papel === 'cliente').sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const pos = s.maos.findIndex((m) => m.id === eu.identidade);

  return NextResponse.json({
    eu: eu.identidade,
    encerrada: !!turma.encerradaEm || turma.status === 'cancelada',
    pessoas: clientes.length,
    instrutoraOnline: [...s.pessoas.values()].some((p) => p.papel === 'instrutor'),
    falando: pessoa(s.falando),
    msgs: s.msgs.map((m) => ({ id: String(m.id), de: m.de, nome: m.nome, restaurante: m.restaurante, host: m.host, at: m.at, tx: m.tx })),
    minhaPosicao: pos >= 0 ? pos + 1 : null,
    ...(papel === 'instrutor' ? {
      maos: s.maos.map((m) => ({ ...pessoa(m.id)!, at: m.at })).filter((m) => m.id),
      participantes: clientes.map((p) => ({ id: p.id, nome: p.nome, restaurante: p.restaurante, mao: s.maos.some((m) => m.id === p.id), falando: s.falando === p.id })),
    } : {}),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
