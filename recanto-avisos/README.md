# Recanto Avisos

Sistema de comunicação escolar da **Escola Recanto das Margaridas**. Permite que a equipe administrativa envie avisos push para os responsáveis dos alunos via PWA (Progressive Web App).

---

## ✅ Deploy Concluído

**Data do Deploy:** 31/03/2026

### Sistema em Produção

**URLs:**
- **PWA (Responsáveis):** https://avisosrecanto.com.br
- **Painel Admin:** https://avisosrecanto.com.br/admin
- **API:** https://avisosrecanto.com.br/api/

**SSL:** Certificado Let's Encrypt válido até 29/06/2026 (renovação automática configurada)

### Dados da VPS
| Item | Valor |
|------|-------|
| IP público | `163.176.142.84` |
| Usuário SSH | `ubuntu` |
| Chave SSH | `C:\Users\55719\OneDrive\APP\ssh-key-2026-03-31.key` |
| Domínio | `avisosrecanto.com.br` |
| DNS | Hostinger — registro A `@` apontando para `163.176.142.84` |

### Credenciais de Acesso

⚠️ **ATENÇÃO DE SEGURANÇA:** As credenciais padrão foram removidas deste documento por questões de segurança.

**Para acessar o sistema pela primeira vez:**
1. Entre em contato com o administrador do sistema que realizou o deploy
2. As credenciais foram definidas durante a instalação e devem ser mantidas em local seguro
3. **Após o primeiro acesso, altere IMEDIATAMENTE todas as senhas** via painel admin → seção "Usuários"

**Perfis disponíveis:**
- `gestao_escolar` - Master (acesso total)
- `coordenacao` - Coordenação (enviar avisos, relatórios)
- `secretaria` - Secretaria (importar CSV, gerenciar alunos)
- `administrativo` - Administrativo (enviar avisos)

**Política de senhas:**
- Mínimo 12 caracteres
- Incluir letras maiúsculas, minúsculas, números e símbolos
- Não reutilizar senhas anteriores
- Trocar senhas a cada 90 dias

### Deploy Realizado
- [x] Instância Oracle Cloud criada (VM.Standard.E2.1.Micro — Always Free)
- [x] Ubuntu 22.04 — sistema atualizado
- [x] Node.js v22.22.2 instalado
- [x] Portas 80 e 443 abertas no firewall (iptables)
- [x] DNS configurado na Hostinger
- [x] PM2 6.0.14 instalado e configurado
- [x] Nginx 1.18.0 instalado e configurado
- [x] Certbot 1.21.0 instalado
- [x] Código enviado para `/opt/recanto-avisos/`
- [x] Dependências instaladas (backend e PWA)
- [x] PWA compilada com `VITE_API_URL=https://avisosrecanto.com.br`
- [x] Arquivo `.env` de produção criado com JWT_SECRET seguro
- [x] Aplicação iniciada com PM2 (auto-start no boot configurado)
- [x] SSL/HTTPS configurado com Let's Encrypt
- [x] Sistema testado e funcionando

### Como Acessar o Servidor

No PowerShell ou terminal:
```powershell
ssh -i "C:\Users\55719\OneDrive\APP\ssh-key-2026-03-31.key" ubuntu@163.176.142.84
```

### Comandos Úteis de Manutenção

**Verificar status:**
```bash
pm2 status
pm2 logs recanto-avisos
curl https://avisosrecanto.com.br/api/health
```

**Reiniciar aplicação:**
```bash
pm2 restart recanto-avisos
```

**Atualizar código (após alterações locais):**
```bash
# Local - enviar arquivos alterados
scp -i "C:\Users\55719\OneDrive\APP\ssh-key-2026-03-31.key" -r backend/src ubuntu@163.176.142.84:/opt/recanto-avisos/backend/

# No servidor - reiniciar
pm2 restart recanto-avisos
```

**Rebuild da PWA (se necessário):**
```bash
cd /opt/recanto-avisos/pwa-responsaveis
VITE_API_URL=https://avisosrecanto.com.br npm run build
```

**Ver logs do Nginx:**
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

---

## Arquitetura Geral

