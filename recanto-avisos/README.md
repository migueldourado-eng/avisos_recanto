# Recanto Avisos

Sistema de comunicacao escolar da Escola Recanto das Margaridas.

O projeto possui:
- uma API em Node.js/Express com SQLite;
- um painel administrativo em HTML/JS servido em `/admin`;
- uma PWA para responsaveis servida no dominio principal.

## Producao

- PWA: `https://avisosrecanto.com.br`
- Admin: `https://avisosrecanto.com.br/admin`
- API: `https://avisosrecanto.com.br/api`
- VPS: `163.176.142.84`
- Usuario SSH: `ubuntu`
- Chave SSH local: `C:\Users\55719\OneDrive\APP\ssh-key-2026-03-31.key`

## Estado atual

### Fluxo do responsavel no app

O acesso do responsavel funciona assim:

1. O responsavel le o QR Code da turma.
2. O app abre a tela de confirmacao com o `qr_token` da turma.
3. O responsavel informa o nome completo do aluno.
4. A API autentica com `qr_token + nome_aluno`.
5. Depois do login, a PWA mostra um onboarding em 3 etapas:
   - explicacao de privacidade e uso do app;
   - pedido para ativar notificacoes;
   - pedido para adicionar atalho na tela inicial.
6. Depois do onboarding, o responsavel entra em `/avisos`.

Observacoes:
- O login continua dependente de `QR + nome do aluno`.
- O QR atual e por turma, nao por aluno.
- No celular, a tela de QR tenta abrir a camera direto.
- Se a camera do app falhar no celular, a tela orienta a usar a camera nativa ou a digitacao manual.
- No PC, a tela de QR mantem a interface da biblioteca com webcam/upload.
- As sugestoes de nome do aluno so aparecem apos `5` caracteres digitados.
- O pedido de instalacao do atalho nao aparece mais na home nem no login; ele aparece depois do aceite.

### Multiplos filhos por responsavel

Um responsavel pode ter mais de um filho em turmas diferentes e acessar tudo na mesma conta:

1. Apos o login com o primeiro filho, o responsavel vai em **Conta** → **Adicionar filho**.
2. Le o QR Code da turma do segundo filho.
3. Digita o nome do aluno → vinculado.
4. O app passa a exibir dados dos dois filhos sem precisar sair e entrar novamente.

Comportamento com multiplos filhos:
- **Avisos**: o responsavel recebe avisos de todas as turmas dos seus filhos na mesma lista.
- **Vida Escolar**: seletor de filho aparece no topo da aba para alternar entre os dados de cada um.
- **Solicitacoes**: ao abrir o modal, a primeira tela pede para selecionar para qual filho e a solicitacao.
- **Conta**: lista todos os filhos vinculados e exibe o botao de adicionar novo.
- **Header**: quando ha multiplos filhos, o nome no topo vira botoes de alternancia entre eles.

### Notificacoes

O backend suporta varios tokens FCM por responsavel.

Isso permite:
- o mesmo acesso em mais de um celular;
- envio de push para varios aparelhos vinculados ao mesmo responsavel;
- remocao de dispositivos no painel admin.

### Vida escolar

O app dos pais exibe:
- total de faltas;
- comportamento;
- observacoes.

### Conta

A aba `Conta` no app dos pais exibe:
- nome do responsavel;
- todos os filhos vinculados (com turma de cada um);
- botao `Adicionar filho` para vincular novo filho via QR;
- acao `Falar com a escola`;
- saida do app com confirmacao.

### Horarios e datas

Os horarios de avisos e solicitacoes foram ajustados para trafegar em ISO UTC explicito na API, evitando deslocamentos de fuso na exibicao do admin e da PWA.

### Templates de aviso

O painel admin agora abre o fluxo de envio com escolha entre:
- `Usar modelo pronto`
- `Escrever aviso do zero`

Categorias atuais com destaque operacional:
- `Transporte escolar`
- `Alunos`
- `Aulas`
- `Saude`
- `Frequencia`
- `Reunioes`
- `Administrativo`

Templates recentes adicionados:
- onibus escolar vai atrasar;
- onibus escolar saira mais cedo hoje;
- onibus escolar nao vai funcionar hoje;
- crianca voltou para a escola;
- aluno nao foi buscado no horario;
- aluno apresentou mal-estar;
- mudanca de rotina da turma.

No admin, a aba de comportamento usa a mesma base da aba de alunos e complementa com os dados de vida escolar quando a rota correspondente estiver disponivel.

## Estrutura

```text
recanto-avisos/
|-- backend/
|   `-- src/
|       |-- index.js
|       |-- database.js
|       |-- middleware/
|       |-- routes/
|       |   |-- admin.js
|       |   |-- auth.js
|       |   |-- avisos.js
|       |   `-- solicitacoes.js
|       `-- services/
|           `-- fcm.js
|-- admin-panel/
|   `-- index.html
|-- pwa-responsaveis/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- firebase.js
|   |   |-- sw.js
|   |   `-- pages/
|   `-- dist/
|-- nginx/
|-- ecosystem.config.js
|-- setup-oracle.sh
`-- deploy-oracle.sh
```

## PWA relevante

