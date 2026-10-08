import { TEMA, type Tema } from '@/lib/temas';

/** Tile do tema (ícone sobre o tint do tema). size: xs | sm | (padrão) | lg */
export function TemaTile({ tema, size }: { tema: string; size?: 'xs' | 'sm' | 'lg' }) {
  const t = TEMA[tema as Tema];
  if (!t) return null;
  return (
    <span className={`ti ${size ?? ''}`} style={{ '--tc': t.cor, '--tt': t.tint } as React.CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: t.icone }} />
    </span>
  );
}
