/* Tipos compartilhados pela sala ao vivo (cliente e instrutora, modo LiveKit e modo demonstração). */

export type Papel = 'cliente' | 'instrutor';
export type Etapa = 'espera' | 'aula' | 'fim';

export type PessoaSala = { id: string; nome: string; restaurante: string };
export type MaoSala = PessoaSala & { at: number };
export type MsgSala = { id: string; de: string; nome: string; restaurante: string; host: boolean; at: number; tx: string };

/** O "canal" da aula: mesma forma vinda do LiveKit ou do polling do modo demonstração */
export type Canal = {
  eu: string;
  pronto: boolean;
  pessoas: number;
  instrutoraOnline: boolean;
  participantes: (PessoaSala & { mao: boolean; falando: boolean })[];
  maos: MaoSala[];
  minhaPosicao: number | null;
  falando: PessoaSala | null;
  msgs: MsgSala[];
  enviar: (tx: string) => Promise<string | null>;
  mao: (levantar: boolean) => Promise<string | null>;
  atualizar: () => void;
};

/** Mídia (vídeo real só com LiveKit) */
export type Midia = {
  video: boolean;
  mic: boolean;
  cam: boolean;
  tela: boolean;
  alternar: (k: 'mic' | 'cam' | 'tela') => void;
  instrutoraMic: boolean;
  instrutoraCam: boolean;
  palco: React.ReactNode | null; // vídeo da tela compartilhada
  camera: React.ReactNode | null; // vídeo da câmera da instrutora
  extraPalco?: React.ReactNode; // ex.: botão "Ativar som"
  podeCompartilhar: boolean; // cliente liberado pode mostrar a tela
};

export type DadosSala = {
  papel: Papel;
  etapa: 'espera' | 'fim';
  livekit: boolean;
  turma: { id: string; tema: string; hora: number; horario: string; iniciada: boolean };
  eu: { nome: string; restaurante: string };
  segParaComecar: number;
  segParaAbrir: number;
  inscritos: PessoaSala[];
  fim?: { entrou: boolean; avaliou: boolean };
  resumo?: { inscritos: number; presentes: number; duvidas: number; duracaoMin: number | null; media: number | null; respostas: number } | null;
};
