'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Modal } from '@/components/equipe/Modal';
import { toast } from '@/components/equipe/Toast';
import '@/components/equipe/equipe-comp.css';
import { criarTrilha } from './acoes';

export function NovaTrilha() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [erro, setErro] = useState('');
  const [pend, start] = useTransition();
  const criar = (e?: React.FormEvent) => {
    e?.preventDefault();
    start(async () => {
      const r = await criarTrilha(titulo);
      if (!r.ok) { setErro(r.erro); return; }
      toast(r.msg, 'route');
      router.push(`/interno/conteudo/trilhas/${r.id}`);
    });
  };
  return (
    <>
      <button type="button" className="btn btn-l btn-filled" onClick={() => setAberto(true)}><span className="icon">add</span>Nova trilha</button>
      {aberto && (
        <Modal titulo="Nova trilha" onFechar={() => setAberto(false)} rodape={<>
          <button type="button" className="btn btn-l btn-outlined" onClick={() => setAberto(false)}>Cancelar</button>
          <button type="submit" form="nt-f" className="btn btn-l btn-filled" disabled={pend}>{pend ? 'Criando…' : 'Criar trilha'}</button>
        </>}>
          <form id="nt-f" onSubmit={criar} noValidate>
            <div className="fld">
              <label htmlFor="nt-t">Título</label>
              <input id="nt-t" maxLength={120} placeholder="Ex.: Trilha do Financeiro" value={titulo} onChange={(e) => setTitulo(e.target.value)} aria-invalid={!!erro} />
              {erro ? <div className="err" role="alert">{erro}</div> : <div className="info">A trilha nasce como rascunho, com uma etapa. Publique quando estiver pronta.</div>}
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
