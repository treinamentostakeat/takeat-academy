import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { exigirPessoa } from '@/lib/sessao';
import { diaDaJornada, trilhasDoUsuario, vistaDaTrilha } from '@/lib/trilhas';
import '../../(area)/academy.css';

export const metadata = { title: 'Formatura' };

const fmtData = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo' });

/* Formatura: tela de parabéns quando a pessoa conclui todos os cursos da trilha.
   Quem ainda não terminou volta para a home da trilha. */
export default async function Formatura({ params }: { params: Promise<{ id: string }> }) {
  const u = await exigirPessoa();
  const { id } = await params;
  const t = (await trilhasDoUsuario(u)).find((x) => x.id === id);
  if (!t) notFound();
  const home = `/interno/trilhas/${t.id}`;
  if (!t.total || t.concluidos < t.total) redirect(home);

  const ids = t.etapas.flatMap((e) => e.cursos.map((c) => c.id));
  const [notas, vista] = await Promise.all([
    db.progresso.findMany({ where: { usuarioId: u.id, cursoId: { in: ids } }, select: { acertos: true, total: true, concluidoEm: true } }),
    vistaDaTrilha(u.id, t.id),
  ]);
  const acertos = notas.reduce((n, p) => n + p.acertos, 0);
  const perguntas = notas.reduce((n, p) => n + p.total, 0);
  const fim = notas.reduce((d, p) => (p.concluidoEm > d ? p.concluidoEm : d), notas[0]?.concluidoEm ?? new Date());
  const dias = vista ? diaDaJornada(vista, fim) : null;

  return (
    <div className="ac ac-solo">
      <div className="ac-bv ac-fm">
        <div className="ac-brilho" aria-hidden="true" />
        <Confetes />
        <header className="ac-bv-top">
          <span className="ac-marca"><span className="ac-marca-t">Takeat</span><span className="ac-marca-s">ACADEMY</span></span>
          <Link className="pular" href={home}>Voltar para a trilha</Link>
        </header>

        <main className="ac-fm-main">
          <Capelo />
          <p className="ac-eyebrow">Formatura · {t.titulo}</p>
          <h1>Parabéns, <em>{u.nome.split(' ')[0]}!</em></h1>
          <div className="ac-bv-risco" aria-hidden="true" />
          <p className="lead">Você concluiu a trilha <b>{t.titulo}</b>. Agora você conhece como a Takeat funciona por dentro. Boas-vindas de verdade ao time!</p>

          <div className="ac-fm-numeros">
            <div><b>{t.total}</b><span>{t.total === 1 ? 'curso concluído' : 'cursos concluídos'}</span></div>
            {perguntas > 0 && <div><b>{Math.round((acertos / perguntas) * 100)}%</b><span>de acertos nos quizzes</span></div>}
            {dias && <div><b>{dias}</b><span>{dias === 1 ? 'dia de jornada' : 'dias de jornada'}</span></div>}
          </div>
          <p className="ac-fm-data">Concluída em {fmtData(fim)}</p>

          <div className="ac-bv-acts">
            <a className="ac-btn prim grande" href={`/interno/certificado/${t.id}?ver=1`} target="_blank" rel="noopener noreferrer"><span className="icon" aria-hidden="true">workspace_premium</span>Abrir certificado</a>
            <a className="ac-btn sec grande" href={`/interno/certificado/${t.id}`}><span className="icon" aria-hidden="true">download</span>Baixar certificado</a>
            <Link className="ac-btn sec grande" href="/interno">Ir para o início<span className="icon" aria-hidden="true">arrow_forward</span></Link>
            <Link className="ac-btn sec grande" href={home}><span className="icon" aria-hidden="true">route</span>Rever a trilha</Link>
          </div>
        </main>
      </div>
    </div>
  );
}

/** Chapéu de formatura com borla amarela */
function Capelo() {
  return (
    <svg className="ac-fm-capelo" aria-hidden="true" viewBox="0 0 240 190">
      <defs>
        <linearGradient id="fm-topo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#DA232C" /><stop offset=".55" stopColor="#C8131A" /><stop offset="1" stopColor="#8E0B12" />
        </linearGradient>
      </defs>
      <path d="M58 92v44c0 18 28 32 62 32s62-14 62-32V92l-62 26z" fill="#26262B" stroke="#3A3A40" strokeWidth="2" />
      <path d="M120 20l112 46-112 46L8 66z" fill="url(#fm-topo)" />
      <path d="M120 20l112 46-112 46L8 66z" fill="none" stroke="#FF6B6F" strokeOpacity=".35" strokeWidth="2" />
      <circle cx="120" cy="66" r="7" fill="#F5A623" />
      <path d="M120 66l84 26v52" fill="none" stroke="#F5A623" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M196 144h16l-3 26h-10z" fill="#F5A623" />
    </svg>
  );
}

/** Confetes caindo (param com prefers-reduced-motion) */
function Confetes() {
  const cores = ['#F5A623', '#C8131A', '#FF6B6F', '#F5F5F5'];
  return (
    <div className="ac-fm-confetes" aria-hidden="true">
      {Array.from({ length: 28 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 37) % 100}%`, background: cores[i % cores.length], animationDelay: `${(i % 7) * 0.45}s`, animationDuration: `${4 + (i % 5)}s`, transform: `rotate(${i * 29}deg)` }} />
      ))}
    </div>
  );
}
