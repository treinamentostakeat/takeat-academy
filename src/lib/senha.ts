import { randomInt } from 'node:crypto';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
/** Senha provisória aleatória (12 caracteres, sem letras/números que se confundem) */
export const senhaProvisoria = () => Array.from({ length: 12 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');