```
recanto-avisos/
├── backend/              ← API Node.js/Express + SQLite
│   └── src/
│       ├── index.js           ← Servidor principal (portas, CORS, CSP, rotas)
│       ├── database.js        ← Conexão, migrations e seed do banco SQLite
│       ├── routes/
│       │   ├── admin.js       ← Todas as rotas do painel admin (/api/admin/*)
│       │   └── auth.js        ← Autenticação dos responsáveis (/api/auth/*)
│       ├── services/
│       │   └── fcm.js         ← Envio de push via Firebase Cloud Messaging
│       ├── middleware/
│       │   └── auth.js        ← Middlewares JWT (admin e responsável)
│       ├── data/
│       │   └── templates.js   ← 36 templates de aviso pré-definidos
│       └── scripts/
│           ├── check-admins.js    ← Diagnóstico: lista admins e testa hashes
│           └── reset-admins.js    ← Utilitário: redefine senhas dos admins
│
├── admin-panel/          ← Painel administrativo (HTML/JS vanilla, sem framework)
│   ├── index.html             ← Painel completo (uma única página)
│   └── teste-login.html       ← Página de debug do login
│
├── pwa-responsaveis/     ← PWA React + Vite (para os pais/responsáveis)
│   └── src/
│       ├── App.jsx            ← Roteamento principal
│       ├── pages/
│       │   ├── LoginPage.jsx      ← Tela de identificação via QR Code
│       │   ├── AvisosPage.jsx     ← Feed de avisos do responsável
│       │   └── ConsentePage.jsx   ← Aceite LGPD
│       ├── firebase.js        ← Configuração Firebase + registro FCM token
│       ├── firebase-config.js ← Chaves do projeto Firebase
│       └── sw.js              ← Service Worker (push notifications)
│
├── nginx/
│   ├── nginx.conf             ← Config Nginx para desenvolvimento local
│   └── nginx-oracle.conf      ← Config Nginx para Oracle Cloud (produção)
│
├── ecosystem.config.js   ← Configuração PM2 (produção)
├── setup-oracle.sh       ← Script de instalação inicial na Oracle Cloud
└── deploy-oracle.sh      ← Script de atualização após mudanças no código
```

**Stack:**
- Backend: Node.js v22+, Express, SQLite (`node:sqlite` nativo), JWT, bcrypt, Firebase Admin SDK
- PWA: React, Vite, TailwindCSS, Firebase (push notifications)
- Admin: HTML + Tailwind CDN (sem framework, servido em `/admin`)

---

## Banco de Dados

**SQLite** — arquivo em `data/recanto.db` (dev) ou `/opt/recanto-data/recanto.db` (produção).

| Tabela         | Descrição                                                                 |
|----------------|---------------------------------------------------------------------------|
| `admins`       | Usuários do painel admin (gestão, coordenação, secretaria, administrativo) |
| `turmas`       | Turmas da escola com QR token único por turma                             |
| `alunos`       | Alunos vinculados a turmas                                                |
| `responsaveis` | Responsáveis vinculados a alunos, com FCM token para push                |
| `avisos`       | Avisos enviados                                                           |
| `entregas`     | Registro de entrega e leitura de cada aviso por responsável              |

Migrations incrementais ficam em `backend/src/database.js` (linhas 102–109) — seguro rodar várias vezes.

---

## Perfis de Admin

| Usuário          | Senha padrão       | Perfil          | Acesso                              |
|------------------|--------------------|-----------------|-------------------------------------|
| `gestao_escolar` | `Recanto@82463179` | `master`        | Tudo, incluindo gerenciar admins     |
| `coordenacao`    | `Coord@967128`     | `coordenacao`   | Enviar avisos, ver relatórios        |
| `secretaria`     | `Secre@791364`     | `secretaria`    | Importar CSV, gerenciar alunos       |
| `administrativo` | `Admin@827139`     | `administrativo`| Enviar avisos                        |

> **Altere as senhas em produção** via painel admin → seção "Usuários" (apenas perfil master) ou via `PUT /api/admin/minha-senha`.

---

## Funcionalidades por Tela (Painel Admin)

O painel admin fica em `admin-panel/index.html` e é servido pelo backend em `/admin`.

### Dashboard
- Totais: alunos ativos, responsáveis cadastrados, com app instalado, sem app
- Avisos enviados hoje
- Tabela de adoção do app por turma

### Avisos — Enviar (3 etapas)

**Etapa 1 — Destinatários:**
- Toda a escola
- Turmas específicas (seleção múltipla com checkboxes)
- Alunos específicos (busca por nome)

