import 'server-only';
import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';

/* LiveKit: vídeo da sala de aula. Sem LIVEKIT_* no .env a sala roda em modo demonstração (sem vídeo real). */

export const livekitAtivo = () => !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
export const livekitUrl = () => process.env.LIVEKIT_URL || '';
export const nomeSala = (turmaId: string) => `turma-${turmaId}`;

/**
 * Token de entrada. Instrutor publica áudio/vídeo/tela e administra a sala.
 * Cliente entra só ouvindo (canPublish=false); quando o instrutor libera a mão, ganha microfone (e tela).
 */
export async function tokenSala(opts: { turmaId: string; identidade: string; nome: string; papel: 'instrutor' | 'cliente'; metadata?: object }) {
  const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
    identity: opts.identidade, name: opts.nome, ttl: '3h', metadata: JSON.stringify({ papel: opts.papel, ...(opts.metadata || {}) }),
  });
  const instrutor = opts.papel === 'instrutor';
  at.addGrant({
    room: nomeSala(opts.turmaId), roomJoin: true, roomAdmin: instrutor,
    canPublish: instrutor, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: true,
  });
  return at.toJwt();
}

const sala = () => new RoomServiceClient(process.env.LIVEKIT_URL!.replace(/^wss?:/, 'https:'), process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);

/** Libera (ou recolhe) o microfone e a tela de um cliente */
export async function liberarFala(turmaId: string, identidade: string, liberar: boolean) {
  await sala().updateParticipant(nomeSala(turmaId), identidade, undefined, {
    canPublish: liberar, canSubscribe: true, canPublishData: true, canUpdateMetadata: true,
    // Cliente liberado fala e pode mostrar a tela; câmera do cliente fica de fora (só a instrutora aparece)
    canPublishSources: liberar ? [TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO] : [],
  });
}

export async function encerrarSala(turmaId: string) {
  try { await sala().deleteRoom(nomeSala(turmaId)); } catch { /* sala já fechada */ }
}
