'use client';
import { BotaoExportar, Paginacao, usePaginacao, type DadosExport } from '@/components/equipe/Tabela';

/* Inscritos da turma no drawer: tabela no computador, cartões no celular, com Exportar e paginação. */

export type LinhaInscrito = { id: string; nome: string; restaurante: string; whatsapp: string; canal: string; presenca: 'presente' | 'faltou' | null };

const ROTULO = { presente: 'Presente', faltou: 'Faltou' };

function Presenca({ p }: { p: LinhaInscrito['presenca'] }) {
  if (!p) return <span className="dim">—</span>;
  return <span className={p === 'presente' ? 'pres-y' : 'pres-n'}>{ROTULO[p]}</span>;
}

export function TabelaInscritos({ linhas, titulo, subtitulo }: { linhas: LinhaInscrito[]; titulo: string; subtitulo: string }) {
  const { visiveis, paginacao } = usePaginacao(linhas);
  const exportar: DadosExport = {
    titulo,
    subtitulo,
    colunas: ['Nome', 'Restaurante', 'WhatsApp', 'Canal', 'Presença'],
    linhas: linhas.map((i) => [i.nome, i.restaurante, i.whatsapp, i.canal, i.presenca ? ROTULO[i.presenca] : '—']),
  };
  return (
    <>
      <div className="sec-bar">
        <div className="sec-t">Inscritos ({linhas.length})</div>
        <BotaoExportar dados={exportar} />
      </div>
      <div className="tframe t-cartoes">
        <table>
          <thead><tr><th scope="col">Nome</th><th scope="col">Restaurante</th><th scope="col">WhatsApp</th><th scope="col">Canal</th><th scope="col">Presença</th></tr></thead>
          <tbody>
            {visiveis.map((i) => (
              <tr key={i.id}>
                <td>{i.nome}</td>
                <td>{i.restaurante}</td>
                <td className="nw">{i.whatsapp}</td>
                <td>{i.canal}</td>
                <td><Presenca p={i.presenca} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mlist">
        {visiveis.map((i) => (
          <article className="mc" key={i.id}>
            <div className="mc-h">
              <div className="mc-n"><b>{i.nome}</b><small>{i.restaurante}</small></div>
              <div className="r"><Presenca p={i.presenca} /></div>
            </div>
            <dl><dt>WhatsApp</dt><dd>{i.whatsapp}</dd><dt>Canal</dt><dd>{i.canal}</dd></dl>
          </article>
        ))}
      </div>
      <Paginacao {...paginacao} />
    </>
  );
}
