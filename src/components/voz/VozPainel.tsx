'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/equipe/Modal';
import { toast } from '@/components/equipe/Toast';
import '@/components/equipe/equipe-comp.css';
import type { VozClonada, VozPronta } from '@/lib/integracoes/elevenlabs';

/* Painel de voz: texto para fala (vozes prontas da ElevenLabs ou clonadas) e clonagem (enviar amostras,
   testar a fala de cada voz e apagar). Fala com as rotas /api/voz/*. */

const fmtData = (iso: string | null) => (iso ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '—');
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
const erroDe = async (r: Response) => { try { return ((await r.json()) as { erro?: string }).erro ?? 'Não foi possível concluir.'; } catch { return 'Não foi possível concluir.'; } };

export function VozPainel({ vozes, prontas, limiteMb, limiteTexto, limiteFala, desligado }: { vozes: VozClonada[]; prontas: VozPronta[]; limiteMb: number; limiteTexto: number; limiteFala: number; desligado: boolean }) {
  return (
    <>
      <TextoParaFala prontas={prontas} clonadas={vozes} limite={limiteFala} desligado={desligado} />
      <Clonagem vozes={vozes} limiteMb={limiteMb} limiteTexto={limiteTexto} desligado={desligado} />
    </>
  );
}

/** Texto para fala: escolhe a voz (ouvindo a amostra das prontas), escreve o texto e baixa o MP3 */
function TextoParaFala({ prontas, clonadas, limite, desligado }: { prontas: VozPronta[]; clonadas: VozClonada[]; limite: number; desligado: boolean }) {
  const [escolha, setEscolha] = useState('');
  const [texto, setTexto] = useState('');
  const [audio, setAudio] = useState<{ url: string; nome: string } | null>(null);
  const [gerando, setGerando] = useState(false);
  const [tocando, setTocando] = useState(false);
  const previaRef = useRef<HTMLAudioElement>(null);
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio.url); }, [audio]);

  // Se a voz escolhida sumir (ex.: clonada apagada), volta para a primeira da lista
  const todas = [...prontas.map((v) => ({ id: v.voiceId, nome: v.nome })), ...clonadas.map((v) => ({ id: v.voiceId, nome: v.nome }))];
  const voz = todas.find((v) => v.id === escolha) ?? todas[0] ?? null;
  const pronta = prontas.find((v) => v.voiceId === voz?.id) ?? null;

  const trocar = (id: string) => { previaRef.current?.pause(); setEscolha(id); };
  const ouvirAmostra = () => {
    const a = previaRef.current;
    if (!a) return;
    if (a.paused) { a.currentTime = 0; a.play().catch(() => toast('Não foi possível tocar a amostra.', 'error')); } else a.pause();
  };
  const gerar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voz || !texto.trim()) return;
    setGerando(true);
    try {
      const r = await fetch('/api/voz/falar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voiceId: voz.id, texto }) });
      if (!r.ok) { toast(await erroDe(r), 'error'); return; }
      setAudio({ url: URL.createObjectURL(await r.blob()), nome: voz.nome });
    } catch { toast('Sem conexão. Tente de novo.', 'error'); } finally { setGerando(false); }
  };

  return (
    <section className="mod vz-tts">
      <div className="mod-h"><div><h2>Texto para fala</h2><p>Escolha uma voz, escreva o texto e gere o áudio em MP3. Cada geração consome créditos da conta ElevenLabs.</p></div></div>
      {todas.length ? (
        <form className="vz-form" onSubmit={gerar}>
          <div className="vz-voz-esc">
            <div className="fld">
              <label htmlFor="vz-tts-v">Voz</label>
              <select id="vz-tts-v" value={voz?.id ?? ''} onChange={(e) => trocar(e.target.value)} disabled={desligado}>
                {prontas.length > 0 && <optgroup label="Vozes da ElevenLabs">{prontas.map((v) => <option key={v.voiceId} value={v.voiceId}>{v.descricao ? `${v.nome} (${v.descricao})` : v.nome}</option>)}</optgroup>}
                {clonadas.length > 0 && <optgroup label="Vozes clonadas">{clonadas.map((v) => <option key={v.voiceId} value={v.voiceId}>{v.nome}</option>)}</optgroup>}
              </select>
            </div>
            {pronta?.previa && <>
              <button type="button" className="btn btn-m btn-outlined" onClick={ouvirAmostra}><span className="icon">{tocando ? 'stop' : 'volume_up'}</span>{tocando ? 'Parar' : 'Ouvir amostra'}</button>
              <audio ref={previaRef} src={pronta.previa} preload="none" onPlay={() => setTocando(true)} onPause={() => setTocando(false)} onEnded={() => setTocando(false)} />
            </>}
          </div>
          <div className="fld">
            <label htmlFor="vz-tts-t">Texto</label>
            <textarea id="vz-tts-t" maxLength={limite} placeholder="Escreva o que a voz vai falar." value={texto} onChange={(e) => setTexto(e.target.value)} disabled={desligado} />
            <div className="info">{texto.length}/{limite} caracteres. As vozes prontas falam português; o sotaque indicado é o de origem da voz.</div>
          </div>
          <div className="vz-acts">
            <button type="submit" className="btn btn-l btn-filled" disabled={gerando || desligado || !texto.trim()}><span className="icon">graphic_eq</span>{gerando ? 'Gerando…' : 'Gerar áudio'}</button>
            {audio && <><audio src={audio.url} controls /><a className="linkbtn" href={audio.url} download={`${audio.nome}.mp3`}>Baixar MP3</a></>}
          </div>
        </form>
      ) : <p className="vz-vazio">{desligado ? 'Configure a ElevenLabs para usar esta área.' : 'Nenhuma voz disponível na conta ElevenLabs.'}</p>}
    </section>
  );
}

