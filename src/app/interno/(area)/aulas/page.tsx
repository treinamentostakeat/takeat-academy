import Link from 'next/link';
import { exigirPessoa } from '@/lib/sessao';
import { TEMAS } from '@/lib/temas';

export const metadata = { title: 'Aulas ao vivo' };

/* Aulas ao vivo: a pessoa escolhe entre as aulas internas (para o time Takeat) e as aulas do sistema,
   que são as mesmas dos clientes e continuam na agenda de clientes (/aulas). */
export default async function AulasAoVivo() {
  await exigirPessoa();
  return (
    <>
      <header className="ac-pg-h">
        <p className="ac-eyebrow">Aulas ao vivo</p>
        <h1>Qual aula você quer ver?</h1>
        <p className="lead">Escolha entre as aulas feitas para o time Takeat e as aulas do sistema, que os restaurantes também fazem.</p>
      </header>

      <div className="ac-escolhas">
        <Link className="ac-escolha" href="/interno/aulas/internas">
          <span className="ac-ic red" aria-hidden="true"><span className="icon">groups</span></span>
          <p className="ac-eyebrow">Para colaboradores</p>
          <h2>Aulas internas</h2>
          <p>Aulas ao vivo só para o time Takeat, com quem faz a empresa acontecer.</p>
          <ul aria-label="Temas">
            <li>Cultura e valores</li><li>Setores por dentro</li><li>Universo do Restaurante</li><li>Liderança e gestão</li><li>IA e produtividade</li><li>Bem-estar</li>
          </ul>
          <span className="mais">Ver aulas internas<span className="icon" aria-hidden="true">arrow_forward</span></span>
        </Link>

        <Link className="ac-escolha" href="/aulas">
          <span className="ac-ic" aria-hidden="true"><span className="icon">videocam</span></span>
          <p className="ac-eyebrow">Sistema Takeat</p>
          <h2>Aulas do sistema</h2>
          <p>As mesmas aulas ao vivo que os restaurantes fazem, por tema e horário. Abre a agenda de aulas dos clientes.</p>
          <ul aria-label="Temas">{TEMAS.map((t) => <li key={t}>{t}</li>)}</ul>
          <span className="mais">Ver agenda das aulas do sistema<span className="icon" aria-hidden="true">arrow_forward</span></span>
        </Link>
      </div>
    </>
  );
}
