# API do Takeat Academy

API de integração para criar o acesso de novos colaboradores à área interna (trilhas de onboarding) e gerar uma nova senha quando alguém esquecer a sua. Foi pensada para o RPA: a cada colaborador novo, o robô cria a conta e **a própria Academy manda o primeiro acesso pelo WhatsApp do número de comunicação interna**. A pessoa recebe um link, cria a sua senha e já entra.

## Fluxo do RPA

1. **Carga inicial (uma vez só):** o robô lê os colaboradores ativos do Portal do RH e chama `POST /usuarios` para cada um, com `whatsapp`. Quem já tem conta volta `409` e é pulado, então a carga pode rodar de novo sem duplicar ninguém. Para quem já tinha conta e nunca entrou, chame `POST /usuarios/acesso` para mandar o link.
2. **Toda segunda-feira (rotina semanal):** as admissões da Takeat acontecem na segunda. Nesse dia, o robô:
   1. lê no Portal do RH as pessoas com **data de admissão igual à do dia**;
   2. chama `POST /usuarios` para cada uma, com `nome`, `email`, `departamento` e `whatsapp`;
   3. confere o `whatsapp.status` de cada resposta. Para quem voltou `erro`, tenta `POST /usuarios/acesso` mais tarde, no mesmo dia.

   O link de primeiro acesso sai na hora para cada pessoa. Se a rotina rodar duas vezes no mesmo dia, ninguém recebe em dobro: quem já tem conta volta `409`.
3. **Líderes (gestores de equipe):** entram como colaboradores comuns, pela mesma chamada `POST /usuarios`. Na carga inicial, inclua todos os líderes ativos do Portal do RH junto com os demais colaboradores.

> O cargo "Gestor" da Academy é outra coisa: é quem administra a plataforma. Ele não é dado pela API e continua sendo atribuído pela tela **Usuários e cargos**.

- **Endereço base:** `https://takeat-academy.vercel.app/api/v1`
- **Formato:** JSON, em UTF-8, no corpo e na resposta
- **Versão:** v1

## Autenticação

Toda requisição precisa da chave da API no cabeçalho `Authorization`:

```
Authorization: Bearer <chave>
```

- A chave é entregue pela equipe do Academy e deve ficar guardada no cofre de credenciais do RPA, nunca no código nem em planilhas.
- O servidor guarda só o hash da chave. Para trocar a chave, gere uma nova e atualize a variável `API_RPA_CHAVE_HASH` no servidor; a anterior deixa de valer na hora.
- Sem a chave, ou com uma chave errada, a resposta é `401`. Se a API não estiver configurada no servidor, a resposta é `503`.

## Cadastrar colaborador

`POST /usuarios`

Cria uma conta de **colaborador** com senha provisória. No primeiro acesso, a pessoa é obrigada a criar uma senha própria. A API só cria colaboradores: contas de RH, gestor e instrutor continuam sendo criadas pela plataforma.

### Corpo

| Campo | Tipo | Obrigatório | Regras |
|---|---|---|---|
| `nome` | texto | sim | Nome e sobrenome, de 3 a 80 caracteres |
| `email` | texto | sim | E-mail válido, de qualquer domínio (inclusive Gmail). É o login da pessoa. |
| `departamento` | texto | não | Até 60 caracteres. Ex.: `Financeiro` |
| `whatsapp` | texto | não (recomendado) | Celular com DDD, com ou sem 55, com ou sem máscara. Ex.: `27999998888`. Com ele, a Academy manda o link de primeiro acesso pelo WhatsApp. |

### Exemplo

```bash
curl -X POST https://takeat-academy.vercel.app/api/v1/usuarios \
  -H "Authorization: Bearer $ACADEMY_API_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Ana Souza", "email": "ana.souza@gmail.com", "departamento": "Financeiro", "whatsapp": "27999998888"}'
```

### Resposta `201 Created`

```json
{
  "usuario": {
    "id": "cmw4abc123",
    "nome": "Ana Souza",
    "email": "ana.souza@gmail.com",
    "departamento": "Financeiro",
    "cargo": "colaborador",
    "criadoEm": "2026-11-10T13:00:00.000Z"
  },
  "senhaProvisoria": "Xk7mPq2RtW9a",
  "endereco": "https://takeat-academy.vercel.app/interno/entrar",
  "linkPrimeiroAcesso": "https://takeat-academy.vercel.app/acesso/eyJ0Ijoi...",
  "whatsapp": { "status": "enviado" }
}
```

- **`whatsapp.status`** (só quando o `whatsapp` foi enviado):
  - `enviado`: a mensagem saiu e não precisa fazer mais nada.
  - `erro`: o WhatsApp recusou. O erro fica registrado na Academy e o envio pode ser refeito com `POST /usuarios/acesso`.
  - `nao_configurado`: o servidor ainda não tem o WhatsApp ligado (nem a uazapi, nem a Meta).
- **`linkPrimeiroAcesso`:** vale por 7 dias e só funciona uma vez, porque deixa de valer assim que a pessoa cria a senha. Serve para mandar por outro canal quando o WhatsApp não sair. Não guarde o link depois de usar.
- **`senhaProvisoria`:** continua disponível, para quem prefere passar o login com a senha. Ela só aparece nesta resposta.

