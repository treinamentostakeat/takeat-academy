'use client';
import { useState, useTransition } from 'react';
import { Dropdown } from '@/components/Dropdown';
import { Modal } from './Modal';
import './equipe-comp.css';
import { toast } from './Toast';
import { cancelarTurma, trocarInstrutor, type Resultado } from '@/app/equipe/(area)/agenda/acoes';

/* Ações do gestor no detalhe da turma: trocar instrutor e cancelar turma (modais). */

type Pessoa = { id: string; nome: string };
type Props = {
  turma: { id: string; tema: string; quando: string; instrutorId: string; plantaoId: string; inscritos: number };
  pessoas: Pessoa[];
  podeTrocar: boolean;
  podeCancelar: boolean;
};

export function AcoesTurma({ turma, pessoas, podeTrocar, podeCancelar }: Props) {
  const [aberto, setAberto] = useState<'troca' | 'cancel' | null>(null);
  return (
    <>
      {podeTrocar && <button type="button" className="btn btn-l btn-outlined" onClick={() => setAberto('troca')}><span className="icon">swap_horiz</span>Trocar instrutor</button>}
      {podeCancelar && <button type="button" className="btn btn-l btn-danger-o" onClick={() => setAberto('cancel')}>Cancelar turma</button>}
      {aberto === 'troca' && <ModalTroca turma={turma} pessoas={pessoas} onFechar={() => setAberto(null)} />}
      {aberto === 'cancel' && <ModalCancel turma={turma} onFechar={() => setAberto(null)} />}
    </>
  );
}

function useAcao(onFechar: () => void) {
  const [pend, start] = useTransition();
  const [erro, setErro] = useState('');
  const rodar = (f: () => Promise<Resultado>) =>
    start(async () => {
      setErro('');
      try {
        const r = await f();
        if (r.ok) { onFechar(); toast(r.msg); } else setErro(r.erro);
      } catch {
        setErro('Não foi possível concluir. Tente de novo.');
      }
    });
  return { pend, erro, rodar };
}

function ModalTroca({ turma, pessoas, onFechar }: { turma: Props['turma']; pessoas: Pessoa[]; onFechar: () => void }) {
  const [inst, setInst] = useState(turma.instrutorId);
  const [plant, setPlant] = useState(turma.plantaoId);
  const { pend, erro, rodar } = useAcao(onFechar);
  // Se a pessoa da aula ou do plantão foi desativada, ainda aparece na lista para não sumir da tela
  const opcoes = (atual: string) => {
    const l = [...pessoas];
    if (!l.some((p) => p.id === atual)) l.unshift({ id: atual, nome: 'Pessoa desativada' });
    return l.map((p) => ({ value: p.id, label: p.nome }));
  };
  return (
    <Modal
      titulo="Trocar instrutor"
      onFechar={onFechar}
      rodape={<>
        <button type="button" className="btn btn-l btn-outlined" onClick={onFechar}>Voltar</button>
        <button type="button" className="btn btn-l btn-filled" disabled={pend} onClick={() => rodar(() => trocarInstrutor({ turmaId: turma.id, instrutorId: inst, plantaoId: plant }))}>
          {pend ? 'Salvando…' : 'Trocar instrutor'}
        </button>
      </>}
    >
      <p>{turma.tema} · {turma.quando}. A troca vale só para esta turma; a grade modelo não muda.</p>
      <div className="fld">
        <label htmlFor="f-inst">Instrutor da aula</label>
        <Dropdown id="f-inst" value={inst} onChange={setInst} opcoes={opcoes(turma.instrutorId)} />
      </div>
      <div className="fld">
        <label htmlFor="f-plant">Plantão</label>
        <Dropdown id="f-plant" value={plant} onChange={setPlant} opcoes={opcoes(turma.plantaoId)} />
        {inst === plant
          ? <div className="info aviso"><span className="icon s16">warning</span>A mesma pessoa fica na aula e no plantão: o plantão fecha neste horário.</div>
          : <div className="info">Treinamento é prioridade: se quem dá a aula faltar, quem está no plantão assume.</div>}
      </div>
      {erro && <p className="err" role="alert">{erro}</p>}
    </Modal>
  );
}

function ModalCancel({ turma, onFechar }: { turma: Props['turma']; onFechar: () => void }) {
  const [motivo, setMotivo] = useState('');
  const { pend, erro, rodar } = useAcao(onFechar);
  const n = turma.inscritos;
  return (
    <Modal
      titulo="Cancelar turma?"
      onFechar={onFechar}
      foco=".md-f .btn-outlined"
      rodape={<>
        <button type="button" className="btn btn-l btn-outlined" onClick={onFechar}>Voltar</button>
        <button type="button" className="btn btn-l btn-danger" disabled={pend} onClick={() => rodar(() => cancelarTurma({ turmaId: turma.id, motivo: motivo.trim() || undefined }))}>
          {pend ? 'Cancelando…' : 'Cancelar turma'}
        </button>
      </>}
    >
      <p><b className="forte">{turma.tema}</b> · {turma.quando}.</p>
      <p>
        {n
          ? `${n === 1 ? 'O inscrito recebe' : `Os ${n} inscritos recebem`} um aviso automático no WhatsApp com link para escolher outro horário.`
          : 'Esta turma ainda não tem inscritos. Quem tentar se inscrever verá outro horário.'}{' '}
        A ação não pode ser desfeita.
      </p>
      <div className="fld">
        <label htmlFor="f-mot">Motivo (opcional)</label>
        <textarea id="f-mot" value={motivo} maxLength={300} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: instrutora e plantão indisponíveis" />
        <div className="info">Fica registrado só para a equipe; não vai na mensagem.</div>
      </div>
      {erro && <p className="err" role="alert">{erro}</p>}
    </Modal>
  );
}
