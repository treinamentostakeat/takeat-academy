# Takeat Academy

Plataforma de aulas ao vivo da Takeat para restaurantes: inscrição, agenda, sala de aula própria e presença no HubSpot (fase 1).

## Rodar no computador

Precisa do Node.js 20 ou mais novo e do `.env` preenchido (copie de `.env.example`).
O banco é o Postgres do Supabase: em **Project Settings → Database → Connection string**, copie a do
**Transaction pooler** para `DATABASE_URL` (acrescente `?pgbouncer=true&connection_limit=1`) e a do
**Session pooler** para `DIRECT_URL`, trocando `[YOUR-PASSWORD]` pela senha do banco.

```bash
npm install
npm run dev
```

Abra http://localhost:3000 (lado do cliente) e http://localhost:3000/equipe (área da equipe).
O banco já está criado no Supabase com a conta do gestor (`onboarding@takeat.app`) e a grade modelo.
Mudanças de tabela ficam em `prisma/migrations` e são aplicadas com `npm run db:migrate`.

## Testes

```bash
npm test
```

Os testes que usam banco só rodam com `TEST_DATABASE_URL` apontando para um Postgres em localhost, porque apagam os dados que usam. Sem essa variável, eles são pulados.

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

## Quem entra onde

| Público | Onde | Como entra |
|---|---|---|
| Clientes | `/`, `/aulas`, `/perfil` | CNPJ, sem senha |
| Equipe de treinamentos (gestor, instrutor) | `/equipe` | E-mail e senha |
| RH e colaboradores | `/interno` | E-mail e senha criados em `/interno/pessoas` |

A senha gerada é provisória: no primeiro acesso, a pessoa precisa criar a própria. Depois de 5 tentativas erradas seguidas, a conta fica bloqueada por 15 minutos. O gestor cria a primeira conta de RH em `/equipe/usuarios`. As regras ficam em `src/lib/permissoes.ts`.

## API de integração (RPA)

Cadastro de colaboradores e recuperação de senha por API, documentados em [docs/API.md](docs/API.md). O servidor guarda só o hash da chave, em `API_RPA_CHAVE_HASH`; sem essa variável, a API responde `503`.

## Clonagem de voz (ElevenLabs)

A aba `/equipe/voz` envia amostras de áudio para a ElevenLabs, clona a voz, gera falas de teste e apaga vozes. Ela só aparece para gestores e RH cujo e-mail está em `VOZ_ACESSO_EMAILS` (separados por vírgula). O RH acessa pela área interna, em `/interno/voz`. A chave fica em `ELEVENLABS_API_KEY`, só no servidor, e precisa das permissões de texto para fala e de leitura e escrita de vozes (`voices_read` e `voices_write`). Para clonar, é obrigatório confirmar a autorização da pessoa dona da voz. Cada ação fica registrada na tabela `Integracao`, no canal `elevenlabs`.

## Trilhas da área interna

O RH e o gestor editam tudo em `/interno/conteudo`: trilhas, etapas, cursos, vídeos (arquivo enviado ou link do YouTube, Vimeo ou Google Drive), materiais e perguntas. O arquivo vai do navegador direto para o Supabase Storage em partes de 6 MB, que são reenviadas sozinhas se a conexão cair; o limite por vídeo vem de `VIDEO_LIMITE_MB` (50 MB no plano Free do Supabase). A trilha e cada vídeo podem ter uma foto de capa (JPG, PNG ou WebP, até 5 MB), guardada no mesmo bucket; sem foto, a trilha usa a capa colorida gerada. Só aparece para os colaboradores o que estiver publicado. O quiz é corrigido no servidor; o gabarito nunca vai para o navegador antes da resposta.

Para importar a trilha do protótipo do RH (21 cursos e 210 perguntas, que entra como rascunho e sem os vídeos):

```bash
npm run db:importar-onboarding
```

## Links que a equipe usa

- **Grupos de WhatsApp (por restaurante):** `APP_URL/i/<CNPJ>`, que identifica o restaurante e marca o canal como "Link do grupo".
- **Botão dentro do sistema Takeat:** `APP_URL/i/<CNPJ>?canal=botao`.
- **Link avulso:** `APP_URL/aulas`.
- **Link pessoal da sala** (vai no WhatsApp de confirmação): `APP_URL/s/<código>`.

## Como funciona

- A **grade modelo** (25 turmas/semana) gera as turmas até 31/12/2026. Mudanças na grade valem a partir da data escolhida e não mexem em turmas que já têm inscritos.
- A **sala** abre 10 minutos antes. Quem entrou na sala fica com presença; ao encerrar a aula (ou automaticamente 30 minutos depois do fim, se ninguém encerrar), a presença vai para o HubSpot.
- **Cancelar turma** avisa cada inscrito pelo WhatsApp com o link para escolher outro horário.

## Publicar (Vercel)

Variáveis no Vercel (**Settings → Environment Variables**): `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`,
`APP_URL` (endereço público), `TZ_AULAS`, e as das integrações. Não defina `DEV_LOGIN` nem `RELOGIO` em produção.
No ar, a sala de aula precisa das chaves do LiveKit (o modo demonstração guarda chat e mãos na memória do servidor,
o que não funciona com várias instâncias).

## Próximas fases

2. Plantão e transcrição com relatório semanal · 3. Aulas gravadas, clipes, catálogo de dúvidas e busca com IA · 4. Trilhas, certificados, novidades e indicadores.
