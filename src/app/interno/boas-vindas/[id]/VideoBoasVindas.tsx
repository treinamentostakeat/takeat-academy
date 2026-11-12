'use client';
import { useState } from 'react';
import type { Exibicao } from '@/lib/aprendizagem';

/** Vídeo de boas-vindas: capa vermelha com play; o player só carrega depois do clique. */
export function VideoBoasVindas({ video }: { video: NonNullable<Exibicao> }) {
  const [tocando, setTocando] = useState(false);
  return (
    <div className="ac-bv-player">
      {tocando && video.tipo === 'iframe' && <iframe src={video.src} title="Vídeo de boas-vindas" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />}
      {tocando && video.tipo === 'video' && <video src={video.src} controls autoPlay playsInline />}
      {!tocando && (
        <>
          <div className="grad" aria-hidden="true" />
          <div className="risco" aria-hidden="true" />
          <span className="tag" aria-hidden="true">● BOAS-VINDAS</span>
          {video.tipo === 'link'
            ? <a className="ac-bv-play" href={video.href} target="_blank" rel="noopener noreferrer" aria-label="Assistir ao vídeo de boas-vindas (abre em outra aba)"><span className="icon" aria-hidden="true">play_arrow</span></a>
            : <button type="button" className="ac-bv-play" onClick={() => setTocando(true)} aria-label="Assistir ao vídeo de boas-vindas"><span className="icon" aria-hidden="true">play_arrow</span></button>}
        </>
      )}
    </div>
  );
}
