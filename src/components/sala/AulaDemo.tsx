'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarMensagem, levantarMao } from '@/lib/sala';
import { Aula } from './Aula';
import type { Canal, MaoSala, MsgSala, Papel, PessoaSala } from './tipos';

/* Aula no MODO DEMONSTRAÇÃO (sem LiveKit): sem vídeo; chat, mãos e fala via polling do estado
   guardado na memória do servidor (GET /api/sala/estado a cada 1,5 s). */

type Estado = {
  eu: string; encerrada: boolean; pessoas: number; instrutoraOnline: boolean; falando: PessoaSala | null; msgs: MsgSala[];
  minhaPosicao: number | null; maos?: MaoSala[]; participantes?: Canal['participantes'];
};

export default function AulaDemo({ papel, turmaId, seg0, onSair, onEncerrar, onEncerrada, topo }: {
  papel: Papel; turmaId: string; seg0: number; onSair: () => void; onEncerrar: () => Promise<void>; onEncerrada: () => void;
  topo: (pessoas: number) => React.ReactNode;
}) {
  const [e, setE] = useState<Estado | null>(null);
  const [midia, setMidia] = useState({ mic: true, cam: true, tela: true });
  const fim = useRef(onEncerrada);
  useEffect(() => { fim.current = onEncerrada; }, [onEncerrada]);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/sala/estado?turma=${encodeURIComponent(turmaId)}&papel=${papel}`, { cache: 'no-store' });
      if (!r.ok) return;
      const dados: Estado = await r.json();
      setE(dados);
      if (dados.encerrada) fim.current();
    } catch { /* rede instável: tenta de novo no próximo ciclo */ }
  }, [turmaId, papel]);

  useEffect(() => {
    const primeira = setTimeout(carregar, 0);
    const i = setInterval(carregar, 1500);
    return () => { clearTimeout(primeira); clearInterval(i); };
  }, [carregar]);

  const canal: Canal = {
    eu: e?.eu ?? '',
    pronto: !!e,
    pessoas: e?.pessoas ?? 0,
    instrutoraOnline: !!e?.instrutoraOnline,
    participantes: e?.participantes ?? [],
    maos: e?.maos ?? [],
    minhaPosicao: e?.minhaPosicao ?? null,
    falando: e?.falando ?? null,
    msgs: e?.msgs ?? [],
    enviar: async (tx) => { const r = await enviarMensagem(turmaId, papel, tx); void carregar(); return r.ok ? null : r.erro; },
    mao: async (sim) => { const r = await levantarMao(turmaId, sim); void carregar(); return r.ok ? null : r.erro; },
    atualizar: () => { void carregar(); },
  };

  return (
    <Aula
      papel={papel} turmaId={turmaId} canal={canal} seg0={seg0} onSair={onSair} onEncerrar={onEncerrar} topo={topo}
      midia={{
        video: false, ...midia,
        alternar: (k) => setMidia((m) => ({ ...m, [k]: !m[k] })),
        // Sem vídeo real, a câmera e o microfone da instrutora aparecem como ligados para o cliente
        instrutoraMic: true, instrutoraCam: true,
        palco: null, camera: null, podeCompartilhar: false,
      }}
    />
  );
}
