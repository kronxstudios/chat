const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const storage = require('./storage');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store connected clients: sessionId -> WebSocket
const clients = new Map();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Serve static files (optional)
app.use(express.static('../'));

// File upload
const upload = multer({ storage: multer.memoryStorage() });
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const fileId = `${uuidv4()}.enc`;
    await storage.uploadFile(req.file.buffer, fileId);
    res.json({ fileId });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// File download
app.get('/files/:fileId', async (req, res) => {
  try {
    const data = await storage.getFile(req.params.fileId);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment');
    res.send(data);
  } catch (err) {
    res.status(404).send('File not found');
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('SecureChat Backend - E2EE Relay\n');
});

// WebSocket
wss.on('connection', (ws) => {
  let mySessionId = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.type === 'register') {
        mySessionId = msg.sessionId;
        clients.set(mySessionId, ws);
        console.log(`Registered: ${mySessionId}`);
      }
      else if (msg.type === 'chat') {
        const recipientWs = clients.get(msg.to);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(JSON.stringify({
            type: 'chat',
            ciphertext: msg.ciphertext,
            nonce: msg.nonce
          }));
        } else {
          console.log(`Recipient ${msg.to} not connected`);
        }
      }
    } catch (err) {
      console.error('Message error:', err);
    }
  });

  ws.on('close', () => {
    if (mySessionId) {
      clients.delete(mySessionId);
      console.log(`Disconnected: ${mySessionId}`);
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SecureChat backend running on port ${PORT}`);
});
