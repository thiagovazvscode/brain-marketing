# Requirements — Plataforma de Operação da Brain (admin como sistema operacional)

## Extensão — BRAIN OS Fase 1 (Auditoria e Fundação)

Esta plataforma foi absorvida como o núcleo comercial/operacional do
**BRAIN OS** ("Clientes, Operação, Métodos e Receita"), uma arquitetura maior
cobrindo CRM comercial, contratos, playbooks, tarefas, agenda, financeiro e
uma dashboard de comando — ver plano completo em
`C:\Users\Gamerz\.claude\plans\atomic-discovering-pascal.md`. A Fase 1
(auditoria e fundação) entregou, sobre o que já existia aqui:

- `client_products` ("contrato vivo") ganhou colunas comerciais/operacionais:
  `planId`, `negotiatedValue`, `billingType`/`billingCycle`/`billingDay`,
  `installments`, `quantity`, `numberOfUsers`, `discount`, `contractTerm`,
  `responsibleUserId`, `salespersonId`, `impactOnMrr` (MRR real, calculado em
  `src/lib/billing.ts`), `onboardingStatus`, `implementationProgress`,
  `operationalStatus`, `nextAction`, `nextActionDate`. Não foi criada uma
  entidade nova — a nomenclatura/arquitetura existente já estava correta.
- Nova tabela `product_plans` (plano por produto: cobrança, ciclo, preço-base).
- `admin_users` ganhou `name`/`role` (enum `user_role`) — base pra
  responsável/vendedor e permissão por papel futura.
- Nova UI `/admin/products` (catálogo com CRUD real, antes só existia
  leitura) e abas em `/admin/clients/[slug]` (Visão Geral com KPIs reais de
  MRR/receita contratada/saúde/tempo de relacionamento, Produtos,
  Diagnóstico, Histórico real, e placeholders "Em breve" pras seções que
  pertencem às Fases 2–5 do BRAIN OS: Operação, Tarefas, Reuniões,
  Contratos, Financeiro, Documentos).
- Novo tema visual (`--os-*` em `globals.css`) — sidebar escura, conteúdo
  claro, verde como cor de ação — escopado só ao `/admin`, sem alterar o
  site institucional.
- Deliberadamente fora desta Fase (ver plano pra fases seguintes): CRM
  Kanban, fluxo completo "Nova Venda/Contratação" com geração automática de
  contrato/playbook/projeto, Contratos/templates/PDF, Playbooks
  configuráveis, Financeiro/parcelas, Tarefas, Agenda, Documentos,
  Relatórios, permissões granulares, Motor de Próxima Ação.

## Contexto

Esta versão substitui a anterior. O Bloco 1 (cadastro manual de cliente) já
está em produção e continua como está. A partir daqui, o objetivo deixa de
ser "CRUD de cliente" e passa a ser: construir a plataforma que a Brain usa
para **vender, entregar e provar resultado**.

Diagnóstico medido (não suposto):

- APIs em produção respondem rápido (240–450ms). O gargalo é de
  renderização: páginas do admin são `"use client"` + `useEffect` + fetch →
  waterfall → spinner antes de qualquer conteúdo.
- O painel está vazio: 0 page views, 0 leads, 1 cliente sem nada dentro.
- `/admin/clients/[slug]` só mostra "Nenhum briefing preenchido ainda".
- O dashboard mede só o site institucional — nada da operação da agência.
- **Erro conceitual do spec anterior**: `client_products` modelava produto
  como `pgEnum` com 5 valores chutados. Produto é entidade de negócio (a
  Brain vende, precifica e ajusta produto o tempo todo) — um enum do
  Postgres exige migration pra adicionar um produto novo. Substituído por
  uma tabela `products`.

## Catálogo real (fonte: `src/data/services.ts`)

A Brain vende 6 produtos:

