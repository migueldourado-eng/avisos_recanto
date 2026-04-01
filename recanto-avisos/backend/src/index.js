require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connect, migrate, seed } = require('./database');
const { init: initFcm } = require('./services/fcm');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const avisosRoutes = require('./routes/avisos');

const app = express();
const PORT = process.env.PORT || 3001;

// Confiar no proxy reverso (Nginx)
app.set('trust proxy', true);

// CSP padrão para as rotas da API
app.use((req, res, next) => {
  // Painel admin usa CDNs externas — CSP relaxado só para /admin
  if (req.path.startsWith('/admin')) {
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.tailwindcss.com',
            'https://cdnjs.cloudflare.com',
            'https://fonts.googleapis.com',
          ],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
    })(req, res, next);
  } else {
    // CSP estrito para API e PWA
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'https://fcm.googleapis.com'],
        },
      },
    })(req, res, next);
  }
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3001'];

app.use(cors({
  origin: (origin, cb) => {
    // Permite ausência de origin (mobile nativo, Postman, curl)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origem não permitida pelo CORS'));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting global: 100 req / 15 min por IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
}));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/avisos', avisosRoutes);

app.get('/health',     (req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Painel admin servido diretamente pelo backend (evita problemas de CORS com file://)
const adminPanelPath = path.join(__dirname, '../../admin-panel/index.html');
app.get('/admin', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.sendFile(adminPanelPath);
});
app.get('/admin/teste', (req, res) => {
  res.sendFile(path.join(__dirname, '../../admin-panel/teste-login.html'));
});

// Handler global de erros
app.use((err, req, res, next) => {
  console.error('❌ Erro na rota:', err.message);
  console.error(err.stack);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(500).json({ error: isProd ? 'Erro interno no servidor.' : err.message });
});

async function start() {
  try {
    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32) {
      console.error('❌ JWT_SECRET ausente ou fraco (mínimo 32 caracteres). Defina no .env antes de iniciar.');
      process.exit(1);
    }

    connect();
    migrate();
    await seed();
    initFcm();

    app.listen(PORT, () => {
      console.log(`✅ Recanto Avisos rodando na porta ${PORT}`);
      console.log(`📚 Banco de dados: OK`);
      console.log(`👤 Admin: ${process.env.ADMIN_EMAIL || 'diretor@recantodasmargaridas.edu.br'}`);
    });
  } catch (err) {
    console.error('Erro ao iniciar:', err);
    process.exit(1);
  }
}

start();
