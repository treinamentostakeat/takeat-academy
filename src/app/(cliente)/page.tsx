import { Suspense } from 'react';
import { AbrirInscricao, EntrarAula, InscricaoProvider } from '@/components/cliente/Inscricao';
import { ProximasAulas } from '@/components/cliente/ProximasAulas';
import { faixaH, proximaTexto } from '@/components/cliente/comum';
import { contextoCliente, param, type ParamsCliente } from '@/components/cliente/dados';
import { TEMA, TEMAS, temaVars } from '@/lib/temas';
import '@/components/cliente/cliente.css';
import './inicio.css';

/* Início (fase 1): temas das aulas ao vivo, "Ao vivo agora" e as próximas aulas do restaurante. */
export default function Inicio({ searchParams }: { searchParams: Promise<ParamsCliente> }) {
  return (
    <main className="page cl cl-inicio">
      <div className="hello"><h1>O que você quer aprender hoje?</h1></div>
      <Suspense fallback={<Esqueleto />}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: Promise<ParamsCliente> }) {
  const sp = await searchParams;
  const { ctx, aoVivo, proximas } = await contextoCliente(sp);
  const aberta = (tema: string) => ctx.turmas.find((t) => t.tema === tema && t.sit === 'agendada' && !ctx.minhas.includes(t.id));

  return (
    <InscricaoProvider ctx={ctx} abrirAoCarregar={param(sp, 'inscrever') === '1'}>
      <section className="panel" aria-labelledby="h-live">
        <div className="panel-h">
          <h2 id="h-live"><span className="icon s24">videocam</span>Aulas ao vivo</h2>
          {/* 1 botão preenchido por tela: com aula ao vivo, o preenchido é "Entrar na aula" */}
          <AbrirInscricao className={`btn btn-l ${aoVivo ? 'btn-outlined' : 'btn-filled'} enroll-btn`}>
            <span className="icon">event_available</span>Inscrever-se em uma aula
          </AbrirInscricao>
        </div>
        <div className="panel-b">
          {aoVivo && (
            <div className="feature">
              <div>
                <div className="meta">
                  <span className="live-pill"><span className="dot" />Ao vivo agora</span>
                  <span>{faixaH(aoVivo.hora)} · {aoVivo.minutos ? `começou há ${aoVivo.minutos} min` : 'começando agora'}</span>
                </div>
                <h3>{aoVivo.tema}</h3>
                <p className="sub">{aoVivo.pessoas ? `${aoVivo.pessoas} ${aoVivo.pessoas === 1 ? 'pessoa' : 'pessoas'} na sala` : 'Aula ao vivo de 1 hora'}</p>
              </div>
              <EntrarAula turmaId={aoVivo.id} className="btn btn-l btn-filled"><span className="icon">login</span>Entrar na aula</EntrarAula>
            </div>
          )}
          <p className="lead-s">Escolha um tema para ver os dias e horários.</p>
          <div className="tgrid">
            {TEMAS.map((tm) => {
              const nx = aberta(tm);
              return (
                <AbrirInscricao key={tm} tema={tm} className="ttile" style={temaVars(tm)} disabled={!nx} label={`${tm}: ver dias e horários`}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TEMA[tm].icone }} />
                  <span>
                    <span className="n">{tm}</span>
                    <span className="nx">{nx ? `Próxima: ${proximaTexto(nx.data, nx.hora, ctx.hoje)}` : 'Sem horários abertos'}</span>
                  </span>
                </AbrirInscricao>
              );
            })}
          </div>
        </div>
      </section>
      <ProximasAulas aulas={proximas} hoje={ctx.hoje} />
    </InscricaoProvider>
  );
}

function Esqueleto() {
  return (
    <section className="panel" aria-busy="true" aria-label="Carregando aulas ao vivo">
      <div className="panel-h"><h2><span className="icon s24">videocam</span>Aulas ao vivo</h2></div>
      <div className="panel-b"><div className="tgrid">{TEMAS.map((t) => <div key={t} className="sk ttile-sk" />)}</div></div>
    </section>
  );
}
