# Takeat Academy

Plataforma de aulas ao vivo da Takeat para restaurantes: inscrição, agenda, sala de aula própria e presença no HubSpot (fase 1).

## Rodar no computador

Precisa do Node.js 20 ou mais novo.

```bash
npm install
npm run setup
npm run dev
```

Abra http://localhost:3000 (lado do cliente) e http://localhost:3000/equipe (área da equipe).

- `npm run setup` cria o banco local (`prisma/dev.db`) e as contas iniciais: o gestor (`onboarding@takeat.app`) e duas instrutoras de exemplo. A senha inicial está em `SEED_SENHA_INICIAL` no `.env`; troque em **Minha conta** depois de entrar.
- Copie `.env.example` para `.env` se ainda não existir e preencha `SESSION_SECRET` e `SEED_SENHA_INICIAL`.

## Modo demonstração

Sem as chaves das integrações, o app funciona inteiro e mostra uma faixa amarela no topo:

- **Vídeo (LiveKit)**: a sala abre com chat, mão levantada, liberar fala, presença e avaliação, mas sem câmera nem microfone.
- **HubSpot e WhatsApp**: nada sai do app; cada envio fica registrado na tabela `Integracao`.

## Ligar as integrações (no `.env`, depois reinicie)

| O quê | Onde conseguir | Variáveis |
|---|---|---|
| Vídeo da sala | https://cloud.livekit.io → criar projeto → Settings → Keys | `LIVEKIT_URL` (wss://…livekit.cloud), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| HubSpot | HubSpot → Configurações → Integrações → Apps privados (escopos: ler empresas, escrever notas) | `HUBSPOT_TOKEN`; `HUBSPOT_PROP_CNPJ` se a propriedade de CNPJ da empresa não se chamar `cnpj` |
| WhatsApp | Meta for Developers → WhatsApp Business Cloud API; criar e aprovar os modelos `academy_inscricao`, `academy_lembrete`, `academy_cancelamento` (pt_BR) | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID` |

Em produção o app precisa estar em HTTPS (o navegador só libera microfone e compartilhamento de tela assim) e `APP_URL` deve ser o endereço público.

## Links que a equipe usa

- **Grupos de WhatsApp (por restaurante):** `APP_URL/i/<CNPJ>`, que identifica o restaurante e marca o canal como "Link do grupo".
- **Botão dentro do sistema Takeat:** `APP_URL/i/<CNPJ>?canal=botao`.
- **Link avulso:** `APP_URL/aulas`.
- **Link pessoal da sala** (vai no WhatsApp de confirmação): `APP_URL/s/<código>`.

## Como funciona

- A **grade modelo** (25 turmas/semana) gera as turmas até 31/12/2026. Mudanças na grade valem a partir da data escolhida e não mexem em turmas que já têm inscritos.
- A **sala** abre 10 minutos antes. Quem entrou na sala fica com presença; ao encerrar a aula (ou automaticamente 30 minutos depois do fim, se ninguém encerrar), a presença vai para o HubSpot.
- **Cancelar turma** avisa cada inscrito pelo WhatsApp com o link para escolher outro horário.

## Para produção

- Banco: trocar `provider` em `prisma/schema.prisma` para `postgresql` e `DATABASE_URL` para o Postgres (ex.: Supabase).
- Deixar `DEV_LOGIN` vazio (a rota `/api/dev/entrar` só existe para testes automáticos em desenvolvimento).

## Próximas fases

2. Plantão e transcrição com relatório semanal · 3. Aulas gravadas, clipes, catálogo de dúvidas e busca com IA · 4. Trilhas, certificados, novidades e indicadores.