### Mensagem que a pessoa recebe

Sai pelo **número de comunicação interna da Takeat** (uazapi), como mensagem de texto comum:

> Olá, Ana! Seu acesso à Takeat Academy, a plataforma de treinamentos da Takeat, está pronto.
>
> Crie sua senha neste link: https://takeat-academy.vercel.app/acesso/…
>
> Seu login é o e-mail ana.souza@gmail.com. O link vale por 7 dias.

Configuração no servidor:
- `UAZAPI_TOKEN`: token da instância do número.
- `UAZAPI_URL`: opcional, o padrão é `https://automate-takeat.uazapi.com`.

Sem a uazapi, a Academy usa a API oficial da Meta, com o modelo `academy_primeiro_acesso` e as mesmas 3 informações (nome, link e e-mail).

### Erros

| Status | Quando | Exemplo de corpo |
|---|---|---|
| `400` | Corpo inválido ou campo fora das regras | `{"erro": "Informe um e-mail válido.", "campo": "email"}` |
| `401` | Chave ausente ou errada | `{"erro": "Chave inválida."}` |
| `409` | Já existe conta com este e-mail (ativa ou desativada) | `{"erro": "Já existe uma conta com este e-mail.", "campo": "email", "usuarioId": "cmw4abc123"}` |
| `503` | API não configurada no servidor | `{"erro": "API desligada: ..."}` |

Em caso de `409`, não tente de novo: a pessoa já tem acesso. Se ela não lembrar a senha, use **Recuperar senha**. Se a conta estiver desativada, quem reativa é o RH.

## Reenviar o primeiro acesso

`POST /usuarios/acesso`

Manda de novo o link de primeiro acesso pelo WhatsApp. É para quem já tem conta e **ainda não criou a própria senha**, como as contas criadas antes da carga inicial ou alguém que perdeu a mensagem. Quem já criou a senha usa **Recuperar senha**.

### Corpo

| Campo | Tipo | Obrigatório |
|---|---|---|
| `email` | texto | sim |
| `whatsapp` | texto | sim |

### Resposta `200 OK`

```json
{
  "usuario": { "id": "cmw4abc123", "nome": "Ana Souza", "email": "ana.souza@gmail.com" },
  "linkPrimeiroAcesso": "https://takeat-academy.vercel.app/acesso/eyJ0Ijoi...",
  "whatsapp": { "status": "enviado" }
}
```

### Erros

| Status | Quando |
|---|---|
| `400` | E-mail ou WhatsApp ausente ou inválido |
| `401` | Chave ausente ou errada |
| `404` | Nenhum colaborador com este e-mail |
| `409` | Conta desativada, ou a pessoa já criou a própria senha (use **Recuperar senha**) |

## Recuperar senha

`POST /usuarios/senha`

Gera uma **nova senha provisória** para um colaborador. A senha anterior deixa de valer na hora, o bloqueio por tentativas erradas é zerado, e a pessoa cria uma senha própria no próximo acesso.

Não existe envio automático por e-mail: quem chama a API repassa a nova senha para a pessoa.

### Corpo

| Campo | Tipo | Obrigatório |
|---|---|---|
| `email` | texto | sim |

### Exemplo

```bash
curl -X POST https://takeat-academy.vercel.app/api/v1/usuarios/senha \
  -H "Authorization: Bearer $ACADEMY_API_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"email": "ana.souza@gmail.com"}'
```

### Resposta `200 OK`

```json
{
  "usuario": { "id": "cmw4abc123", "nome": "Ana Souza", "email": "ana.souza@gmail.com" },
  "senhaProvisoria": "Hb3nVz8LqEr5",
  "endereco": "https://takeat-academy.vercel.app/interno/entrar"
}
```

### Erros

| Status | Quando |
|---|---|
| `400` | E-mail ausente ou inválido |
| `401` | Chave ausente ou errada |
| `404` | Nenhum colaborador com este e-mail. Contas de RH e da equipe também respondem `404`: a senha delas é tratada na plataforma. |
| `409` | Conta desativada. Peça ao RH para reativar. |
| `503` | API não configurada no servidor |

## Boas práticas para o RPA

- **Uma chamada por pessoa.** Se a resposta for `409`, a conta já existe: não repita. Se a pessoa ainda não entrou, mande o link com `POST /usuarios/acesso`.
- **Mande sempre o `whatsapp`.** Sem ele, ninguém recebe o acesso automaticamente.
- **`whatsapp.status` = `erro`:** tente `POST /usuarios/acesso` mais tarde.
- **Não guarde a senha provisória** depois de repassá-la. Ela só serve para o primeiro acesso.
- **Erros `5xx` ou falta de resposta:** tente de novo depois de alguns minutos. O cadastro não duplica: uma segunda tentativa com o mesmo e-mail responde `409`.
- **Registre o `usuario.id`** retornado, se quiser cruzar com o cadastro do RH depois.

## O que a API ainda não faz

- Consultar, editar ou desativar colaboradores (o RH faz pela tela **Pessoas**).
- Atribuir trilhas ou prazos.
- Enviar e-mail com o acesso (o envio automático é só pelo WhatsApp).