**Etapa 2 — Escolher template:**
- Templates agrupados por categoria (carregados de `/api/admin/templates?agrupado=1`)
- "Criar novo aviso" — campo livre com opção de salvar como template pessoal (salvo em `localStorage`)
- "Meus templates" — templates salvos localmente pelo usuário

**Etapa 3 — Revisar e enviar:**
- Placeholders preenchidos automaticamente quando possível:
  - `[TURMA]` → nome da turma selecionada (ou "de sua turma" se for para todos)
  - `[NOME DO ALUNO]` → nome do aluno (ou "seu(sua) filho(a)" se for para todos)
- Preview da mensagem final
- Campo "Enviado por" (obrigatório)
- Botão "Enviar"

### Avisos — Histórico
- Lista todos os avisos com status (push enviados, abertos)
- Exportar CSV → arquivo com BOM UTF-8, compatível com Excel (`;` como separador)
- Excluir aviso individual ou limpar todo o histórico

### Turmas
- Lista de turmas com contador de alunos e taxa de adoção do app
- Gerar QR Code para cada turma (link para imprimir e distribuir)

### Alunos
- Listagem com filtro por turma e busca por nome
- **Adicionar aluno** — modal com campos: Nome*, Turma*, Matrícula, Nome do Responsável*, Telefone
  - O responsável é **obrigatório** ao adicionar manualmente
  - Após salvar, o responsável pode escanear o QR da turma para ativar o app
- **Excluir aluno** — remove o aluno, o responsável e todas as entregas (em transação)

### Importar CSV
- Formato esperado: exportação do **Google Contatos**
- Campos usados: `First Name`, `Middle Name`, `Last Name`, `Labels`, `Phone 1 - Value`
- Código da turma extraído do campo `Labels` (padrão: `CODIGO_2026`, ex: `1A_2026`, `G5B_2026`)
- Exibe relatório: vinculados, alunos criados, sem turma, não vinculados

### Responsáveis
- Lista todos os responsáveis com aluno, turma, telefone e status do app

### Usuários *(apenas perfil master)*
- Lista admins cadastrados
- Alterar senha de qualquer admin

---

## Fluxo QR Code (Responsáveis)

1. Secretaria imprime o QR Code de cada turma (gerado em **Turmas → QR Code**)
2. Responsável escaneia o QR com o celular → abre a PWA (`https://DOMINIO/?turma=TOKEN`)
3. Responsável digita o nome do aluno → sistema faz match (exato ou parcial)
4. Aceite LGPD obrigatório no primeiro acesso
5. PWA solicita permissão para notificações push → registra FCM token
6. Responsável recebe avisos como notificação push mesmo com o celular bloqueado

**Rotas envolvidas:**
- `POST /api/auth/login-turma` — identifica responsável pelo QR token + nome do aluno
- `GET /api/auth/sugestoes` — autocomplete do nome do aluno
- `POST /api/auth/aceite-lgpd` — grava aceite
- `POST /api/auth/register-fcm-token` — salva token FCM

---

## Templates Pré-definidos

Total: **36 templates** em 8 categorias (`backend/src/data/templates.js`).

| Categoria      | Templates                                                                                                                                                                              |
|----------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Aulas          | Não haverá aula, Antecipação do término, Buscar criança mais cedo, Fechamento emergencial, Suspensão por chuva, Atividade diferenciada, Início do período letivo, Recesso e retorno, Dia de avaliação |
| Infraestrutura | Falta de água, Falta de energia, Obras ou manutenção                                                                                                                                   |
| Frequência     | Criança não veio à escola, Aviso de faltas                                                                                                                                             |
| Saúde          | Machucado sem gravidade, Machucado — ligue urgente, Ligue urgente, Alerta de saúde na turma, Pediculose, Vacinação, Criança com febre — buscar, Criança não se alimentou hoje          |
| Comportamento  | Precisamos conversar, Elogio — bom comportamento                                                                                                                                       |
| Reuniões       | Reunião de pais, Solicitação de reunião com família                                                                                                                                    |
| Administrativo | Documentação pendente, Retirada de material, Entrega de boletim, Material escolar, Foto escolar, Passeio escolar                                                                       |
| Uniforme       | Lembrete de uniforme, Criança sem uniforme                                                                                                                                             |
| Merenda        | Cardápio especial, Sem merenda hoje                                                                                                                                                    |

