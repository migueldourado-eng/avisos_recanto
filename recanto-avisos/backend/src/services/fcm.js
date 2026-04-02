const admin = require('firebase-admin');
const { getDb } = require('../database');

let initialized = false;

const INVALID_TOKEN_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
  'messaging/invalid-argument',
]);

function init() {
  if (initialized) return;

  const { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;
  if (!FIREBASE_PROJECT_ID || !FIREBASE_PRIVATE_KEY || !FIREBASE_CLIENT_EMAIL) {
    console.warn('⚠️  Firebase não configurado. Push notifications desabilitadas.');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: FIREBASE_CLIENT_EMAIL,
    }),
  });

  initialized = true;
  console.log('🔔 Firebase FCM: OK');
}

/**
 * Envia push notification em lote.
 * @param {string[]} fcm_tokens - Array de tokens FCM
 * @param {string}   titulo     - Título base (sem prefixo)
 * @param {string}   mensagem   - Corpo da notificação
 * @param {boolean}  urgente    - Se true, usa prefixo e prioridade alta
 * @param {number}   aviso_id   - ID do aviso (incluído no data payload)
 * @returns {{ enviados: number, falhas: number, tokens_invalidos: string[], tokens_enviados: Set<string> }}
 */
async function enviarPush(fcm_tokens, titulo, mensagem, urgente, aviso_id) {
  const vazio = { enviados: 0, falhas: 0, tokens_invalidos: [], tokens_enviados: new Set() };
  if (!initialized || !fcm_tokens.length) return vazio;

  const tituloFinal = urgente
    ? `🚨 URGENTE — ${titulo}`
    : `📢 Escola Recanto — ${titulo}`;

  const message = {
    tokens: fcm_tokens,
    notification: {
      title: tituloFinal,
      body: mensagem,
    },
    data: {
      aviso_id: String(aviso_id),
      urgente: String(urgente),
      url: '/avisos',
    },
    android: {
      priority: urgente ? 'high' : 'normal',
      notification: {
        channel_id: urgente ? 'urgente' : 'avisos',
        sound: urgente ? 'alarme' : 'default',
      },
    },
    webpush: {
      headers: {
        Urgency: urgente ? 'high' : 'normal',
      },
      notification: {
        requireInteraction: urgente,
      },
    },
  };

  let batchResponse;
  try {
    batchResponse = await admin.messaging().sendEachForMulticast(message);
  } catch (err) {
    console.error('FCM sendEachForMulticast erro:', err.message);
    return vazio;
  }

  const tokens_invalidos = [];
  const tokens_enviados = new Set();
  let enviados = 0;
  let falhas = 0;

  batchResponse.responses.forEach((resp, i) => {
    if (resp.success) {
      enviados++;
      tokens_enviados.add(fcm_tokens[i]);
    } else {
      falhas++;
      const code = resp.error?.code;
      if (INVALID_TOKEN_CODES.has(code)) {
        tokens_invalidos.push(fcm_tokens[i]);
      }
    }
  });

  // Limpar tokens inválidos do banco
  if (tokens_invalidos.length > 0) {
    try {
      const db = getDb();
      const ph = tokens_invalidos.map(() => '?').join(',');
      db.prepare(`UPDATE responsaveis SET fcm_token = NULL WHERE fcm_token IN (${ph})`)
        .run(...tokens_invalidos);
      console.log(`🗑️  ${tokens_invalidos.length} token(s) FCM inválido(s) removido(s).`);
    } catch (err) {
      console.error('Erro ao remover tokens inválidos:', err.message);
    }
  }

  return { enviados, falhas, tokens_invalidos, tokens_enviados };
}

module.exports = { init, enviarPush };
