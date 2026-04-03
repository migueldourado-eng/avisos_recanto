# Changelog

Todas as mudancas relevantes do projeto Recanto Avisos ficam registradas aqui.

---

## [1.1.0] - 02/04/2026

### Corrigido
- Templates do painel admin voltaram a carregar na etapa de envio de avisos.
- QR Code do admin deixou de sofrer bloqueio por `429 Too Many Requests`.
- App dos pais deixou de piscar por conflito de Service Worker.
- App dos pais deixou de alternar textos e icones por traducao automatica do navegador.
- Respostas da escola voltaram a chegar aos responsaveis via FCM.
- Fluxo de solicitacoes dos pais recebeu abas de nova mensagem e historico.

### Alterado
- Rotas administrativas ficaram fora do rate limit global do backend.
- Validacao de responsaveis e notificacoes recebeu ajustes de inicializacao do Firebase.
- Documentacao do projeto foi atualizada com as mudancas recentes.

### Observacoes
- O painel admin continua usando CDN do Tailwind no HTML atual.
- Os avisos de extensao do navegador no console nao sao erro do sistema.

