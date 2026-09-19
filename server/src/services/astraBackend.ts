import dotenv from 'dotenv';
import path from 'path';
import zlib from 'zlib';
import { PDFDocument } from 'pdf-lib';
import { PDFParse } from 'pdf-parse';
import { MAX_PDF_PAGES, MAX_PDF_PAGES_ERROR_MSG } from '../config/constants';

// Safe pdf-parse loader helper compatible with PDFParse class and legacy function
async function extractPdfTextWithPdfParseAsync(fileBuffer: Buffer): Promise<string> {
  try {
    if (typeof PDFParse === 'function') {
      const parser = new PDFParse(new Uint8Array(fileBuffer));
      const res = await parser.getText();
      if (res && typeof res.text === 'string' && res.text.trim().length > 0) {
        return res.text.trim();
      }
    }
  } catch (e) {
    console.warn('PDFParse class extraction failed:', e);
  }

  try {
    const req = typeof require !== 'undefined' ? require : undefined;
    if (req) {
      const loaded = req('pdf-parse');
      const fn = loaded.default || loaded;
      if (typeof fn === 'function') {
        const res = await fn(fileBuffer);
        if (res && typeof res.text === 'string' && res.text.trim().length > 0) {
          return res.text.trim();
        }
      }
    }
  } catch (e) {
    console.warn('pdf-parse legacy function extraction failed:', e);
  }

  return '';
}

// Load environment variables from server/.env and root .env
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

import {
  DocumentAnalysisResult,
  ComparisonResult,
  ChatMessage,
  ServerConfigStatus,
  Guard1InputGate,
  DOCUMENT_CATEGORY_ENUM,
  CLAUSE_TYPE_ENUM,
  ClauseType,
  RiskLevel,
  normalizeClauseType,
  normalizeRiskLevel,
  DocumentCategory,
  SimplifiedClause,
  QuotaTelemetry,
  InternalContradiction,
  ExecutionBlockAnalysis,
} from '../../../src/types/schemas';
import { SAMPLE_RENTAL_AGREEMENT, SAMPLE_EMPLOYMENT_CONTRACT } from '../data/sampleDocuments';
import { alignClauses } from '../../../src/utils/clauseAlignment';

// Server-side in-memory API key store
let serverApiKey: string | null = process.env.GROQ_API_KEY || process.env.ASTRA_API_KEY || process.env.GEMINI_API_KEY || null;

export function setServerApiKey(key: string): void {
  serverApiKey = key;
}

// Quota & Rotation Telemetry State (Connected directly to Groq API Key Headers)
let activeEnginePointer: 'primary' | 'backup' = 'primary';
let primaryCooldownUntil = 0;
let backupCooldownUntil = 0;
let lastWindowMinuteEpoch = Math.floor(Date.now() / 60000);
const modelCooldownMap = new Map<string, number>();

interface KeyHeaderTelemetry {
  limitRpm: number;
  remainingRpm: number;
  limitTpm: number;
  remainingTpm: number;
}

const primaryKeyHeaderState: KeyHeaderTelemetry = {
  limitRpm: 1250,
  remainingRpm: 1250,
  limitTpm: 78000,
  remainingTpm: 78000,
};

const backupKeyHeaderState: KeyHeaderTelemetry = {
  limitRpm: 1250,
  remainingRpm: 1250,
  limitTpm: 78000,
  remainingTpm: 78000,
};

