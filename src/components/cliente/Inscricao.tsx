'use client';
/* Inscrição em 3 passos (tema → dia/horário → dados), igual ao protótipo. Também serve para "Entrar na aula"
   ao vivo de quem ainda não está inscrito (vai direto aos dados e, ao confirmar, para a sala). */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { TemaTile } from '@/components/TemaTile';
import { cnpjValido, mascaraCnpj, mascaraTelefone, soNumeros, whatsappValido } from '@/lib/formato';
import { inscrever } from '@/lib/inscricao';
import { TEMA, TEMAS, temaVars, type Tema } from '@/lib/temas';
import { diaMes, diaMinusculo, diaSemanaCurto, faixaH, proximaTexto, tituloDia, type CampoInscricao, type CtxInscricao, type TurmaCli } from './comum';
import './cliente.css';

/** Ainda não começou e não foi cancelada */
const livre = (t: TurmaCli) => t.sit === 'agendada';

type Abrir = { tema?: string; turmaId?: string; modo?: 'inscrever' | 'entrar' };
type Api = { abrir: (o?: Abrir) => void; avisar: (msg: string) => void; ctx: CtxInscricao };
const Ctx = createContext<Api | null>(null);

export function useInscricao() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useInscricao fora do InscricaoProvider');
  return c;
}

/* ---------- Gatilhos (podem ser usados dentro de Server Components) ---------- */
export function AbrirInscricao({ tema, turmaId, className, style, disabled, label, children }: {
  tema?: string; turmaId?: string; className?: string; style?: CSSProperties; disabled?: boolean; label?: string; children: ReactNode;
}) {
  const { abrir } = useInscricao();
  return (
    <button type="button" className={className} style={style} disabled={disabled} aria-label={label} onClick={() => abrir({ tema, turmaId })}>
      {children}
    </button>
  );
}

/** "Entrar na aula" ao vivo: com inscrição vai direto para a sala; sem, pede os dados e inscreve antes. */
export function EntrarAula({ turmaId, className, style, label, children }: { turmaId: string; className?: string; style?: CSSProperties; label?: string; children: ReactNode }) {
  const { abrir, ctx } = useInscricao();
  const codigo = ctx.codigos[turmaId];
  if (codigo) return <Link className={className} style={style} href={`/s/${codigo}`} aria-label={label}>{children}</Link>;
  return <button type="button" className={className} style={style} aria-label={label} onClick={() => abrir({ turmaId, modo: 'entrar' })}>{children}</button>;
}

/** Toast do cliente (o mesmo do protótipo, embaixo) */
export function useToast() {
  const [msg, setMsg] = useState('');
  const [on, setOn] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avisar = useCallback((m: string) => {
    setMsg(m); setOn(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setOn(false), 3600);
  }, []);
  useEffect(() => () => clearTimeout(t.current), []);
  const el = (
    <div className={`toast cl-toast${on ? ' on' : ''}`} role="status" aria-live="polite">
      <span className="icon fill">check_circle</span><span>{msg}</span>
    </div>
  );
  return { avisar, toast: el };
}

