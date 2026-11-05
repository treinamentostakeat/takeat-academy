'use client';
import { useState, useSyncExternalStore } from 'react';
import { Dropdown } from '@/components/Dropdown';

/* Peças obrigatórias da tabela do Takeat UI Kit (components.md §5): botão Exportar e paginação. */

/* ---------- Exportar ---------- */
export type DadosExport = { titulo: string; subtitulo?: string; colunas: string[]; linhas: (string | number)[][] };

const esc = (v: unknown) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const CSS_PDF = `
  @page { margin: 16mm; }
  html, body { background: var(--surface-raised); }
  body { margin: 0; color: var(--text-secondary); font-family: Poppins, sans-serif; font-size: 12px; line-height: 16px; letter-spacing: .4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  img { height: 24px; display: block; margin-bottom: 16px; }
  h1 { margin: 0; color: var(--text-primary); font-size: 18px; line-height: 24px; font-weight: 600; }
  p { margin: 4px 0 0; }
  table { width: 100%; margin-top: 16px; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th { padding: 8px 12px; background: var(--surface-fill); color: var(--text-secondary); font-weight: 600; text-align: left; }
  td { padding: 8px 12px; border-bottom: .5px solid var(--stroke-default); color: var(--text-primary); font-weight: 500; font-variant-numeric: tabular-nums; }
  footer { margin-top: 16px; color: var(--text-tertiary); }
`;

/** Abre a impressão do navegador só com a tabela, para salvar em PDF. Usa os estilos do app no tema claro e Poppins. */
export async function exportarPdf(d: DadosExport) {
  document.querySelector('iframe.pdf-frame')?.remove();
  const f = document.createElement('iframe');
  f.className = 'pdf-frame';
  f.title = d.titulo;
  f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.append(f);

  const estilos = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')].map((l) => `<link rel="stylesheet" href="${esc(l.href)}">`).join('');
  const quando = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  const doc = f.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR" data-theme="light"><head><meta charset="utf-8"><title>${esc(d.titulo)}</title>${estilos}<style>${CSS_PDF}</style></head><body>
    <img src="/brand/takeat-logo.svg" alt="Takeat">
    <h1>${esc(d.titulo)}</h1>${d.subtitulo ? `<p>${esc(d.subtitulo)}</p>` : ''}
    <table><thead><tr>${d.colunas.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
    <tbody>${d.linhas.map((l) => `<tr>${l.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <footer>Takeat Academy · exportado em ${esc(quando)}</footer>
  </body></html>`);
  doc.close();

  // Só imprime depois de estilos, logo e fonte carregados; falha de um recurso não impede a exportação
  const pendentes = [...doc.querySelectorAll<HTMLLinkElement | HTMLImageElement>('link[rel="stylesheet"], img')].map((el) => new Promise((ok) => {
    if (el instanceof HTMLImageElement && el.complete) return ok(null);
    el.addEventListener('load', ok, { once: true });
    el.addEventListener('error', ok, { once: true });
  }));
  await Promise.all(pendentes);
  await doc.fonts.ready;

  const w = f.contentWindow!;
  w.addEventListener('afterprint', () => f.remove(), { once: true });
  w.focus();
  w.print();
}

/** Botão Exportar do kit: Outlined, Large, sempre teal. PDF sempre. No celular fica só o ícone. */
export function BotaoExportar({ dados }: { dados: DadosExport }) {
  return (
    <button type="button" className="btn btn-l btn-export" aria-label={`Exportar ${dados.titulo} em PDF`} onClick={() => { void exportarPdf(dados); }}>
      <span className="icon">file_export</span><span className="rot">Exportar</span>
    </button>
  );
}

/* ---------- Paginação ---------- */
const CELULAR = '(max-width: 900px)';
const assinar = (avisar: () => void) => {
  const m = window.matchMedia(CELULAR);
  m.addEventListener('change', avisar);
  return () => m.removeEventListener('change', avisar);
};

/**
 * Paginação no navegador. Linhas por página: 10 no computador e 5 no celular.
 * `chave` volta para a primeira página quando muda (por exemplo, ao filtrar).
 */
export function usePaginacao<T>(itens: T[], chave = '') {
  const celular = useSyncExternalStore(assinar, () => window.matchMedia(CELULAR).matches, () => false);
  const opcoes = celular ? [5, 10, 25, 50] : [10, 25, 50, 100];
  const [escolha, setEscolha] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [chaveAtual, setChaveAtual] = useState(chave);
  if (chave !== chaveAtual) { setChaveAtual(chave); setPagina(1); }

  const linhas = escolha && opcoes.includes(escolha) ? escolha : opcoes[0];
  const ultima = Math.max(1, Math.ceil(itens.length / linhas));
  const atual = Math.min(pagina, ultima);
  return {
    visiveis: itens.slice((atual - 1) * linhas, atual * linhas),
    paginacao: {
      // O kit só pede paginação quando as linhas passam de uma página padrão
      ativa: itens.length > opcoes[0],
      total: itens.length, atual, ultima, linhas, opcoes,
      irPara: setPagina,
      mudarLinhas: (n: number) => { setEscolha(n); setPagina(1); },
    },
  };
}

/** Números das páginas com reticências: 1 … 4 5 6 … 12 */
function numeros(atual: number, ultima: number) {
  const nums = [...new Set([1, atual - 1, atual, atual + 1, ultima])].filter((n) => n >= 1 && n <= ultima).sort((a, b) => a - b);
  return nums.flatMap((n, i) => (i && n - nums[i - 1] > 1 ? ['…' as const, n] : [n]));
}

export function Paginacao({ total, atual, ultima, linhas, opcoes, ativa, irPara, mudarLinhas }: ReturnType<typeof usePaginacao>['paginacao']) {
  if (!ativa) return null;
  const ini = (atual - 1) * linhas + 1, fim = Math.min(atual * linhas, total);
  return (
    <nav className="pager" aria-label="Paginação da tabela">
      <span className="pg-n" aria-live="polite">{ini}–{fim} de {total} registros</span>
      <span className="pg-l">
        Linhas por página
        <Dropdown tamanho="compacto" ariaLabel="Linhas por página" value={String(linhas)} opcoes={opcoes.map((n) => ({ value: String(n), label: String(n) }))} onChange={(v) => mudarLinhas(Number(v))} />
      </span>
      <span className="pages">
        <button type="button" disabled={atual === 1} onClick={() => irPara(atual - 1)} aria-label="Página anterior"><span className="icon s18">chevron_left</span></button>
        {numeros(atual, ultima).map((n, i) => (n === '…'
          ? <span key={`r${i}`} className="pg-r" aria-hidden="true">…</span>
          : <button key={n} type="button" aria-current={n === atual ? 'page' : undefined} aria-label={`Página ${n}`} onClick={() => irPara(n)}>{n}</button>))}
        <button type="button" disabled={atual === ultima} onClick={() => irPara(atual + 1)} aria-label="Próxima página"><span className="icon s18">chevron_right</span></button>
      </span>
    </nav>
  );
}
