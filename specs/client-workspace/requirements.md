# Requirements — Workspace de Cliente

## Contexto

O CRM/admin (`specs/admin-crm-analytics/`) está no ar: autenticação, tracking,
leads do site, dashboard de tráfego e uma seção `Clientes` — mas essa seção, hoje,
é só um espelho passivo de um formulário externo, não uma ferramenta de operação.

Diagnóstico (lido no código, não só na tela):

- `src/app/api/briefings/[client]/route.ts` é a **única** rota que insere linhas
  em `clients` — e ela só roda quando alguém preenche `/briefing/[slug]`
  (pensado para ser preenchido durante uma reunião). Não tem autenticação de
  admin.
- `src/app/api/admin/clients/route.ts` só tem `GET`. Não existe `POST`/`PUT` —
  não dá para criar ou editar um cliente pelo painel.
- `src/app/admin/(protected)/clients/page.tsx` não tem botão "novo cliente" nem
  formulário de cadastro — só lista o que já existe.
- O schema (`src/db/schema.ts`) modela `clients` (nome, whatsapp, slug) e
  `client_briefings` (JSON de respostas do formulário). Não existe nada sobre
  produto contratado, propostas enviadas, arquivos do cliente ou
  roadmap/cronograma.

Resultado prático: a agência fecha um cliente novo e não tem onde colocar isso no
sistema, a não ser mandando ele preencher um formulário. O painel precisa virar o
hub que o dono da agência usa para **conduzir** cada cliente — não só medir
tráfego do site institucional.

> Nota sobre uma versão anterior deste spec: uma primeira tentativa deste
> workspace incluía faturamento (valor mensal, MRR, histórico de pagamento).
> Esta versão substitui aquela — o foco agora é exclusivamente cadastro,
> produtos (com visão de upsell), propostas, arquivos e roadmap, conforme
> repriorizado. Faturamento/MRR fica para um spec futuro, se ainda fizer
> sentido.

## Fora de escopo (explicitamente excluído nesta v1)

- Faturamento, valor mensal, MRR ou histórico de pagamento (ver nota acima).
- Emissão/assinatura de contrato — fica fora do sistema, como já decidido para
  documentos do tipo contrato.
- Upload de arquivo binário para dentro do sistema — v1 registra
  **links/referências** para arquivos que já existem em outro lugar (Drive,
  WhatsApp, etc.), não um repositório de arquivos. Justificativa em `design.md`.
- Multi-usuário / permissões por cliente — continua uso interno do dono da
  agência (mesma decisão do CRM/analytics).
- Notificação automática de roadmap atrasado ou proposta sem resposta — a v1
  só exibe, não avisa.
- Portal do cliente (acesso externo à própria pasta).

## User Stories & Requisitos (notação EARS)

### 1. Cadastro manual de cliente pelo admin (prioridade máxima)

**User Story**: Como dono da agência, quero cadastrar um cliente novo direto pelo
painel assim que fecho o contrato, sem depender de ele preencher um formulário,
porque o meu fluxo de trabalho começa no fechamento, não no briefing.

```
WHEN o admin cria um cliente pela tela /admin/clients (nome, contato/WhatsApp,
    data de entrada)
THE SYSTEM SHALL criar o registro em `clients` imediatamente, com um slug gerado
    a partir do nome (editável antes de salvar), sem exigir nenhum briefing ou
    proposta associada

WHERE já existe um cliente com o mesmo slug
WHEN o admin tenta criar outro cliente com esse slug
THE SYSTEM SHALL rejeitar a criação e indicar que o slug já está em uso

WHEN o admin edita os dados básicos de um cliente existente (nome, contato, data
    de entrada)
THE SYSTEM SHALL atualizar o registro em `clients` mantendo o slug e o histórico
    (produtos, propostas, briefings, arquivos, roadmap) intactos

WHEN um briefing é enviado via /api/briefings/[client] para um slug que ainda não
    existe em `clients`
THE SYSTEM SHALL continuar criando o cliente automaticamente (comportamento atual
    preservado — o formulário de briefing continua funcionando como uma porta de
    entrada possível, só deixa de ser a única)
```

### 2. Gestão de produtos por cliente (com visão de upsell)

**User Story**: Como dono da agência, quero ver quais produtos um cliente já tem
e quais ele ainda não tem, para saber exatamente onde cabe upsell.

```
THE SYSTEM SHALL restringir produto a um catálogo fechado: Tráfego Pago,
    Diagnóstico Comercial, Consultoria, BrokerApps, Outro

WHEN o admin adiciona um produto a um cliente (tipo, data de início)
THE SYSTEM SHALL criar o registro com status inicial "ativo"

WHEN o admin altera o status de um produto (ativo ↔ pausado, qualquer status →
    encerrado)
THE SYSTEM SHALL atualizar o status desse produto sem afetar os demais produtos
    do cliente

WHILE o admin visualiza a pasta de um cliente
THE SYSTEM SHALL exibir dois grupos lado a lado: os produtos do catálogo que o
    cliente já tem (com status) e os produtos do catálogo que o cliente ainda
    não tem — este segundo grupo é a lista de oportunidades de upsell para
    aquele cliente

WHERE um produto do catálogo tem status "encerrado" (nenhuma linha "ativa"
    correspondente)
THE SYSTEM SHALL exibi-lo no grupo de oportunidades de upsell, indicando que já
    foi cliente desse produto antes
```

### 3. Registro de propostas enviadas

**User Story**: Como dono da agência, quero registrar quais propostas comerciais
já mandei para um cliente e quando, para saber o histórico de negociação sem
precisar lembrar de cabeça — inclusive quando a proposta não é uma página do
site (PDF, Google Doc, ou só uma mensagem no WhatsApp).