function Clonagem({ vozes, limiteMb, limiteTexto, desligado }: { vozes: VozClonada[]; limiteMb: number; limiteTexto: number; desligado: boolean }) {
  const router = useRouter();
  const arquivosRef = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [consentimento, setConsentimento] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const total = arquivos.reduce((n, a) => n + a.size, 0);

  const clonar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (nome.trim().length < 2) return setErro('Dê um nome à voz.');
    if (!arquivos.length) return setErro('Escolha pelo menos um áudio.');
    if (total > limiteMb * 1024 * 1024) return setErro(`Os áudios somam ${mb(total)}. O limite é de ${limiteMb} MB no total.`);
    if (!consentimento) return setErro('Confirme que você tem autorização da pessoa dona da voz.');
    const corpo = new FormData();
    corpo.append('nome', nome.trim());
    corpo.append('consentimento', 'sim');
    arquivos.forEach((a) => corpo.append('arquivos', a));
    setEnviando(true);
    try {
      const r = await fetch('/api/voz/clonar', { method: 'POST', body: corpo });
      if (!r.ok) { setErro(await erroDe(r)); return; }
      const j = (await r.json()) as { requerVerificacao: boolean };
      toast(j.requerVerificacao ? 'Voz clonada. A ElevenLabs pediu uma verificação antes do uso.' : 'Voz clonada.', 'record_voice_over');
      setNome(''); setArquivos([]); setConsentimento(false);
      if (arquivosRef.current) arquivosRef.current.value = '';
      router.refresh();
    } catch {
      setErro('Sem conexão. Confira sua internet e tente de novo.');
    } finally { setEnviando(false); }
  };

  return (
    <div className="vz-grid">
      <section className="mod">
        <div className="mod-h"><div><h2>Clonar uma voz</h2><p>Para um bom resultado: 1 a 3 minutos de fala limpa, sem música nem ruído, de uma pessoa só.</p></div></div>
        <form className="vz-form" onSubmit={clonar} noValidate>
          <div className="fld"><label htmlFor="vz-n">Nome da voz</label><input id="vz-n" maxLength={80} placeholder="Ex.: Ana · instrutora" value={nome} onChange={(e) => setNome(e.target.value)} disabled={desligado} /></div>
          <div className="fld">
            <label htmlFor="vz-a">Áudios de amostra</label>
            <input ref={arquivosRef} id="vz-a" type="file" accept="audio/*" multiple disabled={desligado} onChange={(e) => setArquivos([...(e.target.files ?? [])].slice(0, 5))} />
            <div className="info">{arquivos.length ? `${arquivos.length} ${arquivos.length === 1 ? 'arquivo' : 'arquivos'} · ${mb(total)} de ${limiteMb} MB` : `Até 5 arquivos (MP3, WAV, M4A…), somando até ${limiteMb} MB.`}</div>
          </div>
          <label className="vz-check"><input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} disabled={desligado} />
            <span>Confirmo que a voz é minha ou que tenho autorização expressa da pessoa para cloná-la e usá-la.</span></label>
          {erro && <p className="err" role="alert">{erro}</p>}
          <div><button type="submit" className="btn btn-l btn-filled" disabled={enviando || desligado}><span className="icon">record_voice_over</span>{enviando ? 'Clonando…' : 'Clonar voz'}</button></div>
        </form>
      </section>

      <section className="mod">
        <div className="mod-h"><div><h2>Vozes clonadas ({vozes.length})</h2><p>Gere uma fala de teste ou apague a voz da conta.</p></div></div>
        {vozes.length ? vozes.map((v) => <Voz key={v.voiceId} v={v} limiteTexto={limiteTexto} onApagada={() => router.refresh()} />)
          : <p className="vz-vazio">Nenhuma voz clonada ainda.</p>}
      </section>
    </div>
  );
}

