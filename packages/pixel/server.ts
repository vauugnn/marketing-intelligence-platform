import express from 'express';
import path from 'path';
import cors from 'cors';

const app = express();
const PORT = process.env.PIXEL_PORT || 3002;

// Allow loading from any domain (tracking pixels need cross-origin)
app.use(cors({
  origin: '*',
  methods: ['GET', 'HEAD'],
  credentials: false
}));

// Cache control for pixel script (1 hour)
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=3600');
  next();
});

// Serve compiled pixel script
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'pixel' });
});

app.listen(PORT, () => {
  console.log(`📡 Pixel server running on http://localhost:${PORT}`);
});
