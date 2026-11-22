'use client';
import { useState } from 'react';
import { linkWhatsApp } from '@/lib/acesso-whatsapp';
import { lerLista, type PessoaLista } from '@/lib/importar-lista';
import { Modal } from '@/components/equipe/Modal';
import { importarPessoa, terminarImportacao, type ResultadoImportacao } from './acoes';

/* Importar lista: o RH cola a lista da planilha, confere e libera o acesso de todos de uma vez.
   Cada pessoa vira uma conta de colaborador e recebe o link de primeiro acesso pelo WhatsApp (número de comunicação interna).
   As pessoas são processadas uma de cada vez, em ordem, para o WhatsApp não enviar tudo no mesmo segundo. */

type Etapa = 'colar' | 'conferir' | 'enviando' | 'pronto';

const ROTULO: Record<ResultadoImportacao['situacao'], string> = {
  criado: 'Acesso criado', reenviado: 'Já tinha conta: link reenviado', ja_tem_acesso: 'Já tem acesso (nada mudou)', erro: 'Não foi possível',
};
const ENVIO: Record<string, string> = {
  enviado: 'WhatsApp enviado', erro: 'WhatsApp falhou', nao_configurado: 'WhatsApp desligado', numero_invalido: 'WhatsApp inválido',
};

const textoManual = (nome: string, email: string, link: string) =>
  `Olá, ${nome.split(' ')[0]}! Seu acesso à Takeat Academy está pronto.\n\nCrie sua senha neste link: ${link}\n\nSeu login é o e-mail ${email}. O link vale por 7 dias.`;

export function ModalImportar({ envioAutomatico, onFechar }: { envioAutomatico: boolean; onFechar: () => void }) {
  const [etapa, setEtapa] = useState<Etapa>('colar');
  const [texto, setTexto] = useState('');
  const [lista, setLista] = useState<PessoaLista[]>([]);
  const [res, setRes] = useState<Record<number, ResultadoImportacao>>({});
  const validas = lista.filter((p) => !p.erro);
  const feitos = Object.keys(res).length;

  const conferir = () => { setLista(lerLista(texto)); setEtapa('conferir'); };
  const liberar = async () => {
    setEtapa('enviando');
    for (const p of validas) {
      let r: ResultadoImportacao;
      try { r = await importarPessoa({ nome: p.nome, email: p.email, whatsapp: p.whatsapp, departamento: p.departamento || undefined }); }
      catch { r = { situacao: 'erro', erro: 'Falha de conexão. Tente de novo.' }; }
      setRes((x) => ({ ...x, [p.linha]: r }));
    }
    try { await terminarImportacao(); } catch { /* a lista atualiza ao recarregar */ }
    setEtapa('pronto');
  };

  const contagem = (s: ResultadoImportacao['situacao']) => Object.values(res).filter((r) => r.situacao === s).length;
  const semWhats = Object.values(res).filter((r) => r.link && r.envio !== 'enviado').length;

  return (
    <Modal titulo="Importar lista" onFechar={etapa === 'enviando' ? () => {} : onFechar} rodape={
      etapa === 'colar' ? <>
        <button type="button" className="btn btn-l btn-outlined" onClick={onFechar}>Cancelar</button>
        <button type="button" className="btn btn-l btn-filled" disabled={!texto.trim()} onClick={conferir}><span className="icon">checklist</span>Conferir lista</button>
      </> : etapa === 'conferir' ? <>
        <button type="button" className="btn btn-l btn-outlined" onClick={() => setEtapa('colar')}>Voltar</button>
        <button type="button" className="btn btn-l btn-filled" disabled={!validas.length} onClick={liberar}><span className="icon">send</span>Liberar acesso ({validas.length})</button>
      </> : etapa === 'enviando' ? <>
        <button type="button" className="btn btn-l btn-filled" disabled>Liberando {feitos} de {validas.length}…</button>
      </> : <>
        <button type="button" className="btn btn-l btn-filled" onClick={onFechar}>Concluir</button>
      </>
    }>
      <div className="imp">
        {etapa === 'colar' && (
          <>
            <p>Copie da planilha as colunas <b>nome</b>, <b>e-mail</b> e <b>WhatsApp</b> (o departamento é opcional) e cole aqui, uma pessoa por linha. A ordem das colunas não importa.</p>
            <p>Cada pessoa vira uma conta de <b>colaborador</b> e {envioAutomatico ? 'recebe na hora, pelo WhatsApp da comunicação interna, o link para criar a senha e entrar.' : 'ganha um link para criar a senha. O WhatsApp automático ainda não está ligado: você vai poder mandar o link de cada um no fim.'}</p>
            <div className="fld">
              <label htmlFor="imp-t">Lista</label>
              <textarea id="imp-t" rows={9} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'Ana Souza\tana@takeat.app\t(27) 99999-0000\tFinanceiro\nBeto Lima\tbeto@takeat.app\t(27) 98888-1111\tSuporte'} />
              <div className="info">Quem já tem conta e ainda não entrou recebe o link de novo. Quem já criou a senha não é alterado.</div>
            </div>
          </>
        )}

        {etapa !== 'colar' && (
          <>
            {etapa === 'conferir' && <p><b>{validas.length}</b> {validas.length === 1 ? 'pessoa pronta' : 'pessoas prontas'} para liberar{lista.length > validas.length ? <>, <b>{lista.length - validas.length}</b> com problema (ficam de fora)</> : ''}.</p>}
            {etapa === 'pronto' && (
              <div className="notice imp-ok"><span className="icon">task_alt</span><div>
                <b>Pronto.</b> {contagem('criado')} {contagem('criado') === 1 ? 'acesso criado' : 'acessos criados'}, {contagem('reenviado')} {contagem('reenviado') === 1 ? 'link reenviado' : 'links reenviados'}, {contagem('ja_tem_acesso')} já {contagem('ja_tem_acesso') === 1 ? 'tinha' : 'tinham'} acesso{contagem('erro') ? `, ${contagem('erro')} com erro` : ''}.
                {semWhats > 0 && <> Para {semWhats === 1 ? 'a pessoa' : `as ${semWhats} pessoas`} sem WhatsApp automático, use o botão <b>Enviar</b> na linha.</>}
              </div></div>
            )}
            <div className="imp-tab" role="region" aria-label="Pessoas da lista" tabIndex={0}>
              <table>
                <thead><tr><th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">WhatsApp</th><th scope="col">Situação</th></tr></thead>
                <tbody>
                  {lista.map((p) => {
                    const r = res[p.linha];
                    return (
                      <tr key={p.linha} className={p.erro || r?.situacao === 'erro' ? 'mal' : r ? 'bem' : undefined}>
                        <td>{p.nome || '—'}</td>
                        <td>{p.email || '—'}</td>
                        <td>{p.whatsapp || '—'}</td>
                        <td>
                          {p.erro ? <span className="err">{p.erro}</span>
                            : !r ? <span className="t-sub">{etapa === 'enviando' ? 'Na fila…' : 'Pronto para liberar'}</span>
                              : <span className="imp-st">
                                <b>{ROTULO[r.situacao]}</b>
                                {r.erro && <small>{r.erro}</small>}
                                {r.envio && <small>{ENVIO[r.envio]}</small>}
                                {r.link && r.envio !== 'enviado' && (
                                  <a className="btn btn-m btn-outlined" href={linkWhatsApp(p.whatsapp, textoManual(p.nome, p.email, r.link))} target="_blank" rel="noopener noreferrer"><span className="icon">send</span>Enviar</a>
                                )}
                              </span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
