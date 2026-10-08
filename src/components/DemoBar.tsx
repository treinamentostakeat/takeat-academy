import { livekitAtivo } from '@/lib/integracoes/livekit';

/** Faixa amarela quando o app roda sem as chaves de integração (vídeo simulado, HubSpot/WhatsApp só registrados). */
export function DemoBar() {
  const faltam = [
    !livekitAtivo() && 'vídeo (LiveKit)',
    !process.env.HUBSPOT_TOKEN && 'HubSpot',
    !(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) && 'WhatsApp',
  ].filter(Boolean);
  if (!faltam.length) return null;
  return (
    <div className="demo-bar" role="note">
      <span className="icon">science</span>
      Modo demonstração: {faltam.join(', ')} sem chave configurada. Nada é enviado para fora do app.
    </div>
  );
}