**Placeholders disponíveis:** `[TURMA]`, `[NOME DO ALUNO]`, `[DATA]`, `[DATA INÍCIO]`, `[DATA FIM]`, `[DATA RETORNO]`, `[DATA LIMITE]`, `[HORÁRIO]`, `[HORÁRIO INÍCIO]`, `[HORÁRIO FIM]`, `[MOTIVO]`, `[DESCRIÇÃO]`, `[TELEFONE]`, `[NÚMERO]`, `[MÊS]`

---

## API — Endpoints Principais

### Auth (responsáveis)
| Método | Rota                           | Descrição                          |
|--------|--------------------------------|------------------------------------|
| POST   | `/api/auth/login-turma`        | Login via QR token + nome do aluno |
| GET    | `/api/auth/sugestoes`          | Autocomplete de nome de aluno      |
| POST   | `/api/auth/aceite-lgpd`        | Gravar aceite LGPD                 |
| POST   | `/api/auth/register-fcm-token` | Registrar token push               |

### Admin (requer JWT de admin)
| Método | Rota                             | Descrição                                        |
|--------|----------------------------------|--------------------------------------------------|
| POST   | `/api/admin/login`               | Login do admin                                   |
| GET    | `/api/admin/stats`               | Dashboard de totais                              |
| GET    | `/api/admin/turmas`              | Lista turmas                                     |
| GET    | `/api/admin/turmas/:id/qrcode`   | URL do QR Code da turma                          |
| GET    | `/api/admin/alunos`              | Lista alunos (filtros: `turma_id`, `busca`)      |
| POST   | `/api/admin/alunos`              | Adicionar aluno                                  |
| PUT    | `/api/admin/alunos/:id`          | Editar aluno                                     |
| DELETE | `/api/admin/alunos/:id`          | Excluir aluno + responsável + entregas           |
| GET    | `/api/admin/responsaveis`        | Lista responsáveis                               |
| POST   | `/api/admin/vincular-manual`     | Vincular responsável a aluno manualmente         |
| GET    | `/api/admin/templates`           | Templates (`?agrupado=1` para agrupar)           |
| POST   | `/api/admin/avisos`              | Enviar aviso                                     |
| GET    | `/api/admin/avisos`              | Histórico de avisos                              |
| GET    | `/api/admin/avisos/:id/entregas` | Detalhes de entrega de um aviso                  |
| DELETE | `/api/admin/avisos/:id`          | Excluir aviso                                    |
| GET    | `/api/admin/avisos/exportar`     | Exportar CSV do histórico                        |
| POST   | `/api/admin/importar-csv`        | Importar alunos via CSV (Google Contatos)        |
| GET    | `/api/admin/admins`              | Lista admins *(apenas master)*                   |
| PUT    | `/api/admin/admins/:id/senha`    | Alterar senha de admin *(apenas master)*         |
| PUT    | `/api/admin/minha-senha`         | Alterar própria senha                            |

---

## Variáveis de Ambiente

Arquivo `backend/.env`:

```env
NODE_ENV=production
PORT=3001
JWT_SECRET=<string_aleatoria_minimo_32_caracteres>

# Admin master (seed inicial)
ADMIN_USUARIO=gestao_escolar
ADMIN_SENHA=Recanto@82463179

# CORS
ALLOWED_ORIGINS=https://SEU_DOMINIO

# Banco SQLite (produção)
DB_PATH=/opt/recanto-data/recanto.db

# Firebase — caminho para o serviceAccountKey.json
GOOGLE_APPLICATION_CREDENTIALS=/opt/recanto-avisos/backend/serviceAccountKey.json

# Domínio (usado para gerar URL dos QR Codes)
DOMAIN=SEU_DOMINIO
```

Arquivo `pwa-responsaveis/.env` (ou `.env.local`):

```env
VITE_API_URL=https://SEU_DOMINIO
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

---

## Rodando Localmente

### Pré-requisito
**Node.js v22+** obrigatório (usa `node:sqlite` nativo do Node).

### Backend
```bash
cd backend
# Crie o .env com JWT_SECRET de pelo menos 32 caracteres
npm install
node src/index.js
```
- Backend: `http://localhost:3001`
- Painel admin: `http://localhost:3001/admin`

### PWA (responsáveis)
```bash
cd pwa-responsaveis
npm install
VITE_API_URL=http://localhost:3001 npm run dev
```
- PWA: `http://localhost:5173`

---

