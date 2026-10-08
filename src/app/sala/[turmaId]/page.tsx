import type { Metadata } from 'next';
import { Suspense } from 'react';
import { connection } from 'next/server';
import { db } from '@/lib/db';
import { clienteAtual } from '@/lib/sessao';
import { hoje, MIN_ANTES_SALA, situacao } from '@/lib/datas';
import { livekitAtivo } from '@/lib/integracoes/livekit';
import { iniciais } from '@/lib/formato';
import { inscricaoDoCliente, quandoTexto, rotuloHorario, segundosAte } from '@/lib/sala-servidor';
import { DemoBar } from '@/components/DemoBar';
import { AvisoSala } from '@/components/sala/AvisoSala';
import { SalaAoVivo } from '@/components/sala/SalaAoVivo';
import type { DadosSala } from '@/components/sala/tipos';

export const metadata: Metadata = { title: 'Sala de aula' };

/* Sala de aula do cliente: /sala/<turmaId>. Exige o restaurante identificado e inscrito nesta turma. */
export default function PaginaSala({ params }: { params: Promise<{ turmaId: string }> }) {
  return (
    <Suspense fallback={<div className="sala-carregando" role="status">Abrindo a sala…</div>}>
      <Sala params={params} />
    </Suspense>
  );
}

async function Sala({ params }: { params: Promise<{ turmaId: string }> }) {
  await connection(); // sempre na hora do pedido (relógio, sessão e banco)
  const { turmaId } = await params;
  const turma = await db.turma.findUnique({ where: { id: turmaId }, include: { inscricoes: { include: { restaurante: { select: { nome: true } } }, orderBy: { criadoEm: 'asc' } } } });
  if (!turma) {
    return <AvisoSala icone="search_off" neutro titulo="Aula não encontrada" texto="Este endereço não corresponde a nenhuma aula. Escolha um horário na agenda de aulas ao vivo." principal={{ href: '/aulas', label: 'Ver aulas ao vivo', icon: 'event_available' }} secundaria={{ href: '/', label: 'Voltar ao início' }} />;
  }
  if (turma.status === 'cancelada') {
    return <AvisoSala icone="event_busy" titulo="Esta aula foi cancelada" texto={<>A aula de {turma.tema} de {quandoTexto(turma).toLowerCase()} foi cancelada. Escolha outro horário: leva menos de um minuto.</>} principal={{ href: '/aulas', label: 'Escolher outro horário', icon: 'event_available' }} secundaria={{ href: '/', label: 'Voltar ao início' }} />;
  }

  const [cliente, inscricao] = await Promise.all([clienteAtual(), inscricaoDoCliente(turmaId)]);
  if (!inscricao) {
    return (
      <AvisoSala
        icone="how_to_reg"
        titulo={cliente ? 'Você ainda não está inscrito nesta aula' : 'Entre pelo link da sua inscrição'}
        texto={cliente
          ? <>A aula de {turma.tema} é de {quandoTexto(turma).toLowerCase()}. Inscreva-se rapidinho para entrar na sala.</>
          : <>Para entrar na aula de {turma.tema}, use o link que enviamos no seu WhatsApp ou inscreva-se em um horário.</>}
        principal={{ href: '/aulas', label: 'Inscrever-se em uma aula', icon: 'event_available' }}
        secundaria={{ href: '/', label: 'Voltar ao início' }}
      />
    );
  }

  const s = situacao(turma);
  const emAndamento = !!turma.iniciadaEm && !turma.encerradaEm && turma.data === hoje();
  const etapa: DadosSala['etapa'] = turma.encerradaEm || (s === 'realizada' && !emAndamento) ? 'fim' : 'espera';
  const segParaComecar = segundosAte(turma.data, turma.hora);

  const dados: DadosSala = {
    papel: 'cliente',
    etapa,
    livekit: livekitAtivo(),
    turma: { id: turma.id, tema: turma.tema, hora: turma.hora, horario: rotuloHorario(turma), iniciada: !!turma.iniciadaEm },
    eu: { nome: inscricao.nome, restaurante: inscricao.restaurante.nome },
    segParaComecar,
    segParaAbrir: emAndamento ? 0 : segParaComecar - MIN_ANTES_SALA * 60,
    // O cliente vê só a contagem e as iniciais (nomes completos ficam com a instrutora)
    inscritos: turma.inscricoes.map((i) => ({ id: i.id, nome: iniciais(i.nome), restaurante: '' })),
    fim: { entrou: !!inscricao.entrouEm, avaliou: inscricao.nota != null },
  };
  return <SalaAoVivo key={etapa} dados={dados} demoBar={<DemoBar />} />;
}
