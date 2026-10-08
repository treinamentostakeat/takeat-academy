import 'server-only';
import { db } from '../db';

/** Registra uma chamada de integração. Sem chave configurada fica como "demo" (nada sai do app). */
export async function registrar(canal: 'hubspot' | 'whatsapp', tipo: string, payload: unknown, envio?: () => Promise<void>) {
  const reg = await db.integracao.create({ data: { canal, tipo, payload: JSON.stringify(payload), status: envio ? 'pendente' : 'demo' } });
  if (!envio) return reg;
  try {
    await envio();
    return db.integracao.update({ where: { id: reg.id }, data: { status: 'enviado' } });
  } catch (e) {
    // Falha de integração nunca derruba a ação do cliente; fica registrada para reenvio.
    return db.integracao.update({ where: { id: reg.id }, data: { status: 'erro', erro: String(e instanceof Error ? e.message : e).slice(0, 500) } });
  }
}
