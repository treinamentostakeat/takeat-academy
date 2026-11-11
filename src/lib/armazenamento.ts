import 'server-only';

/* Supabase Storage pela API REST, com a chave secreta só no servidor.
   O navegador recebe apenas links assinados e temporários: um para enviar o arquivo e outro para assistir.
   O bucket "academy" é privado: sem link assinado, ninguém acessa os vídeos. */

const BUCKET = 'academy';
export const TIPOS_VIDEO = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
/** Limite por arquivo. No plano Free do Supabase o teto é 50 MB; no Pro, suba o limite global e o do bucket
    no painel do Supabase e defina VIDEO_LIMITE_MB (ex.: 2048 para 2 GB). */
export const limiteVideoMb = () => {
  const n = Number(process.env.VIDEO_LIMITE_MB);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 50;
};

function cfg() {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, '');
  const chave = process.env.SUPABASE_SECRET_KEY?.trim();
  return url && chave ? { url, chave } : null;
}
export const armazenamentoAtivo = () => !!cfg();

async function api<T>(metodo: 'POST' | 'DELETE', caminho: string, corpo?: unknown): Promise<T> {
  const c = cfg();
  if (!c) throw new Error('Armazenamento de arquivos desligado: defina SUPABASE_URL e SUPABASE_SECRET_KEY no .env');
  const r = await fetch(`${c.url}/storage/v1${caminho}`, {
    method: metodo, cache: 'no-store',
    headers: { apikey: c.chave, Authorization: `Bearer ${c.chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo ?? {}),
  });
  // Nunca repassa a resposta inteira: o erro não deve carregar dados de autenticação
  if (!r.ok) throw new Error(`Supabase Storage respondeu ${r.status}`);
  return r.json() as Promise<T>;
}

export type EnvioAssinado = { endpoint: string; token: string; bucket: string; caminho: string };

/** Token para o navegador enviar o arquivo direto ao Storage, em partes de 6 MB que retomam se a conexão cair
    (protocolo TUS). Vale por 2 horas e só para este caminho. */
export async function linkDeEnvio(caminho: string): Promise<EnvioAssinado> {
  const j = await api<{ url: string }>('POST', `/object/upload/sign/${BUCKET}/${caminho}`);
  const token = new URL(j.url, 'http://x').searchParams.get('token');
  if (!token) throw new Error('Supabase Storage não devolveu o token de envio');
  // Envio com token assinado usa a rota /upload/resumable/sign (a /upload/resumable exige JWT de usuário)
  return { endpoint: `${hostDoStorage(cfg()!.url)}/storage/v1/upload/resumable/sign`, token, bucket: BUCKET, caminho };
}

/** O Supabase recomenda o host direto do Storage para arquivos grandes: <ref>.storage.supabase.co */
export const hostDoStorage = (url: string) => url.replace(/^https:\/\/([a-z0-9]+)\.supabase\.co$/, 'https://$1.storage.supabase.co');

/** Links para assistir (padrão: 4 horas). Caminho sem link volta como null. */
export async function linksDeLeitura(caminhos: string[], segundos = 4 * 3600): Promise<Map<string, string | null>> {
  if (!caminhos.length) return new Map();
  const r = await api<{ path: string | null; signedURL: string | null; error: string | null }[]>('POST', `/object/sign/${BUCKET}`, { expiresIn: segundos, paths: caminhos });
  return new Map(caminhos.map((p) => {
    const x = r.find((y) => y.path === p);
    return [p, x?.signedURL ? `${cfg()!.url}/storage/v1${x.signedURL}` : null];
  }));
}

/** Apaga arquivos que saíram do curso. Falha aqui nunca desfaz o salvamento. */
export async function apagarArquivos(caminhos: string[]) {
  if (!caminhos.length || !armazenamentoAtivo()) return;
  try { await api('DELETE', `/object/${BUCKET}`, { prefixes: caminhos }); } catch { /* arquivo órfão: sem impacto para quem assiste */ }
}

/** Caminho do arquivo de um curso: cursos/<cursoId>/<aleatório>-<nome-limpo>.<ext> */
export function caminhoDoVideo(cursoId: string, nome: string, aleatorio: string) {
  const ext = (/\.(mp4|webm|mov|m4v)$/i.exec(nome)?.[1] ?? 'mp4').toLowerCase();
  const base = nome.replace(/\.[A-Za-z0-9]{1,5}$/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'video';
  return `cursos/${cursoId}/${aleatorio}-${base}.${ext}`;
}
export const ehCaminhoDoCurso = (cursoId: string, caminho: string) => new RegExp(`^cursos/${cursoId}/[\\w-]+\\.(mp4|webm|mov|m4v)$`).test(caminho);
