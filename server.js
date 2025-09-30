const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients: sessionId -> WebSocket
const clients = new Map();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Health check
app.get('/', (req, res) => {
  res.send('SecureChat Backend - E2EE Relay\n');
});

// WebSocket relay
wss.on('connection', (ws) => {
  let mySessionId = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'register') {
        mySessionId = msg.sessionId;
        clients.set(mySessionId, ws);
      }
      else if (msg.type === 'chat' || msg.type === 'file_start' || msg.type === 'file_chunk') {
        const recipientWs = clients.get(msg.to);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(data); // Relay raw message
        }
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  ws.on('close', () => {
    if (mySessionId) {
      clients.delete(mySessionId);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SecureChat backend running on port ${PORT}`);
});