```
THE SYSTEM SHALL suportar dois tipos de proposta registrada: "do site" (com
    página correspondente em /proposta/[slug]) e "externa" (sem página no
    site — PDF, Google Doc, WhatsApp, etc.)

WHEN o admin registra uma proposta "do site" (qual página, data de envio)
THE SYSTEM SHALL vincular esse registro ao cliente e à página de proposta
    correspondente em /proposta/[slug]

THE SYSTEM SHALL restringir a escolha de proposta "do site" às páginas que já
    existem (ex: vaz-ferreira, mv-imoveis, capbox, francine-leite), evitando
    digitar um slug que não existe

WHEN o admin registra uma proposta "externa" (título livre, data de envio, link
    externo opcional)
THE SYSTEM SHALL exigir o título livre (ex: "Proposta PDF enviada por e-mail")
    e aceitar o link externo como opcional

WHILE o admin visualiza a pasta de um cliente
THE SYSTEM SHALL listar as propostas enviadas a esse cliente — as "do site" com
    link direto para /proposta/[slug], as "externas" com o título livre e o
    link externo (se houver) — todas com data de envio e status (enviada,
    aceita, recusada)

WHEN o admin atualiza o status de uma proposta (ex: de "enviada" para "aceita")
THE SYSTEM SHALL atualizar apenas esse registro, sem criar ou alterar produtos
    automaticamente (a criação do produto contratado continua sendo uma ação
    manual do admin — ver Requisito 2)
```

### 4. Associação dos briefings existentes à visão do cliente

**User Story**: Como dono da agência, quero ver o briefing preenchido por um
cliente junto com o resto da pasta dele, não como se fosse a única coisa que
existe sobre esse cliente.

```
THE SYSTEM SHALL manter o fluxo atual de /briefing/[slug] e a tabela
    `client_briefings` sem nenhuma mudança de comportamento

WHILE o admin visualiza a pasta de um cliente
THE SYSTEM SHALL exibir os briefings preenchidos (se houver) como uma seção entre
    outras (dados básicos, produtos, propostas, briefings, arquivos, roadmap),
    nunca como a única informação disponível sobre o cliente

WHERE um cliente foi criado manualmente (Requisito 1) e nunca preencheu um
    briefing
THE SYSTEM SHALL exibir a seção de briefings vazia, sem tratar isso como erro ou
    estado inválido
```

### 5. Arquivos/pastas por cliente

**User Story**: Como dono da agência, quero ter uma lista de materiais e
documentos relevantes de cada cliente, para não depender de procurar em
conversas de WhatsApp ou pastas soltas do computador.

```
WHEN o admin adiciona uma referência de arquivo a um cliente (título, link
    externo, categoria opcional)
THE SYSTEM SHALL salvar essa referência vinculada ao cliente — a v1 armazena
    apenas o link/referência, não o arquivo em si (ver design.md para a
    justificativa dessa escolha)

WHILE o admin visualiza a pasta de um cliente
THE SYSTEM SHALL listar as referências de arquivo desse cliente, agrupadas ou
    filtráveis por categoria, com o link abrindo em nova aba

WHEN o admin remove uma referência de arquivo
THE SYSTEM SHALL removê-la da lista sem afetar o arquivo original (que vive fora
    do sistema)
```

### 6. Roadmap/cronograma por cliente

**User Story**: Como dono da agência, quero ver o que já foi feito, o que está em
andamento e o que falta para cada cliente, com datas, para conduzir a execução
sem depender da minha memória.

```
WHEN o admin cria um item de roadmap para um cliente (título, descrição
    opcional, data prevista opcional)
THE SYSTEM SHALL criar o item com status "a fazer"

WHILE o admin visualiza a pasta de um cliente
THE SYSTEM SHALL exibir os itens de roadmap agrupados por status (a fazer, em
    andamento, feito), ordenáveis por data prevista

WHEN o admin muda o status de um item para "em andamento" ou "feito"
THE SYSTEM SHALL atualizar o status e, no caso de "feito", registrar a data de
    conclusão

WHEN o admin edita título, descrição ou data prevista de um item existente
THE SYSTEM SHALL atualizar o item sem criar um novo registro
```

## Requisitos não-funcionais

- **Consistência com o CRM existente**: todas as tabelas novas referenciam
  `clients.id` por FK; nenhuma duplica nome/whatsapp/slug que já existe em
  `clients`.
- **Não quebrar o fluxo atual**: `/briefing/[slug]` e `client_briefings`
  continuam funcionando exatamente como hoje — este spec só adiciona portas de
  entrada e visões novas em cima do que já existe.
- **Sem novo usuário/papel**: continua protegido pelo mesmo `proxy.ts` e sessão
  de admin único já existentes (matcher já cobre `/api/admin/:path*`).
- **Entrega incremental**: o cadastro manual de cliente (Requisito 1) precisa
  funcionar de forma independente das demais seções (produtos, propostas,
  arquivos, roadmap), que podem ser entregues em blocos separados sem bloquear
  o uso do que já estiver pronto — ver `tasks.md`.

## Perguntas em aberto — status

1. **Slug do cliente** — ✅ Resolvido: gerado a partir do nome, editável só na
   criação, travado depois de criado.
2. **Categoria de arquivo** (Requisito 5) — ✅ Resolvido: Contrato, Material,
   Entregável, Outro, **Acesso** (login/credenciais de plataforma do cliente).
3. **Proposta sem página correspondente** — ✅ Resolvido: existe, sim (PDF,
   Google Doc, WhatsApp) — coberto agora pelo tipo "externa" no Requisito 3.
