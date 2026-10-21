# DSI Panel — Instruções para Agentes de Desenvolvimento

## 1. Identidade e objetivo

**Projeto:** DSI Panel

O DSI Panel é uma aplicação web interna destinada a centralizar ferramentas, informações e funcionalidades do Departamento de Sistemas (DSI) da Prefeitura de Pindamonhangaba.

Inicialmente, será uma plataforma departamental. Sua arquitetura deverá permitir expansão progressiva para outros departamentos, secretarias e, eventualmente, para uma intranet municipal.

### Princípios fundamentais

- Simplicidade e legibilidade.
- Arquitetura MVC modular.
- Monólito em vez de microsserviços.
- Separação clara de responsabilidades.
- Segurança desde o início.
- Desenvolvimento incremental.
- Baixo acoplamento entre módulos.
- Facilidade de manutenção por uma equipe pequena.
- Preferência por tecnologias abertas.
- Não antecipar funcionalidades futuras.

**Diretriz principal:** implementar apenas o necessário, preservando a capacidade de expansão.

---

## 2. Stack tecnológica obrigatória

| Camada                 | Tecnologia                        |
| ---------------------- | --------------------------------- |
| Framework              | Next.js — App Router              |
| Linguagem              | TypeScript strict                 |
| Runtime                | Bun                               |
| Gerenciador de pacotes | Bun                               |
| Interface              | React                             |
| Arquitetura            | MVC modular                       |
| Backend                | Controllers e Services em Next.js |
| Banco de dados         | PostgreSQL                        |
| ORM                    | Drizzle ORM                       |
| Migrações              | Drizzle Kit                       |
| Validação              | Zod                               |
| Containers             | Docker                            |
| Orquestração           | Docker Compose                    |
| Testes                 | Bun Test e Playwright             |
| Qualidade              | ESLint e Prettier                 |

Utilizar versões estáveis e suportadas.

Não adicionar dependências sem necessidade técnica justificada.

### Bun

Bun será utilizado no desenvolvimento, build, testes e execução em produção.

Comandos padrão:

```bash
bun install
bun run dev
bun run build
bun run start
bun test
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

Regras:

1. Não utilizar npm, yarn ou pnpm.
2. Versionar `bun.lock`.
3. Utilizar `bun install --frozen-lockfile` nos builds reproduzíveis.
4. Utilizar imagens oficiais `oven/bun`.
5. Não instalar Node.js no container por padrão.
6. Verificar compatibilidade das dependências com Bun.
7. Não utilizar recursos experimentais sem justificativa.
8. Validar o funcionamento da aplicação no container final.

---

## 3. Arquitetura MVC modular

A aplicação seguirá o padrão **Model–View–Controller (MVC)**, adaptado ao funcionamento do Next.js App Router.

O Next.js será utilizado como framework web e mecanismo de roteamento, mas a lógica da aplicação deverá permanecer organizada em camadas MVC.

### Responsabilidades

**Model**

Responsável por representar e persistir os dados.

Inclui:

- Schemas do Drizzle ORM;
- Tipos e entidades;
- Repositories e consultas;
- Relacionamentos;
- Operações de persistência.

**View**

Responsável pela apresentação das informações.

Inclui:

- Páginas React;
- Layouts;
- Formulários;
- Tabelas;
- Componentes de interface;
- Estados visuais.

Views não devem conter regras de negócio nem consultas diretas ao banco.

**Controller**

Responsável por receber e coordenar requisições.

Inclui:

- Recebimento de parâmetros;
- Validação de entradas;
- Verificação de autenticação;
- Verificação de autorização;
- Chamada dos services;
- Tratamento e formatação de respostas.

Controllers não devem implementar regras de negócio complexas nem acessar diretamente o banco.

**Service**

Responsável pela lógica de negócio.

Inclui:

- Regras e validações de domínio;
- Operações e fluxos de negócio;
- Coordenação de repositories;
- Integrações com outros módulos;
- Transações;
- Aplicação de políticas de negócio.

Services não devem depender de componentes React ou de objetos HTTP do Next.js.

### Fluxo obrigatório

```text
Requisição HTTP / Server Action
              |
              v
         Controller
              |
              v
           Service
              |
              v
            Model
              |
              v
          PostgreSQL
```

Para renderização:

```text
Next.js Route
      |
      v
  Controller
      |
      v
   Service
      |
      v
    Model
      |
      v
 Controller
      |
      v
    View
