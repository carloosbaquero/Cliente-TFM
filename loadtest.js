import ws from 'k6/ws';
import { check } from 'k6';

// export const options = {
//   vus: 400,
//   duration: '15m',
// };

export const options = {
  stages: [
    { duration: '10m', target: 5000 }, // Sube hasta 5000 VUs en 10 minutos
    { duration: '20m', target: 5000 }, // Mantén 5000 VUs durante 20 minutos
    { duration: '5m', target: 0 },     // Baja a 0 VUs
  ],
};

export default function () {
  const url = 'wss://alb.biometric.internal';
  const params = {};

  let errorMsg = null;

  const res = ws.connect(url, params, function (socket) {
    socket.on('open', function () {
      for (let i = 0; i < 100; i++) {
        // Simula el batch como en index.js
        const batch = {
          id: i,
          patientId: 'p001',
          date: Date.now(),
          data: Array.from({ length: 12 }, () =>
            Array.from({ length: 200 }, () => Math.floor(Math.random() * 1000))
          ),
        };
        socket.send(JSON.stringify(batch));
      }
      socket.close();
    });
    socket.on('error', function (e) {
      errorMsg = e.error();
      console.log('WebSocket error:', errorMsg);
    });
  });

  check(res, { 'Conexión exitosa': (r) => r && r.status === 101 });

  if (errorMsg) {
    console.error('Último error de conexión:', errorMsg);
  }
}