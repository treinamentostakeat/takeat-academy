'use client';
import { useEffect, useRef, useState } from 'react';
import { iniciais } from '@/lib/formato';
import { encerrarFala, liberarMicrofone, terminarMinhaFala } from '@/lib/sala';
import type { Canal, Midia, Papel } from './tipos';
import { useToast } from './useToast';

/* Etapa "aula ao vivo" (igual ao protótipo sala.html): palco com a tela da instrutora, câmera dela na lateral,
   chat aberto; cliente levanta a mão e vê só a própria posição; instrutora vê a fila e libera o microfone. */

const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const ordinal = (n: number) => `${n}º`;
const abrir = (d: HTMLDialogElement | null) => { if (d) { d.returnValue = ''; d.showModal(); } };

export function Aula({ papel, turmaId, canal, midia, seg0, onSair, onEncerrar, topo }: {
  papel: Papel; turmaId: string; canal: Canal; midia: Midia; seg0: number;
  onSair: () => void; onEncerrar: () => Promise<void>; topo: (pessoas: number) => React.ReactNode;
}) {
  const inst = papel === 'instrutor';
  const { el: toastEl, mostrar } = useToast();
  const [aba, setAba] = useState<'maos' | 'chat' | 'pessoas'>('maos');
  const [agora, setAgora] = useState(() => Date.now());
  const [ocupado, setOcupado] = useState(false);
  const [texto, setTexto] = useState('');
  const sairRef = useRef<HTMLDialogElement>(null);
  const fimRef = useRef<HTMLDialogElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const i = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  /* Cliente: popup quando o microfone é liberado; aviso quando a fala termina */
  const euFalando = !inst && !!canal.falando && canal.falando.id === canal.eu;
  const [falava, setFalava] = useState(euFalando);
  const [pop, setPop] = useState(false);
  if (falava !== euFalando) {
    setFalava(euFalando);
    setPop(euFalando);
    if (!euFalando) mostrar('Microfone desligado. Obrigado pela pergunta!', 'mic_off');
  }
  useEffect(() => {
    if (!pop) return;
    const h = setTimeout(() => setPop(false), 5000);
    return () => clearTimeout(h);
  }, [pop]);

  /* Chat sempre rolado para a última mensagem */
  const nMsgs = canal.msgs.length;
  useEffect(() => { const b = msgsRef.current; if (b) b.scrollTop = b.scrollHeight; }, [nMsgs, aba]);

  const decorrido = seg0; // o componente pai atualiza a cada segundo
  const falando = canal.falando;

  async function clicarMao() {
    if (ocupado) return;
    setOcupado(true);
    try {
      if (euFalando) { await terminarMinhaFala(turmaId); canal.atualizar(); }
      else {
        const erro = await canal.mao(!canal.minhaPosicao);
        if (erro) mostrar(erro, 'error');
      }
    } finally { setOcupado(false); }
  }

  async function liberar(id: string, nome: string) {
    const r = await liberarMicrofone(turmaId, id, falando?.id ?? null);
    if (r.ok) { mostrar(`Microfone de ${nome} liberado.`, 'mic'); canal.atualizar(); }
    else mostrar(r.erro, 'error');
  }
  async function pararFala() {
    if (!falando) return;
    await encerrarFala(turmaId, falando.id);
    canal.atualizar();
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const v = texto.trim();
    if (!v) return;
    setTexto('');
    const erro = await canal.enviar(v);
    if (erro) { setTexto(v); mostrar(erro, 'error'); }
  }

  /* ---------- Palco ---------- */
  const semTela = !midia.video
    ? { icon: 'videocam_off', t: 'Vídeo desligado no modo demonstração' }
    : inst
      ? { icon: 'screen_share', t: 'Toque em Tela para mostrar o sistema aos clientes' }
      : canal.instrutoraOnline
        ? { icon: 'stop_screen_share', t: 'A instrutora ainda não está compartilhando a tela' }
        : { icon: 'hourglass_top', t: 'Aguardando a instrutora entrar' };

  const tool = (k: 'mic' | 'cam' | 'tela', on: string, off: string, iOn: string, iOff: string) => {
    const ligado = midia[k];
    return (
      <button type="button" className={`btn btn-outlined tool${ligado ? '' : ' off'}`} aria-pressed={ligado} onClick={() => midia.alternar(k)}>
        <span className="icon">{ligado ? iOn : iOff}</span><span>{ligado ? on : off}</span>
      </button>
    );
  };

  const camLigada = inst ? midia.cam : midia.instrutoraCam;
  const micLigado = inst ? midia.mic : midia.instrutoraMic;
  const presente = inst || canal.instrutoraOnline;

  const chat = (
    <div className="msgs" ref={msgsRef} aria-live="polite">
      {canal.msgs.map((m) => {
        const mine = m.de === canal.eu;
        const cls = mine ? 'mine' : m.host ? 'host' : '';
        return (
          <div className={`msg ${cls}`} key={m.id}>
            {m.host ? <span className="av host"><span className="icon s16">school</span></span> : <span className="av">{iniciais(m.nome)}</span>}
            <div className="bd">
              <div className="who">
                {mine ? 'Você' : m.host ? 'Instrutora' : m.nome}
                {!mine && <small> · {m.host ? 'Takeat' : m.restaurante}</small>} <small>· {hora.format(m.at)}</small>
              </div>
              <div className="tx">{m.tx}</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {topo(canal.pessoas)}
      <main className="room">
        <div className="stage-col">
          <div className="stage" aria-label="Tela compartilhada">
            {midia.palco ?? <div className="stage-off"><span className="icon">{semTela.icon}</span><p>{semTela.t}</p></div>}
            <div className="stage-tags">
              <span className="stage-tag"><span className="dot" />Ao vivo{decorrido > 0 ? ` · ${mmss(decorrido)}` : ''}</span>
              {inst && midia.video && (
                <span className="stage-tag hide-m"><span className="icon s16">{midia.tela ? 'screen_share' : 'stop_screen_share'}</span>{midia.tela ? 'Você está compartilhando a tela' : 'Tela pausada'}</span>
              )}
              {falando && (
                <span className="stage-tag"><span className="icon s16 fill">mic</span>{falando.id === canal.eu ? 'Você está falando' : `${falando.nome} está falando`}</span>
              )}
            </div>
            {midia.extraPalco}
            {pop && (
              <div className="pop" role="alertdialog" aria-labelledby="pop-t">
                <div className="mic"><span className="icon fill">mic</span></div>
                <h3 id="pop-t">Microfone liberado!</h3>
                <p>Tire sua dúvida. Todos na aula estão te ouvindo.{midia.podeCompartilhar ? ' Se precisar, mostre sua tela.' : ''}</p>
                <button type="button" className="btn btn-l btn-outlined btn-block" autoFocus onClick={() => setPop(false)}>Entendi</button>
              </div>
            )}
          </div>

          {!inst && (
            <>
              {canal.minhaPosicao && !euFalando && (
                <div className="status hand">
                  <span className="pos" aria-hidden="true">{ordinal(canal.minhaPosicao)}</span>
                  <div className="txt">
                    <b>Sua mão está levantada</b>
                    <span>{canal.minhaPosicao === 1
                      ? 'Você é o próximo. Quando a instrutora liberar, seu microfone liga sozinho.'
                      : `Você é o ${ordinal(canal.minhaPosicao)} da fila. Quando chegar sua vez, seu microfone liga sozinho.`}</span>
                  </div>
                </div>
              )}
              {euFalando && (
                <div className="status talk">
                  <span className="wave" aria-hidden="true"><i /><i /><i /><i /></span>
                  <div className="txt"><b>Você está falando</b>Todos na aula estão te ouvindo.</div>
                </div>
              )}
              <div className="controls" style={euFalando && midia.podeCompartilhar ? { gridTemplateColumns: 'auto 1fr auto 48px' } : undefined}>
                <span className={`mic-state${euFalando ? ' on' : ''}`}>
                  <span className={`icon${euFalando ? ' fill' : ''}`}>{euFalando ? 'mic' : 'mic_off'}</span>
                  <span>Microfone<span className="long">{euFalando ? ' ligado' : ' desligado'}</span></span>
                </span>
                <button type="button" className={`btn btn-l ${euFalando ? 'btn-filled' : 'btn-outlined'}`} onClick={clicarMao} disabled={ocupado}>
                  <span className="icon">{euFalando ? 'check' : 'back_hand'}</span>
                  <span>{euFalando ? 'Terminei de falar' : canal.minhaPosicao ? 'Abaixar a mão' : 'Levantar a mão'}</span>
                </button>
                {euFalando && midia.podeCompartilhar && (
                  <button type="button" className="btn btn-l btn-outlined" onClick={() => midia.alternar('tela')}>
                    <span className="icon">{midia.tela ? 'stop_screen_share' : 'screen_share'}</span><span>{midia.tela ? 'Parar tela' : 'Mostrar tela'}</span>
                  </button>
                )}
                <button type="button" className="btn btn-l btn-outlined btn-icon" aria-label="Sair da aula" title="Sair da aula" onClick={() => abrir(sairRef.current)}>
                  <span className="icon">logout</span>
                </button>
              </div>
            </>
          )}
          {inst && (
            <div className="controls inst">
              {tool('mic', 'Microfone', 'Mudo', 'mic', 'mic_off')}
              {tool('cam', 'Câmera', 'Sem câmera', 'videocam', 'videocam_off')}
              {tool('tela', 'Tela', 'Tela pausada', 'screen_share', 'stop_screen_share')}
              <button type="button" className="btn btn-danger tool" onClick={() => abrir(fimRef.current)}><span className="icon">call_end</span><span>Encerrar aula</span></button>
            </div>
          )}
        </div>

        <aside className="side" aria-label="Instrutora e interação">
          <div className={`cam${camLigada ? '' : ' off'}`} aria-label="Câmera da instrutora">
            {camLigada && midia.camera ? midia.camera : <div className="face"><span className="icon fill">person</span></div>}
            {presente && micLigado && !falando && <span className="ring" />}
            <span className="lbl">
              {presente
                ? <><span className="icon s16">{micLigado ? 'mic' : 'mic_off'}</span>{inst ? 'Você' : 'Instrutora'}{camLigada ? '' : ' · câmera desligada'}</>
                : <><span className="icon s16">hourglass_top</span>Aguardando a instrutora</>}
            </span>
          </div>

          {!inst && (
            <div className="pane">
              <div className="pane-h"><h2>Chat da aula</h2><span className="chip chip-neutral"><span className="icon s16">group</span>{canal.pessoas}</span></div>
              {chat}
            </div>
          )}

          {inst && (
            <>
              <div className="tabs" role="tablist">
                <button type="button" className="tab" role="tab" aria-selected={aba === 'maos'} onClick={() => setAba('maos')}>
                  <span className="icon s16 fill">back_hand</span>Mãos <span className={`badge${canal.maos.length ? '' : ' zero'}`}>{canal.maos.length}</span>
                </button>
                <button type="button" className="tab" role="tab" aria-selected={aba === 'chat'} onClick={() => setAba('chat')}><span className="icon s16">chat</span>Chat</button>
                <button type="button" className="tab" role="tab" aria-selected={aba === 'pessoas'} onClick={() => setAba('pessoas')}><span className="icon s16">group</span>Pessoas</button>
              </div>
              {aba === 'maos' && (
                <div className="pane">
                  <div className="pane-h"><h2>Mãos levantadas</h2><span className="chip chip-neutral">Por ordem de chegada</span></div>
                  <div className="list">
                    {falando && (
                      <div className="speaking-now">
                        <span className="av" style={{ background: 'var(--surface-raised)', color: 'var(--teal-ink)' }}>{iniciais(falando.nome)}</span>
                        <div className="txt">
                          <div className="k"><span className="wave" aria-hidden="true"><i /><i /><i /><i /></span>Falando agora</div>
                          <div className="n">{falando.nome}</div><div className="c">{falando.restaurante}</div>
                        </div>
                        <button type="button" className="btn btn-m btn-outlined" onClick={pararFala}>Encerrar fala</button>
                      </div>
                    )}
                    {canal.maos.map((m, i) => {
                      const min = Math.max(0, Math.floor((agora - m.at) / 60000));
                      return (
                        <div className="hand-row" key={m.id}>
                          <span className="ord">{ordinal(i + 1)}</span>
                          <span className="av">{iniciais(m.nome)}</span>
                          <div className="txt">
                            <div className="n"><span className="icon s16 fill">back_hand</span>{m.nome}</div>
                            <div className="c">{m.restaurante} · {min ? `há ${min} min` : 'agora'}</div>
                          </div>
                          <button type="button" className="btn btn-m btn-outlined" aria-label={`Liberar microfone de ${m.nome}`} onClick={() => liberar(m.id, m.nome)}>
                            <span className="icon s16">mic</span>Liberar
                          </button>
                        </div>
                      );
                    })}
                    {!canal.maos.length && !falando && (
                      <div className="empty"><span className="icon fill">back_hand</span>Ninguém com a mão levantada.<br />Quando um cliente levantar a mão, ele aparece aqui.</div>
                    )}
                  </div>
                </div>
              )}
              {aba === 'chat' && <div className="pane"><div className="pane-h"><h2>Chat da aula</h2></div>{chat}</div>}
              {aba === 'pessoas' && (
                <div className="pane">
                  <div className="pane-h"><h2>Participantes</h2><span className="chip chip-neutral">{canal.pessoas}</span></div>
                  <div className="list" style={{ gap: 0 }}>
                    {canal.participantes.map((p) => (
                      <div className="prow" key={p.id}>
                        <span className="av">{iniciais(p.nome)}</span>
                        <div className="txt"><div className="n">{p.nome}</div><div className="c">{p.restaurante}</div></div>
                        <span className="st">
                          {p.mao && <span className="icon s16 fill y" title="Mão levantada">back_hand</span>}
                          {p.falando ? <span className="icon s16 fill g" title="Falando">mic</span> : <span className="icon s16" title="Microfone desligado">mic_off</span>}
                        </span>
                      </div>
                    ))}
                    {!canal.participantes.length && <div className="empty"><span className="icon">group</span>Nenhum cliente na sala ainda.</div>}
                  </div>
                </div>
              )}
            </>
          )}

          {(!inst || aba === 'chat') && (
            <form className="chat-f" autoComplete="off" onSubmit={enviar}>
              <div className="composer">
                <label className="sr-only" htmlFor="chat-in">Mensagem</label>
                <input id="chat-in" placeholder={inst ? 'Escreva uma mensagem para a turma' : 'Escreva sua dúvida ou mensagem'} maxLength={300} value={texto} onChange={(e) => setTexto(e.target.value)} />
                <button type="submit" className="btn btn-l btn-outlined btn-icon" aria-label="Enviar mensagem"><span className="icon">send</span></button>
              </div>
              <p className="hint">Todos na aula veem o chat.</p>
            </form>
          )}
        </aside>
      </main>

      <dialog ref={sairRef} aria-labelledby="leave-t" onClose={() => { if (sairRef.current?.returnValue === 'ok') onSair(); }}>
        <form method="dialog">
          <div className="dlg-b"><h2 id="leave-t">Sair da aula?</h2><p>A aula continua acontecendo. Você pode voltar pelo mesmo link enquanto ela estiver ao vivo.</p></div>
          <div className="dlg-f"><button className="btn btn-l btn-outlined" value="cancel">Continuar na aula</button><button className="btn btn-l btn-filled" value="ok">Sair</button></div>
        </form>
      </dialog>
      <dialog ref={fimRef} aria-labelledby="end-t" onClose={() => { if (fimRef.current?.returnValue === 'ok') onEncerrar(); }}>
        <form method="dialog">
          <div className="dlg-b"><h2 id="end-t">Encerrar a aula para todos?</h2><p>Os clientes saem da sala e recebem o pedido de avaliação. A presença de quem entrou é registrada.</p></div>
          <div className="dlg-f"><button className="btn btn-l btn-outlined" value="cancel">Continuar</button><button className="btn btn-l btn-danger" value="ok">Encerrar aula</button></div>
        </form>
      </dialog>
      {toastEl}
    </>
  );
}
