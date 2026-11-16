import Link from 'next/link';
import { exigirPessoa } from '@/lib/sessao';
import { EmBreve } from '../../visual';

export const metadata = { title: 'Aulas internas' };

/* Categorias das aulas internas. A agenda, a sala com chat ao vivo e o cadastro das aulas entram na próxima etapa;
   até lá, cada categoria aparece como "Em breve". */
const CATEGORIAS = [
  { icon: 'favorite', titulo: 'Cultura e valores', texto: 'O jeito Takeat de trabalhar, contado por quem vive ele.' },
  { icon: 'apartment', titulo: 'Setores por dentro', texto: 'Cada área mostra como funciona, o que faz e como ajudar.' },
  { icon: 'restaurant', titulo: 'Universo do Restaurante', texto: 'Salão, cozinha, delivery e a rotina de quem é nosso cliente.' },
  { icon: 'supervisor_account', titulo: 'Liderança e gestão', texto: 'Feedback, rituais de time e gestão no dia a dia.' },
  { icon: 'auto_awesome', titulo: 'IA e produtividade', texto: 'Ferramentas e jeitos de trabalhar melhor com IA.' },
  { icon: 'self_improvement', titulo: 'Bem-estar', texto: 'Saúde, equilíbrio e cuidado com quem faz a Takeat.' },
];

export default async function AulasInternas() {
  await exigirPessoa();
  return (
    <>
      <header className="ac-pg-h">
        <Link className="ac-voltar" href="/interno/aulas"><span className="icon s16" aria-hidden="true">arrow_back</span>Aulas ao vivo</Link>
        <p className="ac-eyebrow">Para colaboradores</p>
        <h1>Aulas internas</h1>
        <p className="lead">Aulas ao vivo só para o time Takeat. A agenda está sendo montada: assim que a primeira aula for marcada, ela aparece aqui.</p>
      </header>

      <section className="ac-sec" aria-labelledby="t-categorias">
        <div className="ac-sec-h"><div><h2 id="t-categorias">Temas</h2><p>O que vem por aí nas aulas internas</p></div></div>
        <div className="ac-sistema">
          {CATEGORIAS.map((c) => <EmBreve key={c.titulo} icon={c.icon} titulo={c.titulo} texto={c.texto} />)}
        </div>
      </section>

      <section className="ac-sec" aria-labelledby="t-sistema">
        <div className="ac-sec-h"><div><h2 id="t-sistema">Enquanto isso</h2><p>As aulas do sistema já acontecem toda semana</p></div></div>
        <Link className="ac-lin" href="/aulas">
          <span className="ac-ic red peq" aria-hidden="true"><span className="icon">videocam</span></span>
          <span><b>Aulas do sistema</b><small>As mesmas aulas que os restaurantes fazem, por tema e horário</small></span>
          <span className="ac-aovivo">● AO VIVO</span>
        </Link>
      </section>
    </>
  );
}