function Voz({ v, limiteTexto, onApagada }: { v: VozClonada; limiteTexto: number; onApagada: () => void }) {
  const [texto, setTexto] = useState('Olá! Boas-vindas ao Takeat Academy.');
  const [audio, setAudio] = useState<string | null>(null);
  const [pend, setPend] = useState<'fala' | 'apagar' | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  useEffect(() => () => { if (audio) URL.revokeObjectURL(audio); }, [audio]);

  const gerar = async () => {
    setPend('fala');
    try {
      const r = await fetch('/api/voz/falar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ voiceId: v.voiceId, texto }) });
      if (!r.ok) { toast(await erroDe(r), 'error'); return; }
      setAudio(URL.createObjectURL(await r.blob()));
    } catch { toast('Sem conexão. Tente de novo.', 'error'); } finally { setPend(null); }
  };
  const apagar = async () => {
    setPend('apagar');
    try {
      const r = await fetch(`/api/voz/${v.voiceId}`, { method: 'DELETE' });
      if (!r.ok) { toast(await erroDe(r), 'error'); return; }
      toast('Voz apagada da conta ElevenLabs.', 'delete');
      setConfirmar(false);
      onApagada();
    } catch { toast('Sem conexão. Tente de novo.', 'error'); } finally { setPend(null); }
  };

  return (
    <div className="vz-voz">
      <div className="vz-voz-h">
        <span className="icon vz-voz-i">graphic_eq</span>
        <div className="vz-voz-n"><b>{v.nome}</b><small>Criada em {fmtData(v.criadaEm)} · ID {v.voiceId}</small></div>
        <button type="button" className="btn btn-m btn-outlined btn-icon" onClick={() => setConfirmar(true)} aria-label={`Apagar a voz ${v.nome}`} title="Apagar voz"><span className="icon">delete</span></button>
      </div>
      <div className="fld">
        <label htmlFor={`vz-t-${v.voiceId}`}>Texto de teste</label>
        <textarea id={`vz-t-${v.voiceId}`} maxLength={limiteTexto} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="info">{texto.length}/{limiteTexto} caracteres. Cada geração consome créditos da conta ElevenLabs.</div>
      </div>
      <div className="vz-acts">
        <button type="button" className="btn btn-m btn-outlined" disabled={!!pend || !texto.trim()} onClick={gerar}><span className="icon">play_arrow</span>{pend === 'fala' ? 'Gerando…' : 'Gerar fala'}</button>
        {audio && <><audio src={audio} controls /><a className="linkbtn" href={audio} download={`${v.nome}.mp3`}>Baixar MP3</a></>}
      </div>
      {confirmar && (
        <Modal titulo={`Apagar a voz ${v.nome}?`} onFechar={() => setConfirmar(false)} foco=".md-f .btn-outlined" rodape={<>
          <button type="button" className="btn btn-l btn-outlined" onClick={() => setConfirmar(false)}>Cancelar</button>
          <button type="button" className="btn btn-l btn-danger" disabled={pend === 'apagar'} onClick={apagar}>{pend === 'apagar' ? 'Apagando…' : 'Apagar'}</button>
        </>}>
          <p>A voz sai da conta ElevenLabs e não pode ser recuperada. Os áudios já baixados continuam com você.</p>
        </Modal>
      )}
    </div>
  );
}
