# Requirements — Painel Admin, Analytics e CRM de Leads

## Contexto

O projeto `brain-marketing` é hoje um site Next.js estático (sem banco de dados, sem
autenticação), com uma página institucional (`/`), uma proposta comercial
(`/proposta/vaz-ferreira`) e uma página estilo linktree (`/hub`) usada para tráfego
pago, contendo:

- 7 banners de serviço (6 apontam para WhatsApp, 1 — BrokerApps — aponta para
  `https://brokerapps.com.br`)
- Um quiz de 5 perguntas que recomenda um serviço e termina em um CTA
- Um botão fixo de WhatsApp no rodapé

O objetivo desta feature é dar ao dono do negócio (usuário único, sem multi-tenant)
visibilidade sobre quem acessa essas páginas, o que clica, e transformar interações
de alto interesse (quiz completo, clique em banner) em leads organizados num CRM
simples, correlacionados às campanhas de tráfego pago que os originaram.

## Fora de escopo (explicitamente excluído nesta v1)

- Multi-usuário / múltiplos clientes logando no painel (é uso interno, só o dono)
- Automações de follow-up (e-mail marketing, disparo automático de WhatsApp, etc.)
- Papéis e permissões (RBAC) — login único é suficiente
- Autenticação multifator

## User Stories & Requisitos (notação EARS)

### 1. Autenticação do admin

**User Story**: Como dono da agência, quero logar num painel protegido para que
só eu tenha acesso aos dados de analytics e aos leads.

```
WHEN o admin acessa /admin/login e submete email e senha corretos
THE SYSTEM SHALL autenticar e criar uma sessão segura (cookie httpOnly, assinado)
AND redirecionar para /admin/dashboard

WHEN o admin submete credenciais incorretas
THE SYSTEM SHALL rejeitar o login e exibir mensagem de erro genérica
    (não revelar se o e-mail existe ou não)

WHERE uma rota começa com /admin (exceto /admin/login)
IS acessada sem sessão válida
THE SYSTEM SHALL redirecionar para /admin/login

WHILE uma sessão de admin está ativa
THE SYSTEM SHALL expirá-la automaticamente após 7 dias de inatividade
AND permitir logout manual

THE SYSTEM SHALL NOT implementar cadastro público de novos admins
    (usuário único, criado via seed/script, sem tela de signup)
```

### 2. Captura de eventos (page view e clique)

**User Story**: Como dono da agência, quero saber quantas pessoas acessam cada
página e em quais elementos elas clicam, para entender o que engaja.

```
WHEN um visitante acessa qualquer página rastreada (/, /hub, /proposta/vaz-ferreira)
THE SYSTEM SHALL registrar um evento de page view contendo:
    rota, timestamp, referrer, UTM params (source/medium/campaign/term/content),
    e um session id anônimo (gerado client-side, sem PII)

WHEN um visitante clica em um banner, numa opção do quiz, no CTA final do quiz,
    ou no botão de WhatsApp do rodapé
THE SYSTEM SHALL registrar um evento de clique com um identificador único
    do elemento (ex: "banner-incorporadoras", "quiz-step-2-opt-1", "whatsapp-footer")
AND NOT bloquear ou atrasar a navegação/abertura do link para o visitante
    (envio fire-and-forget)

WHERE o banco de dados ou o endpoint de tracking estiver indisponível
THE SYSTEM SHALL falhar silenciosamente no client
    (a experiência do visitante nunca pode quebrar por causa de analytics)

THE SYSTEM SHALL aplicar rate limiting no endpoint de tracking
    para mitigar flood de eventos falsos
```

### 3. Popup de captura de lead (nome, telefone, e-mail)

**User Story**: Como dono da agência, quero capturar nome e telefone antes de
direcionar o visitante para o WhatsApp, para não perder o contato de quem
demonstrou interesse.

