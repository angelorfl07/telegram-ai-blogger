# Telegram AI Blogger + Gemini PRO + Ghost CMS

Este projeto entrega um **robô Telegram profissional em Node.js e TypeScript** para gerar artigos altamente otimizados para SEO com Gemini, criar imagem destacada automaticamente, enviar prévia para aprovação no Telegram e publicar o conteúdo no Ghost CMS pela Admin API.

> O sistema foi desenhado para rodar em uma VPS Linux com Docker Compose, mantendo banco SQLite, imagens e logs em volumes persistentes. Como é um bot 24/7 acionado por mensagens do Telegram e integrado a APIs externas, ele deve permanecer em execução contínua em um servidor, VPS ou ambiente persistente equivalente.

## Arquitetura

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Bot | Telegraf | Receber comandos, validar administrador, enviar prévia e controlar aprovação |
| IA | Google Gemini API | Gerar artigo SEO, metadados, schema, tags e prompt de imagem |
| Imagem | Gemini + Sharp | Criar capa horizontal, converter/comprimir para WEBP e salvar localmente |
| CMS | Ghost Admin API | Enviar imagem e publicar post com HTML, slug, tags e metadados |
| Banco | SQLite | Histórico, cache, eventos, status dos posts e auditoria básica |
| Logs | Winston | Logs estruturados em console e arquivos persistentes |
| Deploy | Docker Compose | Execução reproduzível em VPS Linux com healthcheck e restart automático |

## Estrutura do projeto

```text
/app
├── src
│   ├── bot
│   ├── services
│   ├── ghost
│   ├── gemini
│   ├── seo
│   ├── image
│   ├── database
│   ├── prompts
│   ├── utils
│   ├── middleware
│   └── types
├── storage
├── logs
├── docker
├── .env
├── docker-compose.yml
├── Dockerfile
├── package.json
└── README.md
```

## Requisitos da VPS

Use uma VPS Linux com Docker e Docker Compose instalados. Para produção, recomenda-se pelo menos 1 vCPU, 1 GB de RAM e armazenamento persistente suficiente para imagens e logs. O bot usa long polling do Telegram, portanto não exige domínio público para webhook, mas exige saída para internet. A publicação no Ghost usa a Admin API, que suporta autenticação por Admin API Key e endpoints administrativos para posts e imagens.[1]

## Opções de execução

| Abordagem | Tradeoffs | Custo | Complexidade de setup |
|---|---|---|---|
| VPS Linux com Docker Compose | É a abordagem principal deste projeto, mantém o bot online 24/7, permite volumes persistentes, logs e controle total do ambiente. | Depende do provedor da VPS. | Média, pois exige configurar servidor, Docker e variáveis de ambiente. |
| Computador local sempre ligado | Evita custo de VPS, mas o bot ficará indisponível se a máquina desligar, perder internet ou hibernar. | Baixo ou zero, se você já tiver a máquina. | Baixa a média, mas menos robusta para produção. |
| Plataforma de containers gerenciada | Reduz manutenção de infraestrutura, mas pode exigir adaptação para persistência de SQLite, storage de imagens e variáveis secretas. | Variável conforme uso. | Média a alta, dependendo do provedor. |


## Instalação rápida

Clone ou envie esta pasta para a VPS e execute os comandos abaixo no diretório do projeto.

```bash
cp .env.example .env
nano .env

docker compose up -d --build
docker compose logs -f
```

O endpoint local de healthcheck ficará disponível em `http://localhost:3000/health`.

## Configuração do `.env`

| Variável | Descrição |
|---|---|
| `PORT` | Porta do healthcheck HTTP, padrão `3000` |
| `TELEGRAM_BOT_TOKEN` | Token gerado no BotFather |
| `TELEGRAM_ALLOWED_USER` | ID numérico do Telegram ou username autorizado |
| `GEMINI_API_KEY` | Chave da Google Gemini API |
| `GEMINI_MODEL` | Modelo textual, padrão `gemini-2.5-pro` |
| `GEMINI_IMAGE_MODEL` | Modelo usado para geração de imagem |
| `GHOST_URL` | URL pública do site Ghost |
| `GHOST_ADMIN_API_URL` | URL da Admin API, geralmente `https://dominio/ghost/api/admin` |
| `GHOST_ADMIN_KEY` | Admin API Key no formato `id:secret` |
| `GHOST_AUTHOR_ID` | Autor opcional configurável por ID |
| `IMAGE_WIDTH` e `IMAGE_HEIGHT` | Dimensões finais da imagem WEBP |
| `SQLITE_PATH` | Caminho do banco SQLite |

## Criando o bot no Telegram

Abra o Telegram, converse com `@BotFather`, use `/newbot`, escolha nome e username e copie o token para `TELEGRAM_BOT_TOKEN`. Para descobrir seu ID numérico, você pode usar bots como `@userinfobot` ou registrar uma primeira tentativa de acesso e consultar os logs. Em produção, configure `TELEGRAM_ALLOWED_USER` para impedir uso por terceiros.