1. Tráfego pago e aquisição (`trafego-pago`) — **produto de entrada**
2. Posicionamento (`posicionamento`)
3. Sites e landing pages (`sites-landing-pages`)
4. Audiovisual (`audiovisual`)
5. Inteligência comercial (`inteligencia-comercial`)
6. Broker Apps / Tecnologia (`tecnologia`)

E entrega segundo o **Método Brain** (fonte: `src/data/method.ts`), 5
estágios, nesta ordem: Raio-X → Direção → Estrutura → Motor de aquisição →
Curva de otimização. Todo cliente, em todo produto contratado, está em
algum desses estágios — é isso que transforma "lista de clientes" em
ferramenta de consultoria.

## Fora de escopo desta versão

- **Propostas, arquivos e roadmap genérico** — faziam parte do spec
  anterior (Blocos 3–7 do `tasks.md` antigo) e ficam **adiados**, não
  cancelados. Esta versão prioriza os 4 módulos abaixo porque são o que
  transforma o painel em ferramenta de venda/entrega/prova de resultado;
  proposta/arquivo/roadmap genérico voltam depois se ainda fizerem sentido
  separado do que o Módulo 2 (estágio do método) já cobre.
- Emissão de nota fiscal, contrato, assinatura eletrônica.
- Multi-usuário / permissões — continua uso interno do dono da agência.
- Notificação automática (e-mail/WhatsApp) de qualquer evento.

## Módulo 1 — Catálogo de produtos

**User Story**: Como dono da agência, quero que o catálogo de produtos seja
dado, não código, para adicionar ou ajustar um produto sem precisar de uma
migration.

```
THE SYSTEM SHALL armazenar o catálogo de produtos em uma tabela (`products`),
    nunca em um enum ou constante de código

WHEN um produto é adicionado ao catálogo
THE SYSTEM SHALL persisti-lo via INSERT, sem exigir alteração de schema

THE SYSTEM SHALL popular o catálogo inicial a partir de `src/data/services.ts`
    (os 6 produtos reais da Brain), marcando "Tráfego pago e aquisição" como
    produto de entrada (`isEntryProduct`)

WHILE um produto está marcado como inativo (`isActive = false`)
THE SYSTEM SHALL continuar exibindo-o no histórico de clientes que já o
    contrataram, mas não oferecê-lo como opção de upsell
```

## Módulo 2 — Engajamento do cliente (o "contrato vivo")

**User Story**: Como dono da agência, quero saber que produto cada cliente
tem, em que estágio do Método Brain está a entrega, e quem está travado, para
conduzir a operação e não só registrar contrato.

```
WHEN o admin associa um produto do catálogo a um cliente
THE SYSTEM SHALL criar um engajamento (`client_products`) com status "ativo"
    e estágio inicial "Raio-X"

WHILE o admin visualiza a pasta de um cliente
THE SYSTEM SHALL exibir, lado a lado: os produtos contratados (com status e
    estágio atual) e os produtos do catálogo ainda não contratados
    (oportunidade de upsell)

WHEN o admin avança o estágio de um engajamento
THE SYSTEM SHALL atualizar o estágio atual e registrar a transição
    (`client_stage_history`: de qual estágio, para qual, quando) — sem isso
    não dá pra medir tempo de ciclo nem mostrar evolução pro cliente

WHILE o admin visualiza o dashboard
THE SYSTEM SHALL destacar engajamentos "travados" (mesmo estágio há mais de
    21 dias) para priorização
```

## Módulo 3 — Links rastreáveis

**User Story**: Como dono da agência, quero meus próprios links curtos pra
bio do Instagram, WhatsApp e anúncios, e saber exatamente o que cada um
performa e pra onde as pessoas vão depois de clicar.

