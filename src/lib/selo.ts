import { createHmac, timingSafeEqual } from 'node:crypto';

/* Cookies assinados (HMAC): o conteúdo fica visível, mas não pode ser alterado sem o SESSION_SECRET. */

const SECRET = () => {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('Defina SESSION_SECRET no .env');
  return s;
};
const sign = (v: string) => createHmac('sha256', SECRET()).update(v).digest('base64url');
export const selar = (dados: object) => { const v = Buffer.from(JSON.stringify(dados)).toString('base64url'); return `${v}.${sign(v)}`; };
export function abrir<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [v, s] = token.split('.');
  if (!v || !s) return null;
  const a = Buffer.from(sign(v)), b = Buffer.from(s);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { return JSON.parse(Buffer.from(v, 'base64url').toString()) as T; } catch { return null; }
}
