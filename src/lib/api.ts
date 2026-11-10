import { createHash, timingSafeEqual } from 'node:crypto';

/* Autenticação da API de integração (RPA). O servidor guarda só o hash SHA-256 da chave (API_RPA_CHAVE_HASH);
   a chave em si fica com quem integra e vai no cabeçalho Authorization: Bearer <chave>. */

export const hashDaChave = (chave: string) => createHash('sha256').update(chave, 'utf8').digest('hex');

export type Autorizacao = { ok: true } | { ok: false; status: 401 | 503; erro: string };

/** Confere o cabeçalho Authorization contra o hash configurado. Sem hash configurado, a API fica desligada. */
export function autorizar(cabecalho: string | null, hashConfigurado: string | undefined): Autorizacao {
  const esperado = (hashConfigurado ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(esperado)) return { ok: false, status: 503, erro: 'API desligada: a chave de integração não está configurada neste servidor.' };
  const chave = /^Bearer\s+(\S+)$/i.exec(cabecalho ?? '')?.[1];
  if (!chave) return { ok: false, status: 401, erro: 'Envie a chave no cabeçalho Authorization: Bearer <chave>.' };
  const a = Buffer.from(hashDaChave(chave), 'hex'), b = Buffer.from(esperado, 'hex');
  return a.length === b.length && timingSafeEqual(a, b) ? { ok: true } : { ok: false, status: 401, erro: 'Chave inválida.' };
}
