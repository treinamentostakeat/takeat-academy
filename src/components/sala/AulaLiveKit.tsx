'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DisconnectReason, Room, RoomEvent, Track, type Participant } from 'livekit-client';
import {
  RoomAudioRenderer, RoomContext, VideoTrack, isTrackReference, useChat, useLocalParticipant,
  useLocalParticipantPermissions, useParticipants, useStartAudio, useTracks,
} from '@livekit/components-react';
import { levantarMao } from '@/lib/sala';
import { Aula } from './Aula';
import type { Canal, Papel } from './tipos';

/* Aula com vídeo real (LiveKit). Só a instrutora publica câmera, microfone e tela; o cliente entra só ouvindo
   e ganha microfone (e tela) quando a instrutora libera. Mãos = atributo "mao" (gravado pelo servidor);
   quem está falando = cliente com permissão de publicar; chat = chat do LiveKit. */

type Props = {
  papel: Papel; turmaId: string; seg0: number; url: string; token: string;
  onSair: () => void; onEncerrar: () => Promise<void>; onEncerrada: () => void; onErro: (msg: string) => void; onQueda: (msg: string) => void;
  topo: (pessoas: number) => React.ReactNode;
};

const meta = (p: Participant) => { try { return JSON.parse(p.metadata || '{}') as { papel?: Papel; restaurante?: string }; } catch { return {}; } };
const pessoa = (p: Participant) => ({ id: p.identity, nome: p.name || 'Participante', restaurante: meta(p).restaurante || '' });

export default function AulaLiveKit(props: Props) {
  const { url, token, papel } = props;
  const [room, setRoom] = useState<Room | null>(null);
  const cb = useRef(props);
  useEffect(() => { cb.current = props; });

  useEffect(() => {
    const r = new Room({ adaptiveStream: true, dynacast: true });
    let ativo = true;
    r.on(RoomEvent.Disconnected, (motivo?: DisconnectReason) => {
      if (!ativo) return;
      if (motivo === DisconnectReason.ROOM_DELETED) cb.current.onEncerrada();
      else if (motivo !== DisconnectReason.CLIENT_INITIATED) cb.current.onQueda('A conexão com a aula caiu. Toque em Entrar na aula para voltar.');
    });
    r.connect(url, token)
      .then(async () => {
        if (!ativo) return;
        setRoom(r);
        if (papel === 'instrutor') {
          await r.localParticipant.setMicrophoneEnabled(true).catch(() => cb.current.onErro('Não foi possível ligar o microfone. Confira a permissão do navegador.'));
          await r.localParticipant.setCameraEnabled(true).catch(() => {});
        }
      })
      .catch(() => { if (ativo) cb.current.onQueda('Não foi possível conectar à aula. Confira sua internet e tente de novo.'); });
    return () => { ativo = false; void r.disconnect(); };
  }, [url, token, papel]);

  if (!room) return <>{props.topo(0)}<div className="sala-carregando" role="status">Conectando à aula…</div></>;
  return (
    <RoomContext.Provider value={room}>
      <RoomAudioRenderer />
      <Conectado {...props} room={room} />
    </RoomContext.Provider>
  );
}