```

O controller deverá devolver dados ou resultados apropriados à view, sem expor entidades sensíveis ou estruturas internas desnecessárias.

---

## 4. Estrutura de diretórios

Estrutura recomendada:

```text
dsi-panel/
├── .agent.md
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (panel)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── users/
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   └── users/
│   │   │       └── route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── views/
│   │   │   └── schemas/
│   │   │
│   │   ├── users/
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   ├── views/
│   │   │   ├── schemas/
│   │   │   └── permissions.ts
│   │   │
│   │   └── dashboard/
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── models/
│   │       └── views/
│   │
│   ├── shared/
│   │   ├── components/
│   │   ├── lib/
│   │   │   ├── db/
│   │   │   ├── auth/
│   │   │   ├── security/
│   │   │   └── env.ts
│   │   └── types/
│   │
│   └── middleware.ts
│
├── drizzle/
├── tests/
├── docs/
├── Dockerfile
├── compose.yml
├── drizzle.config.ts
├── next.config.ts
├── .env.example
├── bun.lock
├── tsconfig.json
└── package.json
```

A estrutura é uma referência inicial.

Criar somente os arquivos e diretórios necessários para cada funcionalidade.

Não gerar diretórios vazios apenas para completar a estrutura.

---

## 5. Controllers e roteamento

Os controllers deverão ficar em:

`src/modules/<module>/controllers/`

### Regras

1. Toda operação de negócio exposta por uma rota deverá passar por um controller.
2. Controllers recebem entradas e coordenam a operação.
3. Controllers validam dados com Zod.
4. Controllers verificam autenticação e autorização quando necessário.
5. Controllers chamam services.
6. Controllers não acessam diretamente repositories.
7. Controllers não implementam regras complexas de negócio.
8. Controllers não devem depender de componentes visuais.
9. Não duplicar lógica entre controllers.

### Rotas Next.js

Os arquivos em `app/` devem ser mínimos.

Uma rota HTTP deverá delegar a um controller:

```ts
// src/app/api/users/route.ts

import { listUsersController } from "@/modules/users/controllers/list-users-controller";

export async function GET() {
  return listUsersController();
}
```

O controller:

```ts
// modules/users/controllers/list-users-controller.ts

import { userService } from "../services/user-service";

export async function listUsersController() {
  // Autenticação e autorização aqui.

  const users = await userService.list();

  return Response.json(users);
}
```

O exemplo é ilustrativo. Na implementação real, utilizar a camada centralizada de segurança, tratamento de erros e DTOs.

### Server Actions

Server Actions também deverão delegar aos controllers.

Não implementar regras de negócio diretamente nas actions.

Controllers acionados por Server Actions poderão retornar resultados tipados em vez de respostas HTTP.

Evitar acoplar um mesmo controller simultaneamente aos formatos HTTP e Server Action. Quando necessário, utilizar adapters específicos que compartilhem o mesmo service.

---

## 6. Services

Os services deverão ficar em:

`src/modules/<module>/services/`

São responsáveis pela lógica de negócio.

### Regras

1. Toda regra de negócio deve residir em um service ou componente de domínio apropriado.
2. Services podem utilizar repositories.
3. Services podem coordenar operações entre módulos por interfaces públicas.
4. Services não devem acessar diretamente objetos `Request` ou `Response`.
5. Services não devem importar componentes React.
6. Services não devem depender do App Router.
7. Services devem ser testáveis isoladamente.
8. Operações que exigem atomicidade deverão utilizar transações.

Evitar services genéricos que concentrem funcionalidades sem relação.

Preferir organização por responsabilidade funcional.

---

## 7. Models

Os models deverão ficar em:

`src/modules/<module>/models/`

Podem incluir:

- Definições de entidades;
- Schemas Drizzle;
- Repositories;
- Tipos de persistência;
- Mapeamentos de dados.

Exemplo:

```text
models/
├── user-schema.ts
├── user-repository.ts
└── user-types.ts
```

### Regras

1. Não executar consultas diretamente nas views.
2. Não executar consultas diretamente nos controllers.
3. Centralizar persistência nos repositories.
4. Não expor estruturas internas do banco diretamente nas respostas públicas.
5. Utilizar tipos apropriados para entrada e saída.
6. Não misturar validações HTTP com definições de persistência.

Os schemas de validação Zod poderão ficar no diretório `schemas/` do módulo.

---

## 8. Views

As views deverão ficar em:

`src/modules/<module>/views/`

Incluem páginas e componentes específicos do módulo.

Exemplo:

```text
views/
├── users-page.tsx
├── user-form.tsx
└── user-table.tsx
```

### Regras

1. Views são responsáveis pela apresentação.
2. Não implementar regras de negócio nas views.
3. Não acessar diretamente o banco.
4. Não importar repositories.
5. Não executar verificações de autorização exclusivamente no cliente.
6. Priorizar Server Components.
7. Utilizar Client Components apenas quando necessário.
8. Utilizar componentes compartilhados quando apropriado.

### Páginas Next.js

Arquivos `page.tsx` devem permanecer simples.

Exemplo:

```tsx
// src/app/(panel)/users/page.tsx

