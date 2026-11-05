import Link from 'next/link';
import type { UsuarioSessao } from '@/lib/sessao';
import { rotuloCurto, rotuloDia } from '@/lib/datas';
import { CANAL, detalheTurma, fmt1, pessoasAtivas, whatsMascarado } from '@/lib/equipe';
import { TemaTile } from '@/components/TemaTile';
import { Drawer } from '@/components/equipe/Drawer';
import { AcoesTurma } from '@/components/equipe/AcoesTurma';
import { ChipSit, rotuloSit } from './pecas';
import { TabelaInscritos } from './TabelaInscritos';

/* Drawer "Detalhe da turma" (aberto por ?turma=<id> na agenda) */

const hhmm = (d: Date) => new Intl.DateTimeFormat('pt-BR', { timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(d).replace(', ', ' às ');

export function DrawerCarregando({ fecharHref }: { fecharHref: string }) {
  return (
    <Drawer titulo="Detalhe da turma" subtitulo="Carregando…" fecharHref={fecharHref}>
      <div aria-busy="true" aria-label="Carregando turma" className="dw-sk">
        <div className="sk" style={{ height: 64 }} />
        <div className="sk" style={{ height: 120 }} />
        <div className="sk" style={{ height: 200 }} />
      </div>
    </Drawer>
  );
}

export async function DetalheTurma({ id, u, fecharHref }: { id: string; u: UsuarioSessao; fecharHref: string }) {
  const t = await detalheTurma(id);
  if (!t) {
    return (
      <Drawer titulo="Detalhe da turma" fecharHref={fecharHref}>
        <div className="state"><span className="icon">search_off</span><b>Turma não encontrada</b><p>O link pode estar errado. Volte para a agenda e escolha a turma de novo.</p></div>
      </Drawer>
    );
  }
  const gestor = u.cargo === 'gestor';
  const pessoas = gestor ? await pessoasAtivas() : [];
  const feita = t.sit === 'realizada';
  const ativa = t.sit === 'agendada' || t.sit === 'ao-vivo';
  const n = t.inscricoes.length;
  const ctx = `${rotuloCurto(t.data)} · ${t.hora}h–${t.hora + 1}h`;
  const voce = (pid: string) => (pid === u.id ? ' (você)' : '');
  const pct = n ? Math.round((t.presentes / n) * 100) : 0;

  return (
    <Drawer
      titulo="Detalhe da turma"
      subtitulo={`${t.tema} · ${ctx}`}
      fecharHref={fecharHref}
      origem={t.id}
      rodape={<>
        <span className="dw-ctx">{ctx}</span>
        {gestor && (ativa) && (
          <AcoesTurma
            turma={{ id: t.id, tema: t.tema, quando: `${rotuloDia(t.data)}, ${t.hora}h`, instrutorId: t.instrutorId, plantaoId: t.plantaoId, inscritos: n }}
            pessoas={pessoas.map((p) => ({ id: p.id, nome: p.nome }))}
            podeTrocar={ativa}
            podeCancelar={t.sit === 'agendada'}
          />
        )}
        {ativa && <Link className="btn btn-l btn-outlined" href={`/equipe/sala/${t.id}`}><span className="icon">co_present</span>Abrir sala</Link>}
      </>}
    >
      <section>
        <div className="sec-t">Identificação</div>
        <div className="dw-id">
          <TemaTile tema={t.tema} />
          <div><div className="dw-tema">{t.tema}</div><ChipSit sit={t.sit} /></div>
        </div>
        <dl className="kv">
          <dt>Dia</dt><dd>{rotuloDia(t.data)}</dd>
          <dt>Horário</dt><dd>{t.hora}h–{t.hora + 1}h</dd>
          <dt>Instrutor da aula</dt><dd>{t.instrutor.nome}{voce(t.instrutorId)}</dd>
          <dt>Plantão</dt><dd>{t.plantao.nome}{voce(t.plantaoId)}</dd>
          <dt>Situação</dt><dd>{rotuloSit(t.sit)}</dd>
        </dl>
      </section>

      {t.sit === 'cancelada' && (
        <div className="note-box">
          <span className="icon">info</span>
          <span>
            Turma cancelada{t.canceladaEm ? ` em ${hhmm(t.canceladaEm)}` : ''}. Os inscritos receberam aviso com link para escolher outro horário.
            {t.motivoCancel && <><br />Motivo: {t.motivoCancel}</>}
          </span>
        </div>
      )}

      <section>
        {!n ? (
          <>
            <div className="sec-t">Inscritos (0)</div>
            <div className="state st-p"><span className="icon">group</span><b>Ainda sem inscritos</b><p>As inscrições aparecem aqui assim que os clientes escolherem este horário.</p></div>
          </>
        ) : (
          <>
            <TabelaInscritos
              titulo={`Inscritos: ${t.tema}`}
              subtitulo={`${rotuloDia(t.data)}, ${t.hora}h às ${t.hora + 1}h · Instrutor: ${t.instrutor.nome}`}
              linhas={t.inscricoes.map((i) => ({
                id: i.id,
                nome: i.nome,
                restaurante: i.restaurante.nome,
                whatsapp: whatsMascarado(i.whatsapp),
                canal: CANAL[i.canal] ?? i.canal,
                presenca: feita ? (i.presente ? 'presente' : 'faltou') : t.sit === 'ao-vivo' && i.presente ? 'presente' : null,
              }))}
            />
            {feita && <p className="hint">{t.presentes} de {n} presentes ({pct}%). Presença registrada automaticamente pela sala.</p>}
          </>
        )}
      </section>

      {feita && n > 0 && (
        <section>
          <div className="sec-t">Depois da aula</div>
          <div className="minis">
            <div className="mini"><div className="k">Avaliação média</div><div className="v">{t.media !== null ? fmt1(t.media) : <span className="dim">—</span>}</div><div className="hint">{t.avaliacoes} {t.avaliacoes === 1 ? 'avaliação' : 'avaliações'}</div></div>
            <div className="mini"><div className="k">Dúvidas tiradas</div><div className="v">{t.maosLiberadas}</div><div className="hint">Levantaram a mão e foram liberados para falar</div></div>
            <div className="mini"><div className="k">Presentes</div><div className="v">{t.presentes}</div><div className="hint">de {n} inscritos</div></div>
          </div>
          <div className="sec-t sec-t2">Comentários ({t.comentarios.length})</div>
          {t.comentarios.length ? (
            <div className="coms">
              {t.comentarios.map((c) => (
                <div className="com" key={c.id}>
                  {c.nota ? <span className="st">{c.nota} ★</span> : null} {c.comentario}
                  <div className="who">{c.nome} · {c.restaurante.nome}</div>
                </div>
              ))}
            </div>
          ) : <p className="hint">Nenhum comentário nesta turma.</p>}
        </section>
      )}
    </Drawer>
  );
}