function Conectado({ papel, turmaId, seg0, onSair, onEncerrar, onErro, topo, room }: Props & { room: Room }) {
  const inst = papel === 'instrutor';
  const participantes = useParticipants();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const permissoes = useLocalParticipantPermissions();
  const { chatMessages, send } = useChat();
  const telas = useTracks([Track.Source.ScreenShare]).filter(isTrackReference);
  const cameras = useTracks([Track.Source.Camera]).filter(isTrackReference);
  const { mergedProps, canPlayAudio } = useStartAudio({ room, props: { className: 'btn btn-m btn-outlined som-bloqueado' } });

  /* Cliente liberado: liga o microfone sozinho; ao perder a permissão, desliga microfone e tela */
  const podeFalar = !inst && !!permissoes?.canPublish;
  const erroRef = useRef(onErro);
  useEffect(() => { erroRef.current = onErro; }, [onErro]);
  useEffect(() => {
    if (inst) return;
    if (podeFalar) localParticipant.setMicrophoneEnabled(true).catch(() => erroRef.current('Não conseguimos ligar seu microfone. Confira a permissão do navegador.'));
    else if (localParticipant.isMicrophoneEnabled || localParticipant.isScreenShareEnabled) {
      localParticipant.setMicrophoneEnabled(false).catch(() => {});
      localParticipant.setScreenShareEnabled(false).catch(() => {});
    }
  }, [podeFalar, inst, localParticipant]);

  const instrutora = participantes.find((p) => meta(p).papel === 'instrutor');
  const clientes = participantes.filter((p) => meta(p).papel !== 'instrutor');
  const falandoP = clientes.find((p) => p.permissions?.canPublish);
  const maos = clientes
    .filter((p) => p.attributes.mao && p !== falandoP)
    .map((p) => ({ ...pessoa(p), at: Number(p.attributes.mao) || 0 }))
    .sort((a, b) => a.at - b.at);
  const pos = maos.findIndex((m) => m.id === localParticipant.identity);

  const msgs = useMemo(() => chatMessages.map((m) => {
    const de = m.from;
    return {
      id: m.id, de: de?.identity ?? '', nome: de ? pessoa(de).nome : 'Participante', restaurante: de ? pessoa(de).restaurante : '',
      host: de ? meta(de).papel === 'instrutor' : false, at: m.timestamp, tx: m.message,
    };
  }), [chatMessages]);

  const canal: Canal = {
    eu: localParticipant.identity,
    pronto: true,
    pessoas: clientes.length,
    instrutoraOnline: !!instrutora,
    participantes: clientes.map((p) => ({ ...pessoa(p), mao: !!p.attributes.mao && p !== falandoP, falando: p === falandoP })),
    maos: inst ? maos : [],
    minhaPosicao: pos >= 0 ? pos + 1 : null,
    falando: falandoP ? pessoa(falandoP) : null,
    msgs,
    enviar: async (tx) => { try { await send(tx); return null; } catch { return 'Não foi possível enviar. Tente de novo.'; } },
    mao: async (sim) => { const r = await levantarMao(turmaId, sim); return r.ok ? null : r.erro; },
    atualizar: () => {},
  };

  // Palco: tela de um cliente liberado tem prioridade; senão, a tela da instrutora
  const tela = telas.find((t) => meta(t.participant).papel !== 'instrutor') ?? telas.find((t) => meta(t.participant).papel === 'instrutor');
  const cam = cameras.find((t) => meta(t.participant).papel === 'instrutor' && !t.publication.isMuted);

  async function alternar(k: 'mic' | 'cam' | 'tela') {
    try {
      if (k === 'mic') await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      if (k === 'cam') await localParticipant.setCameraEnabled(!isCameraEnabled);
      if (k === 'tela') await localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { audio: false });
    } catch {
      if (k !== 'tela') onErro(k === 'mic' ? 'Não foi possível ligar o microfone.' : 'Não foi possível ligar a câmera.');
    }
  }

  return (
    <Aula
      papel={papel} turmaId={turmaId} canal={canal} seg0={seg0} onSair={onSair} onEncerrar={onEncerrar} topo={topo}
      midia={{
        video: true,
        mic: isMicrophoneEnabled, cam: isCameraEnabled, tela: isScreenShareEnabled,
        alternar,
        instrutoraMic: !!instrutora?.isMicrophoneEnabled,
        instrutoraCam: !!cam,
        palco: tela ? <VideoTrack trackRef={tela} className="tela" /> : null,
        camera: cam ? <VideoTrack trackRef={cam} /> : null,
        extraPalco: canPlayAudio ? null : <button type="button" {...mergedProps}><span className="icon">volume_up</span>Ativar som da aula</button>,
        podeCompartilhar: podeFalar && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia,
      }}
    />
  );
}