import { getUsersPageController } from "@/modules/users/controllers/users-page-controller";

import { UsersPage } from "@/modules/users/views/users-page";

export default async function Page() {
  const data = await getUsersPageController();

  return <UsersPage data={data} />;
}
```

Views deverão receber dados preparados para apresentação, preferencialmente por DTOs tipados.

---

## 9. Comunicação entre módulos

Cada módulo deverá possuir responsabilidades próprias.

Não acessar diretamente os repositories internos de outro módulo.

A comunicação deverá ocorrer por serviços ou interfaces públicas.

Exemplo:

O módulo de contratos não deverá consultar diretamente tabelas internas do módulo de usuários para obter informações que já possam ser fornecidas por um serviço público desse módulo.

Evitar dependências circulares.

Não utilizar chamadas HTTP internas entre módulos do mesmo monólito sem necessidade.

Não implementar microsserviços.

---

## 10. Autenticação

A autenticação deverá ser centralizada e extensível.

O projeto deverá permitir integração futura com:

- Keycloak;
- Active Directory por meio de provedor apropriado;
- OpenID Connect;
- Microsoft Entra ID.

### Regras

1. Usuários deverão possuir identificadores internos estáveis.
2. E-mails não devem ser utilizados como chave primária.
3. Regras de negócio não devem depender do provedor de autenticação.
4. Sessões devem ser gerenciadas centralmente.
5. Não implementar autenticação própria do zero quando houver solução consolidada.
6. Utilizar Argon2id ou alternativa adequada para senhas locais.
7. Proteger cookies de sessão.
8. Aplicar limitação de tentativas de autenticação.
9. Não armazenar senhas em texto puro.
10. Preparar a arquitetura para SSO institucional.

A escolha da biblioteca ou provedor inicial deverá ocorrer na implementação da autenticação.

---

## 11. Autorização

Utilizar RBAC.

Conceitos:

- Usuários;
- Papéis;
- Permissões;
- Associação entre usuários e papéis;
- Associação entre papéis e permissões.

Exemplos:

```text
dashboard:read

users:read
users:create
users:update
users:delete