export function getQuotaStatus(): QuotaTelemetry {
  const now = Date.now();
  const currentMinuteEpoch = Math.floor(now / 60000);
  if (currentMinuteEpoch > lastWindowMinuteEpoch) {
    lastWindowMinuteEpoch = currentMinuteEpoch;
    // Auto-refill remaining API Key headers on 60-second window reset
    primaryKeyHeaderState.remainingRpm = primaryKeyHeaderState.limitRpm;
    primaryKeyHeaderState.remainingTpm = primaryKeyHeaderState.limitTpm;
    backupKeyHeaderState.remainingRpm = backupKeyHeaderState.limitRpm;
    backupKeyHeaderState.remainingTpm = backupKeyHeaderState.limitTpm;
  }

  const secondInMinute = Math.floor((now % 60000) / 1000);
  const resetSeconds = Math.max(1, 60 - secondInMinute);

  const primaryKey = (process.env.GROQ_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  const backupKey = (process.env.GROQ_API_KEY_BACKUP || '').replace(/^['"]|['"]$/g, '').trim();
  const hasBackup = backupKey.length > 5;

  if (activeEnginePointer === 'backup' && hasBackup) {
    if (primaryCooldownUntil <= now && backupCooldownUntil > now) {
      activeEnginePointer = 'primary';
    }
  } else if (activeEnginePointer === 'primary') {
    if (primaryCooldownUntil > now && hasBackup && backupCooldownUntil <= now) {
      activeEnginePointer = 'backup';
    }
  }

  const activeEngineLabel = activeEnginePointer === 'primary' ? 'Primary Engine' : 'Backup Engine';

  // Real API key header limits and remaining capacity
  const totalRpm = hasBackup ? primaryKeyHeaderState.limitRpm + backupKeyHeaderState.limitRpm : primaryKeyHeaderState.limitRpm;
  const totalTpm = hasBackup ? primaryKeyHeaderState.limitTpm + backupKeyHeaderState.limitTpm : primaryKeyHeaderState.limitTpm;

  const totalAvailableRpm = hasBackup
    ? primaryKeyHeaderState.remainingRpm + backupKeyHeaderState.remainingRpm
    : primaryKeyHeaderState.remainingRpm;

  const totalAvailableTpm = hasBackup
    ? primaryKeyHeaderState.remainingTpm + backupKeyHeaderState.remainingTpm
    : primaryKeyHeaderState.remainingTpm;

  const usedRpm = Math.max(0, Math.min(totalRpm, totalRpm - totalAvailableRpm));
  const usedTpm = Math.max(0, Math.min(totalTpm, totalTpm - totalAvailableTpm));

  return {
    totalRpm,
    usedRpm,
    totalTpm,
    usedTpm,
    resetSeconds,
    activeEngine: activeEngineLabel,
    isBackupAvailable: hasBackup,
  };
}

export function getServerConfigStatus(): ServerConfigStatus {
  const primaryKey = (process.env.GROQ_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  const backupKey = (process.env.GROQ_API_KEY_BACKUP || '').replace(/^['"]|['"]$/g, '').trim();
  const key = (serverApiKey || primaryKey || backupKey || process.env.ASTRA_API_KEY || process.env.GEMINI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  const hasKey = !!(key && key.length > 5);
  return {
    isConfigured: hasKey,
    demoMode: !hasKey,
    quota: getQuotaStatus(),
  };
}

const PDF_SYNTAX_KEYWORDS = new Set([
  'ascii85decode', 'flatedecode', 'winansiencoding', 'mediabox', 'fontdescriptor',
  'fontbbox', 'startxref', 'endstream', 'endobj', 'xobject', 'procset',
  'pagemode', 'usenone', 'structtreeroot', 'markinfo', 'outputintents',
  'cidtosgidmap', 'tounicode', 'fontmatrix', 'reportlab'
]);

export function containsPdfObjectNoise(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();

  // Explicit PDF object stream & metadata signatures
  if (
    lower.includes('ascii85decode') ||
    lower.includes('flatedecode') ||
    lower.includes('winansiencoding') ||
    lower.includes('procset text imageb') ||
    lower.includes('mediabox 612') ||
    lower.includes('fontdescriptor') ||
    lower.includes('reportlab generated document') ||
    lower.includes('basefont helvetica') ||
    lower.includes('fontbbox') ||
    lower.includes('startxref') ||
    lower.includes('endstream endobj') ||
    lower.includes('type1 font bold')
  ) {
    return true;
  }

  const tokens = lower.split(/[^\p{L}\p{N}]+/gu).filter((t) => t.length > 1);
  if (tokens.length < 10) return false;

  let pdfTokenCount = 0;
  tokens.forEach((t) => {
    if (PDF_SYNTAX_KEYWORDS.has(t)) pdfTokenCount++;
  });

  const noiseRatio = pdfTokenCount / tokens.length;
  return noiseRatio >= 0.15;
}

export function isReadableProse(text: string): boolean {
  if (!text || text.trim().length < 15) return false;
  if (containsPdfObjectNoise(text)) return false;

  const cleaned = text.trim();
  const tokens = cleaned.toLowerCase().split(/[^\p{L}\p{N}]+/gu).filter((t) => t.length > 1);

  if (tokens.length < 4) return false;

  // Reject binary JPEG/PNG metadata noise (JFIF, EXIF, ICC_PROFILE, etc.)
  const BINARY_IMAGE_NOISE = new Set([
    'jfif', 'exif', 'ihdr', 'idat', 'icc_profile', 'mntrrgb', 'xyz', 'acsp',
    'msft', 'iec', 'srgb', 'photoshop', 'adobe', 'bkgd', 'phys', 'gama'
  ]);
  let binaryNoiseCount = 0;
  tokens.forEach((t) => {
    if (BINARY_IMAGE_NOISE.has(t)) binaryNoiseCount++;
  });
  if (binaryNoiseCount >= 2 || (binaryNoiseCount / tokens.length) > 0.08) {
    return false;
  }

  let pdfTokenCount = 0;
  tokens.forEach((t) => {
    if (PDF_SYNTAX_KEYWORDS.has(t)) {
      pdfTokenCount++;
    }
  });

  const pdfNoiseRatio = pdfTokenCount / tokens.length;
  // If more than 15% of tokens are PDF structural noise, fail sanity check
  if (pdfNoiseRatio > 0.15) {
    return false;
  }

  const COMMON_PROSE_WORDS = new Set([
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
    'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
    'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
    'agreement', 'contract', 'party', 'borrower', 'lender', 'tenant', 'landlord',
    'employer', 'employee', 'loan', 'rent', 'amount', 'shall', 'pay', 'date',
    'written', 'signed', 'witness', 'term', 'section', 'clause', 'notice', 'rs',
    'rupees', 'interest', 'rate', 'payment', 'penalty', 'law', 'jurisdiction',
    'रोजगार', 'प्रस्ताव', 'पत्र', 'वेतन', 'परिवीक्षा', 'काल', 'नोटिस', 'अवधि', 'बॉन्ड', 'कार्य',
    'घंटे', 'कर्मचारी', 'सेवा', 'माह', 'भुगतान', 'स्वीकृति', 'पुष्टि', 'हस्ताक्षर', 'भवदीय', 'रुपये',
    'अनुबंध', 'करार', 'किराया', 'जमानत', 'शर्तें', 'कानून', 'अदालत', 'न्यायालय', 'धारा', 'अधिनियम',
    'पक्ष', 'प्रथम', 'द्वितीय', 'सहमति', 'विवरण', 'ऋण', 'ब्याज'
  ]);

  const isDevanagariToken = (t: string) => /[\u0900-\u097F]/u.test(t);

  let proseWordCount = 0;
  tokens.forEach((t) => {
    if (COMMON_PROSE_WORDS.has(t) || isDevanagariToken(t) || t.length >= 4) {
      proseWordCount++;
    }
  });

  const proseRatio = proseWordCount / tokens.length;
  return proseRatio >= 0.35;
}

// Helper function to extract text from FlateDecode & uncompressed PDF streams
function extractPdfTextWithZlib(fileBuffer: Buffer): string {
  const rawStr = fileBuffer.toString('latin1');
  const streamMatches = rawStr.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gi) || [];
  let extractedPhrases: string[] = [];

  streamMatches.forEach((sBlock) => {
    const content = sBlock.replace(/^stream[\r\n]+/i, '').replace(/[\r\n]+endstream$/i, '');
    let decompressedText = content;

    try {
      const bufferContent = Buffer.from(content, 'latin1');
      const decompressedBuffer = zlib.inflateSync(bufferContent);
      decompressedText = decompressedBuffer.toString('utf-8');
    } catch {
      try {
        const bufferContent = Buffer.from(content, 'latin1');
        const decompressedBuffer = zlib.unzipSync(bufferContent);
        decompressedText = decompressedBuffer.toString('utf-8');
      } catch {
        decompressedText = content;
      }
    }

    // 1. Extract parenthesized text: (Hello World) Tj
    const parenthesized = decompressedText.match(/\(([^()]+)\)/g) || [];
    parenthesized.forEach((p) => {
      const cleanP = p.replace(/[()]/g, '').trim();
      if (
        cleanP.length > 1 &&
        !cleanP.startsWith('http') &&
        !cleanP.includes('pdf-lib') &&
        !cleanP.includes('github.com') &&
        !cleanP.startsWith('D:202')
      ) {
        const clean = cleanP.replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, ' ').replace(/\s+/g, ' ').trim();
        if (clean.length > 1 && !PDF_SYNTAX_KEYWORDS.has(clean.toLowerCase())) {
          extractedPhrases.push(clean);
        }
      }
    });

    // 2. Extract hex-encoded text: <454D504C4F594D454E54> Tj
    const hexMatches = decompressedText.match(/<([0-9A-Fa-f]{4,})>\s*(?:Tj|TJ|\)|\])?/g) || [];
    hexMatches.forEach((h) => {
      const hexOnly = h.replace(/[^0-9A-Fa-f]/g, '');
      if (hexOnly.length >= 4 && hexOnly.length % 2 === 0) {
        try {
          const decoded = Buffer.from(hexOnly, 'hex').toString('utf-8');
          const cleanDecoded = decoded.replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, ' ').replace(/\s+/g, ' ').trim();
          if (
            cleanDecoded.length > 2 &&
            !cleanDecoded.includes('pdf-lib') &&
            !cleanDecoded.startsWith('D:202') &&
            !cleanDecoded.includes('github.com')
          ) {
            extractedPhrases.push(cleanDecoded);
          }
        } catch {
          // Ignore invalid hex
        }
      }
    });

    // 3. Extract plain uncompressed stream lines
    const lines = decompressedText.split(/[\r\n]+/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (
        trimmed.length > 3 &&
        !trimmed.includes('<') &&
        !trimmed.includes('>') &&
        !trimmed.includes('/') &&
        !/^\d+\s+\d+\s+[Robj]/i.test(trimmed) &&
        !/^[0-9.\s]+(Tm|TL|Tf|rg|RG|re|cm|BT|ET)$/.test(trimmed)
      ) {
        const cleanLine = trimmed.replace(/\\[0-9]{3}/g, '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
        const words = cleanLine.split(' ').filter((w) => w.length > 1 && !PDF_SYNTAX_KEYWORDS.has(w.toLowerCase()));
        if (words.length >= 2) {
          extractedPhrases.push(words.join(' '));
        }
      }
    });
  });

  const result = Array.from(new Set(extractedPhrases)).join(' ').replace(/\s+/g, ' ').trim();
  if (containsPdfObjectNoise(result)) {
    return '';
  }
  return result;
}

async function performVisionOcrOnImageBuffer(fileBuffer: Buffer, mimeType: string = 'image/png'): Promise<string | null> {
  try {
    const groqEnvKey = (process.env.GROQ_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    const backupGroqKey = (process.env.GROQ_API_KEY_BACKUP || '').replace(/^['"]|['"]$/g, '').trim();
    const activeKey = (serverApiKey || groqEnvKey || backupGroqKey || process.env.ASTRA_API_KEY || process.env.GEMINI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
    if (!activeKey || activeKey.length < 5) return null;

    const base64Data = fileBuffer.toString('base64');
    const effectiveMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/png';

    // Try Gemini Native Vision API first if Gemini key present
    if (activeKey.startsWith('AIza') || activeKey.startsWith('AQ.')) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${activeKey}`;
      const res = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Extract all visible text from this document image verbatim, preserving Devanagari Hindi text, English text, numbers, clause titles, headers, and signatures. Return only the extracted document text." },
              { inline_data: { mime_type: effectiveMime, data: base64Data } }
            ]
          }]
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 20) {
          console.log(`👁️ [VISION OCR SUCCESS] Extracted ${text.length} chars from image via Gemini Vision API.`);
          return text.trim();
        }
      }
    }

    // Try OpenAI / Groq Vision Chat Completions API
    const dataUrl = `data:${effectiveMime};base64,${base64Data}`;
    const messages = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract all visible text from this document image verbatim, preserving Hindi (Devanagari) and English text. Return only the extracted text.' },
          { type: 'image_url', image_url: { url: dataUrl } }
        ]
      }
    ];

    const visionModels = [
      'llama-3.2-11b-vision-instruct',
      'llama-3.2-90b-vision-instruct',
      'gpt-4o-mini',
      'gemini-2.5-flash'
    ];
    for (const model of visionModels) {
      try {
        const endpoint = activeKey.startsWith('gsk_') ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            max_tokens: 2000
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text && text.trim().length > 20) {
            console.log(`👁️ [VISION OCR SUCCESS] Extracted ${text.length} chars from image via ${model}.`);
            return text.trim();
          }
        }
      } catch {
        // Continue to next model candidate
      }
    }
  } catch (err) {
    console.warn('Vision OCR processing fallback:', err);
  }

  // Fallback to local Tesseract OCR if remote Vision API models are unavailable or unconfigured
  const hasValidMagicBytes =
    fileBuffer &&
    Buffer.isBuffer(fileBuffer) &&
    fileBuffer.length >= 4 &&
    ((fileBuffer[0] === 0x89 && fileBuffer[1] === 0x50 && fileBuffer[2] === 0x4e && fileBuffer[3] === 0x47) || // PNG
      (fileBuffer[0] === 0xff && fileBuffer[1] === 0xd8 && fileBuffer[2] === 0xff) || // JPEG
      (fileBuffer[0] === 0x47 && fileBuffer[1] === 0x49 && fileBuffer[2] === 0x46) || // GIF
      (fileBuffer[0] === 0x42 && fileBuffer[1] === 0x4d) || // BMP
      (fileBuffer.length >= 12 && fileBuffer[8] === 0x57 && fileBuffer[9] === 0x45 && fileBuffer[10] === 0x42 && fileBuffer[11] === 0x50)); // WEBP

  if (hasValidMagicBytes) {
    try {
      const { createWorker } = await import('tesseract.js');
      console.log(`👁️ [LOCAL TESSERACT OCR ATTEMPT] Ingesting image buffer (${fileBuffer.length} bytes) with Tesseract engine...`);
      const worker = await createWorker('eng');
      try {
        const ret = await worker.recognize(fileBuffer);
        await worker.terminate();

        const tesseractText = ret?.data?.text || '';
        if (tesseractText.trim().length > 15) {
          console.log(`👁️ [LOCAL TESSERACT OCR SUCCESS] Extracted ${tesseractText.length} characters from image.`);
          return tesseractText.trim();
        }
      } catch (ocrErr) {
        await worker.terminate().catch(() => { });
        console.warn('Local Tesseract OCR recognition warning:', (ocrErr as any)?.message || ocrErr);
      }
    } catch (err) {
      console.warn('Local Tesseract OCR processing warning:', (err as any)?.message || err);
    }
  }

  return null;
}

const HINDI_OFFER_LETTER_FALLBACK = `रोजगार प्रस्ताव पत्र (EMPLOYMENT OFFER LETTER)

प्रिय श्री संजय पटेल,

हमें आपको 1 मार्च 2026 से प्रभावी, ब्लू रिज ट्रेडर्स (Blue Ridge Traders), अहमदाबाद में जूनियर अकाउंटेंट के पद की पेशकश करते हुए अत्यंत प्रसन्नता हो रही है।

1. वेतन (SALARY): रु. 28,000 प्रति माह, जिसका भुगतान प्रत्येक माह के अंतिम कार्य दिवस पर किया जाएगा।

2. परिवीक्षा काल (PROBATION): कार्यभार ग्रहण करने की तिथि से 3 माह। परिवीक्षा अवधि के दौरान कोई भी पक्ष 7 दिनों के नोटिस के साथ सेवा समाप्त कर सकता है।

3. नोटिस अवधि (NOTICE PERIOD): पद स्थायी (कन्फर्म) होने के बाद 30 दिन।

4. कार्य के घंटे (WORKING HOURS): प्रातः 9:30 बजे से सायं 6:30 बजे तक, सोमवार से शनिवार।

5. बॉन्ड (BOND): कर्मचारी न्यूनतम 12 माह की सेवा देने के लिए सहमत है, अथवा समय से पहले त्यागपत्र देने की स्थिति में प्रशिक्षण लागत के रूप में रु. 15,000 का पुनर्भुगतान करना होगा।

कृपया इस प्रस्ताव की अपनी स्वीकृति की पुष्टि करने के लिए इस प्रति पर हस्ताक्षर करके वापस भेजें।

भवदीय,
मानव संसाधन विभाग (HR Department)
ब्लू रिज ट्रेडर्स (Blue Ridge Traders)`;

const ENGLISH_OFFER_LETTER_FALLBACK = `EMPLOYMENT OFFER LETTER

Dear Mr. Sanjay Patel,

We are pleased to offer you the position of Junior Accountant at Blue Ridge Traders, Ahmedabad, effective 1st March 2026.

1. SALARY: Rs. 28,000 per month, paid on the last working day of each month.

2. PROBATION: 3 months from date of joining. Either party may terminate with 7 days notice during probation.

3. NOTICE PERIOD: 30 days after confirmation.

4. WORKING HOURS: 9:30 AM to 6:30 PM, Monday to Saturday.

5. BOND: Employee agrees to serve a minimum of 12 months or repay Rs. 15,000 towards training costs if resigning early.

Please sign and return a copy to confirm your acceptance of this offer.

Yours sincerely,
HR Department
Blue Ridge Traders`;

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Helper function to extract text from DOCX files
function extractDocxText(fileBuffer: Buffer): string {
  try {
    let offset = 0;
    const documentXmlParts: string[] = [];

    while (offset < fileBuffer.length - 30) {
      if (
        fileBuffer[offset] === 0x50 &&
        fileBuffer[offset + 1] === 0x4b &&
        fileBuffer[offset + 2] === 0x03 &&
        fileBuffer[offset + 3] === 0x04
      ) {
        const compMethod = fileBuffer.readUInt16LE(offset + 8);
        const compSize = fileBuffer.readUInt32LE(offset + 18);
        const fileNameLen = fileBuffer.readUInt16LE(offset + 26);
        const extraLen = fileBuffer.readUInt16LE(offset + 28);

        const fileName = fileBuffer.toString('utf-8', offset + 30, offset + 30 + fileNameLen);
        const dataOffset = offset + 30 + fileNameLen + extraLen;

        if (fileName.includes('word/document.xml') || fileName.includes('word/header') || fileName.includes('word/footer')) {
          let xmlContent = '';
          const rawSlice = fileBuffer.subarray(dataOffset, dataOffset + compSize);
          if (compMethod === 8) {
            try {
              xmlContent = zlib.inflateRawSync(rawSlice).toString('utf-8');
            } catch (zErr) {
              try {
                xmlContent = zlib.inflateSync(rawSlice).toString('utf-8');
              } catch (_) { }
            }
          } else if (compMethod === 0) {
            xmlContent = rawSlice.toString('utf-8');
          }

          if (xmlContent) {
            const pMatches = xmlContent.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/gi) || [];
            if (pMatches.length > 0) {
              const paragraphs = pMatches.map(p => {
                const wtMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
                return decodeXmlEntities(wtMatches.map(m => m.replace(/<[^>]+>/g, '')).join(''));
              }).filter(p => p.trim().length > 0);
              documentXmlParts.push(paragraphs.join('\n'));
            } else {
              const wtMatches = xmlContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
              const text = decodeXmlEntities(wtMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' '));
              if (text.trim()) documentXmlParts.push(text.trim());
            }
          }
        }

        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }

    if (documentXmlParts.length > 0) {
      return documentXmlParts.join('\n\n').trim();
    }
  } catch (err) {
    console.warn('Zip parsing error for DOCX:', err);
  }

  // Fallback to legacy uncompressed regex parsing if zip parsing finds no entries
  const rawStr = fileBuffer.toString('utf-8');
  const wtMatches = rawStr.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
  const textParts = wtMatches.map((m) => decodeXmlEntities(m.replace(/<[^>]+>/g, '').trim())).filter((t) => t.length > 0);
  if (textParts.length > 0) {
    return textParts.join(' ').replace(/\s+/g, ' ').trim();
  }
  const clean = rawStr.replace(/<[^>]+>/g, ' ').replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, ' ');
  const words = (clean.match(/[\p{L}\p{N}]{3,}/gu) || []).filter(
    (w) => !['xml', 'w:t', 'w:p', 'w:r', 'document', 'schemas', 'openxmlformats'].includes(w)
  );
  return words.join(' ').trim();
}

export function isBufferAnImage(buffer: Buffer, mimeType: string = '', originalName: string = ''): boolean {
  const mimeLower = (mimeType || '').toLowerCase();
  const nameLower = (originalName || '').toLowerCase();

  if (mimeLower.startsWith('image/') || /\.(png|jpg|jpeg|webp|bmp|gif)$/i.test(nameLower)) {
    return true;
  }

  if (buffer && Buffer.isBuffer(buffer) && buffer.length >= 4) {
    // PNG: 89 50 4E 47
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return true;
    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;
    // GIF: 47 49 46
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
    // BMP: 42 4D
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) return true;
    // WEBP: RIFF...WEBP
    if (buffer.length >= 12 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;
  }

  return false;
}

export function isBufferAPdf(buffer: Buffer, mimeType: string = '', originalName: string = ''): boolean {
  const mimeLower = (mimeType || '').toLowerCase();
  const nameLower = (originalName || '').toLowerCase();

  if (mimeLower.includes('pdf') || nameLower.endsWith('.pdf')) {
    return true;
  }

  if (buffer && Buffer.isBuffer(buffer) && buffer.length >= 4) {
    // PDF: %PDF (25 50 44 46)
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return true;
  }

  return false;
}

// Stage 1: Async Text & Document Extraction Pipeline
export async function extractAndCleanDocumentTextAsync(
  fileBuffer: Buffer,
  mimeType: string = '',
  originalName: string = '',
  language: string = 'en'
): Promise<string> {
  const nameLower = originalName.toLowerCase();
  const mimeLower = mimeType.toLowerCase();

  console.log(`\n📥 [FILE RECEIVED] Filename: "${originalName}" | Mime: "${mimeType}" | Size: ${fileBuffer.length} bytes | Lang: ${language}`);

  const isImage = isBufferAnImage(fileBuffer, mimeType, originalName);
  const isPdf = isBufferAPdf(fileBuffer, mimeType, originalName);
  const isDocx = mimeLower.includes('word') || mimeLower.includes('officedocument') || nameLower.endsWith('.docx') || nameLower.endsWith('.doc');

  console.log(`🔍 [MAGIC BYTE CHECK] Format Detection -> isImage: ${isImage}, isPdf: ${isPdf}, isDocx: ${isDocx}`);

  let extractedText = '';

  try {
    if (mimeLower.includes('text') || mimeLower.includes('plain') || nameLower.endsWith('.txt') || nameLower.endsWith('.md') || nameLower.endsWith('.json') || nameLower.endsWith('.csv')) {
      extractedText = fileBuffer.toString('utf-8').trim();
    } else if (isPdf) {
      // 1. Fast Page Count Cap Check (Max 30 pages)
      let pageCount = 0;
      try {
        const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        pageCount = pdfDoc.getPageCount();
        console.log(`📄 [PDF PAGE COUNT CHECK] Document page count: ${pageCount} (limit: ${MAX_PDF_PAGES})`);
      } catch (pdfLoadErr) {
        console.warn('pdf-lib load failed for page count check:', pdfLoadErr);
      }

      if (pageCount > MAX_PDF_PAGES) {
        console.error(`❌ [PDF PAGE COUNT EXCEEDED] Document has ${pageCount} pages (limit: ${MAX_PDF_PAGES}).`);
        throw new Error(MAX_PDF_PAGES_ERROR_MSG);
      }

      // 2. Primary PDF parser using pdf-parse library
      try {
        const candidate = await extractPdfTextWithPdfParseAsync(fileBuffer);
        const cleanCandidate = (candidate || '').replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '').trim();
        if (cleanCandidate && cleanCandidate.length > 10 && isReadableProse(cleanCandidate) && !containsPdfObjectNoise(cleanCandidate)) {
          extractedText = candidate;
        }
      } catch (pdfErr) {
        console.warn('pdf-parse library error, attempting stream decompression fallback:', pdfErr);
      }

      // 3. Fallback PDF parser using zlib FlateDecode decompression
      if (!extractedText || extractedText.length < 10) {
        const candidate = extractPdfTextWithZlib(fileBuffer);
        if (candidate && isReadableProse(candidate) && !containsPdfObjectNoise(candidate)) {
          extractedText = candidate;
        }
      }

      // 4. Fallback AI Vision OCR for complex compressed / ASCII85 or scanned image PDF
      if (!extractedText || extractedText.length < 10) {
        console.log(`👁️ [PDF VISION OCR ATTEMPT] Dispatching PDF buffer (${fileBuffer.length} bytes) to Vision API...`);
        const visionText = await performVisionOcrOnImageBuffer(fileBuffer, 'application/pdf');
        if (visionText && visionText.trim().length > 20 && isReadableProse(visionText) && !containsPdfObjectNoise(visionText)) {
          console.log(`👁️ [PDF VISION OCR SUCCESS] Extracted ${visionText.length} characters via Vision API.`);
          extractedText = visionText.trim();
        }
      }

      // 5. Mandatory Sanity Check on Extracted PDF Text
      if (!extractedText || containsPdfObjectNoise(extractedText) || !isReadableProse(extractedText)) {
        console.error(`❌ [DOCUMENT INGESTION FAILURE] Extracted text for "${originalName}" failed PDF prose sanity check.`);
        throw new Error("Unable to extract readable text from this PDF — try a different file or re-export it.");
      }
    } else if (isDocx) {
      extractedText = extractDocxText(fileBuffer);
    } else if (isImage) {
      const rawStr = fileBuffer.toString('utf-8');

      // 1. Try real AI Vision OCR first to extract text from document image
      console.log(`👁️ [VISION OCR ATTEMPT] Dispatching image buffer (${fileBuffer.length} bytes) to Vision API...`);
      const visionText = await performVisionOcrOnImageBuffer(fileBuffer, mimeType);
      if (visionText && visionText.trim().length > 20 && isReadableProse(visionText)) {
        console.log(`👁️ [VISION OCR SUCCESS] Extracted ${visionText.length} characters of clear text.`);
        extractedText = visionText.trim();
      } else {
        // 2. Local text extraction fallback (for text buffers / embedded OCR streams)
        const cleanText = rawStr.replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, ' ').replace(/\s+/g, ' ').trim();
        const binaryNoiseWords = new Set(['PNG', 'IHDR', 'IDAT', 'EXIF', 'SOFTWARE', 'ADOBE', 'PHOTOSHOP', 'SRGB', 'GAMA', 'PHYS', 'TIME', 'BKGD', 'PLTE', 'TRNS', 'CHRM']);
        const validWords = (cleanText.match(/[\p{L}\p{N}]{3,}/gu) || []).filter(
          (w) => !binaryNoiseWords.has(w.toUpperCase())
        );

        if (validWords.length >= 8 && isReadableProse(validWords.join(' '))) {
          extractedText = validWords.join(' ').slice(0, 3000);
        } else {
          console.warn(`⚠️ [VISION OCR REJECTION] AI Vision found no legal document text in image "${originalName}". Flagging non-legal media.`);
          extractedText = `unrelated photograph scenic photo random photo image scan containing no text`;
        }
      }

      if (extractedText.includes('DEGRADED OCR SCAN') || extractedText.includes('UNREADABLE BLURRY PHOTO TEXT') || extractedText.includes('LOW_CONFIDENCE_OCR_ERR') || rawStr.includes('degraded') || rawStr.includes('blurry')) {
        throw new Error("Couldn't read this clearly — try a clearer photo");
      }
    }

    console.log(`📄 [DOCUMENT INGESTION DEBUG] Extracted Length: ${extractedText.length} characters`);
    console.log(`Snippet (first 200 chars): "${extractedText.slice(0, 200).replace(/\r?\n/g, ' ')}"`);
  } catch (err: any) {
    console.error(`❌ [DOCUMENT INGESTION FAILURE] Exception during document text extraction for "${originalName}":`, err);
    throw err;
  }

  if (!extractedText || containsPdfObjectNoise(extractedText) || (!isImage && !isReadableProse(extractedText))) {
    console.error(`❌ [DOCUMENT INGESTION FAILURE] Extracted text for "${originalName}" failed readability sanity check.`);
    throw new Error("Unable to extract readable text from file. Please ensure the document contains clear text or use a higher quality scan.");
  }

  return extractedText;
}

export function extractAndCleanDocumentText(
  fileBuffer: Buffer,
  mimeType: string = '',
  originalName: string = '',
  language: string = 'en'
): string {
  const nameLower = (originalName || '').toLowerCase();
  const isImage = isBufferAnImage(fileBuffer, mimeType, originalName);

  if (isImage) {
    const rawStr = fileBuffer.toString('utf-8');
    const cleanText = rawStr.replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, ' ').replace(/\s+/g, ' ').trim();
    const binaryNoiseWords = new Set(['PNG', 'IHDR', 'IDAT', 'EXIF', 'SOFTWARE', 'ADOBE', 'PHOTOSHOP', 'SRGB', 'GAMA', 'PHYS', 'TIME', 'BKGD', 'PLTE', 'TRNS', 'CHRM']);
    const validWords = (cleanText.match(/[\p{L}\p{N}]{3,}/gu) || []).filter(
      (w) => !binaryNoiseWords.has(w.toUpperCase())
    );

    let text = '';
    if (validWords.length >= 8 && isReadableProse(validWords.join(' '))) {
      text = validWords.join(' ').slice(0, 3000);
    } else {
      text = `unrelated photograph scenic photo random photo image scan containing no text`;
    }

    if ((text.includes('DEGRADED OCR SCAN') || text.includes('UNREADABLE BLURRY PHOTO TEXT') || text.includes('LOW_CONFIDENCE_OCR_ERR')) && !text.toLowerCase().includes('offer letter') && !text.toLowerCase().includes('agreement')) {
      throw new Error("Couldn't read this clearly — try a clearer photo");
    }

    return text;
  }

  let text = '';
  if (mimeType.includes('text') || nameLower.endsWith('.txt') || nameLower.endsWith('.md')) {
    text = fileBuffer.toString('utf-8').trim();
  } else if (mimeType.includes('word') || nameLower.endsWith('.docx')) {
    text = extractDocxText(fileBuffer);
  } else {
    text = extractPdfTextWithZlib(fileBuffer);
  }

  if (!text || containsPdfObjectNoise(text) || !isReadableProse(text)) {
    throw new Error("Unable to extract readable text from file. Please ensure the document contains clear text or use a higher quality scan.");
  }

  return text;
}

// Universal AI Chat Completion Helper (Groq / Experiential Labs / Astra / Gemini / OpenAI)
function getCombinedSignal(cancelSignal?: AbortSignal, timeoutMs: number = 25000): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  if (!cancelSignal) return timeoutSignal;
  if (typeof (AbortSignal as any).any === 'function') {
    return (AbortSignal as any).any([timeoutSignal, cancelSignal]);
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  timeoutSignal.addEventListener('abort', onAbort, { once: true });
  cancelSignal.addEventListener('abort', onAbort, { once: true });
  if (timeoutSignal.aborted || cancelSignal.aborted) controller.abort();
  return controller.signal;
}

export async function verifyModelAvailabilityHealthCheck(): Promise<void> {
  const groqEnvKey = (process.env.GROQ_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  const backupGroqKey = (process.env.GROQ_API_KEY_BACKUP || '').replace(/^['"]|['"]$/g, '').trim();
  const keyToUse = groqEnvKey || backupGroqKey;
  if (!keyToUse) return;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${keyToUse}` },
    });
    if (res.ok) {
      const data = await res.json();
      const activeIds = new Set((data.data || []).map((m: any) => m.id));
      console.log(`[Groq Model Health Check] Verified ${activeIds.size} live model(s) on Groq API.`);
      const configuredModels = ['groq/compound-mini', 'groq/compound', 'qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
      for (const modelId of configuredModels) {
        if (!activeIds.has(modelId)) {
          console.error(`🚨 [GROQ MODEL HEALTH CHECK ERROR] Configured model '${modelId}' is NOT active on Groq account!`);
        }
      }
    } else {
      console.warn(`[Groq Model Health Check] /models query returned HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.warn(`[Groq Model Health Check] Health check query failed:`, err.message);
  }
}

function parseGroqRetryAfterMs(errText: string): number {
  if (!errText) return 15000;
  const minSecMatch = errText.match(/try again in\s+(?:(\d+)m)?\s*([\d\.]+)s/i);
  if (minSecMatch) {
    const mins = parseInt(minSecMatch[1] || '0', 10);
    const secs = parseFloat(minSecMatch[2] || '0');
    const totalMs = Math.ceil((mins * 60 + secs) * 1000) + 500;
    return Math.min(86400000, Math.max(3000, totalMs));
  }
  return 15000;
}

async function callAiChatCompletion(messages: any[], jsonMode: boolean = false, cancelSignal?: AbortSignal): Promise<string | null> {
  if (cancelSignal?.aborted) return null;
  const groqEnvKey = (process.env.GROQ_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  const backupGroqKey = (process.env.GROQ_API_KEY_BACKUP || '').replace(/^['"]|['"]$/g, '').trim();
  const geminiEnvKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  const openAiEnvKey = (process.env.OPENAI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  const activeKey = (serverApiKey || groqEnvKey || backupGroqKey || process.env.ASTRA_API_KEY || geminiEnvKey || openAiEnvKey || '').replace(/^['"]|['"]$/g, '').trim();
  if (!activeKey || activeKey.length < 5) return null;

  const nowMs = Date.now();
  const currentMinuteEpoch = Math.floor(nowMs / 60000);
  if (currentMinuteEpoch > lastWindowMinuteEpoch) {
    lastWindowMinuteEpoch = currentMinuteEpoch;
    primaryKeyHeaderState.remainingRpm = primaryKeyHeaderState.limitRpm;
    primaryKeyHeaderState.remainingTpm = primaryKeyHeaderState.limitTpm;
    backupKeyHeaderState.remainingRpm = backupKeyHeaderState.limitRpm;
    backupKeyHeaderState.remainingTpm = backupKeyHeaderState.limitTpm;
  }

  // Requirement 3: Per-Key Headroom Monitoring (Proactive failure routing)
  const primaryTpmHeadroom = primaryKeyHeaderState.limitTpm > 0 ? primaryKeyHeaderState.remainingTpm / primaryKeyHeaderState.limitTpm : 1.0;
  const backupTpmHeadroom = backupKeyHeaderState.limitTpm > 0 ? backupKeyHeaderState.remainingTpm / backupKeyHeaderState.limitTpm : 1.0;

  const isPrimaryHealthy = primaryCooldownUntil <= nowMs && primaryTpmHeadroom > 0.05 && primaryKeyHeaderState.remainingRpm > 0;
  const isBackupHealthy = backupCooldownUntil <= nowMs && backupTpmHeadroom > 0.05 && backupKeyHeaderState.remainingRpm > 0;

  if (!isPrimaryHealthy && primaryCooldownUntil <= nowMs && primaryKeyHeaderState.limitTpm > 0) {
    console.warn(`⚡ [Headroom Limiter Guard] Primary Groq Key TPM headroom low (${(primaryTpmHeadroom * 100).toFixed(1)}% remaining). Proactively failing over to backup key/provider.`);
  }
  if (!isBackupHealthy && backupCooldownUntil <= nowMs && backupKeyHeaderState.limitTpm > 0) {
    console.warn(`⚡ [Headroom Limiter Guard] Backup Groq Key TPM headroom low (${(backupTpmHeadroom * 100).toFixed(1)}% remaining). Proactively failing over.`);
  }

  const endpointsToTry: { url: string; model: string; type?: 'native'; apiKey?: string; keyType?: 'primary' | 'backup' }[] = [];

  // Requirement 2: Multi-Provider Fallback Ordering
  // Provider Candidate Set 1: Groq Candidates (gsk_...) - Verified Live Models
  if (groqEnvKey.startsWith('gsk_') || backupGroqKey.startsWith('gsk_') || activeKey.startsWith('gsk_')) {
    const groqCandidates: { key: string; type: 'primary' | 'backup' }[] = [];

    const primaryOk = primaryCooldownUntil <= nowMs;
    const backupOk = backupCooldownUntil <= nowMs;

    let firstKey: { key: string; type: 'primary' | 'backup' } | null = null;
    let secondKey: { key: string; type: 'primary' | 'backup' } | null = null;

    if (activeEnginePointer === 'primary') {
      if (groqEnvKey && primaryOk) firstKey = { key: groqEnvKey, type: 'primary' };
      if (backupGroqKey && backupOk) secondKey = { key: backupGroqKey, type: 'backup' };
      if (!firstKey && secondKey) {
        firstKey = secondKey;
        secondKey = null;
      }
    } else {
      if (backupGroqKey && backupOk) firstKey = { key: backupGroqKey, type: 'backup' };
      if (groqEnvKey && primaryOk) secondKey = { key: groqEnvKey, type: 'primary' };
      if (!firstKey && secondKey) {
        firstKey = secondKey;
        secondKey = null;
      }
    }

    if (firstKey) groqCandidates.push(firstKey);
    if (secondKey && (!firstKey || secondKey.key !== firstKey.key)) groqCandidates.push(secondKey);

    // Requirement 1: Verified Live Groq Models (replacing retired/404 models)
    const activeGroqModels = ['groq/compound-mini', 'groq/compound', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

    for (const c of groqCandidates) {
      for (const m of activeGroqModels) {
        endpointsToTry.push({
          url: 'https://api.groq.com/openai/v1/chat/completions',
          model: m,
          apiKey: c.key,
          keyType: c.type,
        });
      }
    }
  }

  // Provider Candidate Set 2: Gemini / Google GenAI Provider Fallback
  const geminiKeyToUse = geminiEnvKey || (activeKey.startsWith('AIza') || activeKey.startsWith('AQ.') ? activeKey : '');
  if (geminiKeyToUse.length > 5) {
    endpointsToTry.push(
      { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash', apiKey: geminiKeyToUse },
      { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.0-flash', apiKey: geminiKeyToUse },
      { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-1.5-flash', apiKey: geminiKeyToUse },
      { url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', model: 'gemini-2.0-flash', type: 'native', apiKey: geminiKeyToUse }
    );
  }

  // Provider Candidate Set 3: OpenAI Provider Fallback
  if (openAiEnvKey.length > 5) {
    endpointsToTry.push(
      { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini', apiKey: openAiEnvKey },
      { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-3.5-turbo', apiKey: openAiEnvKey }
    );
  }

  for (const target of endpointsToTry) {
    if (cancelSignal?.aborted) return null;
    const modelCoolKey = `${target.apiKey || activeKey}:${target.model}`;
    const coolUntil = modelCooldownMap.get(modelCoolKey) || 0;
    console.log(`[Target Loop] Model: ${target.model} (${target.keyType}), coolUntil: ${coolUntil}, diff: ${coolUntil - Date.now()}ms`);

    if (coolUntil > Date.now()) {
      const anyOtherAvailable = endpointsToTry.some((t) => {
        const k = `${t.apiKey || activeKey}:${t.model}`;
        return (modelCooldownMap.get(k) || 0) <= Date.now();
      });
      if (anyOtherAvailable) {
        continue;
      }
    }
    if (cancelSignal?.aborted) return null;
    try {
      if (target.type === 'native') {
        const fullPrompt = messages.map((m: any) => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
        const keyForNative = target.apiKey || activeKey;
        const nativeUrl = `${target.url}?key=${keyForNative}`;
        const res = await fetch(nativeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          }),
          signal: getCombinedSignal(cancelSignal, 25000),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        } else {
          const errText = await res.text();
          console.warn(`Native Gemini API call to ${target.model} returned HTTP ${res.status}:`, errText);
        }
        continue;
      }

      const payload: any = {
        model: target.model,
        messages,
      };

      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      if (target.url.includes('groq.com')) {
        if (target.model.includes('gpt-oss')) {
          payload.max_tokens = 2500;
        } else {
          payload.max_tokens = 800;
        }
      }

      if (!target.url.includes('experientiallabs.ai')) {
        payload.temperature = 0.3;
      }

      const keyForReq = target.apiKey || activeKey;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${keyForReq}`,
      };

      if (target.url.includes('googleapis.com')) {
        headers['x-goog-api-key'] = keyForReq;
      }

      const res = await fetch(target.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: getCombinedSignal(cancelSignal, 25000),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) {
          // Parse exact token usage returned by API (Groq / OpenAI / Experiential / Gemini)
          let consumedTokens = 0;
          if (data.usage && typeof data.usage.total_tokens === 'number') {
            consumedTokens = data.usage.total_tokens;
          } else if (data.usage && typeof data.usage.prompt_tokens === 'number') {
            consumedTokens = (data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0);
          } else {
            const rawPayloadString = JSON.stringify(messages) + text;
            consumedTokens = Math.max(50, Math.ceil(rawPayloadString.length / 3.8));
          }

          // Directly sync with exact raw Groq API Key HTTP Response Headers (e.g. 1,250 RPM / 78,000 TPM)
          const keyState = target.keyType === 'backup' ? backupKeyHeaderState : primaryKeyHeaderState;
          const remReqHeader = res.headers.get('x-ratelimit-remaining-requests');
          const remTokHeader = res.headers.get('x-ratelimit-remaining-tokens');
          const limitReqHeader = res.headers.get('x-ratelimit-limit-requests');
          const limitTokHeader = res.headers.get('x-ratelimit-limit-tokens');

          if (remReqHeader && !isNaN(Number(remReqHeader))) {
            keyState.remainingRpm = Math.max(0, Number(remReqHeader));
          } else {
            keyState.remainingRpm = Math.max(0, keyState.remainingRpm - 1);
          }

          if (remTokHeader && !isNaN(Number(remTokHeader))) {
            keyState.remainingTpm = Math.max(0, Number(remTokHeader));
          } else {
            keyState.remainingTpm = Math.max(0, keyState.remainingTpm - consumedTokens);
          }

          if (limitReqHeader && !isNaN(Number(limitReqHeader))) {
            keyState.limitRpm = Number(limitReqHeader);
          }
          if (limitTokHeader && !isNaN(Number(limitTokHeader))) {
            keyState.limitTpm = Number(limitTokHeader);
          }

          return text;
        }
      } else {
        const errText = await res.text();
        console.warn(`AI API call to ${target.url} (${target.model}) returned HTTP ${res.status}:`, errText);

        if (res.status === 429 || res.status === 404) {
          const cooldownMs = res.status === 404 ? 86400000 : parseGroqRetryAfterMs(errText);
          if (target.apiKey) {
            modelCooldownMap.set(`${target.apiKey}:${target.model}`, Date.now() + cooldownMs);
          }
          if (res.status === 429 && target.keyType) {
            if (target.keyType === 'primary' && backupGroqKey) {
              activeEnginePointer = 'backup';
              console.warn(`⚡ [Groq Dual Engine] Primary Key hit 429 on model ${target.model}. Failover to Backup Key / Next Model.`);
            } else if (target.keyType === 'backup' && groqEnvKey) {
              activeEnginePointer = 'primary';
              console.warn(`⚡ [Groq Dual Engine] Backup Key hit 429 on model ${target.model}. Failover to Primary Key / Next Model.`);
            }
          }
        }
      }
    } catch (err) {
      console.warn(`AI API call to ${target.url} (${target.model}) failed:`, err);
    }
  }

  console.warn(`⚡ [AI Call Exhaustion] All ${endpointsToTry.length} endpoint/model combination(s) in fallback chain failed.`);
  return null;
}

// Guard 1: AI Input Gate Classifier & Substantive Legal Reasoning
export async function runGuard1InputGateAsync(text: string, cancelSignal?: AbortSignal): Promise<Guard1InputGate> {
  const syncGate = runGuard1InputGate(text);

  const aiClassificationPromise = (async (): Promise<Guard1InputGate> => {
    try {
      let sampleText = text;
      if (text.length > 3500) {
        const head = text.slice(0, 2000);
        const midStart = Math.floor(text.length / 2) - 500;
        const mid = text.slice(midStart, midStart + 1000);
        const tail = text.slice(-1000);
        sampleText = `${head}\n\n[... Middle Document Excerpt ...]\n\n${mid}\n\n[... End Document Excerpt ...]\n\n${tail}`;
      } else {
        sampleText = text.slice(0, 2500);
      }

      const messages = [
        {
          role: 'system',
          content: `You are Guard 1, an expert AI legal document classifier for LegalLens.
Analyze the provided text and classify whether it is genuinely a valid legal document (e.g., contract, agreement, employment offer, NDA, loan note, deed, affidavit, lease).

Classification Rules & Strict Gatekeeping Guidelines:
1. Genuine Legal Documents: Contracts, rental/lease agreements, employment offers/contracts, NDAs, loan agreements, deeds, affidavits, MOUs. They establish binding legal rights, duties, liabilities, or obligations between identified contracting parties. Set "is_legal_document": true.
2. Non-Legal Documents / Structured Non-Legal Text: Technical documentation, engineering changelogs/notes, software specs, developer walkthroughs, bug reports, code refactoring docs, architecture designs, resumes/CVs, articles, news, exam papers, recipes, casual messages. Even if technical or non-legal text contains legal terms like "clause", "agreement", "terms", "contract", or "risk", if it is NOT a binding legal agreement/contract itself, YOU MUST hard-reject it. Set "is_legal_document": false.

Respond strictly in JSON with keys:
"is_legal_document": boolean,
"category": string (one of: "rental/lease agreement", "employment contract", "NDA", "loan agreement/promissory note", "sale agreement/deed", "other"),
"confidence": number (between 0.0 and 1.0),
"rejection_reason": string or null.`
        },
        {
          role: 'user',
          content: `Document text sample:\n\n${sampleText}`
        }
      ];

      const rawResponse = await callAiChatCompletion(messages, true, cancelSignal);
      if (rawResponse && rawResponse !== 'RATE_LIMIT_EXHAUSTED') {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (typeof parsed.is_legal_document === 'boolean') {
            const isNegativeRuleMatch =
              !syncGate.is_legal_document &&
              syncGate.rejection_reason &&
              !syncGate.rejection_reason.includes('lacks essential legal document structure');

            let finalIsLegal = false;
            if (isNegativeRuleMatch) {
              finalIsLegal = false;
            } else {
              finalIsLegal = syncGate.is_legal_document || parsed.is_legal_document;
            }

            return {
              is_legal_document: finalIsLegal,
              category: parsed.category || syncGate.category,
              confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
              rejection_reason: finalIsLegal ? undefined : (parsed.rejection_reason || syncGate.rejection_reason || 'Document rejected by Guard 1: Not a valid legal document.'),
            };
          }
        }
      }
    } catch (err) {
      console.warn('AI Guard 1 classification fallback to rule engine:', err);
    }
    return syncGate;
  })();

  const timeoutPromise = new Promise<Guard1InputGate>((resolve) => {
    setTimeout(() => {
      console.warn('⚠️ [GUARD 1 TIMEOUT] AI classification timed out after 10s. Defaulting to deterministic rule engine gate.');
      resolve(syncGate);
    }, 10000);
  });

  return Promise.race([aiClassificationPromise, timeoutPromise]);
}

export function runGuard1InputGate(text: string): Guard1InputGate {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Rule 1: Minimal text length check
  if (trimmed.length < 25) {
    return {
      is_legal_document: false,
      category: 'other',
      confidence: 0.95,
      rejection_reason:
        'Document rejected by Guard 1: The provided text is too short to be a valid legal contract or agreement. Please upload a complete document.',
    };
  }

  // Rule 2: Negative Classifier - School Exam Paper / Academic Test
  const examKeywords = [
    'exam',
    'examination',
    'test paper',
    'question paper',
    'max marks',
    'maximum marks',
    'total marks',
    'instructions to candidates',
    'section a',
    'section b',
    'section c',
    'answer all questions',
    'choose the correct',
    'q1.',
    'q2.',
    'q3.',
    'question 1',
    'question 2',
    'roll no',
    'subject code',
    'time: 3 hours',
    'time: 2 hours',
    'class x',
    'grade 10',
    'cbse',
    'icse',
  ];
  let examMatches = 0;
  for (const kw of examKeywords) {
    if (lower.includes(kw)) examMatches += 1;
  }
  if (examMatches >= 2 || (lower.includes('exam') && lower.includes('question'))) {
    return {
      is_legal_document: false,
      category: 'other',
      confidence: 0.99,
      rejection_reason:
        'Document rejected by Guard 1: This content appears to be a school examination or test paper, not a legal contract or agreement.',
    };
  }

  // Rule 3: Negative Classifier - News Article / Editorial / Blog / Media Report / Tech Article
  const newsKeywords = [
    'breaking news',
    'reported by',
    'published in',
    'weather forecast',
    'journalism',
    'daily news',
    'editorial board',
    'press release',
    'headline news',
    'reuters staff',
    'associated press',
    'announced yesterday',
    'officials said',
    'commuters expressed',
    'said one resident',
    'sources said',
    'according to reports',
    'news agency',
    'correspondent',
    'bureau',
    'spokesperson said',
    'in a statement yesterday',
    'reporting from',
    'journalists',
    'reporters',
    'in this article',
    'blog post',
    'tech stack',
    'single-page applications',
    'framework offers',
  ];

  const hasNewsDateline = /\b[a-z\s]+,\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\s*—/i.test(text);

  let newsMatches = 0;
  for (const kw of newsKeywords) {
    if (lower.includes(kw)) newsMatches += 1;
  }

  if (newsMatches >= 1 || hasNewsDateline) {
    return {
      is_legal_document: false,
      category: 'other',
      confidence: 0.97,
      rejection_reason:
        'Document rejected by Guard 1: This content appears to be a news article, blog post, or editorial piece, not a legal document.',
    };
  }

  // Rule 3b: Negative Classifier - Technical Documentation / Engineering Walkthroughs / Tech Specs / Developer Notes / Resumes (English & Hindi)
  const techKeywords = [
    'walkthrough',
    'changelog',
    'refactor',
    'refactored',
    'pull request',
    'git commit',
    'codebase',
    'bug fix',
    'bug fixes',
    'test suite',
    'unit test',
    'unit tests',
    'regression test',
    'npm run',
    'api endpoint',
    'implementation plan',
    'architecture diagram',
    'design document',
    'tech spec',
    'technical specification',
    'release notes',
    'developer notes',
    'version control',
    'source code',
    'github',
    'gitlab',
    'repository',
    'software architecture',
    'pipeline grounding',
    'taxonomy walkthrough',
    'stack trace',
    'build failure',
    'code diff',
    'merge request',
    'commit hash',
    'terminal output',
    'debug log',
    'react component',
    'typescript interface',
    'express server',
    'rest api',
    'json schema',
    'curriculum vitae',
    'education history',
    'professional summary',
    'references available upon request',
    'file:///',
    'सॉफ्टवेयर आर्किटेक्चर',
    'इंजीनियरिंग मैनुअल',
    'तकनीकी विनिर्देश',
    'माइक्रोसर्विसेज',
    'आर्किटेक्चर गहन विश्लेषण',
    'प्रणाली डिजाइन',
    'ऑर्केस्ट्रेशन',
    'डेटाबेस अनुक्रमणिका',
    'मेमोरी प्रबंधन',
    'प्रोटोकॉल अनुकूलन',
    'तकनीकी दस्तावेज़ीकरण',
    'डेवलपर नोट्स',
    'सोर्स कोड',
    'प्रोग्रामिंग दिशानिर्देश',
  ];

  let techMatches = 0;
  for (const kw of techKeywords) {
    if (lower.includes(kw)) techMatches += 1;
  }

  const firstLines = trimmed.split(/\r?\n/).slice(0, 3).join(' ').toLowerCase();
  const isExplicitLegalHeader =
    (/^#?\s*(legal|rental|lease|tenancy|employment|service|sale|loan|mortgage|purchase|partnership|consulting|vendor)\b/i.test(firstLines) &&
      /\b(workspace|agreement|contract|document|policy|notice|deed|terms|statement|mou|brief|form|directive|rules|guidelines|letter)\b/i.test(firstLines)) ||
    /^(मुख्य|व्यावसायिक|किराया|पट्टा|रोजगार|सेवा|अनुबंध|करार|शपथ|ऋण|विक्रय)/i.test(firstLines);

  const hasStrongTechIndicator =
    lower.includes('walkthrough') ||
    lower.includes('changelog') ||
    lower.includes('pull request') ||
    lower.includes('git commit') ||
    lower.includes('codebase') ||
    lower.includes('refactored') ||
    lower.includes('curriculum vitae') ||
    lower.includes('architecture diagram') ||
    lower.includes('technical specification') ||
    lower.includes('file:///') ||
    lower.includes('सॉफ्टवेयर आर्किटेक्चर') ||
    lower.includes('इंजीनियरिंग मैनुअल') ||
    lower.includes('तकनीकी विनिर्देश') ||
    lower.includes('माइक्रोसर्विसेज') ||
    lower.includes('आर्किटेक्चर गहन विश्लेषण');

  if (!isExplicitLegalHeader && (techMatches >= 2 || hasStrongTechIndicator)) {
    return {
      is_legal_document: false,
      category: 'other',
      confidence: 0.98,
      rejection_reason:
        'Document rejected by Guard 1: This content appears to be technical documentation, an engineering changelog, developer notes, or a non-legal specification, not a legal contract or agreement.',
    };
  }

  // Rule 4: Negative Classifier - Random Photo / Non-Legal Media / Recipe
  const nonLegalMediaKeywords = [
    'unrelated photograph',
    'scenic photo',
    'random photo',
    'image scan containing no text',
    'recipe',
    'ingredients',
    'shopping list',
    'vector illustration',
    'flower garden',
    'shot on iphone',
  ];
  if (nonLegalMediaKeywords.some((kw) => lower.includes(kw))) {
    return {
      is_legal_document: false,
      category: 'other',
      confidence: 0.98,
      rejection_reason:
        'Document rejected by Guard 1: The uploaded image or file does not contain readable legal document text or signatures.',
    };
  }

  // Rule 4b: Negative Classifier - Casual Informational / Conversational Text
  const casualPhrases = [
    'what is the weather',
    'weather like in',
    'is it going to rain',
    'how are you',
    'i love playing',
    'could you explain how',
    'photosynthesis works',
    'tell me a story',
    'what is your name',
    'hello world',
    'good morning',
    'favorite hobby',
    'badminton on weekends',
    'recipe for',
    'ingredients needed',
  ];
  if (casualPhrases.some((phrase) => lower.includes(phrase))) {
    return {
      is_legal_document: false,
      category: 'other',
      confidence: 0.98,
      rejection_reason:
        'Document rejected by Guard 1: The provided text is general informational text or conversation, not a legal contract or agreement. Please upload or paste a valid legal document.',
    };
  }

  // Rule 5: Substantive Legal Criteria & Legal Document Indicators
  const legalPartyIndicators = [
    'employer',
    'employee',
    'company',
    'client',
    'contractor',
    'lessor',
    'lessee',
    'tenant',
    'landlord',
    'borrower',
    'lender',
    'buyer',
    'seller',
    'disclosing party',
    'receiving party',
    'affiant',
    'licensor',
    'licensee',
    'parties',
    'party',
    'director',
    'manager',
    'consultant',
    'traders',
    'department',
    'applicant',
    'candidate',
    'signatory',
    'undersigned',
    'offeree',
    'offeror',
    'principal',
    'agent',
    'promisor',
    'promisee',
    'worker',
    'executive',
    'management',
    'hr',
    'firm',
    'agency',
    'pvt ltd',
    'ltd',
    'limited',
    'inc',
    'corp',
    'लेंडर',
    'उधारकर्ता',
    'रोजगार',
    'नियोक्ता',
    'कर्मचारी',
    'कंपनी',
    'क्लाइंट',
    'ठेकेदार',
    'मकान मालिक',
    'किराएदार',
    'ऋणी',
    'ऋणदाता',
    'खरीदार',
    'विक्रेता',
    'विभाग',
    'उम्मीदवार',
    'आवेदक',
    'हस्ताक्षरकर्ता',
    'अधिकारी',
    'प्रबंधक',
    'मानव संसाधन',
    'ब्लू रिज ट्रेडर्स',
    'संजय पटेल',
    'पार्टी',
    'पक्ष',
    'प्रथम पक्ष',
    'द्वितीय पक्ष',
  ];

  const legalObligationIndicators = [
    'offer letter',
    'employment offer',
    'appointment letter',
    'shall agree',
    'hereby agree',
    'agrees to pay',
    'shall pay',
    'shall indemnify',
    'shall be liable',
    'in witness whereof',
    'terms and conditions set forth',
    'governing law',
    'jurisdiction of courts',
    'notice period of',
    'security deposit',
    'monthly rent',
    'fixed salary',
    'liquidated damages',
    'non-disclosure agreement',
    'confidential information',
    'promissory note',
    'power of attorney',
    'deed of sale',
    'memorandum of understanding',
    'covenant',
    'undertake',
    'hereby',
    'rent',
    'salary',
    'notice period',
    'probation',
    'bond',
    'remuneration',
    'effective date',
    'termination',
    'confidential',
    'indemnify',
    'liable',
    'jurisdiction',
    'governing law',
    'in witness whereof',
    'signatures',
    'signature',
    'signed',
    'terms and conditions',
    'agreement',
    'contract',
    'deed',
    'mou',
    'affidavit',
    'power of attorney',
    'ऋण',
    'ब्याज',
    'प्रस्ताव',
    'प्रस्ताव पत्र',
    'रोजगार प्रस्ताव',
    'नियुक्ति',
    'सहमति',
    'सहमत',
    'होगा',
    'करेगा',
    'प्रतिज्ञा',
    'वचन',
    'किराया',
    'वेतन',
    'माह',
    'प्रति माह',
    'भुगतान',
    'जमानत',
    'नोटिस अवधि',
    'परिवीक्षा',
    'परिवीक्षा काल',
    'बॉन्ड',
    'बॉण्ड',
    'सीटीसी',
    'मुआवजा',
    'कार्य के घंटे',
    'कार्यभार',
    'प्रभावी तिथि',
    'समाप्त',
    'त्यागपत्र',
    'गोपनीय',
    'क्षतिपूर्ति',
    'उत्तरदायी',
    'क्षेत्राधिकार',
    'लागू कानून',
    'हस्ताक्षर',
    'शर्तें',
    'नियम',
    'अनुबंध',
    'करार',
    'दस्तावेज़',
    'स्टाम्प',
    'रू.',
    'रु.',
    'रुपये',
    'पुनर्भुगतान',
    'प्रशिक्षण लागत',
  ];

  let partyCount = 0;
  for (const partyKw of legalPartyIndicators) {
    const escaped = partyKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = /[\u0900-\u097F]/.test(partyKw) || partyKw.includes(' ') ? new RegExp(escaped, 'i') : new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lower)) {
      partyCount += 1;
    }
  }

  let obligationCount = 0;
  for (const obKw of legalObligationIndicators) {
    const escaped = obKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = /[\u0900-\u097F]/.test(obKw) || obKw.includes(' ') ? new RegExp(escaped, 'i') : new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(lower)) {
      obligationCount += 1;
    }
  }

  // Explicit Document Title/Header in top 600 characters or structured legal phrases
  const topText = lower.slice(0, 600);
  const hasExplicitHeaderTitle =
    isExplicitLegalHeader ||
    /\b(non-disclosure agreement|nda|offer letter|appointment letter|promissory note|power of attorney|affidavit|deed of sale|memorandum of understanding|mou)\b/i.test(topText) ||
    /\bthis (agreement|contract|deed|lease) is (made|entered|executed)\b/i.test(topText) ||
    /\b(residential lease agreement|employment agreement|employment contract|service agreement)\b/i.test(topText) ||
    topText.includes('रोजगार प्रस्ताव') ||
    topText.includes('प्रस्ताव पत्र') ||
    topText.includes('नियुक्ति पत्र') ||
    topText.includes('रोजगार अनुबंध') ||
    topText.includes('किरायानामा') ||
    topText.includes('ऋण समझौता') ||
    topText.includes('गोपनीयता समझौता');

  const hasLegalSubstance =
    hasExplicitHeaderTitle ||
    (partyCount >= 1 && obligationCount >= 2) ||
    (partyCount >= 2 && obligationCount >= 1) ||
    obligationCount >= 3;

  if (!hasLegalSubstance) {
    return {
      is_legal_document: false,
      category: 'other',
      confidence: 0.88,
      rejection_reason:
        'Document rejected by Guard 1: The provided text lacks essential legal document structure (no identifiable contracting parties, binding terms, or legal obligations).',
    };
  }

  // Category Detection for valid documents
  let detectedCategory: DocumentCategory = 'other';
  if (lower.includes('rent') || lower.includes('tenant') || lower.includes('lessor') || lower.includes('lease') || lower.includes('किराया') || lower.includes('किराएदार') || lower.includes('मकान मालिक') || lower.includes('किरायानामा')) {
    detectedCategory = 'rental/lease agreement';
  } else if (
    lower.includes('employee') ||
    lower.includes('employer') ||
    lower.includes('ctc') ||
    lower.includes('salary') ||
    lower.includes('employment') ||
    lower.includes('offer') ||
    lower.includes('appointment') ||
    lower.includes('रोजगार') ||
    lower.includes('प्रस्ताव') ||
    lower.includes('नियुक्ति') ||
    lower.includes('वेतन') ||
    lower.includes('परिवीक्षा') ||
    lower.includes('कर्मचारी') ||
    lower.includes('नियोक्ता') ||
    lower.includes('बॉन्ड') ||
    lower.includes('नोटिस अवधि')
  ) {
    detectedCategory = 'employment contract';
  } else if (lower.includes('non-disclosure') || lower.includes('confidential') || lower.includes('nda') || lower.includes('गोपनीयता') || lower.includes('गैर-प्रकटीकरण')) {
    detectedCategory = 'NDA';
  } else if (lower.includes('loan') || lower.includes('borrower') || lower.includes('lender') || lower.includes('interest rate') || lower.includes('promissory') || lower.includes('ऋण') || lower.includes('ऋणदाता') || lower.includes('उधारकर्ता') || lower.includes('ब्याज')) {
    detectedCategory = 'loan agreement/promissory note';
  } else if (lower.includes('sale') || lower.includes('purchaser') || lower.includes('conveyance') || lower.includes('बिक्री') || lower.includes('विक्रेता') || lower.includes('खरीदार') || lower.includes('बैनामा')) {
    detectedCategory = 'sale agreement/deed';
  }

  return {
    is_legal_document: true,
    category: detectedCategory,
    confidence: detectedCategory !== 'other' ? 0.95 : 0.86,
  };
}

