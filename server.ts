import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import { generateVideoPlan } from './server/geminiHandler.ts';
import {
  generateVeoVideo,
  checkVeoStatus,
  downloadVeoVideo,
  generateLyriaMusic,
} from './server/veoLyriaHandler.ts';
import { generateSpeechPreview } from './server/ttsHandler.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
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
      res.status(500).json({ error: error.message || 'Generation failed' });
    }
  });

  // Veo 3 Video Generation Endpoints
  app.post('/api/veo/generate', async (req, res) => {
    try {
      const result = await generateVeoVideo(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('API Error in /api/veo/generate:', error);
      res.status(500).json({ error: error.message || 'Veo video generation failed' });
    }
  });

  app.post('/api/veo/status', async (req, res) => {
    try {
      const result = await checkVeoStatus(req.body.operationName);
      res.json(result);
    } catch (error: any) {
      console.error('API Error in /api/veo/status:', error);
      res.status(500).json({ error: error.message || 'Status check failed' });
    }
  });

  app.post('/api/veo/download', async (req, res) => {
    try {
      await downloadVeoVideo(req.body.operationName, res);
    } catch (error: any) {
      console.error('API Error in /api/veo/download:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Download failed' });
      }
    }
  });

  // Lyria AI Music Generation Endpoint
  app.post('/api/lyria/generate', async (req, res) => {
    try {
      const result = await generateLyriaMusic(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('API Error in /api/lyria/generate:', error);
      res.status(500).json({ error: error.message || 'Music generation failed' });
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

  // Frontend integration: Vite middleware in dev, static files in prod
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
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

  app.listen(port, '0.0.0.0', () => {
    console.log(`TubeCraft AI server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