```
WHERE o banner clicado NÃO é o do BrokerApps
WHEN um visitante clica nesse banner, ou no CTA final do quiz
THE SYSTEM SHALL abrir um popup de captura com campos nome (obrigatório),
    telefone (obrigatório, validado como telefone BR), e e-mail (opcional)
AND NÃO redirecionar imediatamente para o WhatsApp

WHERE o banner clicado é o do BrokerApps
THE SYSTEM SHALL manter o comportamento atual: redirecionar direto para
    https://brokerapps.com.br, sem popup

WHEN o visitante submete o formulário do popup com dados válidos
THE SYSTEM SHALL criar um lead vinculado ao banner/serviço de origem,
    com os UTM params da sessão e timestamp
AND transicionar visualmente (fade) o popup para um estado de sucesso
    exibindo um botão "Falar no WhatsApp para tirar dúvidas"

WHEN o visitante clica no botão de sucesso do popup
THE SYSTEM SHALL abrir o WhatsApp (wa.me) com a mensagem correspondente
    ao serviço/banner de origem

WHEN o visitante submete o formulário com dados inválidos (nome vazio
    ou telefone mal formatado)
THE SYSTEM SHALL exibir erro de validação inline e não criar o lead
```

### 4. Funil e leads do quiz

**User Story**: Como dono da agência, quero ver em qual pergunta as pessoas
abandonam o quiz e qual serviço é mais recomendado, para entender demanda.

```
WHEN um visitante abre o quiz (clica no trigger "Não sabe por onde começar?")
THE SYSTEM SHALL registrar o início de uma sessão de quiz

WHEN um visitante avança de uma pergunta para outra, ou fecha o quiz sem terminar
THE SYSTEM SHALL registrar em qual step ele parou (para cálculo de abandono)

WHEN um visitante completa as 5 perguntas do quiz
THE SYSTEM SHALL registrar o resultado calculado (serviço indicado)
AND isso alimenta o CTA final, que segue a mesma regra da Story 3
    (popup de captura antes do WhatsApp/BrokerApps)
```

### 5. CRM-lite (lista de leads)

**User Story**: Como dono da agência, quero uma lista organizada dos leads
gerados, com status manual, para acompanhar quem já contatei.

```
WHEN o admin acessa a lista de leads no painel
THE SYSTEM SHALL exibir os leads ordenados por data de criação (mais recente primeiro)
    com nome, telefone, e-mail (se houver), serviço/banner de origem,
    respostas do quiz (se aplicável), UTM de origem, e status atual

WHILE o admin visualiza a lista de leads
THE SYSTEM SHALL permitir filtrar por status, por serviço indicado, e por UTM campaign

WHILE o admin visualiza um lead individual
THE SYSTEM SHALL permitir alterar seu status entre: Novo, Contatado, Fechado, Perdido
AND essa é a única ação de CRM desta v1 — sem automações associadas à mudança de status
```

### 6. Dashboard de analytics

**User Story**: Como dono da agência, quero uma visão agregada de page views,
cliques e leads por período, para acompanhar o desempenho das páginas e campanhas.

```
WHILE o admin está no dashboard
THE SYSTEM SHALL exibir, por período selecionável (hoje / 7 dias / 30 dias / custom):
    total de page views por página, total de cliques por elemento rastreado,
    total de leads gerados, e taxa de conclusão do quiz

WHILE o admin está no dashboard
THE SYSTEM SHALL permitir segmentar os números acima por UTM campaign,
    para avaliar o desempenho de cada campanha de tráfego pago
```

### 7. Gestão de pixels de rastreamento

**User Story**: Como dono da agência, quero cadastrar pixels (Meta/GA4) por
página sem mexer em código, para poder trocar de campanha/pixel livremente.

```
WHERE a tela de configuração de pixels é usada para salvar um Pixel ID
    (Meta Pixel ou GA4 Measurement ID) vinculado a uma página
THE SYSTEM SHALL persistir essa configuração no banco de dados

WHEN uma página rastreada é renderizada
THE SYSTEM SHALL injetar o script do pixel correspondente configurado para
    aquela página, se houver
AND não quebrar a renderização da página caso nenhum pixel esteja configurado
```

## Requisitos não-funcionais

- **Privacidade**: não armazenar IP bruto indefinidamente nem outros dados
  desnecessários; session id de tracking é anônimo (não é PII).
- **Resiliência**: falha no tracking nunca deve impedir a navegação do visitante
  ou o envio do lead.
- **Segurança**: senha de admin com hash (bcrypt/argon2), cookie de sessão
  httpOnly + secure + sameSite, proteção CSRF no formulário de login e no popup
  de captura, rate limiting nos endpoints públicos de escrita (tracking e leads).
- **Banco de dados**: Vercel Postgres / Neon.

## Perguntas em aberto para a Fase 2 (Design)

Nenhuma pendência bloqueante — as decisões acima cobrem o suficiente para
avançar ao design técnico.