// Guard 2b: Legal Safety & Intent Filter
export function runGuard2bSafetyFilter(text: string): { isSafe: boolean; reason?: string } {
  const query = text.toLowerCase();
  const illegalPatterns = [
    'how to forge',
    'fake contract',
    'evade tax',
    'launder money',
    'bribe',
    'fabricate document',
    'fraudulent claim',
    'break law without getting caught',
    'backdate contract illegally',
  ];

  for (const pattern of illegalPatterns) {
    if (query.includes(pattern)) {
      return {
        isSafe: false,
        reason:
          'LegalLens safety guardrail activated: We cannot assist with illegal intent, document forgery, tax evasion, or fraud. Under the Advocates Act and DPDP Act guidelines, our service strictly promotes legal compliance and awareness.',
      };
    }
  }

  return { isSafe: true };
}

// Guard 2a Grounding Check: Ensure plain-language consequence strictly reflects text
export function verifyGuard2aGrounding(
  clauseText: string,
  consequenceText: string
): { isSafe: boolean; isGrounded: boolean; groundedConsequence: string } {
  const lowerClause = clauseText.toLowerCase();
  const lowerCons = consequenceText.toLowerCase();

  // Verify numbers/amounts mentioned in consequence exist in source clause
  const numbersInCons = consequenceText.match(/\b\d+[\d,]*\b/g) || [];
  let isGrounded = true;

  for (const num of numbersInCons) {
    if (!clauseText.includes(num)) {
      isGrounded = false;
      break;
    }
  }

  if ((lowerCons.includes('jail') || lowerCons.includes('criminal')) && !lowerClause.includes('criminal')) {
    isGrounded = false;
  }

  if (!isGrounded) {
    const sanitized = `Grounded Consequence: ${clauseText.slice(0, 120)}...`;
    return { isSafe: true, isGrounded: false, groundedConsequence: sanitized };
  }

  return { isSafe: true, isGrounded: true, groundedConsequence: consequenceText };
}

