import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import { exigirUsuario } from '@/lib/sessao';
import { hoje, MIN_ANTES_SALA, situacao } from '@/lib/datas';
import { livekitAtivo } from '@/lib/integracoes/livekit';
import { quandoTexto, resumoAula, rotuloHorario, segundosAte } from '@/lib/sala-servidor';
import { DemoBar } from '@/components/DemoBar';
import { AvisoSala } from '@/components/sala/AvisoSala';
import { SalaAoVivo } from '@/components/sala/SalaAoVivo';
import type { DadosSala } from '@/components/sala/tipos';

export const metadata: Metadata = { title: 'Sala de aula · Equipe' };

/* Sala de aula da instrutora (ou de quem a substitui): /equipe/sala/<turmaId>. Tela cheia, fora do menu da equipe. */
export default function PaginaSalaEquipe({ params }: { params: Promise<{ turmaId: string }> }) {
  return (
    <Suspense fallback={<div className="sala-carregando" role="status">Abrindo a sala…</div>}>
      <Sala params={params} />
    </Suspense>
  );
}

async function Sala({ params }: { params: Promise<{ turmaId: string }> }) {
  await connection(); // sempre na hora do pedido (relógio, sessão e banco)
  const usuario = await exigirUsuario();
  const { turmaId } = await params;
  const turma = await db.turma.findUnique({
    where: { id: turmaId },
    include: { inscricoes: { include: { restaurante: { select: { nome: true } } }, orderBy: { criadoEm: 'asc' } } },
  });
  const agenda = { href: '/equipe/agenda', label: 'Voltar à agenda', icon: 'calendar_month' };
  if (!turma) return <AvisoSala icone="search_off" neutro titulo="Aula não encontrada" texto="Esta turma não existe. Volte à agenda e abra a sala pelo detalhe da turma." principal={agenda} />;
  if (turma.status === 'cancelada') {
    return <AvisoSala icone="event_busy" titulo="Esta aula foi cancelada" texto={<>A aula de {turma.tema} de {quandoTexto(turma).toLowerCase()} foi cancelada{turma.motivoCancel ? ` (${turma.motivoCancel})` : ''}. Os inscritos foram avisados para escolher outro horário.</>} principal={agenda} />;
  }

  const s = situacao(turma);
  const emAndamento = !!turma.iniciadaEm && !turma.encerradaEm && turma.data === hoje();
  const etapa: DadosSala['etapa'] = turma.encerradaEm || (s === 'realizada' && !emAndamento) ? 'fim' : 'espera';
  const segParaComecar = segundosAte(turma.data, turma.hora);

  const dados: DadosSala = {
    papel: 'instrutor',
    etapa,
    livekit: livekitAtivo(),
    turma: { id: turma.id, tema: turma.tema, hora: turma.hora, horario: rotuloHorario(turma), iniciada: !!turma.iniciadaEm },
    eu: { nome: usuario.nome, restaurante: 'Takeat' },
    segParaComecar,
    segParaAbrir: emAndamento ? 0 : segParaComecar - MIN_ANTES_SALA * 60,
    inscritos: turma.inscricoes.map((i) => ({ id: i.id, nome: i.nome, restaurante: i.restaurante.nome })),
    resumo: etapa === 'fim' ? await resumoAula(turma.id) : null,
  };
  return <SalaAoVivo key={etapa} dados={dados} demoBar={<DemoBar />} />;
}
