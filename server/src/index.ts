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
  extractAndCleanDocumentText,
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
  statusCode: 429,
  message: { error: 'System is busy, please try again in a moment.' },
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

// Fast Preview Extraction Endpoint (Unified single parsing pipeline for preview and chat)
app.post('/api/extract-preview', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      const text = (req.body.text || '').trim();
      res.json({ text });
      return;
    }
    const fileBuffer = req.file.buffer;
    const mimeType = req.file.mimetype || '';
    const originalName = req.file.originalname || '';

    try {
      const extracted = extractAndCleanDocumentText(fileBuffer, mimeType, originalName);
      res.json({ text: extracted });
    } catch (err: any) {
      res.json({
        text: '',
        error: err.message || "I couldn't read this document's text — try re-uploading, or use a clearer photo/scan",
      });
    }
  } catch (err: any) {
    res.json({
      text: '',
      error: err.message || "I couldn't read this document's text — try re-uploading, or use a clearer photo/scan",
    });
  }
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

      documentText = extractAndCleanDocumentText(fileBuffer, mimeType, originalName);
    }

    if (!documentText || documentText.trim().length < 10) {
      res.status(400).json({ error: 'Document content or file is required.' });
      return;
    }

    const result = await analyzeDocumentText(documentText, req.body.categoryHint, req.body.language || 'en');
    res.json(result);
  } catch (err: any) {
    const errMsg = err.message || '';
    const isRateLimit = errMsg.includes('429') || errMsg.includes('Too many') || errMsg.includes('quota') || errMsg.includes('busy');
    res.status(isRateLimit ? 429 : 400).json({
      error: isRateLimit ? 'System is busy, please try again in a moment.' : errMsg || 'Failed to analyze document.',
    });
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
    const errMsg = err.message || '';
    const isRateLimit = errMsg.includes('429') || errMsg.includes('Too many') || errMsg.includes('quota') || errMsg.includes('busy');
    res.status(isRateLimit ? 429 : 500).json({
      error: isRateLimit ? 'System is busy, please try again in a moment.' : errMsg || 'Failed to compare documents.',
    });
  }
});

// Grounded Chat Endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { document, question, history, inputContext, language } = req.body;
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }
    const responseMsg = await answerDocumentQuestion(
      document || null,
      question,
      history || [],
      inputContext || null,
      language
    );
    res.json(responseMsg);
  } catch (err: any) {
    const errMsg = err.message || '';
    const isRateLimit = errMsg.includes('429') || errMsg.includes('Too many') || errMsg.includes('quota') || errMsg.includes('busy');
    res.status(isRateLimit ? 429 : 500).json({
      error: isRateLimit ? 'System is busy, please try again in a moment.' : errMsg || 'Failed to process chat query.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`⚡ LegalLens Backend running on http://localhost:${PORT}`);
});