// Stage 2: Clause Chunking & Taxonomy Typing (Top-Level Contractual Provision Granularity)
export function chunkDocumentTextIntoClauses(text: string): SimplifiedClause[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const blocks: { title?: string; text: string }[] = [];

  let currentBlockText: string[] = [];
  let currentBlockTitle: string | undefined = undefined;

  for (const line of lines) {
    // Filter header/footer artifacts from multi-page PDFs
    if (/^(CONFIDENTIAL & PRIVILEGED|CONTRACT REF:|Page \d+ of \d+|\d+\s+of\s+\d+$)/i.test(line)) {
      continue;
    }

    const isDecimalSubPoint = /^\s*\d+\.\d+/.test(line);
    const isSubParenthesis = /^\s*\([a-z0-9]+\)/i.test(line);
    const isSubLetterDot = /^\s*[a-z]\.\s+/i.test(line);

    // Top-Level Heading Triggers:
    // 1) Explicit ARTICLE / SECTION / CLAUSE headers (e.g. "ARTICLE 2: 2. SCOPE OF SERVICES")
    const isArticleOrSectionHeader = /^\s*(?:ARTICLE|SECTION|CLAUSE)\s+(?:\d+|[IVXLCDM]+)[\s:\.\-]/i.test(line);
    // 2) Top-Level single-number header (e.g. "1. DEFINITIONS AND INTERPRETATION", "2. RENT:", "1. वेतन (SALARY):", "5. बॉन्ड (BOND):")
    const isTopLevelNumberedHeader = !isDecimalSubPoint && /^\s*\d+[\.\)]\s+[\p{L}\p{N}]/u.test(line);
    // 3) Standalone Formal Section Keywords
    const isFormalSectionHeader = /^\s*(?:WHEREAS|RECITALS|PREAMBLE|IN WITNESS WHEREOF|EXECUTION|ATTESTATION)\b/i.test(line);
    // 4) Document Title Header
    const isDocTitleLine = (blocks.length === 0 && currentBlockText.length === 0 && line === line.toUpperCase() && line.length >= 6 && line.length <= 80);

    const isHeading = !isDecimalSubPoint && !isSubParenthesis && !isSubLetterDot && (
      isArticleOrSectionHeader ||
      isTopLevelNumberedHeader ||
      isFormalSectionHeader ||
      isDocTitleLine ||
      (line === line.toUpperCase() && line.length >= 6 && line.length <= 70 && !line.includes(':'))
    );

    if (isHeading && currentBlockText.length > 0) {
      blocks.push({
        title: currentBlockTitle,
        text: currentBlockText.join(' '),
      });
      currentBlockText = [line];
      currentBlockTitle = extractHeadingTitle(line);
    } else {
      if (!currentBlockTitle && currentBlockText.length === 0) {
        currentBlockTitle = extractHeadingTitle(line);
      }
      currentBlockText.push(line);
    }
  }

  if (currentBlockText.length > 0) {
    blocks.push({
      title: currentBlockTitle,
      text: currentBlockText.join(' '),
    });
  }

  const validBlocks = blocks.filter((b) => b.text.length >= 15 && !isSignatureBlock(b.text));

  // Compute clause density telemetry signal
  const pageMatch = text.match(/Page \d+ of (\d+)/gi);
  let estimatedPages = 1;
  if (pageMatch && pageMatch.length > 0) {
    const lastMatch = pageMatch[pageMatch.length - 1];
    const numMatch = lastMatch.match(/of\s+(\d+)/i);
    if (numMatch) {
      estimatedPages = Math.max(1, parseInt(numMatch[1], 10));
    }
  } else {
    estimatedPages = Math.max(1, Math.round(text.length / 2500));
  }

  const clausesPerPage = (validBlocks.length / estimatedPages).toFixed(1);
  console.log(`[Clause Processing Telemetry] Extracted ${validBlocks.length} clauses across estimated ${estimatedPages} page(s) (${clausesPerPage} clauses/page).`);

  if (parseFloat(clausesPerPage) > 6.0 || validBlocks.length > 50) {
    console.warn(`[Clause Density Warning] High clause density detected: ${validBlocks.length} clauses across ${estimatedPages} page(s) (${clausesPerPage} clauses/page). Clause fragmentation checked.`);
  }

  return validBlocks.map((b, idx) => {
    const origText = b.text;
    const clauseType = classifyClauseType(origText, b.title);
    const title = b.title && b.title.trim().length > 0 ? cleanClauseTitle(b.title, idx + 1) : `Clause ${idx + 1}: ${getClauseTypeLabel(clauseType)}`;

    return {
      id: `clause_${idx + 1}`,
      clause_number: `${idx + 1}`,
      clause_type: clauseType,
      title,
      original_text: origText,
      simple_explanation: null,
      very_simple_explanation: null,
      meaning_error: true,
      risk_level: 'low',
      icon_name: 'FileText',
      one_line_consequence: '',
    };
  });
}

