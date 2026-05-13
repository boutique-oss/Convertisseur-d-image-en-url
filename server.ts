import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'public', 'compressed');
const PORT = 4001;

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();
app.use(cors());
app.use('/compressed', express.static(UPLOADS_DIR));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Fichier non supporté — image uniquement'));
  },
});

interface CompressOptions {
  maxWidthOrHeight?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
  lossless?: boolean;
}

async function compressImage(buffer: Buffer, opts: CompressOptions = {}): Promise<Buffer> {
  const {
    maxWidthOrHeight = 1920,
    quality = 80,
    format = 'webp',
    lossless = false,
  } = opts;

  let pipeline = sharp(buffer).rotate(); // auto-orient EXIF

  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (w > maxWidthOrHeight || h > maxWidthOrHeight) {
    pipeline = pipeline.resize(maxWidthOrHeight, maxWidthOrHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  if (format === 'webp') pipeline = pipeline.webp({ quality, lossless });
  else if (format === 'avif') pipeline = pipeline.avif({ quality, lossless });
  else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality, mozjpeg: true });
  else pipeline = pipeline.png({ compressionLevel: 9 });

  return pipeline.toBuffer();
}

app.post('/api/compress', upload.single('image'), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Aucun fichier reçu' });
    return;
  }

  const format = (['webp', 'avif', 'jpeg', 'png'].includes(req.body.format)
    ? req.body.format
    : 'webp') as CompressOptions['format'];

  const quality = Math.min(100, Math.max(1, parseInt(req.body.quality) || 80));
  const maxDim = Math.min(4096, Math.max(64, parseInt(req.body.maxDim) || 1920));

  try {
    const original = req.file.buffer;
    const compressed = await compressImage(original, { format, quality, maxWidthOrHeight: maxDim });

    const hash = crypto.createHash('sha1').update(compressed).digest('hex').slice(0, 12);
    const filename = `${hash}.${format}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    fs.writeFileSync(filepath, compressed);

    const originalKB = (original.byteLength / 1024).toFixed(1);
    const compressedKB = (compressed.byteLength / 1024).toFixed(1);
    const ratio = Math.round((1 - compressed.byteLength / original.byteLength) * 100);

    res.json({
      url: `http://localhost:${PORT}/compressed/${filename}`,
      filename,
      originalSize: original.byteLength,
      compressedSize: compressed.byteLength,
      originalKB,
      compressedKB,
      ratio,
      format,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.get('/api/files', (_req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => /\.(webp|avif|jpeg|png)$/.test(f))
    .map(f => ({
      name: f,
      url: `http://localhost:${PORT}/compressed/${f}`,
      size: fs.statSync(path.join(UPLOADS_DIR, f)).size,
    }))
    .sort((a, b) => b.size - a.size);
  res.json(files);
});

app.delete('/api/files/:name', (req, res) => {
  const safe = path.basename(req.params.name);
  const filepath = path.join(UPLOADS_DIR, safe);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
    res.json({ deleted: safe });
  } else {
    res.status(404).json({ error: 'Fichier introuvable' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Agent Compression — http://localhost:${PORT}`);
  console.log(`  POST /api/compress  — upload + compress (multipart/form-data, champ "image")`);
  console.log(`  GET  /api/files     — liste des fichiers compressés`);
  console.log(`  GET  /compressed/:name — servir le fichier`);
  console.log(`  DELETE /api/files/:name — supprimer\n`);
});
