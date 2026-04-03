# Relatorio de Correcoes

**Projeto:** Recanto Avisos  
**Data:** 03/04/2026

Este documento resume os problemas corrigidos recentemente, a causa raiz de cada um e os cuidados adotados para reduzir a chance de regressao.

### Versao e status

| Item | Versao | Status |
|------|--------|--------|
| Templates do admin | 1.1.0 | Corrigido e publicado |
| App dos pais piscando | 1.1.0 | Corrigido e publicado |
| Push de respostas | 1.1.0 | Corrigido e publicado |
| Solicitacoes no admin | 1.1.0 | Corrigido e publicado |
| QR Code com 429 | 1.1.0 | Corrigido e publicado |
| Onboarding da PWA | 1.2.0 | Corrigido e publicado |

---

## 1. Templates de avisos nao apareciam no painel admin

### Problema corrigido
- A etapa de escolha de templates no fluxo de envio de avisos estava vazia.
- Os templates voltaram a aparecer no painel admin.

### Causa raiz
- O frontend do admin estava chamando a rota errada para buscar os templates.
- A consulta precisava usar a rota administrativa correta, com agregacao por categoria.

### Correcao aplicada
- Ajuste da chamada para `GET /api/admin/templates?agrupado=1`.

### Como evitar a repeticao
- Validar sempre a rota usada pelo frontend antes de publicar.
- Manter testes manuais de abertura da etapa de templates no admin.
- Ao criar novas rotas administrativas, registrar a URL esperada no README.

---

## 2. Tela do app dos pais piscando e alternando textos

### Problema corrigido
- O app dos responsaveis recarregava a interface em ciclos.
- Em alguns aparelhos, os textos e icones alternavam entre portugues e ingles.

### Causa raiz
- Havia conflito no gerenciamento do Service Worker.
- A pagina tambem ficava sujeita a traducao automatica do navegador, o que amplificava a percepcao de troca de idioma.

### Correcao aplicada
- Remocao do loop agressivo de atualizacao do Service Worker.
- Uso apenas do fluxo oficial de registro de SW da PWA.
- Inclusao de protecao contra traducao automatica na pagina principal.

### Como evitar a repeticao
- Nunca registrar Service Worker em dois pontos diferentes sem necessidade.
- Evitar reload automatico frequente em PWA, principalmente em producao.
- Sempre testar o app com cache limpo e em navegacao normal antes de publicar.

---

## 3. Respostas da escola nao chegavam ao app dos pais

### Problema corrigido
- A escola respondia a solicitacao, mas o pai nao recebia a notificacao.

### Causa raiz
- A inicializacao do Firebase Messaging estava ocorrendo de forma fragil, com risco de falha silenciosa.
- O token e a registration do Service Worker precisavam estar validos antes do envio.

### Correcao aplicada
- Ajuste do fluxo de inicializacao do FCM no app dos pais.
- Reforco da obtencao e do registro do token.

### Como evitar a repeticao
- Tratar inicializacao de push como fluxo assincrono critico.
- Validar token FCM e registration do SW antes de disparar push.
- Monitorar logs de envio no backend apos qualquer mudanca de Firebase.

---

## 4. Solicitacoes dos pais nao apareciam no admin

### Problema corrigido
- Solicitacoes enviadas pelo app dos pais estavam chegando ao backend, mas podiam nao aparecer na tela do admin em alguns filtros.

### Causa raiz
- O painel aplicava filtros que escondiam registros novos.
- Isso gerava a impressao de que a solicitacao nao tinha sido salva.

### Correcao aplicada
- Revisao do fluxo de listagem no admin.
- Conferencia dos filtros para garantir que novos registros fiquem visiveis por padrao.

### Como evitar a repeticao
- Destacar visualmente filtros ativos no painel.
- Evitar filtros ocultos em telas operacionais.
- Usar mensagens de estado mais claras quando nao houver resultados.

---

## 5. QR Code do admin retornava 429 Too Many Requests

### Problema corrigido
- A tela de `Turmas & QR Codes` passou a exibir erro `429` ao abrir ou recarregar.

### Causa raiz
- O rate limit global do backend estava sendo aplicado tambem ao painel administrativo.
- A navegacao normal do admin podia estourar esse limite, mesmo sem abuso real.

### Correcao aplicada
- Exclusao de rotas `/api/admin/*` do rate limit global.
- Mantidos os limitadores especificos de login e envio de avisos.

### Como evitar a repeticao
- Separar claramente limites globais de limites por funcionalidade.
- Nao aplicar rate limit unico em rotas administrativas sensiveis ao carregamento da interface.
- Sempre testar telas do admin apos qualquer ajuste em middleware global.

---

## 6. Melhorias no app dos pais

### Mudancas entregues
- Botao `Falar com a Escola`.
- Abas `Nova Solicitacao` e `Minhas Solicitacoes`.
- Historico de mensagens com respostas da escola.
- Botao de apagar mensagens/solicitacoes.

### Cuidado adotado
- Os ajustes foram feitos sem alterar o restante das funcoes do app.

### Como evitar a repeticao
- Manter separacao clara entre telas novas e funcoes ja existentes.
- Fazer validacao de fluxo antes e depois de cada deploy.
- Revisar cache da PWA e comportamento do Service Worker em cada publicacao.

---

## 7. Onboarding da PWA reorganizado

### Problema corrigido
- O fluxo de entrada do app estava pouco claro para o responsavel.
- O pedido para instalar o atalho aparecia cedo demais, antes do aceite e antes da permissao de notificacoes.
- Faltava uma explicacao objetiva sobre o que o app faz e o que ele nao acessa no celular.

### Causa raiz
- O onboarding estava distribuido entre telas diferentes.
- O banner de instalacao ficava na home e no login, sem contexto suficiente.
- O aceite de privacidade existia, mas sem uma explicacao mais pratica do uso do aplicativo.

### Correcao aplicada
- Mantido o fluxo de login com `QR Code da turma + nome do aluno`.
- Criada uma landing de entrada centrada no QR Code.
- Criada uma tela de login dedicada para confirmar o nome do aluno depois da leitura do QR.
- Criado onboarding em 3 etapas apos o login:
  - explicacao de privacidade e uso do app;
  - pedido de notificacoes;
  - pedido de atalho na tela inicial.
- Removido o pedido de instalacao da home e do login.

### Como evitar a repeticao
- Concentrar onboarding em uma unica etapa controlada do fluxo.
- Nao pedir instalacao ou permissao antes de o usuario entender o objetivo do app.
- Revisar sempre a ordem de: identificacao, explicacao, aceite, notificacoes e instalacao.

---

## Observacoes finais

- Os ajustes documentados aqui foram focados em estabilidade, experiencia do usuario e integridade do fluxo principal.
- Sempre que houver alteracao em rotas, Service Worker, Firebase ou middleware global, a validacao deve incluir:
  - login do admin
  - abertura da tela de QR Code
  - envio de aviso com template
  - envio e recebimento de solicitacao do app dos pais
  - resposta da escola chegando ao responsavel

## Pendencias conhecidas

- O painel admin ainda usa `cdn.tailwindcss.com` no HTML atual, o que gera aviso de producao no console.
- Logs de extensoes do navegador podem aparecer no admin e no app dos pais sem indicar erro do sistema.
- Se a PWA dos pais mantiver cache antigo, pode ser necessario limpar dados do site e reinstalar o app.
