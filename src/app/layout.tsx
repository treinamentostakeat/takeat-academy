import type { Metadata, Viewport } from 'next';
import '@/styles/tokens.css';
import '@/styles/sala.css';
import '@/styles/equipe.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Takeat Academy', template: 'Takeat Academy · %s' },
  description: 'Aulas ao vivo, plantão de dúvidas e conteúdos da Takeat para restaurantes.',
  icons: { icon: '/brand/takeat-icon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..24,400,0..1,0&display=block" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
