# API do Takeat Academy

API de integração para criar o acesso de novos colaboradores à área interna (trilhas de onboarding) e gerar uma nova senha quando alguém esquecer a sua. Foi pensada para o RPA: a cada colaborador novo, o robô cria a conta e repassa a senha provisória.

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

### Exemplo

```bash
curl -X POST https://takeat-academy.vercel.app/api/v1/usuarios \
  -H "Authorization: Bearer $ACADEMY_API_CHAVE" \
  -H "Content-Type: application/json" \
  -d '{"nome": "Ana Souza", "email": "ana.souza@gmail.com", "departamento": "Financeiro"}'
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
  "endereco": "https://takeat-academy.vercel.app/interno/entrar"
}
```

Repasse para a pessoa o `endereco`, o `email` e a `senhaProvisoria`, por um canal seguro (WhatsApp ou e-mail direto). A senha provisória só aparece nesta resposta: não é possível consultá-la depois. Se ela se perder, use **Recuperar senha**.

### Erros

| Status | Quando | Exemplo de corpo |
|---|---|---|
| `400` | Corpo inválido ou campo fora das regras | `{"erro": "Informe um e-mail válido.", "campo": "email"}` |
| `401` | Chave ausente ou errada | `{"erro": "Chave inválida."}` |
| `409` | Já existe conta com este e-mail (ativa ou desativada) | `{"erro": "Já existe uma conta com este e-mail.", "campo": "email", "usuarioId": "cmw4abc123"}` |
| `503` | API não configurada no servidor | `{"erro": "API desligada: ..."}` |

Em caso de `409`, não tente de novo: a pessoa já tem acesso. Se ela não lembrar a senha, use **Recuperar senha**. Se a conta estiver desativada, quem reativa é o RH.

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

- **Uma chamada por pessoa.** Se a resposta for `409`, a conta já existe: não repita.
- **Não guarde a senha provisória** depois de repassá-la. Ela só serve para o primeiro acesso.
- **Erros `5xx` ou falta de resposta:** tente de novo depois de alguns minutos. O cadastro não duplica: uma segunda tentativa com o mesmo e-mail responde `409`.
- **Registre o `usuario.id`** retornado, se quiser cruzar com o cadastro do RH depois.

## O que a API ainda não faz

- Consultar, editar ou desativar colaboradores (o RH faz pela tela **Pessoas**).
- Atribuir trilhas ou prazos.
- Enviar e-mail com o acesso.
