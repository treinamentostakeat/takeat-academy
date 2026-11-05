'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { iniciais } from '@/lib/formato';
import { DESCRICAO_CARGO, ROTULO_CARGO, ehEquipe, loginDe, type Cargo } from '@/lib/permissoes';
import { Dropdown } from '@/components/Dropdown';
import { BotaoExportar, Paginacao, usePaginacao } from '@/components/equipe/Tabela';
import { Modal } from '@/components/equipe/Modal';
import { toast } from '@/components/equipe/Toast';
import '@/components/equipe/equipe-comp.css';
import { criarUsuario, definirAtivo, gerarNovaSenha, trocarCargo, type ResultadoUsuario } from './acoes';

export type Linha = { id: string; nome: string; email: string; cargo: Cargo; ativo: boolean; departamento: string | null; acesso: string | null; eu: boolean; futuras: number; gerenciavel: boolean };
type Filtro = { q: string; cargo: '' | Cargo; sit: '' | 'ativo' | 'off' };
type Aberto =
  | { t: 'novo' }
  | { t: 'cargo' | 'senha' | 'desativar'; u: Linha }
  | { t: 'senhaGerada'; nome: string; email: string; cargo: Cargo; senha: string; nova: boolean }
  | null;

const CARGO: Record<Cargo, { l: string; cls: string }> = {
  gestor: { l: ROTULO_CARGO.gestor, cls: 'chip-gestor' },
  instrutor: { l: ROTULO_CARGO.instrutor, cls: 'chip-blue' },
  rh: { l: ROTULO_CARGO.rh, cls: 'chip-teal' },
  colaborador: { l: ROTULO_CARGO.colaborador, cls: 'chip-neutral' },
};
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* Lista de contas com filtros e ações. Usada pelo gestor (todos os cargos) e pelo RH (só os cargos que ele administra). */
export function UsuariosTabela({ linhas, filtro, cargos, titulo, subtitulo, rotuloTabela, comDepartamento }: {
  linhas: Linha[];
  filtro: Filtro;
  /** Cargos que quem está vendo pode dar */
  cargos: Cargo[];
  titulo: string;
  subtitulo: string;
  rotuloTabela: string;
  comDepartamento?: boolean;
}) {
  const [f, setF] = useState<Filtro>(filtro);
  const [aberto, setAberto] = useState<Aberto>(null);
  const [menu, setMenu] = useState<{ u: Linha; btn: HTMLButtonElement } | null>(null);
  const [pend, start] = useTransition();

  // Estado dos filtros na URL (sem recarregar a página)
  useEffect(() => {
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.cargo) p.set('cargo', f.cargo);
    if (f.sit) p.set('sit', f.sit);
    const s = p.toString();
    window.history.replaceState(null, '', location.pathname + (s ? `?${s}` : ''));
  }, [f]);

  const palavras = norm(f.q).split(/\s+/).filter(Boolean);
  const lista = linhas.filter((u) =>
    (!f.cargo || u.cargo === f.cargo) &&
    (!f.sit || (f.sit === 'ativo' ? u.ativo : !u.ativo)) &&
    palavras.every((w) => norm(`${u.nome} ${u.email}`).includes(w)));
  const { visiveis, paginacao } = usePaginacao(lista, `${f.q}|${f.cargo}|${f.sit}`);
  const ativos = linhas.filter((u) => u.ativo).length;
  const limpar = () => setF({ q: '', cargo: '', sit: '' });

  const reativar = (u: Linha) => start(async () => {
    const r = await definirAtivo(u.id, true);
    toast(r.ok ? r.msg : r.erro, r.ok ? 'person_check' : 'error');
  });
  const acao = (a: 'cargo' | 'senha' | 'desativar' | 'reativar', u: Linha) => {
    setMenu(null);
    if (a === 'reativar') reativar(u);
    else setAberto({ t: a, u });
  };

  const sitChip = (u: Linha) => <span className={`chip ${u.ativo ? 'chip-teal' : 'chip-neutral'}`}>{u.ativo ? 'Ativo' : 'Desativado'}</span>;
  const cargoChip = (u: Linha) => <span className={`chip ${CARGO[u.cargo].cls}`}>{CARGO[u.cargo].l}</span>;
  const kebab = (u: Linha) => !u.gerenciavel
    ? <span className="dash" aria-label={u.eu ? 'Sem ações para você mesmo' : 'Sem ações disponíveis'}>–</span>
    : (
      <button type="button" className="kb" aria-haspopup="menu" aria-expanded={menu?.u.id === u.id} aria-label={`Ações para ${u.nome}`} disabled={pend}
        onClick={(e) => { const btn = e.currentTarget; setMenu((m) => (m?.u.id === u.id ? null : { u, btn })); }}>
        <span className="icon">more_vert</span>
      </button>
    );
  const av = (u: Linha) => <span className={`av${u.eu ? ' me' : ''}${u.ativo ? '' : ' off'}`}>{iniciais(u.nome)}</span>;

  return (
    <>
      <div className="rp-head">
        <div>
          <h1>{titulo}</h1>
          <p>{subtitulo}</p>
        </div>
        <div className="rp-actions">
          <button type="button" className="btn btn-l btn-filled" onClick={() => setAberto({ t: 'novo' })}><span className="icon">person_add</span>Adicionar pessoa</button>
        </div>
      </div>

      <section className="tcard users" aria-labelledby="t-h">
        <div className="tbar">
          <div><h2 id="t-h">{rotuloTabela}</h2><p className="t-sub">{linhas.length} {linhas.length === 1 ? 'usuário' : 'usuários'}: {ativos} {ativos === 1 ? 'ativo' : 'ativos'}.</p></div>
          <div className="tools">
            <label className="search"><span className="icon">search</span><input type="search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Buscar na tabela" aria-label="Buscar por nome ou e-mail" /></label>
            {cargos.length > 1 && (
              <span className="sel">
                <Dropdown ariaLabel="Cargo" className={f.cargo ? 'on' : ''} value={f.cargo} onChange={(v) => setF({ ...f, cargo: v as Filtro['cargo'] })}
                  opcoes={[{ value: '', label: 'Todos os cargos' }, ...cargos.map((c) => ({ value: c, label: CARGO[c].l }))]} />
              </span>
            )}
            <span className="sel">
              <Dropdown ariaLabel="Situação" className={f.sit ? 'on' : ''} value={f.sit} onChange={(v) => setF({ ...f, sit: v as Filtro['sit'] })}
                opcoes={[{ value: '', label: 'Todas as situações' }, { value: 'ativo', label: 'Ativo' }, { value: 'off', label: 'Desativado' }]} />
            </span>
            <BotaoExportar dados={{
              titulo: rotuloTabela,
              subtitulo: `${lista.length} de ${linhas.length} ${linhas.length === 1 ? 'usuário' : 'usuários'}`,
              colunas: ['Nome', 'E-mail', 'Cargo', 'Departamento', 'Situação', 'Último acesso'],
              linhas: lista.map((u) => [u.nome, u.email, CARGO[u.cargo].l, u.departamento ?? '—', u.ativo ? 'Ativo' : 'Desativado', u.acesso ?? 'Nunca entrou']),
            }} />
          </div>
        </div>
        {(f.cargo || f.sit) && (
          <div className="fchip-row">
            <span className="lbl-s">Filtros aplicados:</span>
            {f.cargo && <span className="fchip">Cargo: {CARGO[f.cargo].l}<button type="button" onClick={() => setF({ ...f, cargo: '' })} aria-label="Remover filtro de cargo"><span className="icon s16">close</span></button></span>}
            {f.sit && <span className="fchip">Situação: {f.sit === 'ativo' ? 'Ativo' : 'Desativado'}<button type="button" onClick={() => setF({ ...f, sit: '' })} aria-label="Remover filtro de situação"><span className="icon s16">close</span></button></span>}
            <button type="button" className="linkbtn" onClick={limpar}>Limpar filtros</button>
          </div>
        )}

        {!lista.length ? (
          <div className="state">
            <span className="icon">search_off</span>
            <b>Nenhum usuário encontrado{f.q ? ` para “${f.q}”` : ''}</b>
            <p>Ninguém da equipe combina com {f.q ? 'essa busca' : 'os filtros'}. Confira o nome ou o e-mail, ou limpe os filtros.</p>
            <div className="acts"><button type="button" className="btn btn-l btn-outlined" onClick={limpar}>Limpar filtros</button></div>
          </div>
        ) : (
          <>
            <div className="tframe t-cartoes">
              <table>
                <thead><tr><th scope="col">Nome</th><th scope="col" className="mail">E-mail</th><th scope="col" className="c">Cargo</th>{comDepartamento && <th scope="col" className="dep">Departamento</th>}<th scope="col" className="c">Situação</th><th scope="col" className="num">Último acesso</th><th scope="col" className="c">Ações</th></tr></thead>
                <tbody>
                  {visiveis.map((u) => (
                    <tr key={u.id}>
                      <td><span className="idc">{av(u)}<span><span className="t">{u.nome}</span>{u.eu && <span className="you">(você)</span>}<span className="s ms">{u.email}</span></span></span></td>
                      <td className="mail">{u.email}</td>
                      <td className="c">{cargoChip(u)}</td>
                      {comDepartamento && <td className={u.departamento ? 'dep' : 'dep dim'}>{u.departamento ?? '—'}</td>}
                      <td className="c">{sitChip(u)}</td>
                      <td className={`num${u.acesso ? '' : ' dim'}`}>{u.acesso ?? 'Nunca entrou'}</td>
                      <td className="c">{kebab(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mlist">
              {visiveis.map((u) => (
                <article className="mc" key={u.id}>
                  <div className="mc-h">
                    <div className="idc">{av(u)}<div className="mc-n"><b>{u.nome}{u.eu && <span className="you">(você)</span>}</b><small>{u.email}</small></div></div>
                    <div className="r">{sitChip(u)}{u.gerenciavel && kebab(u)}</div>
                  </div>
                  <dl><dt>Cargo</dt><dd>{cargoChip(u)}</dd>{comDepartamento && <><dt>Departamento</dt><dd>{u.departamento ?? '—'}</dd></>}<dt>Último acesso</dt><dd className={u.acesso ? '' : 'dash'}>{u.acesso ?? 'Nunca entrou'}</dd></dl>
                </article>
              ))}
            </div>
            <Paginacao {...paginacao} />
          </>
        )}
      </section>

      {menu && <MenuAcoes u={menu.u} btn={menu.btn} podeTrocarCargo={cargos.length > 1} onFechar={() => setMenu(null)} onAcao={acao} />}
      {aberto?.t === 'novo' && <ModalNovo cargos={cargos} onFechar={() => setAberto(null)} onCriado={(r) => setAberto({ t: 'senhaGerada', nome: r.nome, email: r.email, cargo: r.cargo, senha: r.senha, nova: false })} />}
      {aberto?.t === 'cargo' && <ModalCargo u={aberto.u} cargos={cargos} onFechar={() => setAberto(null)} />}
      {aberto?.t === 'desativar' && <ModalDesativar u={aberto.u} onFechar={() => setAberto(null)} />}
      {aberto?.t === 'senha' && <ModalNovaSenha u={aberto.u} onFechar={() => setAberto(null)} onGerada={(senha) => setAberto({ t: 'senhaGerada', nome: aberto.u.nome, email: aberto.u.email, cargo: aberto.u.cargo, senha, nova: true })} />}
      {aberto?.t === 'senhaGerada' && <ModalSenha {...aberto} onFechar={() => setAberto(null)} />}
    </>
  );
}

/* ---------- Menu de ações (kebab) ---------- */
function MenuAcoes({ u, btn, podeTrocarCargo, onFechar, onAcao }: { u: Linha; btn: HTMLButtonElement; podeTrocarCargo: boolean; onFechar: () => void; onAcao: (a: 'cargo' | 'senha' | 'desativar' | 'reativar', u: Linha) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const el = ref.current!;
    const r = btn.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
    setPos({ left: Math.max(8, Math.min(innerWidth - w - 8, r.right - w)), top: r.bottom + 4 + h > innerHeight - 8 ? r.top - h - 4 : r.bottom + 4 });
    el.querySelector('button')?.focus();
    const fora = (e: MouseEvent) => { if (!el.contains(e.target as Node) && !btn.contains(e.target as Node)) onFechar(); };
    const tecla = (e: KeyboardEvent) => {
      const bs = [...el.querySelectorAll('button')], i = bs.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'Escape') { onFechar(); btn.focus(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); bs[(i + 1) % bs.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); bs[(i - 1 + bs.length) % bs.length].focus(); }
      if (e.key === 'Tab') onFechar();
    };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', tecla);
    window.addEventListener('scroll', onFechar, true);
    window.addEventListener('resize', onFechar);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', tecla);
      window.removeEventListener('scroll', onFechar, true);
      window.removeEventListener('resize', onFechar);
    };
  }, [btn, onFechar]);
  return createPortal(
    <div className="us-km" role="menu" aria-label={`Ações para ${u.nome}`} ref={ref} style={pos ?? { visibility: 'hidden', left: 0, top: 0 }}>
      {u.ativo ? (
        <>
          {podeTrocarCargo && <button role="menuitem" type="button" onClick={() => onAcao('cargo', u)}><span className="icon">badge</span>Trocar cargo</button>}
          <button role="menuitem" type="button" onClick={() => onAcao('senha', u)}><span className="icon">key</span>Gerar nova senha provisória</button>
          <hr />
          <button role="menuitem" type="button" className="red" onClick={() => onAcao('desativar', u)}><span className="icon">person_off</span>Desativar</button>
        </>
      ) : (
        <button role="menuitem" type="button" onClick={() => onAcao('reativar', u)}><span className="icon">person_check</span>Reativar</button>
      )}
    </div>,
    document.body,
  );
}

/* ---------- Modais ---------- */
function useAcao() {
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<{ msg: string; campo?: string } | null>(null);
  const rodar = (f: () => Promise<ResultadoUsuario>, ok: (r: Extract<ResultadoUsuario, { ok: true }>) => void) =>
    start(async () => {
      setErro(null);
      try {
        const r = await f();
        if (r.ok) ok(r); else setErro({ msg: r.erro, campo: r.campo });
      } catch {
        setErro({ msg: 'Não foi possível concluir. Tente de novo.' });
      }
    });
  return { pend, erro, setErro, rodar };
}

function Cargos({ opcoes, valor, onChange, nome }: { opcoes: Cargo[]; valor: string; onChange: (v: Cargo) => void; nome: string }) {
  return (
    <div className="roles" role="radiogroup" aria-label="Cargo">
      {opcoes.map((c) => (
        <label className="role" key={c}><input type="radio" name={nome} value={c} checked={valor === c} onChange={() => onChange(c)} /><span><b>{ROTULO_CARGO[c]}</b><small>{DESCRICAO_CARGO[c]}</small></span></label>
      ))}
    </div>
  );
}

function ModalNovo({ cargos, onFechar, onCriado }: { cargos: Cargo[]; onFechar: () => void; onCriado: (r: { nome: string; email: string; cargo: Cargo; senha: string }) => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [cargo, setCargo] = useState<Cargo>(cargos.includes('colaborador') ? 'colaborador' : cargos[0]);
  const { pend, erro, rodar } = useAcao();
  const interno = !ehEquipe(cargo);
  const enviar = (e?: React.FormEvent) => {
    e?.preventDefault();
    rodar(() => criarUsuario({ nome, email, cargo, departamento: interno ? departamento : undefined }), (r) => { toast(r.msg, 'person_add'); onCriado({ nome: nome.trim(), email: r.email!, cargo, senha: r.senha! }); });
  };
  return (
    <Modal titulo="Adicionar pessoa" onFechar={onFechar} rodape={<>
      <button type="button" className="btn btn-l btn-outlined" onClick={onFechar}>Cancelar</button>
      <button type="submit" form="nv-f" className="btn btn-l btn-filled" disabled={pend}><span className="icon">person_add</span>{pend ? 'Adicionando…' : 'Adicionar pessoa'}</button>
    </>}>
      <form id="nv-f" className="nv-f" onSubmit={enviar} noValidate>
        <p>O sistema gera uma senha provisória que aparece uma única vez, para você repassar. No primeiro acesso, a pessoa cria uma senha própria.</p>
        <div className="fld">
          <label htmlFor="nv-n">Nome</label>
          <input id="nv-n" autoComplete="off" placeholder="Nome e sobrenome" value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={erro?.campo === 'nome'} />
          {erro?.campo === 'nome' && <div className="err">{erro.msg}</div>}
        </div>
        <div className="fld">
          <label htmlFor="nv-e">E-mail</label>
          <input id="nv-e" type="email" autoComplete="off" placeholder="nome@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={erro?.campo === 'email'} />
          {erro?.campo === 'email' && <div className="err">{erro.msg}</div>}
        </div>
        {interno && (
          <div className="fld">
            <label htmlFor="nv-d">Departamento (opcional)</label>
            <input id="nv-d" autoComplete="off" maxLength={60} placeholder="Ex.: Financeiro" value={departamento} onChange={(e) => setDepartamento(e.target.value)} aria-invalid={erro?.campo === 'departamento'} />
            {erro?.campo === 'departamento' && <div className="err">{erro.msg}</div>}
          </div>
        )}
        {cargos.length > 1 && <div className="fld"><label id="nv-cl">Cargo</label><Cargos opcoes={cargos} valor={cargo} onChange={setCargo} nome="nv-c" /></div>}
        {erro && !erro.campo && <p className="err" role="alert">{erro.msg}</p>}
      </form>
    </Modal>
  );
}

function ModalSenha({ nome, email, cargo, senha, nova, onFechar }: { nome: string; email: string; cargo: Cargo; senha: string; nova: boolean; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try { await navigator.clipboard.writeText(senha); setCopiado(true); toast('Senha copiada.', 'content_copy'); }
    catch { toast('Não foi possível copiar. Selecione a senha e copie.', 'error'); }
  };
  return (
    <Modal titulo={nova ? 'Nova senha provisória' : 'Pessoa adicionada'} onFechar={onFechar} foco=".md-f .btn-outlined" rodape={<>
      <button type="button" className="btn btn-l btn-outlined" onClick={copiar}><span className="icon">{copiado ? 'check' : 'content_copy'}</span>{copiado ? 'Copiada' : 'Copiar senha'}</button>
      <button type="button" className="btn btn-l btn-filled" onClick={onFechar}>Concluir</button>
    </>}>
      <p>Passe o acesso de <b className="forte">{nome}</b> por um canal seguro (por exemplo, mensagem direta). Ainda não há envio automático por e-mail.</p>
      <dl className="cred">
        <dt>Endereço</dt><dd>{typeof window !== 'undefined' ? `${location.origin}${loginDe(cargo)}` : loginDe(cargo)}</dd>
        <dt>E-mail</dt><dd>{email}</dd>
        <dt>Senha provisória</dt><dd><code className="pw">{senha}</code></dd>
      </dl>
      <div className="notice"><span className="icon">visibility_off</span><div><b>Esta senha aparece só agora</b>Depois de fechar, não dá para ver de novo; gere outra se precisar. No primeiro acesso, a pessoa precisa criar uma senha própria.</div></div>
    </Modal>
  );
}

function ModalCargo({ u, cargos, onFechar }: { u: Linha; cargos: Cargo[]; onFechar: () => void }) {
  const [cargo, setCargo] = useState(u.cargo);
  const { pend, erro, rodar } = useAcao();
  return (
    <Modal titulo={`Trocar cargo de ${u.nome}`} onFechar={onFechar} foco="input:checked" rodape={<>
      <button type="button" className="btn btn-l btn-outlined" onClick={onFechar}>Cancelar</button>
      <button type="button" className="btn btn-l btn-filled" disabled={pend} onClick={() => rodar(() => trocarCargo(u.id, cargo), (r) => { onFechar(); toast(r.msg, 'badge'); })}>{pend ? 'Salvando…' : 'Salvar cargo'}</button>
    </>}>
      <p>O novo cargo vale na hora. Turmas, presenças e avaliações continuam no histórico.</p>
      <Cargos opcoes={cargos} valor={cargo} onChange={setCargo} nome="cg-c" />
      {erro && <p className="err" role="alert">{erro.msg}</p>}
    </Modal>
  );
}

function ModalNovaSenha({ u, onFechar, onGerada }: { u: Linha; onFechar: () => void; onGerada: (senha: string) => void }) {
  const { pend, erro, rodar } = useAcao();
  return (
    <Modal titulo={`Gerar nova senha para ${u.nome}?`} onFechar={onFechar} foco=".md-f .btn-outlined" rodape={<>
      <button type="button" className="btn btn-l btn-outlined" onClick={onFechar}>Cancelar</button>
      <button type="button" className="btn btn-l btn-filled" disabled={pend} onClick={() => rodar(() => gerarNovaSenha(u.id), (r) => onGerada(r.senha!))}>{pend ? 'Gerando…' : 'Gerar senha'}</button>
    </>}>
      <p>A senha atual de {u.nome} deixa de valer na hora. A nova senha provisória aparece uma única vez para você repassar.</p>
      {erro && <p className="err" role="alert">{erro.msg}</p>}
    </Modal>
  );
}

function ModalDesativar({ u, onFechar }: { u: Linha; onFechar: () => void }) {
  const { pend, erro, rodar } = useAcao();
  return (
    <Modal titulo={`Desativar ${u.nome}?`} onFechar={onFechar} foco=".md-f .btn-outlined" rodape={<>
      <button type="button" className="btn btn-l btn-outlined" onClick={onFechar}>Cancelar</button>
      <button type="button" className="btn btn-l btn-danger" disabled={pend} onClick={() => rodar(() => definirAtivo(u.id, false), (r) => { onFechar(); toast(r.msg, 'person_off'); })}>{pend ? 'Desativando…' : 'Desativar'}</button>
    </>}>
      <p>{u.nome} perde o acesso à área da equipe na hora. O histórico é mantido: turmas dadas, presença e avaliações. Dá para reativar depois.</p>
      {u.futuras > 0 && (
        <div className="notice aviso-y"><span className="icon">warning</span><div><b>{u.futuras} {u.futuras === 1 ? 'turma futura' : 'turmas futuras'} com {u.nome.split(' ')[0]}</b>Troque o instrutor dessas turmas na agenda e ajuste a grade modelo.</div></div>
      )}
      {erro && <p className="err" role="alert">{erro.msg}</p>}
    </Modal>
  );
}
