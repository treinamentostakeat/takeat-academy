/* Regras puras das trilhas: como mostrar um vídeo pelo link e como corrigir o quiz. Sem banco nem Next. */

export type Exibicao =
  | { tipo: 'iframe'; src: string }
  | { tipo: 'video'; src: string }
  | { tipo: 'link'; href: string }
  | null;

/** Link colado pelo RH → como exibir. Só incorpora (iframe) YouTube, Vimeo e Google Drive; o resto vira link. */
export function exibicaoDeVideo(url: string): Exibicao {
  let u: URL;
  try { u = new URL(url.trim()); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  const id = (re: RegExp) => re.exec(u.pathname)?.[1];

  if (host === 'youtube.com') {
    const v = u.searchParams.get('v') ?? id(/^\/(?:embed|shorts|live)\/([\w-]{6,})/);
    if (v) return { tipo: 'iframe', src: `https://www.youtube-nocookie.com/embed/${v}` };
  }
  if (host === 'youtu.be') {
    const v = id(/^\/([\w-]{6,})/);
    if (v) return { tipo: 'iframe', src: `https://www.youtube-nocookie.com/embed/${v}` };
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const v = id(/^\/(?:video\/)?(\d+)/);
    if (v) return { tipo: 'iframe', src: `https://player.vimeo.com/video/${v}` };
  }
  if (host === 'drive.google.com') {
    const v = id(/^\/file\/d\/([\w-]+)/) ?? u.searchParams.get('id');
    if (v) return { tipo: 'iframe', src: `https://drive.google.com/file/d/${v}/preview` };
  }
  if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { tipo: 'video', src: u.toString() };
  return { tipo: 'link', href: u.toString() };
}

export const linkValido = (url: string) => {
  try { const u = new URL(url.trim()); return u.protocol === 'https:' || u.protocol === 'http:'; } catch { return false; }
};

/** Corrige as respostas (posição escolhida por pergunta, na ordem das perguntas). Sem resposta conta como erro. */
export function corrigir(gabarito: number[], respostas: (number | null | undefined)[], aprovacao: number) {
  const acertos = gabarito.reduce((n, c, i) => n + (respostas[i] === c ? 1 : 0), 0);
  const total = gabarito.length;
  // Se o RH tirar perguntas, o mínimo nunca passa do total
  const minimo = Math.min(Math.max(1, aprovacao), total);
  return { acertos, total, minimo, aprovada: total > 0 && acertos >= minimo };
}
