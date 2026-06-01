const io = require('socket.io-client');
const url = 'http://localhost:5000';
const socket = io(url, { transports: ['websocket', 'polling'] });

socket.on('connect', () => {
  console.log('connected');
  socket.emit('join-room', { room: 'admin' });
  setTimeout(() => {
    fetch('http://localhost:5000/api/attendance/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        descriptor: Array(128).fill(0),
        deviceId: 'MAIN_ENTRANCE',
        timestamp: new Date().toISOString(),
        confidence: 0.5,
        imageBase64: null
      })
    })
      .then((r) => r.json())
      .then((d) => console.log('POST', d))
      .catch((e) => console.error('POST err', e));
  }, 1000);
});

socket.on('attendance-update', (d) => {
  console.log('attendance-update', d);
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (e) => console.error('socket err', e.message));
setTimeout(() => {
  console.error('timeout');
  process.exit(1);
}, 10000);