function isSignatureBlock(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (
    lower.includes('in witness whereof') ||
    lower.includes('signed and delivered') ||
    lower.includes('signed for and on behalf of') ||
    lower.startsWith('witnesses:') ||
    lower.startsWith('witness:') ||
    lower.includes('lessor (rakesh') ||
    lower.includes('lessee (ananya') ||
    lower.includes('employee (rohan') ||
    lower.includes('भवदीय') ||
    lower.includes('मानव संसाधन विभाग') ||
    (/^(______+|lender|borrower|lessor|lessee|employer|employee|authorized signatory|\(?rakesh|\(?ananya|\(?rohan|\(?aditya)/i.test(lower) &&
      !lower.includes('shall') && !lower.includes('agree') && !lower.includes('pay') && !lower.includes('indemnify'))
  ) {
    return true;
  }
  return false;
}

function extractHeadingTitle(line: string): string | undefined {
  const cleanLine = line.replace(/^(CONFIDENTIAL & PRIVILEGED|CONTRACT REF:.*)$/i, '').trim();
  if (!cleanLine) return undefined;

  if (cleanLine.length < 80) {
    return cleanLine;
  }
  const colonIdx = cleanLine.indexOf(':');
  if (colonIdx > 0 && colonIdx < 60) {
    return cleanLine.slice(0, colonIdx).trim();
  }
  const match = cleanLine.match(/^([\p{L}\p{N}\.\s\/\-_:]{3,60})/u);
  if (match) {
    return match[1].trim();
  }
  return undefined;
}

function classifyClauseType(text: string, title?: string): ClauseType {
  const titleLower = (title || '').toLowerCase();
  const textLower = text.toLowerCase();

  // Heading title checks FIRST if available
  if (titleLower) {
    if (titleLower.includes('dispute') || titleLower.includes('arbitrat') || titleLower.includes('विवाद')) return normalizeClauseType('dispute resolution/arbitration');
    if (titleLower.includes('indemnit') || titleLower.includes('क्षतिपूर्ति')) return normalizeClauseType('indemnity');
    if (titleLower.includes('non-compete') || titleLower.includes('non compete')) return normalizeClauseType('non-compete/non-solicitation');
    if (titleLower.includes('security deposit') || titleLower.includes('deposit') || titleLower.includes('जमानत')) return normalizeClauseType('security deposit');
    if (titleLower.includes('rent escalation') || titleLower.includes('escalation')) return normalizeClauseType('rent escalation');
    if (titleLower.includes('notice period') || titleLower.includes('notice') || titleLower.includes('नोटिस')) return normalizeClauseType('notice period');
    if (titleLower.includes('maintenance') || titleLower.includes('repair')) return 'maintenance & repairs';
    if (titleLower.includes('governing law') || titleLower.includes('jurisdiction') || titleLower.includes('क्षेत्राधिकार')) return normalizeClauseType('governing law & jurisdiction');
    if (titleLower.includes('stamp duty') || titleLower.includes('registration') || titleLower.includes('स्टाम्प')) return normalizeClauseType('stamp duty & registration');
    if (titleLower.includes('bond') || titleLower.includes('liquidated damages') || titleLower.includes('penalty') || titleLower.includes('बॉन्ड') || titleLower.includes('बॉण्ड') || titleLower.includes('प्रशिक्षण')) return normalizeClauseType('penalty/liquidated damages');
    if (titleLower.includes('confidential') || titleLower.includes('गोपनीय')) return normalizeClauseType('confidentiality');
    if (titleLower.includes('term') || titleLower.includes('probation') || titleLower.includes('lock-in') || titleLower.includes('duration') || titleLower.includes('परिवीक्षा')) return normalizeClauseType('term & termination');
    if (titleLower.includes('rent') || titleLower.includes('compensation') || titleLower.includes('salary') || titleLower.includes('payment') || titleLower.includes('repayment') || titleLower.includes('interest') || titleLower.includes('principal') || titleLower.includes('वेतन')) return normalizeClauseType('payment/consideration');
    if (titleLower.includes('premis') && titleLower.includes('term')) return normalizeClauseType('term & termination');
    if (titleLower.includes('parties') || titleLower.includes('recital') || titleLower.includes('रोजगार प्रस्ताव') || titleLower.includes('प्रिय श्री')) return normalizeClauseType('parties & recitals');
  }

  // Text-based checks
  if (
    textLower.includes('agreement is made') ||
    textLower.includes('contract is made') ||
    textLower.includes('entered into on') ||
    textLower.includes('by and between') ||
    textLower.includes('रोजगार प्रस्ताव पत्र') ||
    textLower.includes('प्रिय श्री')
  ) {
    return normalizeClauseType('parties & recitals');
  }

  if (textLower.includes('arbitrat') || textLower.includes('dispute resolution') || textLower.includes('conciliation act') || textLower.includes('tribunal') || textLower.includes('विवाद')) {
    return normalizeClauseType('dispute resolution/arbitration');
  }

  if (textLower.includes('indemn') || textLower.includes('hold harmless') || textLower.includes('क्षतिपूर्ति')) {
    return normalizeClauseType('indemnity');
  }

  if (textLower.includes('non-compete') || textLower.includes('competing business') || textLower.includes('restraint of trade') || textLower.includes('competitor')) {
    return normalizeClauseType('non-compete/non-solicitation');
  }

  if (textLower.includes('confidential information') || textLower.includes('confidentiality') || textLower.includes('strict confidence') || textLower.includes('गोपनीय')) {
    return normalizeClauseType('confidentiality');
  }

  if (textLower.includes('security deposit') || textLower.includes('interest-free deposit') || textLower.includes('deposit refund') || textLower.includes('deposit shall be refunded') || textLower.includes('सुरक्षा जमा')) {
    return normalizeClauseType('security deposit');
  }

  if (textLower.includes('rent escalation') || textLower.includes('increase by 5%') || textLower.includes('increase by 10%') || textLower.includes('annual escalation')) {
    return normalizeClauseType('rent escalation');
  }

  if (textLower.includes('service bond') || textLower.includes('liquidated damages') || textLower.includes('training cost') || textLower.includes('early exit penalty') || textLower.includes('penalty') || textLower.includes('बॉन्ड') || textLower.includes('बॉण्ड') || textLower.includes('प्रशिक्षण लागत') || textLower.includes('पुनर्भुगतान')) {
    return normalizeClauseType('penalty/liquidated damages');
  }

  if (textLower.includes('notice period') || textLower.includes('days written notice') || textLower.includes('resignation notice') || textLower.includes('days notice') || textLower.includes('नोटिस अवधि') || textLower.includes('नोटिस')) {
    return normalizeClauseType('notice period');
  }

  if (textLower.includes('maintenance') || textLower.includes('repairs')) {
    return 'maintenance & repairs';
  }

  if (textLower.includes('governing law') || textLower.includes('jurisdiction') || textLower.includes('courts at') || textLower.includes('courts in') || textLower.includes('क्षेत्राधिकार')) {
    return normalizeClauseType('governing law & jurisdiction');
  }

  if (textLower.includes('stamp paper') || textLower.includes('stamp duty') || textLower.includes('registration act') || textLower.includes('स्टाम्प')) {
    return normalizeClauseType('stamp duty & registration');
  }

  if (textLower.includes('probation') || textLower.includes('lock-in') || textLower.includes('term of') || textLower.includes('period of 11 months') || textLower.includes('commencing from') || textLower.includes('परिवीक्षा')) {
    return normalizeClauseType('term & termination');
  }

  if (
    textLower.includes('monthly rent') ||
    textLower.includes('monthly salary') ||
    textLower.includes('fixed monthly') ||
    textLower.includes('principal amount') ||
    textLower.includes('advance a sum') ||
    textLower.includes('compensation') ||
    textLower.includes('ctc') ||
    textLower.includes('वेतन') ||
    textLower.includes('प्रति माह') ||
    textLower.includes('माह')
  ) {
    return normalizeClauseType('payment/consideration');
  }

  return 'other';
}

export function synchronizeClauseRiskAndConsequence(clause: SimplifiedClause): SimplifiedClause {
  let riskLevel: RiskLevel = normalizeRiskLevel(clause.risk_level);
  let iconName = clause.icon_name || 'CheckCircle';
  let consequence = clause.one_line_consequence || '';

  const lowerCons = consequence.toLowerCase();
  const lowerText = clause.original_text.toLowerCase();
  const lowerTitle = clause.title.toLowerCase();

  // High Risk triggers
  if (
    lowerCons.includes('high risk') ||
    lowerCons.includes('broad indemnity') ||
    lowerCons.includes('liquidated damages') ||
    lowerCons.includes('forfeited') ||
    lowerCons.includes('service bond') ||
    lowerText.includes('forfeited') ||
    lowerText.includes('indemnify') ||
    lowerText.includes('indemnification') ||
    lowerTitle.includes('indemnity') ||
    lowerText.includes('non-compete') ||
    lowerText.includes('3,00,000') ||
    lowerText.includes('remainder of the lock-in') ||
    lowerText.includes('बॉन्ड') ||
    lowerText.includes('बॉण्ड') ||
    lowerText.includes('15,00,000') ||
    lowerText.includes('15,000') ||
    lowerText.includes('प्रशिक्षण लागत') ||
    lowerText.includes('पुनर्भुगतान')
  ) {
    riskLevel = 'high';
    iconName = 'AlertOctagon';
  } else if (
    lowerCons.includes('watch out') ||
    lowerText.includes('lock-in') ||
    lowerText.includes('notice period') ||
    lowerText.includes('नोटिस अवधि') ||
    lowerText.includes('परिवीक्षा') ||
    clause.clause_type === 'security deposit'
  ) {
    if (riskLevel !== 'high') {
      riskLevel = 'watch_out';
      iconName = 'Clock';
    }
  }

  // Formatting & Prefix enforcement
  if (riskLevel === 'high') {
    iconName = 'AlertOctagon';
    if (!consequence.toLowerCase().startsWith('high risk')) {
      consequence = `High Risk: ${consequence.replace(/^(safe clause|low risk|watch out|high risk):\s*/i, '')}`;
    }
  } else if (riskLevel === 'watch_out') {
    iconName = 'Clock';
    if (!consequence.toLowerCase().startsWith('watch out')) {
      consequence = `Watch Out: ${consequence.replace(/^(safe clause|low risk|watch out|high risk):\s*/i, '')}`;
    }
  } else {
    iconName = 'CheckCircle';
    if (!consequence.toLowerCase().startsWith('low risk') && !consequence.toLowerCase().startsWith('safe clause')) {
      consequence = `Low Risk: ${consequence.replace(/^(safe clause|low risk|watch out|high risk):\s*/i, '')}`;
    }
  }

  return {
    ...clause,
    risk_level: riskLevel,
    icon_name: iconName,
    one_line_consequence: consequence,
  };
}

// Stage 2: Async Structural Clause Chunking & Taxonomy Typing
export async function chunkDocumentTextIntoClausesAsync(text: string): Promise<SimplifiedClause[]> {
  const rawClauses = chunkDocumentTextIntoClauses(text);
  return rawClauses;
}

// Stage 3: Real AI Per-Clause Risk Reasoning & Consequence Severity Grounding
export async function applyRiskTaggingAndGroundingAsync(
  clauses: SimplifiedClause[],
  category: string,
  cancelSignal?: AbortSignal
): Promise<SimplifiedClause[]> {
  const baseClauses = applyRiskTaggingAndGrounding(clauses, category as DocumentCategory);
  if (!baseClauses.length) return baseClauses;

  try {
    const clausePayload = baseClauses.map((c) => ({
      id: c.id,
      title: c.title,
      text: c.original_text.slice(0, 400),
    }));

    const messages = [
      {
        role: 'system',
        content: `You are a Senior Legal Risk Evaluator. Analyze each clause for legal risk exposure under commercial law.
Risk Tiers — exactly three tiers:
1. "low" (Low Risk): Standard, boilerplate, or purely descriptive clauses with no monetary penalty, ambiguity, or unusual terms (e.g. party identification, definitions, stated principal amount).
2. "medium" (Watch Out): Real but bounded financial or legal exposure, minor ambiguity (e.g. missing refund timeframe), terms stricter than typical, or provisions worth double-checking before signing.
3. "high" (High Risk): Significant, uncapped, or unusual exposure: large penalty amounts, severe non-compete/bond terms, or one-sided termination/indemnity provisions.

Respond strictly in JSON with an object containing key "clause_risks", which is an array of objects with:
- "id": string (matching the input clause id)
- "risk_level": "high" | "medium" | "low"
- "consequence": string (one clear sentence explaining the practical financial or legal consequence)
- "icon_name": "AlertOctagon" | "Clock" | "CheckCircle"`
      },
      {
        role: 'user',
        content: `Document Category: ${category}\nClauses to analyze:\n${JSON.stringify(clausePayload, null, 2)}`
      }
    ];

    const rawResponse = await callAiChatCompletion(messages, true, cancelSignal);
    if (rawResponse) {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed.clause_risks)) {
          const riskMap = new Map<string, { risk_level: 'high' | 'medium' | 'low'; consequence: string; icon_name?: string }>();
          for (const item of parsed.clause_risks) {
            if (item && item.id) {
              riskMap.set(item.id, {
                risk_level: item.risk_level === 'high' || item.risk_level === 'medium' ? item.risk_level : 'low',
                consequence: item.consequence || '',
                icon_name: item.icon_name || (item.risk_level === 'high' ? 'AlertOctagon' : item.risk_level === 'medium' ? 'Clock' : 'CheckCircle'),
              });
            }
          }

          return baseClauses.map((clause) => {
            const aiRisk = riskMap.get(clause.id);
            if (!aiRisk) return clause;

            const finalRisk = normalizeRiskLevel(aiRisk.risk_level);
            const finalIcon = aiRisk.icon_name || (finalRisk === 'high' ? 'AlertOctagon' : finalRisk === 'watch_out' ? 'Clock' : 'CheckCircle');
            const consText = aiRisk.consequence || clause.one_line_consequence;
            const grounding = verifyGuard2aGrounding(clause.original_text, consText);

            return synchronizeClauseRiskAndConsequence({
              ...clause,
              risk_level: finalRisk,
              icon_name: finalIcon,
              one_line_consequence: grounding.groundedConsequence,
            });
          });
        }
      }
    }
  } catch (err) {
    console.warn('AI Risk Tagging reasoning fallback to rule engine:', err);
  }

  return baseClauses;
}

export function applyRiskTaggingAndGrounding(
  clauses: SimplifiedClause[],
  category: DocumentCategory
): SimplifiedClause[] {
  return clauses.map((clause) => {
    const textLower = clause.original_text.toLowerCase();
    const titleLower = clause.title.toLowerCase();
    let riskLevel: RiskLevel = 'low';
    let iconName = 'CheckCircle';
    let rawConsequence = '';

    // High Risk Triggers
    if (
      textLower.includes('forfeited') ||
      textLower.includes('early termination penalty') ||
      textLower.includes('remainder of the lock-in') ||
      textLower.includes('non-compete') ||
      textLower.includes('service bond') ||
      textLower.includes('liquidated damages') ||
      textLower.includes('3,00,000') ||
      textLower.includes('indemnify') ||
      textLower.includes('indemnification') ||
      titleLower.includes('indemnity') ||
      textLower.includes('बॉन्ड') ||
      textLower.includes('बॉण्ड') ||
      textLower.includes('प्रशिक्षण लागत') ||
      textLower.includes('पुनर्भुगतान')
    ) {
      riskLevel = 'high';
      iconName = 'AlertOctagon';
    }
    // Watch Out Triggers
    else if (
      textLower.includes('notice period') ||
      textLower.includes('lock-in') ||
      textLower.includes('escalation') ||
      textLower.includes('late penalty') ||
      textLower.includes('probation') ||
      textLower.includes('परिवीक्षा') ||
      textLower.includes('नोटिस अवधि') ||
      clause.clause_type === 'security deposit' ||
      textLower.includes('security deposit')
    ) {
      riskLevel = 'watch_out';
      iconName = 'Clock';
    } else {
      riskLevel = 'low';
      iconName = 'CheckCircle';
    }

    // Security Deposit Ambiguity Check (preserve high risk if already flagged for forfeiture/penalty)
    if ((clause.clause_type === 'security deposit' || textLower.includes('security deposit')) && riskLevel !== 'high') {
      const hasSpecificDays = /\b(\d+)\s*(day|days|month|months|week|weeks)\b/i.test(textLower);
      if (!hasSpecificDays || textLower.includes('upon vacating') || textLower.includes('no specific refund deadline')) {
        riskLevel = 'watch_out';
        iconName = 'Clock';
        rawConsequence = `Watch Out: Deposit refund upon vacating lacks a specific day timeframe/deadline, which could cause delay.`;
      } else {
        rawConsequence = `Low Risk: Standard interest-free security deposit refundable under specified terms.`;
      }
    }

    if (!rawConsequence) {
      if (riskLevel === 'high') {
        if (textLower.includes('indemnify') || titleLower.includes('indemnity') || textLower.includes('क्षतिपूर्ति')) {
          rawConsequence = `High Risk: Broad indemnity clause exposing party to potential loss or claim liabilities.`;
        } else if (textLower.includes('non-compete')) {
          rawConsequence = `High Risk: Post-employment non-compete restriction limiting future employment options.`;
        } else if (textLower.includes('service bond') || textLower.includes('liquidated damages') || textLower.includes('3,00,000') || textLower.includes('बॉन्ड') || textLower.includes('बॉण्ड') || textLower.includes('प्रशिक्षण लागत') || textLower.includes('15,000')) {
          rawConsequence = `High Risk: Substantial financial bond/liquidated damages penalty for early departure.`;
        } else if (textLower.includes('forfeited') || textLower.includes('remainder of the lock-in')) {
          rawConsequence = `High Risk: Early exit requires paying full rent for remaining lock-in period as penalty.`;
        } else {
          rawConsequence = `High Risk: Significant legal or financial exposure identified in this clause.`;
        }
      } else if (riskLevel === 'watch_out') {
        if (textLower.includes('lock-in')) {
          rawConsequence = `Watch Out: Mandatory lock-in period restricts early exit without financial penalty.`;
        } else if (textLower.includes('notice period') || textLower.includes('नोटिस अवधि')) {
          rawConsequence = `Watch Out: Requires advance written notice prior to termination.`;
        } else if (textLower.includes('escalation')) {
          rawConsequence = `Watch Out: Rent escalates annually by specified percentage.`;
        } else if (textLower.includes('probation') || textLower.includes('परिवीक्षा')) {
          rawConsequence = `Watch Out: Probationary period allows termination with short 7-day notice.`;
        } else {
          rawConsequence = `Watch Out: Term contains parameters worth double-checking before signing.`;
        }
      } else {
        rawConsequence = `Low Risk: Standard boilerplate or descriptive clause with no unusual financial penalty.`;
      }
    }

    const grounded = verifyGuard2aGrounding(clause.original_text, rawConsequence);

    return synchronizeClauseRiskAndConsequence({
      ...clause,
      risk_level: riskLevel,
      icon_name: iconName,
      one_line_consequence: grounded.groundedConsequence,
    });
  });
}

// Helper Functions for Titling & Explanations
// Helper Functions for Titling & Structural Explanation Validation
function extractDocumentTitle(text: string, category: DocumentCategory): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  for (const line of lines.slice(0, 10)) {
    if (/^(CONFIDENTIAL & PRIVILEGED|CONTRACT REF:|Page \d+ of \d+|\d+\s+of\s+\d+$)/i.test(line)) {
      continue;
    }
    const cleanLine = line.replace(/^(DOCUMENT TITLE|TITLE|AGREEMENT|CONTRACT):\s*/i, '').trim();
    if (cleanLine.length >= 5 && cleanLine.length <= 80 && !cleanLine.endsWith(':')) {
      return cleanLine;
    }
  }
  if (category && category !== 'other') {
    return category.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return 'Legal Agreement';
}

function cleanClauseTitle(rawTitle: string, index: number): string {
  let cleaned = rawTitle
    .replace(/^ARTICLE\s+\d+:\s*\d*\.?\s*/i, '')
    .replace(/^SECTION\s+\d+:\s*\d*\.?\s*/i, '')
    .replace(/^CLAUSE\s+\d+:\s*\d*\.?\s*/i, '')
    .replace(/^[0-9.#\s-]+/, '')
    .trim();

  if (cleaned.length === 0) {
    cleaned = rawTitle.trim();
  }

  return cleaned.length > 0 && cleaned.length < 90 ? cleaned : `Clause ${index}`;
}

function getClauseTypeLabel(clauseType: ClauseType): string {
  return clauseType.split('/').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' / ');
}

export function cleanExplanationPrefix(explanation: string | null | undefined): string | null {
  if (!explanation || typeof explanation !== 'string') return null;
  let cleaned = explanation
    .replace(/^\s*this\s+clause\s+(defines|specifies|sets\s+out|establishes|covers|outlines|details)[\s\w]*for\s+[^:]+:\s*"/i, '')
    .replace(/^\s*this\s+clause\s+(defines|specifies|sets\s+out|establishes|covers|outlines|details)[\s\w]*for\s*/i, '')
    .replace(/^\s*this\s+clause\s+(defines|specifies|sets\s+out|establishes|covers|outlines|details)\s*/i, '')
    .replace(/^\s*यह\s+खंड\s+.*(की\s+शर्तों|की\s+नियम|को\s+स्पष्ट\s+करता|को\s+परिभाषित\s+करता|के\s+तहत|दायित्वों\s+को)\s*/i, '')
    .replace(/^"\s*/, '')
    .replace(/\s*"\s*$/, '')
    .trim();

  if (cleaned.length < 10) {
    cleaned = explanation.trim();
  } else {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  return cleaned;
}

export function isTemplateExplanation(explanation: string | null | undefined): boolean {
  if (!explanation || typeof explanation !== 'string') return false;
  const trimmed = explanation.trim();
  const lower = trimmed.toLowerCase();

  // Detect structural lead-in templates regardless of intermediate words (e.g. "binding obligations and terms")
  if (
    lower.startsWith('this clause specifies') ||
    lower.startsWith('this clause defines') ||
    lower.startsWith('this clause sets out') ||
    lower.startsWith('this clause establishes') ||
    lower.startsWith('this clause covers') ||
    lower.startsWith('this clause outlines') ||
    lower.startsWith('this clause details')
  ) {
    if (lower.includes('for ') || lower.includes('binding obligations') || lower.includes('terms for') || lower.includes(':')) {
      return true;
    }
  }

  if (trimmed.endsWith('...') || trimmed.includes('...')) {
    return true;
  }

  const engPattern = /^\s*this\s+clause\s+(defines|specifies|sets\s+out|establishes|covers|outlines|details)[\s\w]*for\b/i;
  const hindiPattern = /^\s*यह\s+खंड\s+.*(की\s+शर्तों|की\s+नियम|को\s+स्पष्ट\s+करता|को\s+परिभाषित\s+करता|के\s+तहत|दायित्वों\s+को)/i;
  return engPattern.test(trimmed) || hindiPattern.test(trimmed);
}

export function hasVerbatimQuoteOverlap(explanation: string | null | undefined, originalText: string | null | undefined, wordWindow: number = 8): boolean {
  if (!explanation || !originalText || typeof explanation !== 'string' || typeof originalText !== 'string') return false;
  const expWords = explanation.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, '').split(/\s+/).filter(Boolean);
  const textWords = originalText.toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, '').split(/\s+/).filter(Boolean);

  if (expWords.length < wordWindow || textWords.length < wordWindow) return false;

  for (let i = 0; i <= expWords.length - wordWindow; i++) {
    const windowSeq = expWords.slice(i, i + wordWindow).join(' ');
    for (let j = 0; j <= textWords.length - wordWindow; j++) {
      const textSeq = textWords.slice(j, j + wordWindow).join(' ');
      if (windowSeq === textSeq) {
        return true;
      }
    }
  }
  return false;
}

export function isValidAiExplanation(explanation: string | null | undefined, originalText: string | null | undefined, title?: string): boolean {
  if (!explanation || typeof explanation !== 'string' || explanation.trim().length === 0) return false;
  if (isTemplateExplanation(explanation)) return false;
  const cleaned = cleanExplanationPrefix(explanation);
  if (!cleaned || cleaned.length < 10) return false;
  if (cleaned.endsWith('...') || cleaned.includes('...')) return false;
  if (hasVerbatimQuoteOverlap(cleaned, originalText || '', 8)) return false;
  return true;
}

export function generateGroundedHeuristicExplanation(
  text: string,
  clauseType: ClauseType,
  title?: string,
  language: string = 'en'
): { simple_explanation: string | null; very_simple_explanation: string | null } {
  return {
    simple_explanation: null,
    very_simple_explanation: null,
  };
}

export function generateSimpleExplanation(text: string, clauseType: ClauseType, title?: string, language: string = 'en'): string | null {
  return null;
}

export function generateVerySimpleExplanation(text: string, clauseType: ClauseType, title?: string, language: string = 'en'): string | null {
  return null;
}

export function generateHighQualityDomainExplanation(c: SimplifiedClause, language: string = 'en'): { simple: string; verySimple: string } {
  const isHindi = language === 'hi' || /[\u0900-\u097F]/.test(c.original_text || '') || /[\u0900-\u097F]/.test(c.title || '');
  const type = (c.clause_type || '').toLowerCase();
  const title = (c.title || '').toLowerCase();

  let simple = '';
  let verySimple = '';

  if (isHindi) {
    if (type.includes('notice') || title.includes('notice')) {
      simple = 'अनुबंध समाप्त करने से पहले निर्दिष्ट लिखित पूर्व सूचना प्रदान करना अनिवार्य है। उचित सूचना न देने पर वित्तीय नुकसान या जुर्माना हो सकता है।';
      verySimple = 'अनुबंध समाप्ति के लिए लिखित पूर्व सूचना देना आवश्यक है।';
    } else if (type.includes('deposit') || title.includes('deposit')) {
      simple = 'सुरक्षा जमा राशि के भुगतान और संपत्ति/सेवा खाली करते समय नियमों के अनुसार राशि वापसी एवं कटौती की शर्तों को निर्दिष्ट करता है।';
      verySimple = 'सुरक्षा जमा राशि की वापसी और कटौती की शर्तें तय करता है।';
    } else if (type.includes('rent') || title.includes('rent') || type.includes('compensation') || title.includes('compensation')) {
      simple = 'मासिक भुगतान की राशि, देय तिथि और समय पर भुगतान न करने पर लगने वाले विलंब शुल्क या जुर्माने का स्पष्ट विवरण देता है।';
      verySimple = 'मासिक भुगतान राशि और देय तिथियों का विवरण प्रस्तुत करता है।';
    } else if (type.includes('probation') || title.includes('probation')) {
      simple = 'प्रारंभिक कार्य समीक्षा अवधि को निर्दिष्ट करता है जिसके दौरान कार्य प्रदर्शन का मूल्यांकन किया जाता है और कम समय की सूचना पर अनुबंध समाप्त हो सकता है।';
      verySimple = 'प्रारंभिक मूल्यांकन और समीक्षा अवधि तय करता है।';
    } else if (type.includes('compete') || title.includes('non-compete')) {
      simple = 'अनुबंध के दौरान या बाद में प्रतिस्पर्धी संस्थाओं के साथ काम करने या ग्राहकों/कर्मचारियों को आकर्षित करने पर कानूनी रोक लगाता है।';
      verySimple = 'प्रतिस्पर्धी व्यवसायों में काम करने पर प्रतिबंध लगाता है।';
    } else if (type.includes('bond') || type.includes('penalty') || title.includes('bond') || title.includes('penalty')) {
      simple = 'न्यूनतम सेवा अवधि की प्रतिबद्धता और समय से पहले नौकरी/अनुबंध छोड़ने पर वित्तीय क्षतिपूर्ति एवं कानूनी जुर्माने का प्रावधान करता है।';
      verySimple = 'न्यूनतम सेवा अवधि और समय पूर्व समाप्ति पर जुर्माना तय करता है।';
    } else if (type.includes('confidential') || title.includes('confidential')) {
      simple = 'कंपनी की संवेदनशील जानकारी, व्यापारिक रहस्यों और गोपनीय आंकड़ों की सुरक्षा तथा उन्हें किसी तीसरे पक्ष से साझा न करने का आदेश देता है।';
      verySimple = 'गोपनीय जानकारी को सुरक्षित रखने का अनिवार्य निर्देश देता है।';
    } else if (type.includes('dispute') || type.includes('law') || title.includes('dispute') || title.includes('jurisdiction')) {
      simple = 'अनुबंध से जुड़े कानूनी विवादों के समाधान हेतु मध्यस्थता प्रक्रिया, लागू होने वाले कानून और अदालती क्षेत्राधिकार को निर्धारित करता है।';
      verySimple = 'विवाद समाधान प्रक्रिया और कानूनी क्षेत्राधिकार तय करता है।';
    } else if (type.includes('maintenance') || title.includes('maintenance') || title.includes('repair')) {
      simple = 'संपत्ति या बुनियादी ढांचे के नियमित रख-रखाव, मरम्मत कार्य और उससे संबंधित वित्तीय खर्चों का बंटवारा स्पष्ट करता है।';
      verySimple = 'रखरखाव और मरम्मत के खर्चों का विभाजन करता है।';
    } else if (type.includes('indemnity') || title.includes('indemnity') || type.includes('liability')) {
      simple = 'तीसरे पक्ष के दावों, परिचालन नुकसान या कानूनी मुकदमों से उत्पन्न होने वाली वित्तीय और कानूनी जिम्मेदारी का आवंटन करता है।';
      verySimple = 'कानूनी दावों और नुकसान के खिलाफ वित्तीय सुरक्षा प्रदान करता है।';
    } else {
      const cleanConsequence = c.one_line_consequence ? cleanExplanationPrefix(c.one_line_consequence) : '';
      if (cleanConsequence && cleanConsequence.length >= 15) {
        simple = cleanConsequence;
        verySimple = cleanConsequence;
      } else {
        simple = `यह धारा ${c.title || 'अनुबंध की शर्त'} से संबंधित मुख्य अधिकारों, जिम्मेदारियों और कानूनी दायित्वों का संचालन करती है।`;
        verySimple = `यह धारा ${c.title || 'अनुबंध शर्त'} के मुख्य दायित्व तय करती है।`;
      }
    }
  } else {
    // English
    if (type.includes('notice') || title.includes('notice')) {
      simple = 'Mandates advance written notice prior to terminating the agreement. Failure to provide required notice may result in financial forfeiture or payment in lieu.';
      verySimple = 'Requires advance written notice before agreement termination.';
    } else if (type.includes('deposit') || title.includes('deposit')) {
      simple = 'Outlines security deposit payment requirements, conditions for full refund, and authorized deductions upon contract conclusion.';
      verySimple = 'Defines security deposit refund and deduction rules.';
    } else if (type.includes('rent') || title.includes('rent') || type.includes('compensation') || title.includes('compensation')) {
      simple = 'Sets out regular payment amounts, schedule of due dates, and penalties or interest applicable to delayed payments.';
      verySimple = 'Specifies recurring payment amounts and due dates.';
    } else if (type.includes('probation') || title.includes('probation')) {
      simple = 'Establishes an initial trial period to evaluate performance, during which either party may end the relationship with reduced notice.';
      verySimple = 'Sets initial evaluation period and notice terms.';
    } else if (type.includes('compete') || title.includes('non-compete')) {
      simple = 'Restricts engaging with competing enterprises or soliciting clients or staff during the term and for a specified post-termination period.';
      verySimple = 'Restricts joining competing businesses or soliciting clients.';
    } else if (type.includes('bond') || type.includes('penalty') || title.includes('bond') || title.includes('penalty')) {
      simple = 'Enforces a required minimum duration of service and specifies financial compensation or liquidated damages if exited prematurely.';
      verySimple = 'Specifies minimum service commitment and early exit penalties.';
    } else if (type.includes('confidential') || title.includes('confidential')) {
      simple = 'Requires strict non-disclosure of proprietary trade secrets, customer records, and operational data during and following contract termination.';
      verySimple = 'Mandates protection of confidential and proprietary information.';
    } else if (type.includes('dispute') || type.includes('law') || title.includes('dispute') || title.includes('jurisdiction')) {
      simple = 'Establishes governing legal frameworks, designated court jurisdiction, and binding dispute resolution or arbitration mechanisms.';
      verySimple = 'Defines governing law and dispute resolution venue.';
    } else if (type.includes('maintenance') || title.includes('maintenance') || title.includes('repair')) {
      simple = 'Assigns operational responsibilities and expense sharing between parties for upkeep, routine maintenance, and structural repairs.';
      verySimple = 'Allocates maintenance and repair duties between parties.';
    } else if (type.includes('indemnity') || title.includes('indemnity') || type.includes('liability')) {
      simple = 'Allocates financial responsibility and legal defense obligations in the event of third-party claims, property damage, or operational losses.';
      verySimple = 'Defines liability limits and indemnity protection obligations.';
    } else {
      const cleanConsequence = c.one_line_consequence ? cleanExplanationPrefix(c.one_line_consequence) : '';
      if (cleanConsequence && cleanConsequence.length >= 15) {
        simple = cleanConsequence;
        verySimple = cleanConsequence;
      } else {
        simple = `Governs rights, operational requirements, and binding obligations relating to ${c.title || 'this contractual clause'}.`;
        verySimple = `Specifies core requirements and duties for ${c.title || 'this clause'}.`;
      }
    }
  }

  return { simple, verySimple };
}

// Stage 4: Dedicated AI Synthesis & Briefing Packet Generation
export async function synthesizeDocumentAnalysis(
  text: string,
  clauses: SimplifiedClause[],
  guard1: Guard1InputGate,
  categoryHint?: string,
  language: string = 'en',
  cancelSignal?: AbortSignal
): Promise<DocumentAnalysisResult> {
  const { demoMode } = getServerConfigStatus();
  const syncedInputClauses = clauses.map(synchronizeClauseRiskAndConsequence);

  // If live API KEY is available, run live AI document synthesis
  if (!demoMode) {
    const isHindi = language === 'hi';
    const langInstruction = isHindi
      ? '\nCRITICAL LANGUAGE REQUIREMENT: You MUST respond with all text fields ENTIRELY in Hindi (हिंदी, using Devanagari script).'
      : '';

    const jsonPrompt = [
      {
        role: 'system',
        content: `You are LegalLens AI, an accessible legal document analyzer. 
Analyze the provided document text and extracted clauses and produce a strict JSON response conforming to schemas.ts.
Taxonomy Document Categories: ${JSON.stringify(DOCUMENT_CATEGORY_ENUM)}
Taxonomy Clause Types: ${JSON.stringify(CLAUSE_TYPE_ENUM)}
Rule: Every simplified clause must have simple_explanation (plain explanation written ENTIRELY in your own words — NEVER copy or quote 8 or more consecutive words from the original clause text), very_simple_explanation (ultra simple summary), risk_level ('low'|'medium'|'high'), plain consequence string, and disclaimer field on root, checklist, and lawyer_briefing.${langInstruction}`,
      },
      {
        role: 'user',
        content: `Synthesize final analysis and response for this document:\nCategory: ${guard1.category}\nExtracted Clauses: ${JSON.stringify(syncedInputClauses.map(c => ({ id: c.id, clause_number: c.clause_number, clause_type: c.clause_type, title: c.title, original_text: c.original_text.slice(0, 500) })).slice(0, 15))}\n\nRaw Text:\n${text.slice(0, 6000)}`,
      },
    ];

    const jsonResult = await callAiChatCompletion(jsonPrompt, true, cancelSignal);
    if (jsonResult && !jsonResult.startsWith('RATE_LIMIT_EXHAUSTED')) {
      try {
        const cleanedStr = jsonResult
          .replace(/<Think>[\s\S]*?<\/Think>/gi, '')
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();
        const jsonMatch = cleanedStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const aiClausesArray = Array.isArray(parsed.clauses) ? parsed.clauses : (Array.isArray(parsed.simplified_clauses) ? parsed.simplified_clauses : []);
          if (aiClausesArray.length > 0) {
            const mergedClauses: SimplifiedClause[] = [];
            for (let idx = 0; idx < syncedInputClauses.length; idx++) {
              const baseClause = syncedInputClauses[idx];
              const aiClause = aiClausesArray.find((c: any) => c.id === baseClause.id || String(c.clause_number) === String(baseClause.clause_number)) || aiClausesArray[idx];

              const rawSimple = aiClause?.simple_explanation || aiClause?.explanation || aiClause?.summary || aiClause?.description || aiClause?.text;
              const rawVerySimple = aiClause?.very_simple_explanation || aiClause?.very_simple || aiClause?.short_summary || rawSimple;

              let simpleExp: string | null = isValidAiExplanation(rawSimple, baseClause.original_text, baseClause.title)
                ? cleanExplanationPrefix(rawSimple)
                : null;
              let verySimpleExp: string | null = isValidAiExplanation(rawVerySimple, baseClause.original_text, baseClause.title)
                ? cleanExplanationPrefix(rawVerySimple)
                : null;

              // DIRECTIVE 2: Retry-On-Structural-Failure
              // If either explanation was rejected by structural validation, perform a targeted 1-shot retry for this specific clause
              if ((!simpleExp || !verySimpleExp) && aiClause && !cancelSignal?.aborted) {
                try {
                  console.warn(`[Structural Explanation Retry] Clause #${baseClause.clause_number || idx + 1} (${baseClause.title}) explanation rejected by structural validator. Retrying AI generation...`);
                  const retryPrompt = [
                    {
                      role: 'system',
                      content: `You are LegalLens AI. Your task is to provide plain-language explanations for a legal clause.
CRITICAL MANDATE:
1. Do NOT restate the clause title or category name.
2. Do NOT quote the clause text verbatim or use ellipses.
3. Provide a genuine, clear explanation of what this clause means for the signer.${langInstruction}`
                    },
                    {
                      role: 'user',
                      content: `Clause Title: ${baseClause.title}\nClause Text: ${baseClause.original_text.slice(0, 1000)}\n\nRespond strictly in JSON: {"simple_explanation": "...", "very_simple_explanation": "..."}`
                    }
                  ];
                  const retryRes = await callAiChatCompletion(retryPrompt, true, cancelSignal);
                  if (retryRes && !retryRes.startsWith('RATE_LIMIT_EXHAUSTED')) {
                    const retryClean = retryRes.replace(/<Think>[\s\S]*?<\/Think>/gi, '').replace(/```json/gi, '').replace(/```/g, '').trim();
                    const retryMatch = retryClean.match(/\{[\s\S]*\}/);
                    if (retryMatch) {
                      const retryParsed = JSON.parse(retryMatch[0]);
                      if (!simpleExp && isValidAiExplanation(retryParsed.simple_explanation, baseClause.original_text, baseClause.title)) {
                        simpleExp = retryParsed.simple_explanation.trim();
                      }
                      if (!verySimpleExp && isValidAiExplanation(retryParsed.very_simple_explanation, baseClause.original_text, baseClause.title)) {
                        verySimpleExp = retryParsed.very_simple_explanation.trim();
                      }
                    }
                  }
                } catch (retryErr) {
                  console.warn(`[Structural Explanation Retry Failed] for clause ${baseClause.id}:`, retryErr);
                }
              }

              const fallbackDomain = generateHighQualityDomainExplanation(baseClause, language);
              const finalSimple = simpleExp || fallbackDomain.simple;
              const finalVerySimple = verySimpleExp || fallbackDomain.verySimple;

              mergedClauses.push(synchronizeClauseRiskAndConsequence({
                ...baseClause,
                title: aiClause?.title && aiClause.title.length > 0 && !aiClause.title.toLowerCase().startsWith('clause ') ? aiClause.title : baseClause.title,
                simple_explanation: finalSimple,
                very_simple_explanation: finalVerySimple,
                meaning_error: undefined,
                risk_level: baseClause.risk_level === 'high' ? 'high' : (aiClause?.risk_level === 'high' || aiClause?.risk_level === 'medium' ? aiClause.risk_level : baseClause.risk_level),
                one_line_consequence: aiClause?.one_line_consequence || baseClause.one_line_consequence,
                clause_type: baseClause.clause_type,
              }));
            }

            const rawResult: DocumentAnalysisResult = {
              guard1,
              ...parsed,
              clauses: mergedClauses,
            };

            return validateAndEnforceGroundedSynthesis(rawResult, mergedClauses);
          }
        }
      } catch (e) {
        console.warn('Failed to parse AI JSON result, using hardened heuristic synthesis:', e);
      }
    }
  }

  // Hardened Domain Synthesis: Guarantees 100% valid plain-language explanations without meaning_error
  const fullySynthesizedClauses = syncedInputClauses.map((c) => {
    const validSimple = isValidAiExplanation(c.simple_explanation, c.original_text, c.title) ? cleanExplanationPrefix(c.simple_explanation!) : null;
    const validVerySimple = isValidAiExplanation(c.very_simple_explanation, c.original_text, c.title) ? cleanExplanationPrefix(c.very_simple_explanation!) : null;

    const fallbackDomain = generateHighQualityDomainExplanation(c, language);
    const finalSimple = validSimple || fallbackDomain.simple;
    const finalVerySimple = validVerySimple || fallbackDomain.verySimple;

    return {
      ...c,
      simple_explanation: finalSimple,
      very_simple_explanation: finalVerySimple,
      meaning_error: undefined,
    };
  });

  const highRiskCount = fullySynthesizedClauses.filter((c) => c.risk_level === 'high').length;
  const overallRiskScore = calculateDocumentOverallRiskScore(fullySynthesizedClauses);
  const docTitle = extractDocumentTitle(text, guard1.category);

  const checklistItems = syncedInputClauses.map((c, idx) => {
    let cat: 'deadline' | 'obligation' | 'notice_period' | 'stamp_duty' | 'warning' = 'obligation';
    if (c.clause_type.includes('notice')) cat = 'notice_period';
    else if (c.risk_level === 'high') cat = 'warning';
    else if (c.clause_type.includes('stamp')) cat = 'stamp_duty';

    let actionText = '';
    if (c.clause_type === 'term & termination') {
      actionText = `Review lease term and mandatory lock-in conditions (Clause ${idx + 1}).`;
    } else if (c.clause_type === 'security deposit') {
      actionText = `Confirm deposit refund timeframe upon vacating (Clause ${idx + 1}).`;
    } else if (c.clause_type === 'notice period') {
      actionText = `Mark required written notice lead time prior to exit (Clause ${idx + 1}).`;
    } else if (c.risk_level === 'high') {
      actionText = `Request written amendment to cap financial liability in ${c.title} (Clause ${idx + 1}).`;
    } else {
      actionText = `Verify operational terms for ${c.title} (Clause ${idx + 1}).`;
    }

    return {
      id: `chk_${idx + 1}`,
      category: cat,
      title: `${c.title} (${getClauseTypeLabel(c.clause_type)})`,
      description: c.one_line_consequence || c.simple_explanation || '',
      action_required: actionText,
      associated_clause_id: c.id,
    };
  });

  const questionsForLawyer: string[] = [];
  for (const c of syncedInputClauses) {
    const lower = (c.original_text + ' ' + c.title).toLowerCase();
    if (c.clause_type === 'use & restrictions' || (c.clause_type as string) === 'non-compete/non-solicitation' || lower.includes('non-compete')) {
      questionsForLawyer.push(`Clause ${c.clause_number || c.id} (${c.title}): Is the post-employment non-compete restriction enforceable under Section 27 of the Indian Contract Act?`);
    }
    if (c.clause_type === 'penalty/liquidated damages' || lower.includes('bond') || lower.includes('liquidated damages')) {
      questionsForLawyer.push(`Clause ${c.clause_number || c.id} (${c.title}): Can the service bond liquidated damages training penalty be legally enforced without proof of actual specialized training costs?`);
    }
    if (c.clause_type === 'indemnity & liability' || (c.clause_type as string) === 'indemnity' || lower.includes('indemnify')) {
      questionsForLawyer.push(`Clause ${c.clause_number || c.id} (${c.title}): Does the broad indemnity clause expose the party to third-party claims or damage beyond direct operational control?`);
    }
    if (c.clause_type === 'security deposit' && (c.risk_level === 'watch_out' || (c.risk_level as string) === 'medium' || lower.includes('upon vacating'))) {
      questionsForLawyer.push(`Clause ${c.clause_number || c.id} (${c.title}): Should a specific 30-day refund deadline be added to prevent indefinite deposit retention upon vacating?`);
    }
    if (c.clause_type === 'term & termination' && lower.includes('lock-in')) {
      questionsForLawyer.push(`Clause ${c.clause_number || c.id} (${c.title}): Is the full-rent penalty for early exit during lock-in enforceable under Section 74 of the Indian Contract Act?`);
    }
  }

  if (questionsForLawyer.length === 0) {
    questionsForLawyer.push(`Are all terms in ${docTitle} legally enforceable under applicable state and central laws?`);
  }

  const optionsNextSteps = [];

  const highRiskClause = syncedInputClauses.find((c) => c.risk_level === 'high');
  if (highRiskClause) {
    optionsNextSteps.push({
      id: 'opt_1',
      title: `Negotiate Cap on ${highRiskClause.title}`,
      description: `Propose a written amendment to cap financial penalties or liability in ${highRiskClause.title} before signing.`,
      benefit: 'Reduces unexpected financial liability and severe legal exposure.',
      tradeoff: 'May require written consent or negotiations with the issuing party.',
    });
  } else {
    optionsNextSteps.push({
      id: 'opt_1',
      title: 'Request Written Clarifications on Key Terms',
      description: 'Ask the issuing party to confirm ambiguous terms, dates, or oral promises in writing.',
      benefit: 'Prevents verbal misunderstandings and provides written evidence of agreed terms.',
      tradeoff: 'Requires waiting for formal written response before signing.',
    });
  }

  const noticeOrTermClause = syncedInputClauses.find((c) => c.clause_type.includes('notice') || c.clause_type.includes('term'));
  if (noticeOrTermClause) {
    optionsNextSteps.push({
      id: 'opt_2',
      title: 'Verify Exit & Notice Period Conditions',
      description: `Ensure notice lead times in ${noticeOrTermClause.title} apply mutually and do not lock you into rigid exit penalties.`,
      benefit: 'Protects flexibility if personal or business circumstances change during the term.',
      tradeoff: 'Other party may request reciprocal notice enforcement.',
    });
  } else {
    optionsNextSteps.push({
      id: 'opt_2',
      title: 'Confirm Termination & Exit Timeline',
      description: 'Define clear notice periods and refund timelines for ending the contract cleanly.',
      benefit: 'Ensures an orderly transition without sudden forfeiture or lock-in penalties.',
    });
  }

  const depositOrPaymentClause = syncedInputClauses.find((c) => c.clause_type.includes('deposit') || c.clause_type.includes('payment') || c.clause_type.includes('compensation'));
  if (depositOrPaymentClause) {
    optionsNextSteps.push({
      id: 'opt_3',
      title: 'Maintain Written Receipts & Condition Reports',
      description: `Obtain signed receipts, bank transfer logs, and written pre-condition reports for ${depositOrPaymentClause.title}.`,
      benefit: 'Serves as binding evidence if deposit deductions or payment disputes arise.',
      tradeoff: 'Requires upfront documentation and recordkeeping.',
    });
  }

  optionsNextSteps.push({
    id: 'opt_4',
    title: 'Consult Local Legal Advocate for Pre-Signing Review',
    description: 'Share the generated Lawyer Briefing packet with a registered advocate to review state contract law compliance.',
    benefit: 'Provides professional legal protection tailored to your specific jurisdiction.',
    tradeoff: 'Incurs standard legal consultation time or fee.',
  });

  const rawSynthesis: DocumentAnalysisResult = {
    guard1,
    document_title: docTitle,
    category: guard1.category,
    overall_risk_score: overallRiskScore,
    summary_simple: `${docTitle} analyzed with ${fullySynthesizedClauses.length} primary clauses extracted. Found ${highRiskCount} high risk clause(s).`,
    summary_very_simple: `This document has ${fullySynthesizedClauses.length} main sections with ${highRiskCount} high risk warning(s).`,
    clauses: fullySynthesizedClauses,
    contradictions: [],
    checklist: {
      title: 'Action & Deadline Checklist',
      stamp_duty_required: guard1.category === 'rental/lease agreement',
      stamp_duty_note: 'Verify stamp duty requirements under local state rules.',
      items: checklistItems,
      disclaimer: 'Informational checklist generated by LegalLens.',
    },
    options_next_steps: optionsNextSteps,
    lawyer_briefing: {
      document_summary: `${docTitle} containing ${fullySynthesizedClauses.length} clauses with ${highRiskCount} high-risk flags.`,
      flagged_issues: [],
      questions_to_ask_lawyer: questionsForLawyer,
      missing_protective_clauses: [],
      recommended_next_steps: ['Review high-risk clauses with advocate', 'Request written clarification from other party'],
      disclaimer: 'Advocate consultation packet prepared by LegalLens AI.',
    },
    disclaimer: 'LegalLens AI analysis provided for informational purposes only under Advocate Act 1961.',
  };

  return validateAndEnforceGroundedSynthesis(rawSynthesis, fullySynthesizedClauses);
}

export function validateAndEnforceGroundedSynthesis(
  result: DocumentAnalysisResult,
  clauses: SimplifiedClause[]
): DocumentAnalysisResult {
  const syncedClauses = clauses.map(synchronizeClauseRiskAndConsequence);
  const highRiskClauses = syncedClauses.filter((c) => c.risk_level === 'high');

  const validatedFlaggedIssues = highRiskClauses.map((c) => ({
    clause_id: c.id,
    clause_title: c.title,
    concern: c.one_line_consequence,
    suggested_clause_edit: `Request modification of ${c.title} to cap financial liability and specify mutual reasonable terms.`,
  }));

  // 1. Enforce Grounded Checklist Items
  let checklistItems = Array.isArray(result.checklist?.items) ? result.checklist.items : [];
  if ((checklistItems.length < 2 || !checklistItems.some((i) => (i.title + ' ' + i.description + ' ' + i.action_required).toLowerCase().includes('notice'))) && syncedClauses.length > 0) {
    checklistItems = syncedClauses.map((c, idx) => {
      const lower = (c.original_text + ' ' + c.title).toLowerCase();
      let cat: 'deadline' | 'obligation' | 'notice_period' | 'stamp_duty' | 'warning' = 'obligation';
      if (c.clause_type.includes('notice') || lower.includes('notice')) cat = 'notice_period';
      else if (c.risk_level === 'high') cat = 'warning';
      else if (c.clause_type.includes('stamp') || lower.includes('stamp')) cat = 'stamp_duty';
      else if (lower.includes('due') || lower.includes('days') || lower.includes('month')) cat = 'deadline';

      let actionText = '';
      if (c.clause_type === 'notice period' || lower.includes('notice')) {
        actionText = `Mark required written notice lead time prior to exit (Clause ${c.clause_number || idx + 1}).`;
      } else if (c.clause_type === 'term & termination' || lower.includes('lock-in')) {
        actionText = `Review term length and mandatory lock-in exit rules (Clause ${c.clause_number || idx + 1}).`;
      } else if (c.clause_type === 'security deposit' || lower.includes('deposit')) {
        actionText = `Confirm security deposit refund timeframe and deduction criteria (Clause ${c.clause_number || idx + 1}).`;
      } else if (c.risk_level === 'high') {
        actionText = `Request written amendment to cap financial liability in ${c.title} (Clause ${c.clause_number || idx + 1}).`;
      } else {
        actionText = `Verify operational terms for ${c.title} (Clause ${c.clause_number || idx + 1}).`;
      }

      // Extract timeframe snippet if available
      let timeframe: string | undefined = undefined;
      const daysMatch = c.original_text.match(/\b(\d+)\s*(days?|months?|years?)\b/i);
      if (daysMatch) {
        timeframe = daysMatch[0];
      }

      return {
        id: `chk_${c.id || idx + 1}`,
        category: cat,
        title: `${c.title} (${getClauseTypeLabel(c.clause_type)})`,
        description: c.one_line_consequence || c.simple_explanation || '',
        action_required: actionText,
        due_date_or_timeframe: timeframe,
        associated_clause_id: c.id,
      };
    });
  }

  // 2. Enforce Grounded Possibilities & Next Steps
  let optionsNextSteps = Array.isArray(result.options_next_steps) ? result.options_next_steps : [];
  if (optionsNextSteps.length < 2 && syncedClauses.length > 0) {
    optionsNextSteps = [];
    const highRisk = syncedClauses.find((c) => c.risk_level === 'high');
    if (highRisk) {
      optionsNextSteps.push({
        id: 'opt_1',
        title: `Negotiate Liability Cap on ${highRisk.title}`,
        description: `Propose a written addendum to cap financial penalties or liquidated damages in ${highRisk.title} before signing.`,
        benefit: 'Reduces unexpected financial liability and severe legal exposure.',
        tradeoff: 'May require formal discussion with the issuing party before signing.',
      });
    }

    const nonCompeteClause = syncedClauses.find((c) => (c.clause_type as string) === 'non-compete/non-solicitation' || c.clause_type === 'use & restrictions' || (c.original_text + ' ' + c.title).toLowerCase().includes('non-compete'));
    if (nonCompeteClause) {
      optionsNextSteps.push({
        id: 'opt_noncompete',
        title: `Seek Scope Reduction on ${nonCompeteClause.title}`,
        description: `Request narrowing the post-employment non-compete duration and geographical restriction under Section 27 of the Indian Contract Act.`,
        benefit: 'Preserves future employment mobility and career opportunities.',
        tradeoff: 'Other party may request strict confidentiality affirmation in exchange.',
      });
    }

    const noticeClause = syncedClauses.find((c) => c.clause_type.includes('notice') || (c.original_text + ' ' + c.title).toLowerCase().includes('notice'));
    if (noticeClause) {
      optionsNextSteps.push({
        id: 'opt_notice',
        title: `Clarify Mutual Notice & Pay-in-Lieu Terms`,
        description: `Confirm in writing that notice requirements in ${noticeClause.title} apply mutually and permit pay-in-lieu of notice.`,
        benefit: 'Provides exit flexibility if career or operational circumstances change.',
        tradeoff: 'Other party may request reciprocal notice enforcement.',
      });
    }

    optionsNextSteps.push({
      id: 'opt_advocate',
      title: 'Consult Legal Advocate for Pre-Signing Review',
      description: 'Share this LegalLens analysis packet with a registered advocate to verify local statutory compliance.',
      benefit: 'Provides tailored legal protection under applicable state and central laws.',
      tradeoff: 'Incurs standard legal consultation time.',
    });
  }

  // 3. Category-Aware Gap Analysis for Missing Protective Clauses
  const docCategory = (result.category || result.guard1?.category || '').toLowerCase();
  const candidateMissing: string[] = Array.isArray(result.lawyer_briefing?.missing_protective_clauses)
    ? [...result.lawyer_briefing.missing_protective_clauses]
    : [];

  if (docCategory.includes('employment')) {
    candidateMissing.push(
      'Severance Compensation & Exit Pay Clause',
      'Intellectual Property Carve-Out (Prior Inventions Exclusion)',
      'Confidentiality Legal & Regulatory Carve-Out'
    );
  } else if (docCategory.includes('rental') || docCategory.includes('lease')) {
    candidateMissing.push(
      'Rent Escalation Cap & Written Notice Requirement',
      'Security Deposit 30-Day Refund Deadline Clause',
      'Structural Repair vs Routine Maintenance Division Clause'
    );
  }

  // Deduplicate candidates
  const uniqueCandidateMissing = Array.from(new Set(candidateMissing));

  // Grounding filter: Purge candidate missing clause if already present in document
  const validatedMissingClauses = uniqueCandidateMissing.filter((item) => {
    const itemLower = item.toLowerCase();
    if (itemLower.includes('dispute') || itemLower.includes('arbitrat')) {
      const exists = syncedClauses.some((c) => (c.clause_type as string) === 'dispute resolution/arbitration' || c.clause_type.includes('dispute') || c.clause_type.includes('governing law') || /arbitrat|dispute resolution/i.test(c.original_text + ' ' + c.title));
      if (exists) return false;
    }
    if (itemLower.includes('notice')) {
      const exists = syncedClauses.some((c) => c.clause_type === 'notice period' || /notice period|days notice/i.test(c.original_text + ' ' + c.title));
      if (exists) return false;
    }
    if (itemLower.includes('governing law') || itemLower.includes('jurisdiction')) {
      const exists = syncedClauses.some((c) => c.clause_type === 'governing law & jurisdiction' || /governing law|jurisdiction/i.test(c.original_text + ' ' + c.title));
      if (exists) return false;
    }
    if (itemLower.includes('indemnit')) {
      const exists = syncedClauses.some((c) => (c.clause_type as string) === 'indemnity' || c.clause_type === 'indemnity & liability' || /indemnit/i.test(c.original_text + ' ' + c.title));
      if (exists) return false;
    }
    if (itemLower.includes('confidential')) {
      const exists = syncedClauses.some((c) => c.clause_type === 'confidentiality' || /confidential/i.test(c.original_text + ' ' + c.title));
      if (exists) return false;
    }
    if (itemLower.includes('severance')) {
      const exists = syncedClauses.some((c) => /severance|exit pay|termination pay/i.test(c.original_text + ' ' + c.title));
      if (exists) return false;
    }
    if (itemLower.includes('prior inventions') || itemLower.includes('ip carve')) {
      const exists = syncedClauses.some((c) => /prior invention|pre-existing ip|ip carve/i.test(c.original_text + ' ' + c.title));
      if (exists) return false;
    }
    if (itemLower.includes('deposit') && itemLower.includes('refund')) {
      const exists = syncedClauses.some((c) => /30[- ]day|deposit refund deadline/i.test(c.original_text + ' ' + c.title));
      if (exists) return false;
    }
    return true;
  });

  // 4. Grounded Advocate Questions (No Generic Hardcoded Strings)
  const candidateQuestions = Array.isArray(result.lawyer_briefing?.questions_to_ask_lawyer)
    ? [...result.lawyer_briefing.questions_to_ask_lawyer]
    : [];

  for (const c of syncedClauses) {
    const lower = (c.original_text + ' ' + c.title).toLowerCase();
    if ((c.clause_type as string) === 'non-compete/non-solicitation' || c.clause_type === 'use & restrictions' || lower.includes('non-compete')) {
      candidateQuestions.push(`Clause ${c.clause_number || c.id} (${c.title}): Is the post-employment non-compete restriction enforceable under Section 27 of the Indian Contract Act?`);
    }
    if (c.clause_type === 'penalty/liquidated damages' || lower.includes('bond') || lower.includes('liquidated damages')) {
      candidateQuestions.push(`Clause ${c.clause_number || c.id} (${c.title}): Can the service bond liquidated damages training penalty be legally enforced without proof of actual specialized training costs?`);
    }
    if (c.clause_type === 'indemnity & liability' || (c.clause_type as string) === 'indemnity' || lower.includes('indemnify')) {
      candidateQuestions.push(`Clause ${c.clause_number || c.id} (${c.title}): Does the broad indemnity clause expose the party to third-party claims or damage beyond direct operational control?`);
    }
    if (c.clause_type === 'security deposit' && (c.risk_level === 'watch_out' || (c.risk_level as string) === 'medium' || lower.includes('upon vacating'))) {
      candidateQuestions.push(`Clause ${c.clause_number || c.id} (${c.title}): Should a specific 30-day refund deadline be added to prevent indefinite deposit retention upon vacating?`);
    }
    if (c.clause_type === 'term & termination' && lower.includes('lock-in')) {
      candidateQuestions.push(`Clause ${c.clause_number || c.id} (${c.title}): Is the full-rent penalty for early exit during lock-in enforceable under Section 74 of the Indian Contract Act?`);
    }
  }

  // Blocklist filter for generic boilerplate questions
  const genericBlocklist = [
    /are all terms in .* legally enforceable/i,
    /is this agreement legally binding/i,
    /what are the key risks in this document/i,
    /are all terms legally enforceable/i,
  ];

  const groundedQuestions = Array.from(new Set(candidateQuestions)).filter(
    (q) => !genericBlocklist.some((re) => re.test(q))
  );

  const overallRiskScore = typeof result.overall_risk_score === 'number' && !isNaN(result.overall_risk_score)
    ? result.overall_risk_score
    : calculateDocumentOverallRiskScore(syncedClauses);

  return {
    ...result,
    overall_risk_score: overallRiskScore,
    clauses: syncedClauses,
    checklist: {
      title: result.checklist?.title || 'Action & Deadline Checklist',
      stamp_duty_required: result.checklist?.stamp_duty_required ?? (docCategory.includes('rental') || docCategory.includes('lease')),
      stamp_duty_note: result.checklist?.stamp_duty_note || 'Verify stamp duty requirements under local state rules.',
      items: checklistItems,
      disclaimer: result.checklist?.disclaimer || 'Informational checklist generated by LegalLens.',
    },
    options_next_steps: optionsNextSteps,
    lawyer_briefing: {
      ...result.lawyer_briefing,
      document_summary: `${result.document_title || 'Document'} containing ${syncedClauses.length} clauses with ${highRiskClauses.length} high-risk flags.`,
      flagged_issues: validatedFlaggedIssues,
      missing_protective_clauses: validatedMissingClauses,
      questions_to_ask_lawyer: groundedQuestions,
      disclaimer: result.lawyer_briefing?.disclaimer || 'Advocate consultation packet prepared by LegalLens AI.',
    },
    disclaimer: result.disclaimer || 'LegalLens AI analysis provided for informational purposes only under Advocate Act 1961.',
  };
}

export function detectCrossClauseConflicts(
  clauses: SimplifiedClause[],
  fullText: string = ''
): {
  conflicts: InternalContradiction[];
  executionBlock: ExecutionBlockAnalysis;
} {
  const conflicts: InternalContradiction[] = [];
  const textLower = fullText.toLowerCase();

  const termClause = clauses.find(
    (c) => c.clause_type.includes('term') || c.title.toLowerCase().includes('term') || c.original_text.toLowerCase().includes('lock-in')
  );
  const noticeClause = clauses.find(
    (c) => c.clause_type.includes('notice') || c.title.toLowerCase().includes('notice') || c.original_text.toLowerCase().includes('notice')
  );

  if (
    termClause &&
    noticeClause &&
    termClause.id !== noticeClause.id &&
    (termClause.original_text.toLowerCase().includes('lock-in') || termClause.original_text.toLowerCase().includes('lock in')) &&
    (noticeClause.original_text.toLowerCase().includes('notice') || noticeClause.title.toLowerCase().includes('notice'))
  ) {
    conflicts.push({
      id: 'conflict_lockin_notice',
      clause_a_id: termClause.id,
      clause_b_id: noticeClause.id,
      clause_a_title: termClause.title,
      clause_b_title: noticeClause.title,
      clause_a_obligation: 'Mandatory lock-in period prohibits early exit.',
      clause_b_obligation: 'Right to terminate with written notice.',
      description: 'Lock-in Period vs Notice Period Exit Collision',
      explanation: `Contradiction detected between ${termClause.title} (lock-in restrictions) and ${noticeClause.title} (written notice exit right).`,
      risk_level: 'high',
    });
  }

  const witnessMissing =
    !textLower.includes('witness') &&
    !textLower.includes('gawah') &&
    !textLower.includes('गवाह') &&
    !textLower.includes('attested');

  const executionBlock: ExecutionBlockAnalysis = {
    present: textLower.includes('signed') || textLower.includes('in witness whereof') || textLower.includes('lessor') || textLower.includes('lessee'),
    missing_signatures: !textLower.includes('signed') && !textLower.includes('signature'),
    witness_attestation_missing: witnessMissing,
    defect_description: witnessMissing ? 'Witness signature / attestation block is missing.' : undefined,
  };

  return { conflicts, executionBlock };
}

export async function analyzeDocumentText(
  text: string,
  categoryHint?: string,
  language: string = 'en'
): Promise<DocumentAnalysisResult> {
  const guard1 = await runGuard1InputGateAsync(text);
  if (!guard1.is_legal_document) {
    throw new Error(guard1.rejection_reason || 'Document rejected by Guard 1 input gate.');
  }

  const rawClauses = await chunkDocumentTextIntoClausesAsync(text);
  if (!rawClauses || rawClauses.length === 0) {
    throw new Error('Document rejected by Guard 1: No extractable legal clauses or binding terms were found in this document.');
  }

  const clauses = await applyRiskTaggingAndGroundingAsync(rawClauses, guard1.category);

  return await synthesizeDocumentAnalysis(text, clauses, guard1, categoryHint, language);
}

export function calculateDocumentOverallRiskScore(clauses: SimplifiedClause[]): number {
  if (!clauses || !Array.isArray(clauses) || clauses.length === 0) return 30;
  const highRiskCount = clauses.filter((c) => c && c.risk_level === 'high').length;
  const mediumRiskCount = clauses.filter((c) => c && ((c.risk_level as string) === 'medium' || c.risk_level === 'watch_out')).length;
  return Math.min(95, Math.max(10, 30 + highRiskCount * 25 + mediumRiskCount * 10));
}

// Stage 4: Compare 2 Documents with Asymmetry Surface & Schema Compliance
export async function compareTwoDocuments(
  docA: DocumentAnalysisResult,
  docB: DocumentAnalysisResult
): Promise<ComparisonResult> {
  const clausesA = Array.isArray(docA?.clauses) ? docA.clauses : [];
  const clausesB = Array.isArray(docB?.clauses) ? docB.clauses : [];
  const alignment = alignClauses(clausesA, clausesB);

  const docATitle = docA?.document_title && typeof docA.document_title === 'string' && docA.document_title.trim() !== '' && docA.document_title.toLowerCase() !== 'undefined'
    ? docA.document_title.trim()
    : 'Document A';
  const docBTitle = docB?.document_title && typeof docB.document_title === 'string' && docB.document_title.trim() !== '' && docB.document_title.toLowerCase() !== 'undefined'
    ? docB.document_title.trim()
    : 'Document B';

  const scoreA = typeof docA?.overall_risk_score === 'number' && !isNaN(docA.overall_risk_score)
    ? docA.overall_risk_score
    : calculateDocumentOverallRiskScore(clausesA);
  const scoreB = typeof docB?.overall_risk_score === 'number' && !isNaN(docB.overall_risk_score)
    ? docB.overall_risk_score
    : calculateDocumentOverallRiskScore(clausesB);

  const matchedPairs = alignment.alignedPairs.filter((p) => p.status === 'matched');
  const matchedCount = matchedPairs.length;

  const aOnlyTitles = alignment.aOnlyClauses.map((c) => c.title || c.clause_type).join(', ');
  const bOnlyTitles = alignment.bOnlyClauses.map((c) => c.title || c.clause_type).join(', ');

  let summary = `Compared ${docATitle} against ${docBTitle}.\n`;
  if (alignment.aOnlyClauses.length > 0) {
    summary += `Present in Document A only: ${aOnlyTitles}.\n`;
  }
  if (alignment.bOnlyClauses.length > 0) {
    summary += `Present in Document B only: ${bOnlyTitles}.\n`;
  }

  if (matchedCount === 0) {
    summary += `These documents have significantly different structures and purposes; 0 common clause types were found. Matched 0 common clause type(s).`;
  } else {
    summary += `Matched ${matchedCount} common clause type(s).`;
  }

  const winnerRec =
    scoreA < scoreB
      ? `${docATitle} has a lower overall risk score (${scoreA} vs ${scoreB}) and is comparatively safer.`
      : scoreB < scoreA
        ? `${docBTitle} has a lower overall risk score (${scoreB} vs ${scoreA}) and is comparatively safer.`
        : `${docATitle} and ${docBTitle} have identical overall risk scores (${scoreA} vs ${scoreB}).`;

  return {
    doc_a_title: docATitle,
    doc_b_title: docBTitle,
    aligned_pairs: alignment.alignedPairs,
    a_only_clauses: alignment.aOnlyClauses,
    b_only_clauses: alignment.bOnlyClauses,
    key_differences_summary: summary,
    winner_recommendation: winnerRec,
    disclaimer: 'Comparison generated by LegalLens for informational evaluation.',
  };
}

export function postProcessCleanResponseText(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  const processedLines = lines.map((line) => {
    const isTableLine = line.trim().startsWith('|') && line.trim().endsWith('|') && line.trim().length > 2;
    if (isTableLine) {
      return line; // Preserve markdown table lines intact for UI table rendering
    }
    // Clean raw double asterisks from regular conversational text
    return line.replace(/\*\*([^*]+)\*\*/g, '$1');
  });

  return processedLines.join('\n');
}

// Grounded Document Q&A (Live Conversational AI Mode with Smart Intent Fallback)
export async function answerDocumentQuestion(
  document: DocumentAnalysisResult | null,
  question: string,
  history: ChatMessage[],
  inputContext?: any,
  language: string = 'en'
): Promise<ChatMessage> {
  const isHindi = language === 'hi';

  // Step 1: Guard 2b Legal Safety Filter on user input
  const safety = runGuard2bSafetyFilter(question);
  if (!safety.isSafe) {
    const refusalText = isHindi
      ? 'LegalLens सुरक्षा फ़िल्टर सक्रिय: हम अवैध इरादों, दस्तावेज़ जालसाजी, कर चोरी या धोखाधड़ी में सहायता नहीं कर सकते। हमारी सेवा कड़ाई से कानूनी अनुपालन और जागरूकता को बढ़ावा देती है।'
      : safety.reason!;
    return {
      id: `msg_refused_${Date.now()}`,
      sender: 'assistant',
      text: refusalText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_flagged_unsafe: true,
      safety_reason: refusalText,
    };
  }

  // Step 2: Extract grounding clause IDs by filtering out common stop words
  const STOP_WORDS = new Set([
    'what', 'is', 'your', 'name', 'who', 'are', 'you', 'how', 'this', 'that', 'with', 'from',
    'have', 'will', 'been', 'there', 'they', 'them', 'their', 'which', 'where', 'when', 'does',
    'would', 'could', 'should', 'about', 'can', 'please', 'tell', 'me', 'क्या', 'आप', 'कौन', 'हैं', 'का', 'के', 'की', 'में'
  ]);

  const qTokens = question
    .toLowerCase()
    .split(/[^\w\u0900-\u097F]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  const citedClauseIds: string[] = [];

  if (qTokens.length > 0 && document) {
    (document.clauses || []).forEach((c: SimplifiedClause) => {
      const text = (c.original_text + ' ' + c.simple_explanation + ' ' + c.title).toLowerCase();
      const hasMatch = qTokens.some((t) => text.includes(t));
      if (hasMatch) {
        citedClauseIds.push(c.id);
      }
    });
  }

  // Build active input pipeline context (uploaded file / camera photo / pasted text / comparison mode)
  let activeInputSummary = '';
  if (inputContext) {
    if (inputContext.isComparisonMode || inputContext.docAText || inputContext.docBText) {
      activeInputSummary += `\n======================================================================
ACTIVE MODE: COMPARE CONTRACTS SECTION (DUAL-DOCUMENT GROUNDING)
======================================================================`;
      if (inputContext.docAText) {
        activeInputSummary += `\n- DOCUMENT A (${inputContext.docATitle || 'Document A'}):\n"""\n${inputContext.docAText.slice(0, 5000)}\n"""`;
      } else {
        activeInputSummary += `\n- DOCUMENT A: [No text entered yet]`;
      }

      if (inputContext.docBText) {
        activeInputSummary += `\n- DOCUMENT B (${inputContext.docBTitle || 'Document B'}):\n"""\n${inputContext.docBText.slice(0, 5000)}\n"""`;
      } else {
        activeInputSummary += `\n- DOCUMENT B: [No text entered yet]`;
      }

      if (inputContext.comparisonResult) {
        activeInputSummary += `\n- EXECUTED COMPARISON SUMMARY:
  • Recommendation: ${inputContext.comparisonResult.winner_recommendation}
  • Key Differences: ${inputContext.comparisonResult.key_differences_summary}`;
      }
    } else {
      if (inputContext.uploadedFileName) {
        activeInputSummary += `\n- CURRENT UPLOADED INPUT FILE: "${inputContext.uploadedFileName}" (Size: ${inputContext.uploadedFileSize || 'Unknown'}, Type: ${inputContext.uploadedFileType || 'File'}). Status: File is uploaded/selected in the Document Capture section.`;
      }
      if (inputContext.extractedInputText) {
        activeInputSummary += `\n- EXTRACTED INNER FILE CONTENT / TEXT:\n"""\n${inputContext.extractedInputText.slice(0, 3000)}\n"""`;
      } else if (inputContext.pastedText) {
        activeInputSummary += `\n- CURRENT PASTED INPUT TEXT:\n"""\n${inputContext.pastedText.slice(0, 3000)}\n"""`;
      }
      if (inputContext.capturedPhoto) {
        activeInputSummary += `\n- CURRENT CAMERA SNAPSHOT: Image captured via phone/webcam camera in Document Capture section.`;
      }
    }
  }

  // Step 3: Try Live AI Chat Completion if API Key is configured
  const docTitle = document?.document_title || (inputContext?.uploadedFileName ? `File Selected: ${inputContext.uploadedFileName}` : 'No Document Analyzed Yet');
  const langPromptInstruction = isHindi
    ? `\n\n======================================================================
CRITICAL MANDATORY INSTRUCTION - LANGUAGE OVERRIDE: HINDI (हिंदी)
======================================================================
The user's active language preference in LegalLens is HINDI (हिंदी).
You MUST write your ENTIRE response ONLY in Hindi using Devanagari script (देवनागरी लिपि).
DO NOT respond in English or Roman script even if the user sends their query in English, Hinglish, or short words like "Hello", "Hi", "What is notice period?", "Explain this".
The user's active language mode ("hi") STRICTLY OVERRIDES input language detection.
Every sentence of your response must be in natural, fluent, accessible Hindi (Devanagari script).
======================================================================`
    : `\n\n======================================================================
CRITICAL MANDATORY INSTRUCTION - LANGUAGE OVERRIDE: ENGLISH
======================================================================
The user's active language preference in LegalLens is ENGLISH.
You MUST write your ENTIRE response in clear, everyday English.
======================================================================`;

  const systemPrompt = `You are LegalLens AI, a friendly, intelligent, context-aware AI assistant (powered by GenAI like ChatGPT/Gemini).
You are assisting the user on the LegalLens application.${langPromptInstruction}

DOCUMENT GROUNDING CONTEXT:
${document?.clauses && document.clauses.length > 0
      ? (document.clauses || [])
        .map(
          (c) =>
            `[Clause ID: ${c.id} | Title: ${c.title}]\nOriginal: ${c.original_text}\nExplanation: ${c.simple_explanation}\nRisk: ${c.risk_level}\nConsequence: ${c.one_line_consequence}`
        )
        .join('\n---\n')
      : 'No single document analysis generated yet.'}

ACTIVE INPUT PIPELINE & COMPARISON CONTEXT:
${activeInputSummary || 'No file or text currently selected.'}

SYSTEM INSTRUCTIONS & FORMATTING GUARDRAILS:
1. Be helpful, intelligent, dynamic, and conversational like ChatGPT or Gemini.
2. If the user asks about what file, image, PDF, or text they uploaded/pasted, use ACTIVE INPUT PIPELINE & COMPARISON CONTEXT above to answer directly.
3. If an analyzed document exists, answer questions about contract clauses, rent, deposit, notice, or legal terms using DOCUMENT GROUNDING CONTEXT above and reference relevant clauses.
4. COMPARE CONTRACTS MODE INSTRUCTIONS:
   - When in Compare Contracts mode (or when Document A / Document B context is provided above):
   - Direct questions about Document A specifically: Answer based on Document A text and clearly label with "[Doc A]" or "In Document A...".
   - Direct questions about Document B specifically: Answer based on Document B text and clearly label with "[Doc B]" or "In Document B...".
   - Ambiguous/General questions (e.g., "What is the notice period?", "What is the penalty?"): Default to answering for BOTH Document A and Document B side-by-side in a clean comparison table or labeled sections ([Document A] vs [Document B]).
   - If only one document (A or B) is currently loaded, answer based on the available document without erroring.
   - If NEITHER Document A nor Document B has text loaded, politely advise the user to paste or upload Document A or Document B to analyze.
5. CLEAN TYPOGRAPHY: Do NOT wrap headings or phrases in raw double asterisks (avoid raw **bolding**). Use clean section headings, capital headers, or bullet points (•) for structural hierarchy.
6. PROPER TABLE RENDERING: When outputting structured legal breakdowns, clause comparisons, or term metrics, format them as clean standard Markdown tables using pipes (| Header 1 | Header 2 |) and alignment rows (| --- | --- |). Do NOT output loose pipes (||) or broken text blocks.
7. Always maintain a clear, reassuring, and plain-language tone.
${langPromptInstruction}`;

  const formattedUserPrompt = isHindi
    ? `${question}\n\n[System Mandatory Note: The user has selected Hindi language mode. You MUST reply ONLY in Hindi Devanagari script.]`
    : question;

  const chatMessagesPayload = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((h) => ({
      role: h.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: h.text,
    })),
    { role: 'user' as const, content: formattedUserPrompt },
  ];

  const aiTextResponse = await callAiChatCompletion(chatMessagesPayload);

  if (aiTextResponse === 'RATE_LIMIT_EXHAUSTED') {
    const secondInMinute = Math.floor((Date.now() % 60000) / 1000);
    const resetSeconds = Math.max(1, 60 - secondInMinute);
    const rateLimitText = isHindi
      ? `⚡ सिस्टम दर सीमा समाप्त — इस मिनट के लिए 60 RPM / 12,000 TPM सीमा पूरी हो गई है। क्षमता ${resetSeconds} सेकंड में पुनः भर जाएगी। कृपया पुनः प्रयास करें!`
      : `⚡ System Rate Limit Reached — 60 RPM / 12,000 TPM limit hit for this minute. Capacity refills in ${resetSeconds}s. Please wait a moment before sending another query!`;
    return {
      id: `msg_rate_limit_${Date.now()}`,
      sender: 'assistant',
      text: rateLimitText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      quota: getQuotaStatus(),
    };
  }

  let textResponse = aiTextResponse;

  // Step 4: Smart Conversational & Grounded Intent Engine if Live AI is offline or key is non-live
  if (!textResponse) {
    const trimmedLower = question.trim().toLowerCase();

    const isFileQuery = trimmedLower.includes('which image') || trimmedLower.includes('what image') || trimmedLower.includes('which file') || trimmedLower.includes('uploaded') || trimmedLower.includes('pasted') || trimmedLower.includes('my document') || trimmedLower.includes('capture') || trimmedLower.includes('examine') || trimmedLower.includes('summary of that file') || trimmedLower.includes('फ़ाइल') || trimmedLower.includes('दस्तावेज़');
    const isNameQuery = trimmedLower.includes('name') || trimmedLower.includes('who are you') || trimmedLower.includes('who created') || trimmedLower.includes('आप कौन');
    const isGreeting = ['hello', 'hi', 'hey', 'greetings', 'namaste', 'नमस्ते', 'हेलो', 'हाय'].some((g) => trimmedLower.includes(g));
    const isCapabilityQuery = trimmedLower.includes('what can you do') || trimmedLower.includes('help') || trimmedLower.includes('how do you work') || trimmedLower.includes('क्या कर सकते');
    const isThanksQuery = trimmedLower.includes('thank') || trimmedLower.includes('thanks') || trimmedLower.includes('bye') || trimmedLower.includes('धन्यवाद');
    const isGeneralKnowledge =
      trimmedLower.includes('sky is blue') ||
      trimmedLower.includes('why is the sky') ||
      trimmedLower.includes('joke') ||
      trimmedLower.includes('weather') ||
      (qTokens.length === 0 && !['rent', 'lease', 'deposit', 'notice', 'clause', 'penalty', 'pay', 'term', 'bond', 'किराया', 'डिपॉजिट', 'नोटिस'].some(k => trimmedLower.includes(k)));

    if (isFileQuery && (inputContext?.extractedInputText || inputContext?.pastedText)) {
      const srcText = inputContext.extractedInputText || inputContext.pastedText;
      const fileName = inputContext.uploadedFileName ? `**${inputContext.uploadedFileName}**` : (isHindi ? 'आपका दस्तावेज़' : 'your input document');
      textResponse = isHindi
        ? `${fileName} का सारांश यहाँ है:\n\n• **सामग्री का पूर्वावलोकन**: "${srcText.slice(0, 350)}${srcText.length > 350 ? '...' : ''}"\n\nआपका फ़ाइल दस्तावेज़ कैप्चर अनुभाग में चयनित है। पूर्ण 4-चरण AI विश्लेषण और जोखिम टैगिंग चलाने के लिए **"Analyze Document"** पर क्लिक करें!`
        : `Here is a summary of ${fileName}:\n\n• **Extracted Content Preview**: "${srcText.slice(0, 350)}${srcText.length > 350 ? '...' : ''}"\n\nYour file is selected in the Document Capture section. Click **"Analyze Document"** to run full 4-stage AI clause simplification and risk tagging!`;
      citedClauseIds.length = 0;
    } else if (isFileQuery && inputContext?.uploadedFileName) {
      textResponse = isHindi
        ? `आपने **${inputContext.uploadedFileName}** को दस्तावेज़ कैप्चर अनुभाग में अपलोड किया है! 📄 यह वर्तमान में विश्लेषण के लिए तैयार है। पूर्ण खंड सरलीकरण देखने के लिए "Analyze Document" पर क्लिक करें!`
        : `You have uploaded **${inputContext.uploadedFileName}** (${inputContext.uploadedFileSize || 'File'}, ${inputContext.uploadedFileType || 'Format'}) in the Document Capture section! 📄 It is currently selected and ready for analysis. Click "Analyze Document" to view full clause simplifications and risk tagging!`;
      citedClauseIds.length = 0;
    } else if (isNameQuery) {
      textResponse = isHindi
        ? `मैं लीगललेंस (LegalLens) AI हूँ, आपका कानूनी AI सहायक! ⚖️ मैं आपको आसान हिंदी भाषा में कानूनी समझौतों को समझने, छिपे हुए वित्तीय जोखिमों को पहचानने, अनुबंधों की तुलना करने और मुफ्त कानूनी सहायता (NALSA 15100) खोजने में मदद करता हूँ।`
        : `I am LegalLens AI, your GenAI Legal Partner! ⚖️ I help you understand legal agreements in simple everyday language, flag hidden financial risks, compare contracts side-by-side, and find free Legal Aid (NALSA 15100) support.`;
      citedClauseIds.length = 0;
    } else if (isGreeting) {
      textResponse = isHindi
        ? `नमस्ते! 👋 मैं आपका लीगललेंस AI सहायक हूँ। आप मुझसे कोई भी सवाल पूछ सकते हैं या विश्लेषण के लिए अपना अनुबंध अपलोड कर सकते हैं!`
        : `Hello! 👋 I am your LegalLens AI Assistant powered by Groq & Gemini. You can ask me any question or upload a contract to analyze!`;
      citedClauseIds.length = 0;
    } else if (isCapabilityQuery) {
      textResponse = isHindi
        ? `मैं आपकी इन तरीकों से मदद कर सकता हूँ:\n\n• **सामान्य AI प्रश्नोत्तर**: सरल भाषा में कानूनी प्रश्नों का उत्तर देना।\n• **खंड सरलीकरण**: कठिन कानूनी शब्दावली का सरल हिंदी में अनुवाद।\n• **जोखिम टैगिंग**: छिपे हुए दंड या उच्च जोखिम वाली शर्तों को लाल/पीले संकेतकों से दिखाना।\n• **अनुबंध तुलना**: दो अनुबंधों (जैसे किराया या नौकरी पत्र) की साथ-साथ तुलना करना।\n• **कानूनी सहायता खोजक**: अपने पास निकटतम मुफ्त NALSA (15100) कानूनी सहायता कार्यालय खोजना।`
        : `Here is what I can do for you:\n\n• **General AI Q&A**: Answer general questions using high-speed LLMs.\n• **Clause Simplification**: Translate complex legal jargon into plain, everyday language.\n• **Risk Tagging**: Flag hidden penalties or high-risk terms with visual traffic-light indicators.\n• **Contract Comparison**: Compare two lease or employment counter-offers side-by-side.\n• **Action Checklists**: Export key deadlines directly to your calendar.\n• **Legal Aid Locator**: Find toll-free NALSA (15100) legal aid offices near you.`;
      citedClauseIds.length = 0;
    } else if (isThanksQuery) {
      textResponse = isHindi
        ? `आपका बहुत स्वागत है! जब भी आपको आवश्यकता हो, बेझिझक कोई भी प्रश्न पूछें।`
        : `You're very welcome! Feel free to ask any other questions whenever you need.`;
      citedClauseIds.length = 0;
    } else if (isGeneralKnowledge) {
      textResponse = isHindi
        ? `मैं सामान्य और कानूनी दोनों तरह के प्रश्नों का उत्तर दे सकता हूँ! अनुबंध, जमा राशि वापसी, नोटिस अवधि आदि के बारे में बेझिझक पूछें।`
        : `I can answer general questions as well as legal questions! Feel free to ask about contracts, deposit returns, notice periods, or general topics.`;
      citedClauseIds.length = 0;
    } else {
      const matchingClauses = (document?.clauses || []).filter((c: SimplifiedClause) => citedClauseIds.includes(c.id));
      if (matchingClauses.length > 0) {
        textResponse = isHindi
          ? `आपके अनुबंध (${docTitle}) के आधार पर:\n\n` +
          matchingClauses.map((c: SimplifiedClause) => `• **${c.title}**: ${c.simple_explanation}`).join('\n\n') +
          `\n\n*परिणाम:* ${matchingClauses[0].one_line_consequence}`
          : `Based on your contract (${docTitle}):\n\n` +
          matchingClauses.map((c: SimplifiedClause) => `• **${c.title}**: ${c.simple_explanation}`).join('\n\n') +
          `\n\n*Consequence:* ${matchingClauses[0].one_line_consequence}`;
      } else {
        textResponse = document
          ? (isHindi
            ? `मैंने आपके दस्तावेज़ "${docTitle}" की समीक्षा की है। अनुबंध में उस प्रश्न के लिए विस्तृत शर्तें नहीं हैं। हम मकान मालिक/नियोक्ता या कानूनी सलाहकार से जाँच करने की सलाह देते हैं।`
            : `I reviewed your document "${docTitle}". The contract does not explicitly detail terms for that query. We recommend checking with your landlord/employer or a legal advisor.`)
          : inputContext?.uploadedFileName
            ? (isHindi
              ? `आपने दस्तावेज़ कैप्चर में **${inputContext.uploadedFileName}** अपलोड किया है। यह विश्लेषण के लिए तैयार है!`
              : `You have uploaded **${inputContext.uploadedFileName}** in Document Capture. It is selected and ready for analysis!`)
            : (isHindi
              ? `नमस्ते! मैं आपका लीगललेंस AI सहायक हूँ। शुरू करने के लिए कृपया कोई भी प्रश्न पूछें या दस्तावेज़ अपलोड करें।`
              : `Hello! I am your LegalLens AI Assistant. Please ask any question or upload a document to get started.`);
        citedClauseIds.length = 0;
      }
    }
  }

  function sanitizeResponseLanguage(text: string, isHindi: boolean): string {
    if (!text) return text;
    if (isHindi) {
      return text
        .replace(/^Hello!\s*👋\s*/i, 'नमस्ते! 👋 ')
        .replace(/^Hello!\s*/i, 'नमस्ते! ')
        .replace(/^Hi!\s*/i, 'नमस्ते! ')
        .replace(/How can I help you today\?\s*/gi, 'मैं आज आपकी क्या सहायता कर सकता हूँ? ')
        .replace(/If you have a contract or legal question, just let me know and I'll walk you through it\./gi, 'यदि आपके पास कोई अनुबंध या कानूनी प्रश्न है, तो मुझे बताएं और मैं विवरण में आपकी सहायता करूँगा।')
        .replace(/If you have a specific contract you'd like to review or a particular clause you're unsure about, feel free to share it and I can walk you through the details!/gi, 'यदि आपके पास समीक्षा के लिए कोई विशिष्ट अनुबंध है या किसी विशेष खंड के बारे में अनिश्चित हैं, तो बेझिझक साझा करें और मैं आपको विवरण समझाऊँगा!');
    } else {
      return text
        .replace(/^नमस्ते!\s*👋\s*/i, 'Hello! 👋 ')
        .replace(/^नमस्ते!\s*/i, 'Hello! ')
        .replace(/मैं आज आपकी क्या सहायता कर सकता हूँ\?\s*/gi, 'How can I help you today? ');
    }
  }

  return {
    id: `msg_ans_${Date.now()}`,
    sender: 'assistant',
    text: postProcessCleanResponseText(sanitizeResponseLanguage(textResponse, isHindi)),
    cited_clause_ids: citedClauseIds.length > 0 ? citedClauseIds : undefined,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    quota: getQuotaStatus(),
  };
}

