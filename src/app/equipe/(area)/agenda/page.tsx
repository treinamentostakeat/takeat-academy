import { exigirUsuario } from '@/lib/sessao';

export default async function Agenda() {
  const u = await exigirUsuario();
  return <div className="rp-head"><div><h1>Agenda</h1><p>Olá, {u.nome}.</p></div></div>;
}