## Configurando Gemini

Crie uma chave de API no Google AI Studio e coloque em `GEMINI_API_KEY`. O projeto chama a API REST do Gemini com retry automático, timeout e temperatura configurável. Se o modelo de imagem configurado não estiver disponível na sua conta ou região, altere `GEMINI_IMAGE_MODEL` para um modelo Gemini com suporte a saída de imagem. A API Gemini oferece geração de conteúdo por modelos com endpoint `generateContent`, usado neste projeto para artigo e metadados.[2]

## Configurando Ghost CMS

No painel do Ghost, acesse **Settings → Integrations → Add custom integration**. Copie a **Admin API Key** para `GHOST_ADMIN_KEY` e confirme se `GHOST_ADMIN_API_URL` aponta para `/ghost/api/admin`. A publicação usa `POST /posts/?source=html`, envia imagem por `/images/upload/` e salva status como `published`. O Ghost documenta o uso da Admin API para criação de posts e autenticação administrativa por JWT assinado com a Admin API Key.[1]

## Comandos do Telegram

| Comando | Ação |
|---|---|
| `/start` | Inicia o bot e mostra instrução básica |
| `/help` | Lista comandos disponíveis |
| `/status` | Mostra status, fila e analytics básicos |
| `/novopost tema` | Gera artigo SEO, imagem, metadados e prévia |
| `/rewrite` | Reescreve o rascunho ativo mantendo SEO |
| `/postar` | Publica o rascunho aprovado no Ghost CMS |
| `/cancelar` | Cancela o rascunho ativo |
| `/logs` | Mostra últimos posts registrados |

Também são aceitas respostas textuais curtas: `poste`, `sim`, `reescreva`, `não` e `cancelar`.

## Fluxo de uso real

Envie no Telegram:

```text
/novopost Como usar IA com Node.js
```

O bot responderá que está gerando o artigo. Em seguida, enviará imagem destacada, título, resumo, meta description, score SEO estimado, tags e keywords. Se a prévia estiver adequada, envie `/postar`. Caso queira nova versão, envie `/rewrite`.

## SEO implementado

O prompt força o Gemini a atuar como especialista SEO, copywriter técnico, jornalista de tecnologia e estrategista de Google Discover. Cada post inclui título editorial, título SEO, slug, meta description, keywords, resumo, HTML, Markdown, H1/H2/H3, FAQ, JSON-LD, tags, CTA final e score SEO interno.

## Segurança e confiabilidade

O projeto implementa validação de usuário Telegram, rate limit no servidor HTTP, sanitização de HTML, retries automáticos para Gemini e Ghost, timeout de requests, logs estruturados, healthcheck Docker, volumes persistentes, fila de geração e cache inteligente. As chaves sensíveis ficam apenas no `.env`.

## Backup

Para backup simples, preserve `storage/`, `logs/` e `.env`.

```bash
tar -czf backup-telegram-ai-blogger.tar.gz .env storage logs
```

## Restore

Em uma nova VPS, copie o projeto e restaure o arquivo de backup.

```bash
tar -xzf backup-telegram-ai-blogger.tar.gz
docker compose up -d --build
```

## Atualização

```bash
docker compose down
# substitua os arquivos do projeto pela nova versão, preservando .env, storage e logs
docker compose up -d --build
```

## Troubleshooting

| Sintoma | Causa provável | Correção |
|---|---|---|
| Bot não responde | Token inválido ou container parado | Verifique `.env` e `docker compose logs -f` |
| Acesso negado | `TELEGRAM_ALLOWED_USER` não corresponde ao usuário | Configure ID numérico ou username correto |
| Erro Gemini | API key, modelo ou limite indisponível | Teste outro modelo e confirme permissões da chave |
| Erro ao gerar imagem | Modelo sem suporte a imagem | Ajuste `GEMINI_IMAGE_MODEL` para modelo com saída de imagem |
| Erro Ghost 401 | Admin key inválida | Confirme formato `id:secret` |
| Post sem URL | Ghost recusou publicação | Verifique logs, tags, autor e permissões da integração |

## Observações de produção

Este projeto não inclui placeholders quebrados no código, mas as credenciais reais precisam ser preenchidas no `.env`. O comportamento da geração de imagem depende da disponibilidade do modelo Gemini de imagem na sua conta. Em ambientes críticos, recomenda-se configurar monitoramento externo do endpoint `/health`, rotação adicional de logs e política de backup automatizado. O bot usa Telegraf, biblioteca Node.js para Telegram Bot API, mantendo o fluxo de comandos via long polling.[3]

## Referências

[1]: https://ghost.org/docs/admin-api/ "Ghost Admin API"
[2]: https://ai.google.dev/gemini-api/docs/text-generation "Gemini API — Text generation"
[3]: https://telegraf.js.org/ "Telegraf.js"