Arquivos principais do fluxo atual:

- `pwa-responsaveis/src/App.jsx`
- `pwa-responsaveis/src/pages/LandingPage.jsx`
- `pwa-responsaveis/src/pages/QRCodePage.jsx` — suporta `?modo=adicionar` para vincular novo filho
- `pwa-responsaveis/src/pages/StudentLoginPage.jsx`
- `pwa-responsaveis/src/pages/OnboardingPage.jsx`
- `pwa-responsaveis/src/pages/AvisosPage.jsx` — seletor de filho, vida escolar multi-filho
- `pwa-responsaveis/src/pages/SolicitacoesModal.jsx` — seletor de filho ao enviar
- `pwa-responsaveis/src/firebase.js`

O `userInfo` salvo em `localStorage` inclui:
```json
{
  "responsavel_nome": "...",
  "aluno_nome": "...",
  "turma_nome": "...",
  "turma_codigo": "...",
  "filhos": [
    { "aluno_id": 1, "aluno_nome": "...", "turma_nome": "...", "turma_codigo": "..." }
  ]
}
```

## Backend relevante

- `backend/src/routes/auth.js`
  - `POST /api/auth/login-turma` — autentica via QR + nome do aluno; retorna `filhos[]`
  - `GET /api/auth/sugestoes` — sugestoes de nome de aluno
  - `POST /api/auth/aceite-lgpd` — registra aceite LGPD
  - `POST /api/auth/register-fcm-token` — registra dispositivo push
  - `POST /api/auth/adicionar-filho` — vincula novo filho ao responsavel autenticado

- `backend/src/routes/avisos.js`
  - `GET /api/avisos` — avisos de todos os filhos do responsavel
  - `GET /api/avisos/resumo-aluno` — retorna **array** com vida escolar de cada filho

- `backend/src/routes/solicitacoes.js`
  - `POST /api/solicitacoes/enviar` — aceita `aluno_id` opcional no body (multi-filhos)

- `backend/src/routes/admin.js`
  - rotas do painel;
  - envio de avisos — usa `responsavel_alunos` para encontrar destinatarios;
  - listagem de alunos e dispositivos.

- `backend/src/services/fcm.js`
  - envio de push e limpeza de tokens invalidos.

## Banco de dados

Tabelas centrais:

- `admins`
- `turmas`
- `alunos`
- `responsaveis`
- `responsavel_alunos` — vinculo many-to-many entre responsavel e alunos (multiplos filhos)
- `responsavel_dispositivos`
- `avisos`
- `entregas`
- `solicitacoes_pais`
- `aluno_vida_escolar`

Pontos importantes:
- `turmas.qr_token` identifica a turma no fluxo do app.
- `responsaveis.aceite_lgpd` registra aceite no backend.
- `responsavel_dispositivos` guarda varios tokens FCM por responsavel.
- `responsavel_alunos` e a tabela chave para multiplos filhos; as queries de envio de aviso usam ela como fonte de destinatarios.
- `responsaveis.aluno_id` mantem o filho primario para compatibilidade com dados anteriores.

As migrations ficam em `backend/src/database.js`.

## Operacao

### Conectar na VPS

```powershell
ssh -i "C:\Users\55719\OneDrive\APP\ssh-key-2026-03-31.key" ubuntu@163.176.142.84
```

### Status e logs

```bash
pm2 status
pm2 logs recanto-backend
curl https://avisosrecanto.com.br/api/health
```

### Reiniciar backend

```bash
pm2 restart recanto-backend
```

### Build da PWA

```bash
cd /opt/recanto-avisos/pwa-responsaveis
npm run build
```

### Logs do Nginx

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Painel admin

Funcionalidades principais:

- dashboard com totais e uso do app;
- envio de avisos por escola, turma ou aluno;
- historico de avisos;
- cadastro e importacao de alunos;
- vida escolar;
- solicitacoes dos pais;
- gerenciamento de dispositivos vinculados ao aluno.

Responsividade:
- o painel admin agora funciona melhor em celular sem mudar a estrutura funcional;
- no mobile, a navegacao lateral abre por botao de menu no topo;
- grids, cards, modais e espacamentos se adaptam para telas menores;
- a logica, rotas e fluxos operacionais do admin foram preservados.

Detalhes do fluxo de aviso:
- a etapa 2 do envio virou `Como criar`;
- a secretaria escolhe entre modelo pronto e aviso em branco antes de preencher;
- os templates sao agrupados por categoria com icones.

## Observacoes de manutencao

- O workspace pode estar com alteracoes locais fora do escopo do ultimo deploy.
- O arquivo `admin-panel/index.html` concentra boa parte da UI admin.
- O `admin-panel/package.json` usa build compativel com Windows para gerar `dist/index.html` igual ao arquivo fonte.
- A PWA tem historico de problemas de encoding em textos; ao editar, valide sempre o build e a renderizacao final.
- Quando publicar `dist/`, ajuste ownership e permissoes para evitar `403` em `assets/` e `icons/`.
- Em especial, a pasta `pwa-responsaveis/dist/assets` precisa ficar com permissao de leitura/execucao para o Nginx; se ficar `700`, o app cai por `403` nos bundles.
