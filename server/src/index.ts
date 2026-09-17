import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  setServerApiKey,
  getServerConfigStatus,
  analyzeDocumentText,
  synthesizeDocumentAnalysis,
  compareTwoDocuments,
  answerDocumentQuestion,
  extractAndCleanDocumentText,
  extractAndCleanDocumentTextAsync,
  runGuard1InputGate,
  runGuard1InputGateAsync,
  chunkDocumentTextIntoClauses,
  chunkDocumentTextIntoClausesAsync,
  applyRiskTaggingAndGrounding,
  applyRiskTaggingAndGroundingAsync,
} from './services/astraBackend';

dotenv.config({ path: path.join(process.cwd(), 'server/.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Top-level Request Logger
app.use((req: Request, res: Response, next: any) => {
  console.log(`\n📥 [HTTP ${req.method}] ${req.url} (Content-Type: ${req.headers['content-type'] || 'none'})`);
  next();
});

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
app.post('/api/extract-preview', upload.single('file'), async (req: Request, res: Response) => {
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
      const extracted = await extractAndCleanDocumentTextAsync(fileBuffer, mimeType, originalName);
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

// Document Analysis Endpoint with Real-Time SSE Progress Streaming
app.post('/api/analyze', (req: Request, res: Response, next: any) => {
  if (req.headers['content-type']?.includes('multipart/form-data')) {
    upload.any()(req, res, (err) => {
      if (err) {
        console.warn('Multer upload parse error:', err);
      }
      if (Array.isArray(req.files) && req.files.length > 0) {
        (req as any).file = req.files[0];
      }
      next();
    });
  } else {
    next();
  }
}, async (req: Request, res: Response) => {
  const wantsStream = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  if (wantsStream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const serverAbortController = new AbortController();
    let isClientCancelled = false;

    const handleClientDisconnect = () => {
      if (!res.writableEnded) {
        console.log('⚡ [CLIENT DISCONNECT] SSE connection closed by client mid-flight. Aborting pipeline.');
        isClientCancelled = true;
        if (!serverAbortController.signal.aborted) {
          serverAbortController.abort();
        }
      }
    };

    res.on('close', handleClientDisconnect);
    req.on('aborted', handleClientDisconnect);

    const checkAborted = (): boolean => {
      return isClientCancelled || serverAbortController.signal.aborted || res.writableEnded;
    };

    const sendEvent = async (event: string, data: any) => {
      if (checkAborted()) return;
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      } catch (err) {
        console.warn('Failed to write SSE event (client disconnected):', err);
      }
    };

    try {
      let documentText = '';
      const language = req.body?.language || 'en';
      console.log(`\n⚙️ [PIPELINE STARTED] Language: ${language} | WantsStream: ${wantsStream}`);
      console.log(`📦 [REQ PAYLOAD] req.file: ${!!req.file} | req.body keys:`, Object.keys(req.body || {}));

      // Immediately notify client SSE stream is open and Stage 0 Guard 1 is active
      await sendEvent('progress', { stage: 'guard1', stageIndex: 0, status: 'in_progress', label: 'Guard 1 Check' });

      if (checkAborted()) return;

      // Always prioritize fresh extraction from uploaded file payload over client preview text
      if (req.file) {
        documentText = await extractAndCleanDocumentTextAsync(req.file.buffer, req.file.mimetype || '', req.file.originalname || '', language);
      } else if (req.body.fileData) {
        const base64Data = req.body.fileData.replace(/^data:.*?;base64,/, '');
        const fileBuffer = Buffer.from(base64Data, 'base64');
        documentText = await extractAndCleanDocumentTextAsync(fileBuffer, req.body.fileType || 'image/jpeg', req.body.fileName || 'uploaded_doc.jpg', language);
      } else {
        documentText = req.body.text || '';
      }

      console.log(`📄 [PIPELINE TEXT READY] Extracted Text Length: ${documentText.length} chars`);

      if (checkAborted()) return;

      const t0 = Date.now();
      console.log(`🛡️ [STAGE 0: GUARD 1] Evaluating input gate classification...`);

      const g1 = await runGuard1InputGateAsync(documentText || '', serverAbortController.signal);
      console.log(`🛡️ [STAGE 0 RESULT] Legal: ${g1.is_legal_document} | Category: ${g1.category}`);
      if (checkAborted()) return;

      if (!g1.is_legal_document) {
        console.warn(`❌ [GUARD 1 REJECTED] ${g1.rejection_reason}`);
        await sendEvent('error', { error: g1.rejection_reason || 'Document rejected by Guard 1 input gate.' });
        if (!res.writableEnded) res.end();
        return;
      }
      const elapsed0 = Math.max(1, Date.now() - t0);
      await sendEvent('progress', { stage: 'guard1', stageIndex: 0, status: 'completed', elapsed_ms: elapsed0 });

      // Stage 1: OCR & Parsing (Real Content Extraction)
      console.log(`🔍 [STAGE 1: OCR & PARSING] Validating parsed content...`);
      await sendEvent('progress', { stage: 'ocr_parsing', stageIndex: 1, status: 'in_progress', label: 'OCR & Parsing' });
      const t1 = Date.now();
      if (!documentText || documentText.trim().length < 5) {
        if (req.file) {
          documentText = await extractAndCleanDocumentTextAsync(req.file.buffer, req.file.mimetype || '', req.file.originalname || '', language);
        } else if (req.body.fileData) {
          const base64Data = req.body.fileData.replace(/^data:.*?;base64,/, '');
          const fileBuffer = Buffer.from(base64Data, 'base64');
          documentText = await extractAndCleanDocumentTextAsync(fileBuffer, req.body.fileType || 'image/jpeg', req.body.fileName || 'uploaded_doc.jpg', language);
        }
      }

      if (checkAborted()) return;

      if (!documentText || documentText.trim().length < 10) {
        await sendEvent('error', { error: 'Document content or file is required.' });
        if (!res.writableEnded) res.end();
        return;
      }

      const elapsed1 = Math.max(1, Date.now() - t1);
      await sendEvent('progress', { stage: 'ocr_parsing', stageIndex: 1, status: 'completed', elapsed_ms: elapsed1 });

      if (checkAborted()) return;

      // Stage 2: Clause Chunking (Real Structural Clause Sectioning & Taxonomy Parsing)
      await sendEvent('progress', { stage: 'clause_chunking', stageIndex: 2, status: 'in_progress', label: 'Clause Chunking' });
      const t2 = Date.now();
      const rawClauses = await chunkDocumentTextIntoClausesAsync(documentText);
      if (checkAborted()) return;

      if (!rawClauses || rawClauses.length === 0) {
        await sendEvent('error', { error: 'Document rejected by Guard 1: No extractable legal clauses or binding terms were found in this document.' });
        if (!res.writableEnded) res.end();
        return;
      }
      const elapsed2 = Math.max(1, Date.now() - t2);
      await sendEvent('progress', { stage: 'clause_chunking', stageIndex: 2, status: 'completed', elapsed_ms: elapsed2 });

      if (checkAborted()) return;

      // Stage 3: Risk Tagging (Real AI Per-Clause Risk Reasoning & Severity Grounding)
      await sendEvent('progress', { stage: 'risk_tagging', stageIndex: 3, status: 'in_progress', label: 'Risk Tagging' });
      const t3 = Date.now();
      const clausesWithRisk = await applyRiskTaggingAndGroundingAsync(rawClauses, g1.category, serverAbortController.signal);
      if (checkAborted()) return;

      const elapsed3 = Math.max(1, Date.now() - t3);
      await sendEvent('progress', { stage: 'risk_tagging', stageIndex: 3, status: 'completed', elapsed_ms: elapsed3 });

      if (checkAborted()) return;

      // Stage 4: AI Synthesis (Real Executive Summary & Plain-English Briefing Generation)
      await sendEvent('progress', { stage: 'ai_synthesis', stageIndex: 4, status: 'in_progress', label: 'AI Synthesis' });
      const t4 = Date.now();
      const fullResult = await synthesizeDocumentAnalysis(documentText, clausesWithRisk, g1, req.body.categoryHint, language, serverAbortController.signal);
      if (checkAborted()) return;

      const elapsed4 = Math.max(1, Date.now() - t4);
      await sendEvent('progress', { stage: 'ai_synthesis', stageIndex: 4, status: 'completed', elapsed_ms: elapsed4 });

      // Return Final Result
      if (!checkAborted()) {
        await sendEvent('result', fullResult);
        if (!res.writableEnded) res.end();
      }
    } catch (err: any) {
      if (!checkAborted()) {
        const errMsg = err.message || 'Failed to analyze document.';
        await sendEvent('error', { error: errMsg });
        if (!res.writableEnded) res.end();
      }
    }
    return;
  }

  // Non-streaming fallback
  try {
    let documentText = req.body.text || '';
    if (req.file) {
      documentText = await extractAndCleanDocumentTextAsync(req.file.buffer, req.file.mimetype || '', req.file.originalname || '');
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