## Deploy — Oracle Cloud Free Tier

### Instalação inicial (uma única vez)
```bash
# Execute na máquina local, de dentro da pasta recanto-avisos/
sudo bash setup-oracle.sh avisos.suaescola.com.br admin@suaescola.com.br
```

O script (`setup-oracle.sh`) faz automaticamente:
1. Instala Node.js 22 via NodeSource, PM2, Nginx, Certbot
2. Abre portas 80 e 443 no iptables
3. Copia o código, instala dependências, compila a PWA
4. Cria `.env` com `JWT_SECRET` aleatório
5. Configura Nginx como proxy reverso
6. Obtém certificado SSL via Let's Encrypt
7. Inicia backend com PM2 e configura renovação automática do SSL

**Após o setup:**
1. Edite `/opt/recanto-avisos/backend/.env` com as credenciais definitivas
2. Copie o `serviceAccountKey.json` do Firebase para `/opt/recanto-avisos/backend/`
3. Execute `pm2 restart recanto-avisos`

### Atualização de código
```bash
# Apenas backend e admin-panel:
bash deploy-oracle.sh

# Backend + rebuild da PWA:
bash deploy-oracle.sh --pwa
```

### Comandos úteis na VPS
```bash
pm2 status                     # status do processo
pm2 logs recanto-avisos        # logs em tempo real
pm2 restart recanto-avisos     # reiniciar
cat /var/log/recanto/error.log # logs de erro
```

---

## Firebase (Push Notifications)

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative o **Firebase Cloud Messaging**
3. Baixe o `serviceAccountKey.json` (Configurações → Contas de serviço → Gerar nova chave privada)
4. Coloque o arquivo em `backend/serviceAccountKey.json` (dev) ou `/opt/recanto-avisos/backend/serviceAccountKey.json` (produção)
5. Configure `GOOGLE_APPLICATION_CREDENTIALS` no `.env` apontando para o arquivo
6. Atualize as chaves em `pwa-responsaveis/src/firebase-config.js` com as configurações do seu app web Firebase

---

## Segurança

- Senhas armazenadas com **bcrypt** (12 rounds)
- Autenticação via **JWT** (8h para admins, 30 dias para responsáveis)
- Rate limiting: 10 tentativas de login/hora, 10 avisos/minuto, 100 req/15min globais
- Content Security Policy via Helmet:
  - Rotas `/admin*`: CSP relaxado (permite CDNs: Tailwind, FontAwesome, Google Fonts; inline scripts)
  - Demais rotas: CSP estrito
- CORS configurável via `ALLOWED_ORIGINS`
- Upload de CSV limitado a 5 MB

---

## Solução de Problemas

### Login no painel admin não funciona
- Verifique se `JWT_SECRET` tem pelo menos 32 caracteres no `.env`
- Acesse `/admin/teste` para testar a rota de login isoladamente
- Veja os logs: `pm2 logs recanto-avisos`
- Execute `node backend/src/scripts/check-admins.js` para verificar os registros no banco

### Push não chega nos responsáveis
- Verifique se `serviceAccountKey.json` está no lugar correto
- Verifique se `GOOGLE_APPLICATION_CREDENTIALS` está definido no `.env`
- Responsáveis sem `fcm_token` no banco não recebem push (precisam abrir o app e aceitar notificações)

### Importação de CSV com erros
- O formato esperado é o da exportação do **Google Contatos**
- O campo `Labels` deve conter o código da turma no padrão `CODIGO_2026` (ex: `1A_2026`, `G5B_2026`)
- Itens na lista "sem turma" precisam ser vinculados manualmente em **Alunos**

### Aluno adicionado manualmente — QR Code funciona?
Sim. Após adicionar o aluno com o responsável vinculado, o responsável escaneia o QR Code da turma e digita o nome do aluno. O sistema encontra o aluno e vincula o responsável existente ao acesso via app.

### Backup do banco de dados
```bash
# Copiar localmente
cp /opt/recanto-data/recanto.db /opt/recanto-data/recanto-$(date +%Y%m%d).db

# Baixar para a máquina local
scp usuario@IP_VPS:/opt/recanto-data/recanto.db ./backups/

# Cron para backup diário às 3h
(crontab -l; echo "0 3 * * * cp /opt/recanto-data/recanto.db /opt/recanto-data/recanto-\$(date +\%Y\%m\%d).db") | crontab -
```