modules:manage
```

### Regras

1. Autorização deve ser verificada no servidor.
2. Controllers devem garantir autorização antes de executar operações.
3. Services devem preservar invariantes e regras de domínio, independentemente da interface que os invoque.
4. Negar acesso por padrão.
5. Aplicar menor privilégio.
6. Centralizar a avaliação de permissões.
7. Não confiar em verificações realizadas apenas na interface.

A arquitetura deverá permitir futuramente permissões por secretaria, departamento, setor ou unidade.

Não implementar toda a estrutura organizacional antecipadamente.

---

## 12. PostgreSQL e Drizzle ORM

Utilizar PostgreSQL como banco principal.

Utilizar Drizzle ORM para persistência.

### Convenções

- Tabelas em `snake_case`.
- Colunas em `snake_case`.
- Propriedades TypeScript em `camelCase`.
- Identificadores preferencialmente UUID.
- Chaves estrangeiras explícitas.
- Constraints no banco.
- Índices conforme necessidade.
- Datas preferencialmente em `timestamptz`.
- Armazenamento temporal consistente, preferencialmente UTC.

### Migrações

Toda alteração estrutural deverá gerar migração versionada.

Regras:

1. Utilizar Drizzle Kit.
2. Versionar migrações.
3. Não utilizar `drizzle-kit push` em produção.
4. Não alterar migrações já aplicadas.
5. Revisar SQL gerado.
6. Não executar operações destrutivas sem autorização.
7. Realizar backup antes de alterações relevantes.
8. Não executar migrações automaticamente em cada inicialização de produção.

---

## 13. Segurança

Aplicar segurança desde o início.

### Requisitos

- Validar entradas externas com Zod.
- Utilizar consultas parametrizadas.
- Verificar autenticação e autorização.
- Proteger contra XSS, CSRF e SSRF.
- Utilizar HTTPS em produção.
- Proteger cookies.
- Não expor credenciais.
- Não registrar tokens e senhas em logs.
- Não retornar detalhes internos de erros.
- Aplicar limites de requisição quando necessário.
- Manter dependências atualizadas.
- Observar os princípios aplicáveis da LGPD.

### Auditoria

Operações administrativas relevantes deverão gerar registros de auditoria.

Registrar quando aplicável:

- Usuário responsável;
- Operação;
- Entidade afetada;
- Data e hora;
- Resultado.

Logs técnicos e auditoria são responsabilidades distintas.

Evitar registrar dados pessoais desnecessários.

---

## 14. Configuração por ambiente

Suportar:

- Desenvolvimento;
- Testes;
- Produção.

Utilizar variáveis de ambiente.

Manter `.env.example`.

Validar configurações obrigatórias com Zod.

Exemplo:

```env
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/dsi_panel
APP_URL=http://localhost:3000
```

`NODE_ENV` é utilizado pelo ecossistema Next.js, mesmo quando Bun é o runtime.

### Regras

1. Nunca versionar credenciais reais.
2. Não utilizar credenciais de produção em desenvolvimento.
3. Separar bancos por ambiente.
4. Documentar novas variáveis.
5. Falhar explicitamente quando uma configuração obrigatória estiver ausente.
6. Não expor segredos por variáveis `NEXT_PUBLIC_`.

---

## 15. Docker

Utilizar Docker e Docker Compose.

### Dockerfile

- Utilizar imagem oficial do Bun.
- Fixar versão da imagem.
- Utilizar multi-stage build.
- Instalar dependências com lockfile.
- Executar build no container.
- Reduzir dependências na imagem final.
- Executar com usuário não privilegiado.
- Utilizar Bun como runtime em produção.

### Docker Compose

O ambiente inicial deverá conter:

- Aplicação Next.js;
- PostgreSQL.

Requisitos:

- Persistência do PostgreSQL;
- Health checks;
- Rede interna;
- Variáveis de ambiente;
- Política de reinicialização;
- Banco não exposto publicamente por padrão.

### Produção

- HTTPS;
- Proxy reverso quando necessário;
- Backups;
- Logs;
- Deploy reproduzível;
- Procedimento documentado de atualização.

Validar o funcionamento do build do Next.js com Bun antes de utilizar otimizações como `output: "standalone"`.

---

## 16. Convenções de código

Utilizar TypeScript strict.

Evitar `any`.

Preferir tipos explícitos.

### Nomenclatura

| Elemento           | Convenção        |
| ------------------ | ---------------- |
| Variáveis          | camelCase        |
| Funções            | camelCase        |
| Componentes        | PascalCase       |
| Tipos e interfaces | PascalCase       |
| Constantes globais | UPPER_SNAKE_CASE |
| Arquivos           | kebab-case       |
| Diretórios         | kebab-case       |
| Tabelas            | snake_case       |
| Colunas            | snake_case       |

### Idioma

- Código em inglês.
- Identificadores em inglês.
- Interface em português brasileiro.
- Documentação em português brasileiro.

### Boas práticas

- Funções pequenas.
- Responsabilidades claras.
- Evitar duplicação.
- Não criar abstrações prematuras.
- Não criar arquivos excessivamente grandes.
- Preferir legibilidade.
- Comentários devem explicar decisões relevantes.

---

## 17. Tratamento de erros

Separar:

- Erros de validação;
- Erros de autenticação;
- Erros de autorização;
- Erros de negócio;
- Erros inesperados.

Controllers deverão converter erros em respostas apropriadas ao transporte utilizado.

Services deverão lançar ou retornar erros de domínio sem depender de códigos HTTP.

Não retornar stack traces ao usuário.

Não ocultar erros silenciosamente.

Mensagens apresentadas ao usuário deverão estar em português brasileiro.

---

## 18. Testes

Utilizar Bun Test para testes unitários e de integração.

Utilizar Playwright quando testes de ponta a ponta forem necessários.

Priorizar testes de:

- Services;
- Controllers;
- Autorização;
- Validação;
- Repositories;
- Integrações;
- Operações críticas.

Services devem ser testáveis independentemente do Next.js.

Testes de banco devem utilizar ambiente isolado.

Nunca executar testes contra produção.

Antes de concluir alterações relevantes:

```bash
bun run lint
bun run typecheck
bun test
bun run build
```

Os scripts devem existir no `package.json`.

Não afirmar que testes passaram sem executá-los.

---

## 19. Integrações externas

Integrações com sistemas municipais deverão ser isoladas.

Priorizar APIs documentadas.

Não acessar diretamente bancos de fornecedores sem autorização e necessidade explícitas.

### Regras

- Isolar adapters de integração;
- Validar entradas e respostas;
- Utilizar timeouts;
- Tratar indisponibilidade;
- Proteger credenciais;
- Registrar falhas relevantes;
- Considerar idempotência;
- Evitar acoplamento a estruturas internas de fornecedores.

Não implementar integrações antes de existir uma demanda concreta.

---

## 20. Documentação

Manter documentação objetiva em `docs/`.

Registrar decisões arquiteturais relevantes com:

- Contexto;
- Decisão;
- Justificativa;
- Consequências.

Documentar:

- Instalação;
- Configuração;
- Desenvolvimento;
- Migrações;
- Deploy;
- Recuperação.

Evitar documentação desnecessariamente extensa.

---

## 21. Desenvolvimento incremental

### Fase 1 — Fundação

- Inicializar Next.js com Bun;
- Configurar TypeScript strict;
- Configurar PostgreSQL;
- Configurar Drizzle ORM;
- Configurar Docker;
- Criar estrutura MVC modular;
- Configurar variáveis de ambiente;
- Criar layout inicial;
- Configurar lint, formatação e testes.

### Fase 2 — Identidade e autorização

- Definir solução de autenticação;
- Implementar login;
- Implementar sessões;
- Implementar usuários;
- Implementar RBAC;
- Proteger controllers;
- Criar auditoria básica.

### Fase 3 — DSI Panel

- Criar dashboard;
- Implementar navegação modular;
- Adicionar primeira ferramenta solicitada;
- Validar arquitetura com funcionalidades reais.

### Fase 4 — Expansão

Conforme necessidade:

- Novos módulos;
- Integrações;
- Estrutura organizacional;
- SSO;
- Expansão para outros departamentos.

Não antecipar fases sem solicitação.

---

## 22. Instruções obrigatórias para agentes de IA

Todo agente deverá:

1. Ler este documento antes de alterar o projeto.
2. Inspecionar a estrutura existente.
3. Respeitar a arquitetura MVC modular.
4. Manter controllers, services, models e views separados.
5. Utilizar Bun.
6. Respeitar a stack tecnológica.
7. Não introduzir microsserviços.
8. Não adicionar dependências sem justificativa.
9. Não implementar funcionalidades fora do escopo.
10. Não colocar lógica de negócio nas views.
11. Não colocar consultas ao banco nos controllers.
12. Não colocar regras de negócio extensas nos controllers.
13. Não criar abstrações desnecessárias.
14. Centralizar autenticação e autorização.
15. Validar entradas.
16. Proteger segredos.
17. Não executar operações destrutivas sem autorização.
18. Preservar compatibilidade.
19. Atualizar documentação relevante.
20. Executar testes disponíveis.
21. Informar testes não executados.
22. Comunicar decisões técnicas relevantes.
23. Solicitar esclarecimentos para decisões arquiteturais de alto impacto.

### Antes de implementar

- Entender o requisito;
- Identificar o módulo;
- Definir controller, service, model e view necessários;
- Verificar padrões existentes;
- Escolher a solução mais simples.

### Durante a implementação

- Realizar alterações pequenas;
- Respeitar as camadas;
- Evitar dependências desnecessárias;
- Preservar segurança;
- Manter código legível.

### Após implementar

- Verificar tipagem;
- Executar testes;
- Verificar build;
- Documentar alterações relevantes;
- Informar limitações e pendências.

---

## 23. Diretriz final

O DSI Panel deverá permanecer um **monólito MVC modular, simples, seguro e sustentável**.

O Next.js será responsável pelo roteamento e renderização, enquanto a aplicação deverá manter suas responsabilidades separadas entre controllers, services, models e views.

A possibilidade de expansão para uma intranet municipal deverá orientar as decisões arquiteturais, mas não justificar complexidade antecipada.

**Construir o necessário agora, preservando a capacidade de evoluir depois.**
