import Link from 'next/link';
import { cargoValido, ehEquipe } from '@/lib/permissoes';
import { exigirUsuario } from '@/lib/sessao';
import { hoje, segundaDe, somaDias } from '@/lib/datas';
import { TEMAS } from '@/lib/temas';
import { db } from '@/lib/db';
import { gradeAtual } from '@/lib/equipe';
import { Toaster } from '@/components/equipe/Toast';
import { GradeEditor } from './GradeEditor';
import './grade.css';

export const metadata = { title: 'Grade modelo' };

const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

export default async function Grade() {
  await exigirUsuario({ gestor: true });
  const hj = hoje();
  const [{ celulas, vigente, futura }, pessoas] = await Promise.all([
    gradeAtual(),
    db.usuario.findMany({ orderBy: { nome: 'asc' }, select: { id: true, nome: true, ativo: true, cargo: true } }),
  ]);
  const proxSegunda = somaDias(segundaDe(hj), 7);
  const usados = new Set(celulas.flatMap((c) => [c.instrutorId, c.plantaoId]));
  // Na lista: equipe ativa + quem saiu da equipe mas ainda está na grade (para aparecer marcado)
  const naEquipe = (p: (typeof pessoas)[number]) => p.ativo && ehEquipe(cargoValido(p.cargo));
  const opcoes = pessoas.filter((p) => naEquipe(p) || usados.has(p.id)).map((p) => ({ id: p.id, nome: naEquipe(p) ? p.nome : `${p.nome} (desativado)`, ativo: naEquipe(p) }));

  return (
    <div className="gr-pg">
      <div className="rp-head">
        <div>
          <h1>Grade modelo</h1>
          <p>A semana padrão que se repete. Mudanças pontuais (trocar instrutor, cancelar) são feitas na agenda.</p>
        </div>
        <div className="rp-actions"><Link className="btn btn-l btn-outlined" href="/equipe/agenda"><span className="icon">calendar_month</span>Ver agenda</Link></div>
      </div>
      {futura ? (
        <div className="notice gr-note">
          <span className="icon">event_upcoming</span>
          <div><b>Você está editando a grade agendada para {ddmm(futura)}</b>A grade atual{vigente ? ` (desde ${ddmm(vigente)})` : ''} continua valendo até lá.</div>
        </div>
      ) : vigente ? (
        <p className="gr-vig">Grade em vigor desde {ddmm(vigente)}.</p>
      ) : null}
      {celulas.length ? (
        <GradeEditor inicial={celulas} temas={[...TEMAS]} pessoas={opcoes} valePadrao={futura ?? proxSegunda} minimo={somaDias(hj, 1)} />
      ) : (
        <div className="tcard"><div className="state"><span className="icon">view_week</span><b>Grade ainda não criada</b><p>Rode o seed do banco (npm run db:seed) para criar a grade inicial de 25 turmas por semana.</p></div></div>
      )}
      <Toaster />
    </div>
  );
}
