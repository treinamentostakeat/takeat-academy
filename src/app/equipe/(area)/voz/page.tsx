import { Toaster } from '@/components/equipe/Toast';
import { ErroElevenLabs, LIMITE_AMOSTRAS_MB, LIMITE_TEXTO, elevenlabsAtivo, listarVozes, type VozClonada } from '@/lib/integracoes/elevenlabs';
import { exigirAcessoVoz } from '@/lib/sessao';
import { VozPainel } from './VozPainel';
import './voz.css';

export const metadata = { title: 'Clonagem de voz' };

/* Clonagem de voz (ElevenLabs). Só gestores da lista VOZ_ACESSO_EMAILS. */
export default async function Voz() {
  await exigirAcessoVoz();
  let vozes: VozClonada[] = [];
  let aviso: string | null = null;
  if (!elevenlabsAtivo()) aviso = 'A integração com a ElevenLabs não está configurada neste servidor (ELEVENLABS_API_KEY).';
  else {
    try { vozes = await listarVozes(); } catch (e) { aviso = e instanceof ErroElevenLabs ? e.message : 'Não foi possível carregar as vozes da ElevenLabs.'; }
  }
  return (
    <div className="vz">
      <div className="rp-head">
        <div>
          <h1>Clonagem de voz</h1>
          <p>Envie amostras de áudio para clonar uma voz na ElevenLabs e gerar falas com ela. Só você tem acesso a esta área.</p>
        </div>
      </div>
      {aviso && <div className="notice vz-aviso" role="alert"><span className="icon">error</span><div>{aviso}</div></div>}
      <VozPainel vozes={vozes} limiteMb={LIMITE_AMOSTRAS_MB} limiteTexto={LIMITE_TEXTO} desligado={!elevenlabsAtivo()} />
      <Toaster />
    </div>
  );
}
