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
- O pedido de instalacao do atalho nao aparece mais na home nem no login; ele aparece depois do aceite.

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
- `pwa-responsaveis/src/pages/QRCodePage.jsx`
- `pwa-responsaveis/src/pages/StudentLoginPage.jsx`
- `pwa-responsaveis/src/pages/OnboardingPage.jsx`
- `pwa-responsaveis/src/pages/AvisosPage.jsx`
- `pwa-responsaveis/src/firebase.js`

## Backend relevante

- `backend/src/routes/auth.js`
  - `POST /api/auth/login-turma`
  - `GET /api/auth/sugestoes`
  - `POST /api/auth/aceite-lgpd`
  - `POST /api/auth/register-fcm-token`

- `backend/src/routes/admin.js`
  - rotas do painel;
  - envio de avisos;
  - listagem de alunos e dispositivos.

- `backend/src/services/fcm.js`
  - envio de push e limpeza de tokens invalidos.

## Banco de dados

Tabelas centrais:

- `admins`
- `turmas`
- `alunos`
- `responsaveis`
- `responsavel_dispositivos`
- `avisos`
- `entregas`

Pontos importantes:
- `turmas.qr_token` identifica a turma no fluxo do app.
- `responsaveis.aceite_lgpd` registra aceite no backend.
- `responsavel_dispositivos` guarda varios tokens FCM por responsavel.

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

## Observacoes de manutencao

- O workspace pode estar com alteracoes locais fora do escopo do ultimo deploy.
- O arquivo `admin-panel/index.html` concentra boa parte da UI admin.
- A PWA tem historico de problemas de encoding em textos; ao editar, valide sempre o build e a renderizacao final.
- Quando publicar `dist/`, ajuste ownership e permissoes para evitar `403` em `assets/` e `icons/`.
