# 🤖 LEIS GLOBAIS V.L.A.E.G. - Telegram AI Blogger (API)

Este é o documento de especificação (`gemini.md`) do projeto **Telegram AI Blogger**, em conformidade absoluta com as regras globais da Constituição Universal de Projetos (V.L.A.E.G.). Tudo neste projeto deve obedecer rigorosamente às normas aqui descritas.

## 🇧🇷 1. IDIOMA

Tudo no projeto está e continuará em **Português do Brasil (pt-BR)**, incluindo:
- Respostas do bot e interações
- Logs de sistema
- Comentários e Documentação
- Commits
- Mensagens de erro e validações

## 📂 2. ESTRUTURA GLOBAL E DO PROJETO

O projeto segue e deverá se adaptar (onde aplicável) para a estrutura obrigatória:

```text
telegram-ai-blogger/
│
├── frontend/ (Painel Admin Web - planejado/se aplicável)
├── backend/ (Equivalente ao atual `src` do bot e API Express)
├── nginx/
├── shared/
├── tests/
├── docker/
├── architecture/
│
├── compose.yml
├── .env
├── gemini.md
├── task_plan.md
├── findings.md
└── progress.md
```

### Estrutura Atual Identificada:
- **`src/`**: Contém o código fonte do bot e da API.
  - `bot/`: Controle do Telegraf, comandos e interações de aprovação.
  - `services/`: Serviços e healthcheck.
  - `ghost/`: Integração de publicação no Ghost CMS.
  - `gemini/`: Integração com Google Gemini API (texto e imagem).
  - `seo/`: Geração de metadados e otimizações de busca.
  - `image/`: Geração e processamento de imagens (Sharp).
  - `database/`: Conexões com banco de dados (atualmente SQLite).
  - `prompts/`: Templates de IA.
  - `utils/`: Utilitários gerais (ex: logger com Winston).
- **`storage/`**: Arquivos persistentes (imagens, BD).
- **`logs/`**: Logs gerados pelo sistema de logging.
- **`package.json`**: Gerenciamento de dependências Node.js (TypeScript, Express, Telegraf, Gemini).

## 🐳 3. DOCKER & CONTAINERS

- Todos os ambientes são geridos via `compose.yml` na raiz do projeto.
- **Network Obrigatória**: O projeto deve se conectar à rede `goodvibes-network`.
- **Containers Principais**: Limite de 2 containers principais (`frontend` e `backend`). O bot atua como `backend`.
- **Nginx**: Proxy reverso interno sempre configurado sob a pasta `nginx/`.
- **Proxy Manager**: Acesso via internet obrigatoriamente passará pelo *NGINX Proxy Manager* externo (porta 81) antes de chegar no NGINX Interno. Não há exposição direta das portas da API ou Bot (exceto webhook/healthcheck via Nginx).

## 🗄️ 4. BANCO DE DADOS E ARMAZENAMENTO

**Regra Global Absoluta:** O banco de dados PostgreSQL é uma dependência **EXTERNA** da infraestrutura.
- É estritamente PROIBIDO criar um container `postgres` ou `postgres_db` no `compose.yml`.
- A API se conectará ao PostgreSQL via rede `goodvibes-network`.

**Variáveis Obrigatórias no `.env` (Para regras de conexão):**
```env
POSTGRES_HOST=postgres_db
POSTGRES_PORT=5432
POSTGRES_USER=admin
POSTGRES_PASSWORD=1q2w3e4r5t6y
POSTGRES_DB=telegram-ai-blogger
```

*(Nota: O projeto utiliza SQLite em `storage/database.sqlite` para dados do bot e `storage/sites.json` para múltiplos sites. Em caso de adaptação arquitetural, a transição para o Postgres seguirá essa regra).*

## 🧠 5. INTELIGÊNCIA ARTIFICIAL (GEMINI)

A integração com IA (Google Gemini PRO) respeita a lei: **IA nunca controla pagamentos, permissões, autenticação ou regras críticas.**
A IA atua apenas como auxiliar no projeto para:
- Geração de Conteúdo (Artigos otimizados)
- SEO avançado (criação de slugs, metas, tags e Schema)
- Geração de descrições e prompts de Imagem baseados em estilos otimizados para SEO.
- Resumos e categorização

## 📡 6. APIs E INTEGRAÇÕES (GHOST & TELEGRAM)

Todas as requisições API (Express Healthcheck, Ghost CMS Admin API ou chamadas ao Telegram API) seguem as leis de qualidade:
- O bot suporta múltiplos sites Ghost configurados dinamicamente.
- O fluxo de uso é conversacional (`/novosite` para cadastro guiado e `/novopost` com etapas numeradas).
- Versionamento e validação de payloads via bibliotecas de validação (ex: Zod).
- Tratamento de erros rigoroso com logs estruturados (Winston).
- Autenticação segura (Sem credenciais em código).
- O bot opera com `long polling` de maneira otimizada.

## 🛡️ 7. SEGURANÇA E HARD CODE

É expressamente proibido realizar *hard code* de:
- URLs (Ghost CMS)
- Tokens do Telegram
- Chaves de API (Gemini, Admin Ghost)
- Senhas, Portas e Integrações de Banco de Dados.
Tudo está armazenado e deve ser lido unicamente pelo `.env`.
O projeto implementa `helmet` e `express-rate-limit` para o endpoint de healthcheck, garantindo cabeçalhos seguros e proteção contra abusos.

## ⚡ 8. PERFORMANCE E SEO GLOBAL

- **SEO:** O bot injeta SEO Global (Títulos amigáveis, slugs, meta description, schema.org) antes de enviar para o Ghost CMS.
- **Performance:** Processamento de imagens local com `Sharp` para compressão e conversão em formato WEBP otimizado.

## 🔄 9. FLUXO DE TRABALHO E AUTOCORREÇÃO

Caso ocorram erros:
1. O sistema deve analisar, capturar a falha e isolar a causa raiz no logger.
2. Manter resiliência de conexão.
3. Testar correções.
4. Atualizar documentação `findings.md` ou `progress.md`.

## 📚 10. DOCUMENTAÇÃO OBRIGATÓRIA

Os arquivos de documentação devem ser mantidos atualizados:
- `gemini.md`
- `task_plan.md`
- `findings.md`
- `progress.md`

---

**🔥 REGRA FINAL:**
`gemini.md` é a lei.
Todos os frontends, backends, deploys, containers e integrações do projeto devem obedecer rigorosamente este documento.
