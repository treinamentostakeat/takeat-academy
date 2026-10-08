import type { Metadata } from 'next';
import { AvisoSala } from '@/components/sala/AvisoSala';

export const metadata: Metadata = { title: 'Link da aula' };

/* Destino de /s/<codigo> quando o código não existe */
export default function LinkInvalido() {
  return (
    <AvisoSala
      icone="link_off"
      titulo="Não encontramos este link"
      texto="O link da aula pode estar incompleto ou ter sido digitado errado. Confira a mensagem no WhatsApp ou escolha um horário para se inscrever."
      principal={{ href: '/aulas', label: 'Ver aulas ao vivo', icon: 'event_available' }}
      secundaria={{ href: '/', label: 'Voltar ao início' }}
    />
  );
}
