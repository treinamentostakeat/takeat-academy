import Link from 'next/link';
import { connection } from 'next/server';
import { buscarCertificado } from '@/lib/gamificacao';
import '../../interno/(area)/academy.css';

export const metadata = { title: 'Validar certificado', robots: { index: false } };

/* Página pública de validação: quem recebe o certificado confere se o código é verdadeiro. */
export default async function ValidarCertificado({ params }: { params: Promise<{ codigo: string }> }) {
  await connection();
  const { codigo } = await params;
  const c = await buscarCertificado(decodeURIComponent(codigo));
  const data = c?.em.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: process.env.TZ_AULAS || 'America/Sao_Paulo' });
  return (
    <div className="ac ac-solo">
      <div className="ac-bv ac-valida">
        <div className="ac-brilho" aria-hidden="true" />
        <header className="ac-bv-top">
          <Link href="/interno" className="ac-marca"><span className="ac-marca-t">Takeat</span><span className="ac-marca-s">Academy</span></Link>
        </header>
        <main className="ac-valida-main">
          {c ? (
            <>
              <span className="ac-valida-i ok" aria-hidden="true"><span className="icon">verified</span></span>
              <p className="ac-eyebrow">Certificado válido</p>
              <h1>{c.nome}</h1>
              <p className="lead">concluiu a trilha <b>{c.trilha}</b> na Takeat Academy em {data}.</p>
              <p className="ac-valida-cod">{c.codigo}</p>
            </>
          ) : (
            <>
              <span className="ac-valida-i" aria-hidden="true"><span className="icon">help</span></span>
              <p className="ac-eyebrow">Código não encontrado</p>
              <h1>Não achamos este certificado</h1>
              <p className="lead">Confira se o código foi digitado como aparece no certificado, no formato TKA-XXXX-XXXX.</p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
