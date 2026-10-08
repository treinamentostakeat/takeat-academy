import Link from 'next/link';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { AbrirInscricao, InscricaoProvider } from '@/components/cliente/Inscricao';
import { CancelarInscricao, IdentificarForm } from '@/components/cliente/Perfil';
import { diaCurto, diaMinusculo, faixaH, tituloDia } from '@/components/cliente/comum';
import { contextoCliente } from '@/components/cliente/dados';
import { TemaTile } from '@/components/TemaTile';
import { db } from '@/lib/db';
import { agora, salaAberta, situacao } from '@/lib/datas';
import { iniciais, mascaraCnpj } from '@/lib/formato';
import { trocarRestaurante } from '@/lib/inscricao';
import { clienteAtual } from '@/lib/sessao';
import '@/components/cliente/cliente.css';
import './perfil.css';

export const metadata = { title: 'Perfil do restaurante' };

export default function Perfil() {
  return (
    <main className="page cl cl-perfil">
      <nav className="crumb" aria-label="Você está em">
        <Link href="/">Academy</Link><span className="icon s16">chevron_right</span><span aria-current="page">Perfil do restaurante</span>
      </nav>
      <Suspense fallback={<div className="sk" style={{ height: 320, borderRadius: 16 }} aria-busy="true" aria-label="Carregando perfil" />}>
        <Conteudo />
      </Suspense>
    </main>
  );
}

async function Conteudo() {
  await connection(); // usa o relógio: sempre na hora do pedido
  const cliente = await clienteAtual();
  const r = cliente ? await db.restaurante.findUnique({ where: { id: cliente.restauranteId } }) : null;
  if (!cliente || !r) return <Identificar />;

  const [{ ctx }, insc] = await Promise.all([
    contextoCliente({}),
    db.inscricao.findMany({ where: { restauranteId: r.id }, include: { turma: true } }),
  ]);
  const hoje = agora().data;
  const comSit = insc.map((i) => ({ ...i, sit: situacao(i.turma) }));
  const proximas = comSit
    .filter((i) => i.sit === 'agendada' || i.sit === 'ao-vivo')
    .sort((a, b) => a.turma.data.localeCompare(b.turma.data) || a.turma.hora - b.turma.hora);
  const anteriores = comSit
    .filter((i) => i.sit === 'realizada' || i.sit === 'cancelada')
    .sort((a, b) => b.turma.data.localeCompare(a.turma.data) || b.turma.hora - a.turma.hora);
  const MAX_ANT = 20;
  // 1 botão preenchido por tela: só o primeiro "Entrar" é preenchido
  const primeiroAberto = proximas.findIndex((i) => salaAberta(i.turma));

  return (
    <InscricaoProvider ctx={ctx}>
      <div className="head">
        <div className="id">
          <span className="av me" aria-hidden="true">{iniciais(r.nome)}</span>
          <div><h1>{r.nome}</h1><p>CNPJ {mascaraCnpj(r.cnpj)} · As aulas ao vivo da sua equipe.</p></div>
        </div>
        <form action={trocarRestaurante}>
          <button className="btn btn-l btn-outlined" type="submit"><span className="icon">swap_horiz</span>Trocar restaurante</button>
        </form>
      </div>

      <div className="cols2">
        <section className="card box" aria-labelledby="h-prox">
          <div className="box-h">
            <h2 id="h-prox"><span className="icon s24">event_available</span>Próximas aulas</h2>
            {proximas.length > 0 && <Link className="link" href="/aulas">Ver calendário<span className="icon s16">arrow_forward</span></Link>}
          </div>
          {proximas.length ? (
            <ul className="alist">
              {proximas.map((i, k) => {
                const t = i.turma;
                const aberta = salaAberta(t);
                const filled = k === primeiroAberto;
                return (
                  <li key={i.id}>
                    <TemaTile tema={t.tema} size="sm" />
                    <div className="txt">
                      <div className="n">{t.tema}{i.sit === 'ao-vivo' && <span className="chip chip-red"><span className="dot pulse" />Ao vivo</span>}</div>
                      <div className="d">{tituloDia(t.data, hoje)} · {faixaH(t.hora)} · {i.nome}</div>
                    </div>
                    <div className="acts">
                      {aberta && <Link className={`btn btn-m ${filled ? 'btn-filled' : 'btn-outlined'}`} href={`/s/${i.codigo}`}><span className="icon s16">login</span>Entrar</Link>}
                      {i.sit === 'agendada' && <CancelarInscricao id={i.id} descricao={`${i.nome} sai da aula de ${t.tema}, ${diaMinusculo(t.data, hoje)}, às ${t.hora}h`} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty-b">
              <span className="icon">event_available</span>
              <b>Nenhuma aula marcada</b>
              Escolha um tema e um horário para sua equipe aprender ao vivo.
              <div><AbrirInscricao className="btn btn-l btn-filled"><span className="icon">event_available</span>Inscrever-se em uma aula</AbrirInscricao></div>
            </div>
          )}
        </section>

        <section className="card box" aria-labelledby="h-ant">
          <div className="box-h"><h2 id="h-ant"><span className="icon s24">history</span>Aulas anteriores</h2></div>
          {anteriores.length ? (
            <>
              <ul className="alist">
                {anteriores.slice(0, MAX_ANT).map((i) => {
                  const t = i.turma;
                  return (
                    <li key={i.id}>
                      <TemaTile tema={t.tema} size="sm" />
                      <div className="txt">
                        <div className="n">{t.tema}</div>
                        <div className="d">{diaCurto(t.data)} · {faixaH(t.hora)} · {i.nome}</div>
                      </div>
                      {i.sit === 'cancelada'
                        ? <span className="chip chip-neutral"><span className="icon s16">event_busy</span>Cancelada pela equipe</span>
                        : i.presente
                          ? <span className="chip chip-teal"><span className="icon s16 fill">check_circle</span>Participou</span>
                          : <span className="chip chip-yellow"><span className="icon s16">person_off</span>Faltou</span>}
                    </li>
                  );
                })}
              </ul>
              {anteriores.length > MAX_ANT && <div className="more">Mostrando as {MAX_ANT} mais recentes de {anteriores.length}.</div>}
            </>
          ) : (
            <div className="empty-b">
              <span className="icon">history</span>
              <b>Nenhuma aula ainda</b>
              As aulas que sua equipe fizer aparecem aqui, com a presença de cada pessoa.
            </div>
          )}
        </section>
      </div>
    </InscricaoProvider>
  );
}

function Identificar() {
  return (
    <section className="card ident" aria-labelledby="i-h">
      <div className="ic"><span className="icon s24">storefront</span></div>
      <h1 id="i-h">Identifique seu restaurante</h1>
      <p>Com o CNPJ você se inscreve nas aulas e acompanha as aulas da sua equipe.</p>
      <IdentificarForm />
    </section>
  );
}
