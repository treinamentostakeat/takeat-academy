import { HeaderCliente } from '@/components/HeaderCliente';
import { DemoBar } from '@/components/DemoBar';
import { clienteAtual } from '@/lib/sessao';
import { iniciais } from '@/lib/formato';

export default async function LayoutCliente({ children }: { children: React.ReactNode }) {
  const c = await clienteAtual();
  return (
    <>
      <DemoBar />
      <HeaderCliente restaurante={c ? { nome: c.nome, iniciais: iniciais(c.nome) } : null} />
      {children}
    </>
  );
}
