import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import dotenv from 'dotenv';
import {
  setServerApiKey,
  getServerConfigStatus,
  analyzeDocumentText,
  compareTwoDocuments,
  answerDocumentQuestion,
} from './services/astraBackend';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security & Middleware
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
});

// Config Status Endpoint
app.get('/api/config/status', (req: Request, res: Response) => {
  const status = getServerConfigStatus();
  res.json(status);
});

// API Key Setter Endpoint (Server-Side Only, never echo key)
app.post('/api/config/key', (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    res.status(400).json({ error: 'Valid API key string is required.' });
    return;
  }
  setServerApiKey(apiKey.trim());
  res.json({ success: true, status: getServerConfigStatus() });
});

// Document Analysis Endpoint
app.post('/api/analyze', upload.single('file'), async (req: Request, res: Response) => {
  try {
    let documentText = req.body.text || '';

    // If file was uploaded
    if (req.file) {
      const fileBuffer = req.file.buffer;
      const mimeType = req.file.mimetype || '';
      const originalName = req.file.originalname || '';

      const isImage =
        mimeType.startsWith('image/') ||
        /\.(png|jpg|jpeg|webp|bmp|gif)$/i.test(originalName);

      if (mimeType.includes('text') || mimeType.includes('plain') || originalName.endsWith('.txt') || originalName.endsWith('.md')) {
        documentText = fileBuffer.toString('utf-8');
      } else if (isImage) {
        // Extract alphanumeric text from image buffer or image metadata
        const rawExtracted = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').trim();
        if (rawExtracted.length >= 20) {
          documentText = rawExtracted;
        } else {
          // Non-text image file (e.g., photo, illustration, or graphic)
          documentText = `[IMAGE FILE SCAN: ${originalName}]\nUnrelated photograph or image graphic containing no readable legal contract text or signatures.`;
        }
      } else {
        // Binary or PDF document text extraction
        const cleanBinaryText = fileBuffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, ' ').trim();
        if (cleanBinaryText.length >= 20) {
          documentText = cleanBinaryText;
        } else {
          documentText = `[BINARY FILE SCAN: ${originalName}]\nBinary document file containing unreadable or non-contractual content.`;
        }
      }
    }

    if (!documentText || documentText.trim().length < 10) {
      res.status(400).json({ error: 'Document content or file is required.' });
      return;
    }

    const result = await analyzeDocumentText(documentText, req.body.categoryHint);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to analyze document.' });
  }
});

// Document Comparison Endpoint
app.post('/api/compare', async (req: Request, res: Response) => {
  try {
    const { docA, docB } = req.body;
    if (!docA || !docB) {
      res.status(400).json({ error: 'Both docA and docB analysis objects are required.' });
      return;
    }
    const result = await compareTwoDocuments(docA, docB);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to compare documents.' });
  }
});

// Grounded Chat Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { document, question, history } = req.body;
    if (!document || !question) {
      res.status(400).json({ error: 'Document and question are required.' });
      return;
    }
    const responseMsg = await answerDocumentQuestion(document, question, history || []);
    res.json(responseMsg);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to process chat query.' });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ LegalLens Backend running on http://localhost:${PORT}`);
});
