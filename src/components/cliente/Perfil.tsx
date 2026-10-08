'use client';
/* Peças interativas do perfil: identificar pelo CNPJ e cancelar inscrição (com confirmação). */
import { useRouter } from 'next/navigation';
import { useActionState, useRef, useState, useTransition } from 'react';
import { mascaraCnpj } from '@/lib/formato';
import { cancelarInscricao, identificar } from '@/lib/inscricao';
import type { ResultadoIdentificar } from './comum';
import { useInscricao } from './Inscricao';

export function IdentificarForm() {
  const [estado, acao, pendente] = useActionState<ResultadoIdentificar, FormData>(identificar, { ok: false });
  const [cnpj, setCnpj] = useState('');
  const [rest, setRest] = useState('');
  const [limpo, setLimpo] = useState<'cnpj' | 'restaurante' | null>(null);
  const precisaNome = !!estado.precisaNome;
  const erro = (c: 'cnpj' | 'restaurante') => (estado.campo === c && limpo !== c ? estado.erro : undefined);

  return (
    <form className="cl-form" action={(fd) => { setLimpo(null); return acao(fd); }} noValidate>
      <div>
        <label className="lbl" htmlFor="p-cnpj">CNPJ do restaurante</label>
        <input className={`inp${erro('cnpj') ? ' err' : ''}`} id="p-cnpj" name="cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00"
          value={cnpj} onChange={(e) => { setCnpj(mascaraCnpj(e.target.value)); setLimpo('cnpj'); }} aria-invalid={!!erro('cnpj')} autoFocus />
        {erro('cnpj') && <div className="errmsg" role="alert">{erro('cnpj')}</div>}
      </div>
      {precisaNome && (
        <div>
          <label className="lbl" htmlFor="p-rest">Nome do restaurante</label>
          <input className={`inp${erro('restaurante') ? ' err' : ''}`} id="p-rest" name="restaurante" autoComplete="organization" placeholder="Como o restaurante é conhecido"
            maxLength={120} value={rest} onChange={(e) => { setRest(e.target.value); setLimpo('restaurante'); }} aria-invalid={!!erro('restaurante')} autoFocus />
          {erro('restaurante')
            ? <div className="errmsg" role="alert">{erro('restaurante')}</div>
            : <div className="info">Primeira vez por aqui: diga o nome do restaurante.</div>}
        </div>
      )}
      <button className="btn btn-l btn-filled btn-block" type="submit" disabled={pendente}>
        {pendente ? <><span className="icon spin">progress_activity</span>Identificando…</> : <><span className="icon">storefront</span>Identificar restaurante</>}
      </button>
    </form>
  );
}

export function CancelarInscricao({ id, descricao }: { id: string; descricao: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { avisar } = useInscricao();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState('');

  const confirmar = () => iniciar(async () => {
    const r = await cancelarInscricao(id);
    if (!r.ok) { setErro(r.mensagem); return; }
    dlg.current?.close();
    avisar(r.mensagem);
    router.refresh();
  });

  return (
    <>
      <button type="button" className="btn btn-m btn-outlined" onClick={() => { setErro(''); dlg.current?.showModal(); }}>Cancelar inscrição</button>
      <dialog ref={dlg} className="cl-confirm" aria-labelledby={`cx-${id}`}>
        <div className="dlg-h">
          <h2 id={`cx-${id}`}>Cancelar inscrição?</h2>
          <button type="button" className="x" aria-label="Fechar" onClick={() => dlg.current?.close()}><span className="icon">close</span></button>
        </div>
        <div className="dlg-b cl-form">
          <p>{descricao}. O link pessoal da sala deixa de funcionar.</p>
          {erro && <div className="alerta" role="alert" style={{ marginTop: 16 }}><span className="icon">error</span>{erro}</div>}
        </div>
        <div className="dlg-f">
          <button type="button" className="btn btn-l btn-outlined" onClick={() => dlg.current?.close()}>Manter inscrição</button>
          <button type="button" className="btn btn-l btn-danger" onClick={confirmar} disabled={pendente}>
            {pendente ? 'Cancelando…' : 'Cancelar inscrição'}
          </button>
        </div>
      </dialog>
    </>
  );
}
