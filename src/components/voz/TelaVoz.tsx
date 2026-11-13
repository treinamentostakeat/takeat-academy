import { Toaster } from '@/components/equipe/Toast';
import { ErroElevenLabs, LIMITE_AMOSTRAS_MB, LIMITE_TEXTO, LIMITE_TEXTO_FALA, elevenlabsAtivo, listarVozes, listarVozesProntas, type VozClonada, type VozPronta } from '@/lib/integracoes/elevenlabs';
import { exigirAcessoVoz } from '@/lib/sessao';
import { VozPainel } from './VozPainel';
import './voz.css';

/* Clonagem de voz (ElevenLabs). Usada em /equipe/voz (gestor) e /interno/voz (RH).
   Só quem está na lista VOZ_ACESSO_EMAILS entra. */
export async function TelaVoz() {
  await exigirAcessoVoz();
  let vozes: VozClonada[] = [];
  let prontas: VozPronta[] = [];
  let aviso: string | null = null;
  const msg = (e: unknown) => (e instanceof ErroElevenLabs ? e.message : 'Não foi possível carregar as vozes da ElevenLabs.');
  if (!elevenlabsAtivo()) aviso = 'A integração com a ElevenLabs não está configurada neste servidor (ELEVENLABS_API_KEY).';
  else {
    // Uma lista falhar não derruba a outra
    const [c, p] = await Promise.allSettled([listarVozes(), listarVozesProntas()]);
    if (c.status === 'fulfilled') vozes = c.value; else aviso = msg(c.reason);
    if (p.status === 'fulfilled') prontas = p.value; else aviso ??= msg(p.reason);
  }
  return (
    <div className="vz">
      <div className="rp-head">
        <div>
          <h1>Voz e fala</h1>
          <p>Transforme texto em fala com as vozes da ElevenLabs ou clone uma voz a partir de amostras de áudio. Só as pessoas da lista de acesso veem esta área.</p>
        </div>
      </div>
      {aviso && <div className="notice vz-aviso" role="alert"><span className="icon">error</span><div>{aviso}</div></div>}
      <VozPainel vozes={vozes} prontas={prontas} limiteMb={LIMITE_AMOSTRAS_MB} limiteTexto={LIMITE_TEXTO} limiteFala={LIMITE_TEXTO_FALA} desligado={!elevenlabsAtivo()} />
      <Toaster />
    </div>
  );
}
