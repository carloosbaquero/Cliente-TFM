const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const db = require('./db.js');

const envFile = process.env.NODE_ENV === 'TEST' 
  ? '.env.test' 
  : '.env.development';
require('dotenv').config({path: envFile});

let ws;
let reconnectAttempts = 0;
const BACKOFF_TIME = 1000;
let dataIntervalId;
let sendIntervalId;
// const MAX_RETRIES = 10;  // Número máximo de reintentos

function stopWebSocket() {
  if (ws) {
    ws.close();
    ws = null;
  }
}

// Función para conectar al WebSocket con backoff exponencial
function connectWebSocket() {
  ws = new WebSocket(process.env.WS);

  ws.on('open', () => {
    console.log('[WS] Conectado al backend');
    reconnectAttempts = 0;  // Reseteamos los intentos de reconexión
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.confirmedId) {
      markAsConfirmed(msg.confirmedId);
      console.log(`[✓] Confirmado batch ${msg.confirmedId}`);
    }
  });

  ws.on('close', () => {
    if (process.env.TEST !== 'true') {
      console.log('[WS] Conexión cerrada. Reintentando...');
      reconnectWithBackoff();
    }
  });

  ws.on('error', (err) => {
    // console.error('[WS] Error:', err.message);
    // reconnectWithBackoff();
  });
}

// Backoff exponencial para reconexión
function reconnectWithBackoff() {
  // if (reconnectAttempts >= MAX_RETRIES) {
  //   console.error('[WS] Excedido el número máximo de reintentos');
  //   return;
  // }

  // const backoffTime = Math.pow(2, reconnectAttempts) * BACKOFF_TIME;
  reconnectAttempts++;
  console.log(`[WS] Reintentando conexión por ${reconnectAttempts} vez en ${BACKOFF_TIME / 1000} segundos...`);
  setTimeout(connectWebSocket, BACKOFF_TIME);
}

// Simulación: genera un lote con 12 arrays de 200 números
function generateDataBatch() {
  const data = Array.from({ length: 12 }, () =>
    Array.from({ length: 200 }, () => Math.floor(Math.random() * 1000))
  );

  return {
    id: uuidv4(),
    patientId: 'p001',
    timestamp: Date.now(),
    data
  };
}

// Guarda lote en la cola
function enqueue(batch) {
  const stmt = db.prepare('INSERT INTO queue (id, patientId, timestamp, data) VALUES (?, ?, ?, ?)');
  stmt.run(batch.id, batch.patientId, batch.timestamp, JSON.stringify(batch.data));
}

// Obtiene el siguiente lote pendiente
function getNextPending() {
  return db.prepare('SELECT * FROM queue ORDER BY timestamp DESC LIMIT 1').get();
}

// Marca un lote como confirmado
function markAsConfirmed(id) {
  db.prepare('DELETE FROM queue WHERE id = ?').run(id);
}

function trySendNext() {
  const batch = getNextPending();

  if (!batch || ws?.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    id: batch.id,
    patientId: batch.patientId,
    date: batch.timestamp,
    data: JSON.parse(batch.data)
  }));

  console.log(`[→] Enviado batch ${batch.id}`);
}

function start() {
  connectWebSocket();

  dataIntervalId = setInterval(() => {
    const batch = generateDataBatch();
    enqueue(batch);
    console.log(`[+] Nuevo batch ${batch.id} en cola`);
  }, 1000);

  sendIntervalId = setInterval(() => {
    trySendNext();
  }, 500);
}

function stop() {
  clearInterval(dataIntervalId);
  clearInterval(sendIntervalId);
  stopWebSocket();
}

module.exports = {
  generateDataBatch,
  enqueue,
  markAsConfirmed,
  getNextPending,
  start,
  stop
};