```
WHEN o admin cria um link rastreável (rótulo, URL de destino, campanha
    opcional, cliente dono opcional)
THE SYSTEM SHALL gerar um slug único acessível em /l/[slug]

WHEN um visitante acessa /l/[slug]
THE SYSTEM SHALL registrar o clique (sessionId, referrer, UTM, user agent
    resumido) e redirecionar (302) para a URL de destino, sem atrasar
    perceptivelmente a navegação

WHILE o admin visualiza a seção "Links e Páginas"
THE SYSTEM SHALL exibir, por link: cliques totais, CTR (cliques / page views
    da página que hospeda o link, quando aplicável), destino, e o
    caminho mais comum de páginas vistas em seguida pela mesma sessão

WHERE um link está marcado como inativo
THE SYSTEM SHALL continuar servindo o redirecionamento (não quebrar link já
    publicado), mas ocultá-lo da lista de criação de novos links
```

## Módulo 4 — Diagnóstico (consultoria)

**User Story**: Como dono da agência, quero transformar o briefing em um
diagnóstico com nota por pilar, para recomendar produto com justificativa,
não só apontar o que falta.

```
WHEN o admin cria um diagnóstico para um cliente (reaproveitando respostas de
    briefing existentes, se houver)
THE SYSTEM SHALL calcular uma nota por pilar (aquisição, posicionamento,
    processo comercial, tecnologia) e identificar o gargalo principal

THE SYSTEM SHALL gerar recomendações de produto a partir das notas (ex: nota
    baixa em aquisição → tráfego pago; nota baixa em processo comercial →
    inteligência comercial; nota baixa em tecnologia → Broker Apps), cada
    uma com justificativa

WHILE o admin visualiza a pasta de um cliente
THE SYSTEM SHALL exibir o histórico de diagnósticos e a recomendação mais
    recente como a lista de upsell prioritária (substituindo, quando houver
    diagnóstico, a lista genérica "catálogo menos contratado" do Módulo 2)
```

## Dashboard — 3 visões

```
THE SYSTEM SHALL organizar o dashboard em 3 visões: Operação, Links e
    Páginas, Leads e Conversão

WHILE o admin está na visão "Operação"
THE SYSTEM SHALL exibir: clientes ativos, entregas ativas, entregas travadas
    (>21 dias no mesmo estágio), propostas em aberto (se existir o módulo),
    roadmap atrasado (se existir o módulo), funil do Método (contagem por
    estágio), clientes por produto, tabela de oportunidades
    (cliente × produto recomendado × motivo) e clientes novos por mês

WHILE o admin está na visão "Links e Páginas"
THE SYSTEM SHALL exibir: ranking de links por cliques/CTR, páginas mais
    vistas e jornada mais comum, breakdown por UTM campaign, e evolução
    diária de page views e cliques

WHILE o admin está na visão "Leads e Conversão"
THE SYSTEM SHALL exibir os cards já existentes mais um gráfico de linha
    (page views × leads por dia), funil do quiz com abandono por etapa,
    leads por origem/campanha, e taxa lead → cliente
```

## Requisitos não-funcionais

- **Performance de renderização**: páginas do admin buscam dado direto via
  `db` em Server Components sempre que possível; `"use client"` só em
  filtros, formulários e toggles. Meta: `/admin/clients/[slug]` mostra
  conteúdo no primeiro paint.
- **Estágio como texto validado em código, não enum de banco**: ao contrário
  de produto, os 5 estágios do Método Brain são metodologia estável da
  marca — modelados como `text` validado contra uma constante
  TypeScript compartilhada (espelhando `src/data/method.ts`), não um
  `pgEnum` (evita o mesmo problema de rigidez do produto) nem uma tabela
  nova (não é dado editável pelo admin no dia a dia).
- **Seed de demonstração reversível**: roda contra o banco de produção
  (banco único, sem branch por ambiente); precisa de uma flag `--clean` que
  remove exatamente o que criou, sem `DROP TABLE`.
- **Dados com tendência, não retos**: séries temporais do seed devem ter
  crescimento nas últimas semanas — gráfico reto não prova nada.

## Perguntas em aberto

1. Nenhuma pendência bloqueante para iniciar — arquitetura confirmada pelo
   dono da agência antes deste documento ser escrito.
