import { Toaster } from '@/components/equipe/Toast';
import { ErroElevenLabs, LIMITE_AMOSTRAS_MB, LIMITE_TEXTO, elevenlabsAtivo, listarVozes, type VozClonada } from '@/lib/integracoes/elevenlabs';
import { exigirAcessoVoz } from '@/lib/sessao';
import { VozPainel } from './VozPainel';
import './voz.css';

/* Clonagem de voz (ElevenLabs). Usada em /equipe/voz (gestor) e /interno/voz (RH).
   Só quem está na lista VOZ_ACESSO_EMAILS entra. */
export async function TelaVoz() {
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
          <p>Envie amostras de áudio para clonar uma voz na ElevenLabs e gerar falas com ela. Só as pessoas da lista de acesso veem esta área.</p>
        </div>
      </div>
      {aviso && <div className="notice vz-aviso" role="alert"><span className="icon">error</span><div>{aviso}</div></div>}
      <VozPainel vozes={vozes} limiteMb={LIMITE_AMOSTRAS_MB} limiteTexto={LIMITE_TEXTO} desligado={!elevenlabsAtivo()} />
      <Toaster />
    </div>
  );
}
