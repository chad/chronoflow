import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { patchRoutes } from './routes/patches.js';
import { likeRoutes } from './routes/likes.js';

const app = new Hono();

app.use('*', cors({
  origin: ['https://mosh.miren.club', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  allowMethods: ['GET', 'POST', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.route('/', patchRoutes);
app.route('/', likeRoutes);

app.get('/health', (c) => c.json({ ok: true }));

const port = parseInt(process.env.PORT || '3001', 10);
console.log(`[mosh-api] listening on port ${port}`);
serve({ fetch: app.fetch, port });
