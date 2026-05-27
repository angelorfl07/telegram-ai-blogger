# Plano de Tarefas (Task Plan)

- [x] Atualizar arquivos `.md` (task_plan, progress, gemini).
- [x] Criar utilitário de gerenciamento de sites (`src/config/sites.ts`) para ler/escrever `storage/sites.json`.
- [x] Adicionar interface `SiteConfig` nos tipos da aplicação.
- [x] Implementar o comando `/novosite` com state machine simples no `bot.ts`.
- [x] Alterar `/novopost` para listar sites, aguardar escolha, pedir tema, listar estilos e aguardar escolha.
- [x] Refatorar `ghostClient.ts` para aceitar `SiteConfig` como parâmetro e usar `url` e `key` dinâmicos em vez do `.env`.
- [x] Refatorar chamadas ao Gemini para usar o novo `IMAGE_STYLE` escolhido dinamicamente.
- [x] Testar e verificar fluxos.
