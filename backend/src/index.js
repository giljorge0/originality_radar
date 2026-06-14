// backend/src/index.js — V2: WebSocket multiplayer + domain filtering
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { scanIdea, getMap, getStats } from './api/ideas.js';
import { setBroadcaster } from './services/broadcast.js';

dotenv.config();

const app = express();
const server = createServer(app); // shared HTTP+WS server
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── WebSocket Server ────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log(`WS client connected (${wss.clients.size} total)`);
  ws.on('close', () => console.log(`WS client left (${wss.clients.size} remain)`));
  ws.on('error', (err) => console.error('WS error:', err.message));
});

// Give the broadcast function to the ideas API so it can push new ideas
setBroadcaster((payload) => {
  const msg = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
});

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10kb' }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', clients: wss.clients.size, timestamp: new Date().toISOString() }));

app.post('/api/ideas/scan', scanIdea);
app.get('/api/ideas/map', getMap);
app.get('/api/ideas/stats', getStats);

// ── 404 / Error ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

server.listen(PORT, () =>
  console.log(`✓ Originality Radar V2 on http://localhost:${PORT} (WS on /ws)`));
