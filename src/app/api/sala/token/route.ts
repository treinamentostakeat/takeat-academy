import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { livekitAtivo, livekitUrl, tokenSala } from '@/lib/integracoes/livekit';
import { podeEntrar, quemNaSala } from '@/lib/sala-servidor';
import { salaAberta } from '@/lib/datas';

/* Entrada na sala ao vivo. POST { turmaId, papel } → { token, url } (LiveKit) ou { demo: true } (modo demonstração).
   Cliente: precisa estar inscrito e a sala aberta; grava entrouEm na primeira entrada (presença).
   Equipe: abre a aula e grava iniciadaEm na primeira vez. */

const corpo = z.object({ turmaId: z.string().min(1).max(64), papel: z.enum(['cliente', 'instrutor']) });
const erro = (msg: string, status: number) => NextResponse.json({ erro: msg }, { status });

export async function POST(req: NextRequest) {
  const p = corpo.safeParse(await req.json().catch(() => null));
  if (!p.success) return erro('Pedido inválido.', 400);
  const { turmaId, papel } = p.data;

  const turma = await db.turma.findUnique({ where: { id: turmaId } });
  if (!turma) return erro('Aula não encontrada.', 404);
  const eu = await quemNaSala(turmaId, papel);
  if (!eu) return erro(papel === 'instrutor' ? 'Entre com sua conta da equipe.' : 'Você não está inscrito nesta aula.', 403);

  if (papel === 'instrutor') {
    if (turma.status === 'cancelada' || turma.encerradaEm) return erro('Esta aula já foi encerrada ou cancelada.', 409);
    if (!turma.iniciadaEm && !salaAberta(turma)) return erro('A sala abre 10 minutos antes do horário da aula.', 409);
    if (!turma.iniciadaEm) await db.turma.update({ where: { id: turmaId }, data: { iniciadaEm: new Date() } });
  } else {
    if (!podeEntrar(turma)) return erro(turma.encerradaEm ? 'Esta aula já terminou.' : 'A sala ainda não está aberta.', 409);
    await db.inscricao.updateMany({ where: { id: eu.inscricaoId!, entrouEm: null }, data: { entrouEm: new Date() } });
    await db.inscricao.update({ where: { id: eu.inscricaoId! }, data: { saiuEm: null } });
  }

  if (!livekitAtivo()) return NextResponse.json({ demo: true, identidade: eu.identidade });
  const token = await tokenSala({
    turmaId, identidade: eu.identidade, nome: eu.nome, papel,
    metadata: { restaurante: eu.restaurante },
  });
  return NextResponse.json({ token, url: livekitUrl(), identidade: eu.identidade });
}