/* ---------- Provider + diálogo ---------- */
export function InscricaoProvider({ ctx, abrirAoCarregar, children }: { ctx: CtxInscricao; abrirAoCarregar?: boolean; children: ReactNode }) {
  const router = useRouter();
  const dlg = useRef<HTMLDialogElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const { avisar, toast } = useToast();

  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [modo, setModo] = useState<'inscrever' | 'entrar'>('inscrever');
  const [tema, setTema] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [turmaId, setTurmaId] = useState<string | null>(null);

  const [cnpj, setCnpj] = useState('');
  const [restaurante, setRestaurante] = useState('');
  const [nome, setNome] = useState(ctx.pessoa?.nome ?? '');
  const [whats, setWhats] = useState(ctx.pessoa ? mascaraTelefone(ctx.pessoa.whatsapp) : '');
  const [erros, setErros] = useState<Partial<Record<CampoInscricao, string>>>({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, iniciar] = useTransition();

  const porId = useMemo(() => new Map(ctx.turmas.map((t) => [t.id, t])), [ctx.turmas]);
  const minhas = useMemo(() => new Set(ctx.minhas), [ctx.minhas]);
  const aberta = useCallback((t: TurmaCli) => t.sit === 'agendada' && !minhas.has(t.id), [minhas]);

  const abrir = useCallback((o: Abrir = {}) => {
    const t = o.turmaId ? porId.get(o.turmaId) : undefined;
    setModo(o.modo ?? 'inscrever');
    setErros({}); setErroGeral('');
    if (t) { setTema(t.tema); setDia(t.data); setTurmaId(t.id); setPasso(3); }
    else { setTema(o.tema ?? null); setDia(null); setTurmaId(null); setPasso(o.tema ? 2 : 1); }
    if (!dlg.current?.open) dlg.current?.showModal();
  }, [porId]);

  // ?inscrever=1 abre o passo 1 ao carregar (estado inicial já é o passo 1)
  useEffect(() => { if (abrirAoCarregar && !dlg.current?.open) dlg.current?.showModal(); }, [abrirAoCarregar]);

  // Foco: título nos passos 1 e 2; primeiro campo no passo 3
  useEffect(() => {
    if (!dlg.current?.open) return;
    if (passo < 3) titulo.current?.focus();
    else dlg.current.querySelector<HTMLInputElement>('.cl-form .inp:not([readonly])')?.focus();
  }, [passo, turmaId, modo]);

  const turma = turmaId ? porId.get(turmaId) ?? null : null;
  const ident = ctx.ident;
  const pedeCnpj = ident.tipo === 'nenhum';
  const pedeNomeRest = ident.tipo === 'nenhum' || (ident.tipo === 'url' && !ident.restaurante);

  /* Passo 2: dias com horários que ainda vão acontecer */
  const diasDoTema = useMemo(() => {
    if (!tema) return [];
    const m = new Map<string, TurmaCli[]>();
    for (const t of ctx.turmas) if (t.tema === tema && livre(t)) m.set(t.data, [...(m.get(t.data) ?? []), t]);
    return [...m.entries()].map(([data, slots]) => ({ data, slots, abertas: slots.filter(aberta).length }));
  }, [ctx.turmas, tema, aberta]);
  const diaSel = diasDoTema.find((d) => d.data === dia && d.abertas) ?? diasDoTema.find((d) => d.abertas) ?? null;
  const diaRef = useRef<HTMLDivElement>(null);
  useEffect(() => { diaRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }, [diaSel?.data, passo]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!turma || enviando) return;
    const er: Partial<Record<CampoInscricao, string>> = {};
    if (pedeCnpj && !cnpjValido(cnpj)) er.cnpj = soNumeros(cnpj).length === 14 ? 'Esse CNPJ não é válido. Confira os números.' : 'Digite os 14 números do CNPJ.';
    if (pedeNomeRest && restaurante.trim().length < 2) er.restaurante = 'Digite o nome do restaurante.';
    if (nome.trim().length < 2) er.nome = 'Digite seu nome.';
    if (!whatsappValido(whats)) er.whatsapp = 'Digite um WhatsApp com DDD.';
    setErros(er); setErroGeral('');
    const primeiro = (['cnpj', 'restaurante', 'nome', 'whatsapp'] as const).find((k) => er[k]);
    if (primeiro) { dlg.current?.querySelector<HTMLInputElement>(`#e-${primeiro}`)?.focus(); return; }

    iniciar(async () => {
      const r = await inscrever({
        turmaId: turma.id, nome: nome.trim(), whatsapp: soNumeros(whats), canal: ctx.canal,
        cnpj: ident.tipo === 'url' ? ident.cnpj : pedeCnpj ? soNumeros(cnpj) : undefined,
        restaurante: pedeNomeRest ? restaurante.trim() : undefined,
      });
      if (!r.ok) {
        if (r.campo && r.campo !== 'turma') { setErros({ [r.campo]: r.erro }); dlg.current?.querySelector<HTMLInputElement>(`#e-${r.campo}`)?.focus(); }
        else setErroGeral(r.erro);
        return;
      }
      dlg.current?.close();
      if (modo === 'entrar') { router.push(`/s/${r.codigo}`); return; }
      avisar(r.mensagem);
      router.refresh();
    });
  }

  const tituloTxt = modo === 'entrar' ? 'Entrar na aula' : ['Qual tema você quer aprender?', 'Escolha o dia e o horário', 'Confirme seus dados'][passo - 1];
  const sub = modo === 'entrar' ? 'Diga quem você é para a instrutora te reconhecer na sala.' : `Passo ${passo} de 3`;
  const api = useMemo(() => ({ abrir, avisar, ctx }), [abrir, avisar, ctx]);

  return (
    <Ctx.Provider value={api}>
      {children}
      {toast}
      <dialog ref={dlg} className="cl-dlg" aria-labelledby="enroll-title">
        <form onSubmit={enviar} noValidate>
          <div className="dlg-h">
            <div>
              <h2 id="enroll-title" ref={titulo} tabIndex={-1}>{tituloTxt}</h2>
              <p>{sub}</p>
            </div>
            <button type="button" className="x" aria-label="Fechar" onClick={() => dlg.current?.close()}><span className="icon">close</span></button>
          </div>
          {modo === 'inscrever' && <div className="steps" aria-hidden="true">{[1, 2, 3].map((i) => <i key={i} className={i <= passo ? 'on' : undefined} />)}</div>}

          {passo === 1 && (
            <div className="dlg-b">
              <div className="tema-grid">
                {TEMAS.map((tm) => {
                  const nx = ctx.turmas.find((t) => t.tema === tm && aberta(t));
                  return (
                    <button key={tm} type="button" className="tcard" style={temaVars(tm)} disabled={!nx} onClick={() => { setTema(tm); setDia(null); setPasso(2); }}>
                      <TemaTile tema={tm} />
                      <span><span className="n">{tm}</span><span className="d">{TEMA[tm].descricao}</span></span>
                      <span className="ft">
                        <span className="nx">{nx ? <>Próxima: <b>{proximaTexto(nx.data, nx.hora, ctx.hoje)}</b></> : 'Sem horários abertos'}</span>
                        <span className="icon go">arrow_forward</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {passo === 2 && tema && (
            <div className="dlg-b">
              <div className="chosen" style={temaVars(tema)}>
                <TemaTile tema={tema} />
                <div className="txt"><div className="n">{tema}</div><div className="d">{TEMA[tema as Tema]?.descricao}</div></div>
                <button type="button" onClick={() => setPasso(1)}>Trocar tema</button>
              </div>
              <div className="eblk">
                <div className="eblk-h">1. Escolha o dia</div>
                <div className="dchips" role="tablist" aria-label="Dias" ref={diaRef}>
                  {diasDoTema.map((d) => (
                    <button key={d.data} type="button" className="dchip" role="tab" aria-selected={diaSel?.data === d.data} disabled={!d.abertas} onClick={() => setDia(d.data)}>
                      <span className="wd">{diaSemanaCurto(d.data, ctx.hoje)}</span>
                      <span className="dt">{diaMes(d.data)}</span>
                      <span className="ct">{d.abertas ? `${d.abertas} ${d.abertas === 1 ? 'horário' : 'horários'}` : 'Inscrito'}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="eblk">
                <div className="eblk-h">2. Escolha o horário{diaSel ? ` · ${diaMinusculo(diaSel.data, ctx.hoje)}` : ''}</div>
                {!diaSel ? (
                  <div className="none">Não há horários abertos para esse tema até 31 de dezembro.</div>
                ) : (
                  <div className="slots">
                    {diaSel.slots.map((s) => {
                      const ja = minhas.has(s.id);
                      return (
                        <button key={s.id} type="button" className="srow" disabled={ja} onClick={() => { setTurmaId(s.id); setDia(s.data); setPasso(3); }}>
                          <span className="clock"><span className="icon">schedule</span></span>
                          <span className="txt"><span className="h">{faixaH(s.hora)}</span><span className="m">Aula ao vivo de 1 hora</span></span>
                          {ja ? <span className="chip chip-teal"><span className="icon s16 fill">check_circle</span>Inscrito</span> : <span className="icon go">chevron_right</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {passo === 3 && turma && (
            <>
              <div className="dlg-b cl-form">
                <div className="summary">
                  <TemaTile tema={turma.tema} size="sm" />
                  <div><div className="h">{turma.tema}</div><div className="info">{tituloDia(turma.data, ctx.hoje)} · {faixaH(turma.hora)}{turma.sit === 'ao-vivo' ? ' · ao vivo agora' : ''}</div></div>
                </div>
                {erroGeral && <div className="alerta" role="alert"><span className="icon">error</span>{erroGeral}</div>}
                {ident.tipo === 'url' && (
                  <div className="rest-id">
                    <span className="icon">storefront</span>
                    <div><div className="h">{ident.restaurante ?? 'Restaurante novo'}</div><div className="info">CNPJ {mascaraCnpj(ident.cnpj)}</div></div>
                  </div>
                )}
                {pedeCnpj && (
                  <div>
                    <label className="lbl" htmlFor="e-cnpj">CNPJ do restaurante</label>
                    <input className={`inp${erros.cnpj ? ' err' : ''}`} id="e-cnpj" inputMode="numeric" autoComplete="off" placeholder="00.000.000/0000-00"
                      value={cnpj} aria-invalid={!!erros.cnpj} aria-describedby="e-cnpj-m"
                      onChange={(e) => { setCnpj(mascaraCnpj(e.target.value)); setErros((x) => ({ ...x, cnpj: undefined })); }} />
                    {erros.cnpj ? <div className="errmsg" id="e-cnpj-m">{erros.cnpj}</div> : <div className="info" id="e-cnpj-m">Só pedimos uma vez.</div>}
                  </div>
                )}
                {pedeNomeRest && (
                  <div>
                    <label className="lbl" htmlFor="e-restaurante">Nome do restaurante</label>
                    <input className={`inp${erros.restaurante ? ' err' : ''}`} id="e-restaurante" autoComplete="organization" placeholder="Como o restaurante é conhecido"
                      value={restaurante} aria-invalid={!!erros.restaurante} maxLength={120}
                      onChange={(e) => { setRestaurante(e.target.value); setErros((x) => ({ ...x, restaurante: undefined })); }} />
                    {erros.restaurante && <div className="errmsg">{erros.restaurante}</div>}
                  </div>
                )}
                <div>
                  <label className="lbl" htmlFor="e-nome">Seu nome</label>
                  <input className={`inp${erros.nome ? ' err' : ''}`} id="e-nome" autoComplete="name" placeholder="Como você quer ser chamado na aula"
                    value={nome} aria-invalid={!!erros.nome} maxLength={80}
                    onChange={(e) => { setNome(e.target.value); setErros((x) => ({ ...x, nome: undefined })); }} />
                  {erros.nome && <div className="errmsg">{erros.nome}</div>}
                </div>
                <div>
                  <label className="lbl" htmlFor="e-whatsapp">WhatsApp com DDD</label>
                  <input className={`inp${erros.whatsapp ? ' err' : ''}`} id="e-whatsapp" inputMode="tel" autoComplete="tel" placeholder="(00) 00000-0000"
                    value={whats} aria-invalid={!!erros.whatsapp} aria-describedby="e-whatsapp-m"
                    onChange={(e) => { setWhats(mascaraTelefone(e.target.value)); setErros((x) => ({ ...x, whatsapp: undefined })); }} />
                  {erros.whatsapp ? <div className="errmsg" id="e-whatsapp-m">{erros.whatsapp}</div> : <div className="info" id="e-whatsapp-m">O link da sala chega por aqui.</div>}
                </div>
              </div>
              <div className="dlg-f">
                {modo === 'inscrever'
                  ? <button className="btn btn-l btn-outlined" type="button" onClick={() => setPasso(2)}><span className="icon">arrow_back</span>Voltar</button>
                  : <button className="btn btn-l btn-outlined" type="button" onClick={() => dlg.current?.close()}>Cancelar</button>}
                <button className="btn btn-l btn-filled" type="submit" disabled={enviando}>
                  {enviando ? <><span className="icon spin">progress_activity</span>Confirmando…</> : modo === 'entrar' ? <><span className="icon">login</span>Entrar na aula</> : 'Confirmar inscrição'}
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </Ctx.Provider>
  );
}
