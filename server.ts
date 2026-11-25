import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { generateVideoPlan } from './server/geminiHandler.ts';
import { generateSpeechPreview } from './server/ttsHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Support JSON and large image uploads (for Veo image-to-video)
  app.use(express.json({ limit: '60mb' }));
  app.use(express.urlencoded({ extended: true, limit: '60mb' }));

  // API Endpoints
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  app.post('/api/generate-plan', async (req, res) => {
    try {
      const result = await generateVideoPlan(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('API Error in /api/generate-plan:', error);
      const status =
        typeof error?.status === 'number' && error.status >= 400 && error.status < 600
          ? error.status
          : 500;
      res.status(status).json({ error: error.message || 'Generation failed' });
    }
  });

  // Text-to-Speech Preview Endpoint
  app.post('/api/tts', async (req, res) => {
    try {
      const result = await generateSpeechPreview(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('API Error in /api/tts:', error);
      const status =
        typeof error?.status === 'number' && error.status >= 400 && error.status < 600
          ? error.status
          : 500;
      res.status(status).json({ error: error.message || 'Text-to-Speech generation failed' });
    }
  });

  // Never let /api/* requests fall through to Vite SPA HTML fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
  });

  // JSON error handler for Express middleware errors (e.g. malformed JSON / payload limit)
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status =
      typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(status).json({ error: err?.message || 'Internal API error' });
  });

  // Frontend integration: Vite middleware in dev, static files in prod
  if (!isProd) {
    const hmrEnabled = process.env.DISABLE_HMR !== 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: {
          server: httpServer,
        },
        hmr: hmrEnabled,
        watch: hmrEnabled ? {} : null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`TubeCraft AI server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
