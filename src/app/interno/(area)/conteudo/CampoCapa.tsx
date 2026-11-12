'use client';
import { useState } from 'react';
import { Upload } from 'tus-js-client';
import { toast } from '@/components/equipe/Toast';
import type { EnvioAssinado } from '@/lib/armazenamento';
import { prepararEnvioCapa } from './acoes';

/** Envia o arquivo direto do navegador para o Storage em partes de 6 MB (TUS).
    Se a conexão oscilar, cada parte é reenviada sozinha, sem recomeçar o arquivo inteiro. */
export function enviarArquivo(e: EnvioAssinado, arquivo: File, progresso: (pct: number) => void) {
  return new Promise<void>((ok, falha) => {
    const envio = new Upload(arquivo, {
      endpoint: e.endpoint,
      headers: { 'x-signature': e.token, 'x-upsert': 'false' },
      metadata: { bucketName: e.bucket, objectName: e.caminho, contentType: arquivo.type, cacheControl: '3600' },
      chunkSize: 6 * 1024 * 1024, // exigido pelo Supabase
      uploadDataDuringCreation: true,
      storeFingerprintForResuming: false, // cada envio tem um caminho novo; não retoma envios antigos
      retryDelays: [0, 3000, 5000, 10000, 20000],
      onProgress: (enviado, total) => progresso(Math.min(99, Math.round((enviado / total) * 100))),
      onSuccess: () => { progresso(100); ok(); },
      onError: falha,
    });
    envio.start();
  });
}

const TIPOS = 'image/jpeg,image/png,image/webp';
const LIMITE_MB = 5; // o mesmo de LIMITE_IMAGEM_MB, conferido de novo no servidor

/** Foto de capa (trilha ou vídeo). valor = caminho no Storage; previa = link para mostrar a foto atual.
    A foto só fica guardada depois que a pessoa salva a trilha ou o curso. */
export function CampoCapa({ id, rotulo, dono, donoId, valor, previa, aoSalvar, onChange }: {
  id: string; rotulo: string; dono: 'trilha' | 'curso'; donoId: string; valor: string; previa: string | null; aoSalvar: string;
  onChange: (caminho: string, previa: string | null) => void;
}) {
  const [pct, setPct] = useState<number | null>(null);
  const [erro, setErro] = useState('');
  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setErro('');
    if (!TIPOS.split(',').includes(arquivo.type)) { setErro('Envie uma foto em JPG, PNG ou WebP.'); return; }
    if (arquivo.size > LIMITE_MB * 1024 * 1024) { setErro(`A foto tem ${Math.ceil(arquivo.size / 1024 / 1024)} MB. O limite é de ${LIMITE_MB} MB.`); return; }
    setPct(0);
    try {
      const r = await prepararEnvioCapa({ dono, id: donoId, nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size });
      if (!r.ok) { setErro(r.erro); setPct(null); return; }
      await enviarArquivo(r.envio, arquivo, setPct);
      onChange(r.envio.caminho, URL.createObjectURL(arquivo));
      toast(`Foto enviada. ${aoSalvar}`, 'upload');
    } catch {
      setErro('O envio falhou. Confira sua conexão e tente de novo.');
    }
    setPct(null);
  };
  const entrada = <input id={id} type="file" accept={TIPOS} hidden onChange={(e) => { void escolher(e.target.files?.[0]); e.target.value = ''; }} />;
  return (
    <div className="ed-capa">
      <span className="ed-rot">{rotulo}</span>
      <div className="ed-capa-b">
        <div className="ed-capa-prev" aria-hidden={!valor}>
          {valor && previa
            // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário do Storage; não passa pelo otimizador
            ? <img src={previa} alt="Prévia da foto de capa" />
            : <span className="icon">{valor ? 'image' : 'add_photo_alternate'}</span>}
        </div>
        <div className="ed-capa-a">
          {pct !== null ? (
            <div className="ed-envio" role="status"><span>Enviando… {pct}%</span><div className="in-barra"><i style={{ width: `${pct}%` }} /></div></div>
          ) : valor ? (
            <div className="ed-arq">
              <label className="btn btn-m btn-outlined"><span className="icon">image</span>Trocar foto{entrada}</label>
              <button type="button" className="btn btn-m btn-outlined" onClick={() => onChange('', null)}>Remover foto</button>
            </div>
          ) : (
            <div className="ed-arq"><label className="btn btn-m btn-outlined"><span className="icon">upload</span>Enviar foto{entrada}</label></div>
          )}
          <div className="info">JPG, PNG ou WebP, até {LIMITE_MB} MB. Use uma foto deitada (16:9), por exemplo 1280 × 720.</div>
          {erro && <div className="err" role="alert">{erro}</div>}
        </div>
      </div>
    </div>
  );
}
