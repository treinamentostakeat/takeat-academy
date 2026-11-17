import 'server-only';
import { createHash } from 'node:crypto';
import { abrir, selar } from './selo';

/* Link de primeiro acesso: vai no WhatsApp no lugar da senha. A pessoa abre, cria a própria senha e já entra.
   - Vale por 7 dias.
   - Deixa de valer quando a senha muda (o link guarda uma "impressão" da senha atual), então só funciona uma vez.
   - Assinado com o SESSION_SECRET: não dá para montar um link sem ele. */

export const VALIDADE_DIAS = 7;
type Token = { t: 'acesso'; id: string; exp: number; fp: string };

/** Impressão curta da senha atual: muda sempre que a senha muda */
const impressao = (senhaHash: string) => createHash('sha256').update(senhaHash).digest('base64url').slice(0, 16);

export function tokenDeAcesso(u: { id: string; senhaHash: string }, agora = Date.now()) {
  return selar({ t: 'acesso', id: u.id, exp: agora + VALIDADE_DIAS * 86400e3, fp: impressao(u.senhaHash) } satisfies Token);
}

/** Endereço do link (APP_URL ou o endereço de quem chamou) */
export const linkDeAcesso = (base: string, token: string) => `${base.replace(/\/$/, '')}/acesso/${token}`;

/** Lê o token. Devolve o id da conta só se o link é válido, não venceu e a senha ainda é a mesma de quando foi gerado. */
export function lerTokenDeAcesso(token: string, senhaHashAtual: (id: string) => string | null, agora = Date.now()) {
  const t = abrir<Token>(token);
  if (!t || t.t !== 'acesso' || typeof t.id !== 'string' || t.exp < agora) return null;
  const hash = senhaHashAtual(t.id);
  return hash && impressao(hash) === t.fp ? t.id : null;
}

/** Só o id que o token diz (para buscar a conta antes da conferência completa); null se a assinatura não bate */
export const idDoToken = (token: string) => {
  const t = abrir<Token>(token);
  return t && t.t === 'acesso' && typeof t.id === 'string' ? t.id : null;
};
