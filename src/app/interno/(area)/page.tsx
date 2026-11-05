import Link from 'next/link';
import { podeGerirPessoas } from '@/lib/permissoes';
import { exigirPessoa } from '@/lib/sessao';

export const metadata = { title: 'Onboarding' };

/* A trilha de onboarding entra aqui na próxima etapa. */
export default async function Inicio({ searchParams }: { searchParams: Promise<{ negado?: string }> }) {
  const u = await exigirPessoa();
  const { negado } = await searchParams;
  return (
    <>
      {negado && (
        <div className="notice" role="alert" style={{ marginBottom: 16 }}>
          <span className="icon">lock</span>
          <div><b>Esta área é do RH</b>Você foi trazido de volta para o início. Fale com o RH se precisar desse acesso.</div>
        </div>
      )}
      <div className="rp-head">
        <div>
          <h1>Olá, {u.nome.split(' ')[0]}</h1>
          <p>Boas-vindas ao onboarding da Takeat.</p>
        </div>
      </div>
      <section className="tcard">
        <div className="state">
          <span className="icon">route</span>
          <b>Sua trilha aparece aqui em breve</b>
          <p>Ela vai mostrar, setor por setor, como a Takeat funciona.</p>
          {podeGerirPessoas(u.cargo) && <div className="acts"><Link className="btn btn-l btn-outlined" href="/interno/pessoas"><span className="icon">group</span>Gerenciar pessoas</Link></div>}
        </div>
      </section>
    </>
  );
}
