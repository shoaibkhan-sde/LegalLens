import dotenv from 'dotenv';
import path from 'path';

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
  SimplifiedClause,
} from '../../../src/types/schemas';
import { SAMPLE_RENTAL_AGREEMENT, SAMPLE_EMPLOYMENT_CONTRACT } from '../data/sampleDocuments';
import { alignClauses } from '../../../src/utils/clauseAlignment';

// Server-side in-memory API key store
let serverApiKey: string | null = process.env.ASTRA_API_KEY || process.env.GEMINI_API_KEY || null;

export function setServerApiKey(key: string): void {
  serverApiKey = key;
}

export function getServerConfigStatus(): ServerConfigStatus {
  const key = (serverApiKey || process.env.ASTRA_API_KEY || process.env.GEMINI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  const hasKey = !!(key && key.length > 5);
  return {
    isConfigured: hasKey,
    demoMode: !hasKey,
  };
}

// Universal AI Chat Completion Helper (Experiential Labs / Astra / Gemini / OpenAI)
async function callAiChatCompletion(messages: any[], jsonMode: boolean = false): Promise<string | null> {
  const activeKey = (serverApiKey || process.env.ASTRA_API_KEY || process.env.GEMINI_API_KEY || '').replace(/^['"]|['"]$/g, '').trim();
  if (!activeKey || activeKey.length < 5) return null;

  // Potential endpoints to try based on key type
  const endpointsToTry: { url: string; model: string }[] = [];

  if (activeKey.startsWith('AIza') || activeKey.startsWith('AQ.')) {
    endpointsToTry.push(
      { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash' },
      { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-3.6-flash' }
    );
  } else if (activeKey.startsWith('xpl_')) {
    endpointsToTry.push(
      { url: 'https://api.experientiallabs.ai/v1/chat/completions', model: 'gpt-6-astra' },
      { url: 'https://api.experientiallabs.ai/v1/chat/completions', model: 'deepseek-v4-flash' },
      { url: 'https://api.experientiallabs.ai/v1/chat/completions', model: 'gpt-5.6-luna' }
    );
  } else if (activeKey.startsWith('AstraCS:')) {
    endpointsToTry.push({
      url: 'https://api.astra.datastax.com/v1/chat/completions',
      model: 'gpt-4o-mini',
    });
  } else {
    endpointsToTry.push(
      { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-2.5-flash' },
      { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: 'gemini-3.6-flash' },
      { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' }
    );
  }

  for (const target of endpointsToTry) {
    const payload: any = {
      model: target.model,
      messages,
    };

    if (jsonMode) {
      payload.response_format = { type: 'json_object' };
    }

    // Only add temperature for providers known to accept it (skip for experientiallabs gateway)
    if (!target.url.includes('experientiallabs.ai')) {
      payload.temperature = 0.3;
    }

    try {
      const res = await fetch(target.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      } else {
        const errText = await res.text();
        console.warn(`AI API call to ${target.url} returned HTTP ${res.status}:`, errText);
      }
    } catch (err) {
      console.warn(`AI API call to ${target.url} failed:`, err);
    }
  }

  return null;
}

// Guard 1: Fast Input Gate Classifier with Substantive Legal Reasoning
export function runGuard1InputGate(text: string): Guard1InputGate {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Rule 1: Minimal text length check
  if (trimmed.length < 50) {
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

  // Rule 3: Negative Classifier - News Article / Editorial / Blog
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
  ];
  if (newsKeywords.some((kw) => lower.includes(kw))) {
    return {
      is_legal_document: false,
      category: 'other',
      confidence: 0.97,
      rejection_reason:
        'Document rejected by Guard 1: This content appears to be a news article or press release, not a legal document.',
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

  // Rule 5: Substantive Legal Criteria (Identifiable Parties + Legal Terms/Obligations)
  const legalPartyIndicators = [
    'lessor',
    'lessee',
    'tenant',
    'landlord',
    'employer',
    'employee',
    'borrower',
    'lender',
    'buyer',
    'seller',
    'disclosing party',
    'receiving party',
    'company',
    'client',
    'contractor',
    'affiant',
    'licensor',
    'licensee',
    'parties',
  ];

  const legalObligationIndicators = [
    'agree',
    'agrees',
    'shall',
    'covenant',
    'undertake',
    'hereby',
    'rent',
    'salary',
    'payment',
    'deposit',
    'notice period',
    'confidential',
    'indemnify',
    'liable',
    'jurisdiction',
    'governing law',
    'in witness whereof',
    'signatures',
    'terms and conditions',
    'clause',
  ];

  let partyCount = 0;
  for (const partyKw of legalPartyIndicators) {
    if (lower.includes(partyKw)) partyCount += 1;
  }

  let obligationCount = 0;
  for (const obKw of legalObligationIndicators) {
    if (lower.includes(obKw)) obligationCount += 1;
  }

  // Substantive Check: A legal document MUST have identifiable parties AND binding terms
  const hasLegalSubstance = (partyCount >= 1 && obligationCount >= 2) || obligationCount >= 4;

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
  let detectedCategory = 'other' as any;
  if (lower.includes('rent') || lower.includes('tenant') || lower.includes('lessor') || lower.includes('lease')) {
    detectedCategory = 'rental/lease agreement';
  } else if (lower.includes('employee') || lower.includes('employer') || lower.includes('ctc') || lower.includes('salary')) {
    detectedCategory = 'employment contract';
  } else if (lower.includes('non-disclosure') || lower.includes('confidential') || lower.includes('nda')) {
    detectedCategory = 'NDA';
  } else if (lower.includes('loan') || lower.includes('borrower') || lower.includes('interest rate') || lower.includes('promissory')) {
    detectedCategory = 'loan agreement/promissory note';
  } else if (lower.includes('sale') || lower.includes('purchaser') || lower.includes('conveyance')) {
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

// Document Analysis Pipeline
export async function analyzeDocumentText(
  text: string,
  categoryHint?: string
): Promise<DocumentAnalysisResult> {
  // Step 1: Guard 1 Input Gate
  const guard1 = runGuard1InputGate(text);
  if (!guard1.is_legal_document) {
    throw new Error(guard1.rejection_reason || 'Document rejected by Guard 1 input gate.');
  }

  const { demoMode } = getServerConfigStatus();

  // If live API KEY is available, run live AI document analysis
  if (!demoMode) {
    const jsonPrompt = [
      {
        role: 'system',
        content: `You are LegalLens AI, an accessible legal document analyzer. 
Analyze the provided document text and produce a strict JSON response.
Taxonomy Document Categories: ${JSON.stringify(DOCUMENT_CATEGORY_ENUM)}
Taxonomy Clause Types: ${JSON.stringify(CLAUSE_TYPE_ENUM)}
Rule: Every simplified clause must have a simple_explanation and a very_simple_explanation (ultra-simple plain language), a risk_level ('low'|'medium'|'high'), a plain consequence string with icon name, and citation targets.`,
      },
      {
        role: 'user',
        content: `Analyze this document text:\n\n${text.slice(0, 15000)}`,
      },
    ];

    const jsonResult = await callAiChatCompletion(jsonPrompt, true);
    if (jsonResult) {
      try {
        const parsed = JSON.parse(jsonResult);
        return {
          guard1,
          ...parsed,
        };
      } catch (e) {
        console.warn('Failed to parse AI JSON result, using heuristic pipeline:', e);
      }
    }
  }

  // Fallback Mock Engine: Match sample document or generate structured analysis
  const lower = text.toLowerCase();
  if (lower.includes('rental') || lower.includes('tenant') || lower.includes('indiranagar') || lower.includes('lessor')) {
    return SAMPLE_RENTAL_AGREEMENT;
  } else if (lower.includes('employment') || lower.includes('technova') || lower.includes('software engineer') || lower.includes('ctc')) {
    return SAMPLE_EMPLOYMENT_CONTRACT;
  }

  // Dynamic Fallback Generator for custom uploaded text when no API key is set
  return generateDynamicFallbackAnalysis(text, guard1);
}

function generateDynamicFallbackAnalysis(
  text: string,
  guard1: Guard1InputGate
): DocumentAnalysisResult {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const clauses = paragraphs.slice(0, 6).map((para, idx) => {
    const isHighRisk = para.toLowerCase().includes('penalty') || para.toLowerCase().includes('forfeit') || para.toLowerCase().includes('terminate');
    const isMediumRisk = para.toLowerCase().includes('notice') || para.toLowerCase().includes('deposit') || para.toLowerCase().includes('interest');
    const riskLevel: 'low' | 'medium' | 'high' = isHighRisk ? 'high' : isMediumRisk ? 'medium' : 'low';

    return {
      id: `dyn_clause_${idx + 1}`,
      clause_number: `${idx + 1}`,
      clause_type: (idx === 0 ? 'parties & recitals' : idx === 1 ? 'payment/consideration' : idx === 2 ? 'term & termination' : 'other') as any,
      title: `Clause ${idx + 1}: ${para.slice(0, 30)}...`,
      original_text: para,
      simple_explanation: `This clause explains the rules regarding ${para.slice(0, 50).toLowerCase()}...`,
      very_simple_explanation: `This part tells you what is expected in point ${idx + 1}.`,
      risk_level: riskLevel,
      icon_name: riskLevel === 'high' ? 'AlertOctagon' : riskLevel === 'medium' ? 'Clock' : 'CheckCircle',
      one_line_consequence:
        riskLevel === 'high'
          ? 'High Risk: Contains potential penalties or strict financial obligations.'
          : riskLevel === 'medium'
          ? 'Watch Out: Contains notice or payment timelines to remember.'
          : 'Safe Clause: Standard legal terms.',
    };
  });

  return {
    guard1,
    document_title: 'Uploaded Legal Agreement',
    category: guard1.category,
    overall_risk_score: 55,
    summary_simple: 'Uploaded document analyzed via fallback engine. Key clauses extracted for review.',
    summary_very_simple: 'This document has been broken into simple points below.',
    clauses,
    contradictions: [],
    checklist: {
      title: 'Action & Deadline Checklist',
      stamp_duty_required: true,
      stamp_duty_note: 'Verify stamp paper requirements under local state stamp act.',
      items: [
        {
          id: 'dyn_chk_1',
          category: 'obligation',
          title: 'Review Extracted Terms',
          description: 'Ensure all key obligations and payment terms match your verbal understanding.',
          action_required: 'Check clauses 1 through ' + clauses.length,
        },
      ],
      disclaimer: 'Generated automatically by LegalLens.',
    },
    options_next_steps: [
      {
        id: 'dyn_opt_1',
        title: 'Review High Risk Clauses',
        description: 'Carefully verify clauses tagged with red warning icons.',
        benefit: 'Prevents unexpected financial penalties.',
      },
    ],
    lawyer_briefing: {
      document_summary: 'Custom agreement containing ' + clauses.length + ' primary clauses.',
      flagged_issues: [],
      questions_to_ask_lawyer: ['Are all clauses in this agreement legally enforceable in my state?'],
      missing_protective_clauses: ['Check for missing dispute resolution or termination clauses.'],
      recommended_next_steps: ['Have a registered advocate review before signing.'],
      disclaimer: 'Informational packet.',
    },
    disclaimer: 'LegalLens provides AI-assisted analysis for informational purposes only.',
  };
}

// Compare 2 Documents
export async function compareTwoDocuments(
  docA: DocumentAnalysisResult,
  docB: DocumentAnalysisResult
): Promise<ComparisonResult> {
  const alignment = alignClauses(docA.clauses, docB.clauses);

  return {
    doc_a_title: docA.document_title,
    doc_b_title: docB.document_title,
    aligned_pairs: alignment.alignedPairs,
    a_only_clauses: alignment.aOnlyClauses,
    b_only_clauses: alignment.bOnlyClauses,
    key_differences_summary: `Compared ${docA.document_title} against ${docB.document_title}. Found ${alignment.alignedPairs.length} aligned clause pairs, ${alignment.aOnlyClauses.length} clauses present only in Document A, and ${alignment.bOnlyClauses.length} clauses present only in Document B.`,
    winner_recommendation:
      docA.overall_risk_score < docB.overall_risk_score
        ? `${docA.document_title} has a lower overall risk score (${docA.overall_risk_score} vs ${docB.overall_risk_score}) and offers safer tenant/party terms.`
        : `${docB.document_title} is comparatively safer.`,
    disclaimer: 'Comparison generated by LegalLens for informational evaluation.',
  };
}

// Grounded Document Q&A (Live Conversational AI Mode with Smart Intent Fallback)
export async function answerDocumentQuestion(
  document: DocumentAnalysisResult,
  question: string,
  history: ChatMessage[]
): Promise<ChatMessage> {
  // Step 1: Guard 2b Legal Safety Filter on user input
  const safety = runGuard2bSafetyFilter(question);
  if (!safety.isSafe) {
    return {
      id: `msg_refused_${Date.now()}`,
      sender: 'assistant',
      text: safety.reason!,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_flagged_unsafe: true,
      safety_reason: safety.reason,
    };
  }

  // Step 2: Extract grounding clause IDs by filtering out common stop words
  const STOP_WORDS = new Set([
    'what', 'is', 'your', 'name', 'who', 'are', 'you', 'how', 'this', 'that', 'with', 'from',
    'have', 'will', 'been', 'there', 'they', 'them', 'their', 'which', 'where', 'when', 'does',
    'would', 'could', 'should', 'about', 'can', 'please', 'tell', 'me'
  ]);

  const qTokens = question
    .toLowerCase()
    .split(/[^\w]+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  const citedClauseIds: string[] = [];

  if (qTokens.length > 0) {
    (document?.clauses || []).forEach((c: SimplifiedClause) => {
      const text = (c.original_text + ' ' + c.simple_explanation + ' ' + c.title).toLowerCase();
      const hasMatch = qTokens.some((t) => text.includes(t));
      if (hasMatch) {
        citedClauseIds.push(c.id);
      }
    });
  }

  // Step 3: Try Live AI Chat Completion if API Key is configured
  const systemPrompt = `You are LegalLens AI, a friendly, intelligent, and highly capable AI assistant (powered by GenAI like ChatGPT/Gemini).
You are assisting the user alongside their document titled "${document?.document_title || 'Legal Document'}".

DOCUMENT GROUNDING CONTEXT:
${(document?.clauses || [])
  .map(
    (c) =>
      `[Clause ID: ${c.id} | Title: ${c.title}]\nOriginal: ${c.original_text}\nExplanation: ${c.simple_explanation}\nRisk: ${c.risk_level}\nConsequence: ${c.one_line_consequence}`
  )
  .join('\n---\n')}

SYSTEM INSTRUCTIONS:
1. Be helpful, intelligent, dynamic, and conversational like ChatGPT or Gemini.
2. If the user asks a general question (e.g., general science, math, trivia, greetings, or general knowledge), answer their question directly, accurately, and pleasantly.
3. If the user asks about their document, contract clauses, rent, deposit, notice, or legal terms, answer using the document grounding context above and reference relevant clauses.
4. Always maintain a clear, reassuring, and plain-language tone.`;

  const chatMessagesPayload = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-6).map((h) => ({
      role: h.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: h.text,
    })),
    { role: 'user' as const, content: question },
  ];

  const aiTextResponse = await callAiChatCompletion(chatMessagesPayload);

  let textResponse = aiTextResponse;

  // Step 4: Smart Conversational & Grounded Intent Engine if Live AI is offline or key is non-live
  if (!textResponse) {
    const trimmedLower = question.trim().toLowerCase();

    const isNameQuery = trimmedLower.includes('name') || trimmedLower.includes('who are you') || trimmedLower.includes('who created');
    const isGreeting = ['hello', 'hi', 'hey', 'greetings', 'namaste'].some((g) => trimmedLower.includes(g));
    const isCapabilityQuery = trimmedLower.includes('what can you do') || trimmedLower.includes('help') || trimmedLower.includes('how do you work');
    const isThanksQuery = trimmedLower.includes('thank') || trimmedLower.includes('thanks') || trimmedLower.includes('bye');
    const isGeneralKnowledge =
      trimmedLower.includes('sky is blue') ||
      trimmedLower.includes('why is the sky') ||
      trimmedLower.includes('joke') ||
      trimmedLower.includes('weather') ||
      (qTokens.length === 0 && !['rent', 'lease', 'deposit', 'notice', 'clause', 'penalty', 'pay', 'term', 'bond'].some(k => trimmedLower.includes(k)));

    if (isNameQuery) {
      textResponse = `I am LegalLens AI, your GenAI Legal Partner! ⚖️ I help you understand legal agreements in simple everyday language, flag hidden financial risks, compare contracts side-by-side, and find free Legal Aid (NALSA 15100) support.`;
      citedClauseIds.length = 0;
    } else if (isGreeting) {
      textResponse = `Hello! 👋 I am your LegalLens AI Assistant. I can answer questions strictly grounded in your contract ("${document.document_title}"). Ask me about deposit returns, notice periods, rent payment terms, or penalties!`;
      citedClauseIds.length = 0;
    } else if (isCapabilityQuery) {
      textResponse = `Here is what I can do for you:\n\n• **Clause Simplification**: Translate complex legal jargon into plain, everyday language.\n• **Risk Tagging**: Flag hidden penalties or high-risk terms with visual traffic-light indicators.\n• **Contract Comparison**: Compare two lease or employment counter-offers side-by-side.\n• **Action Checklists**: Export key deadlines directly to your calendar.\n• **Legal Aid Locator**: Find toll-free NALSA (15100) legal aid offices near you.`;
      citedClauseIds.length = 0;
    } else if (isThanksQuery) {
      textResponse = `You're very welcome! Feel free to ask any other questions about your contract whenever you need.`;
      citedClauseIds.length = 0;
    } else if (isGeneralKnowledge) {
      textResponse = `That's a general question outside your contract! 🌤️ (e.g. Rayleigh scattering makes the sky blue by scattering short blue light wavelengths). For your document ("${document.document_title}"), I can answer any questions about rent, security deposits, notice periods, or penalties!`;
      citedClauseIds.length = 0;
    } else {
      const matchingClauses = document.clauses.filter((c: SimplifiedClause) => citedClauseIds.includes(c.id));
      if (matchingClauses.length > 0) {
        textResponse =
          `Based on your contract (${document.document_title}):\n\n` +
          matchingClauses.map((c: SimplifiedClause) => `• **${c.title}**: ${c.simple_explanation}`).join('\n\n') +
          `\n\n*Consequence:* ${matchingClauses[0].one_line_consequence}`;
      } else {
        textResponse = `I reviewed your document "${document.document_title}". The contract does not explicitly detail terms for that query. We recommend checking with your landlord/employer or a legal advisor.`;
        citedClauseIds.length = 0;
      }
    }
  }

  return {
    id: `msg_ans_${Date.now()}`,
    sender: 'assistant',
    text: textResponse,
    cited_clause_ids: citedClauseIds.length > 0 ? citedClauseIds : undefined,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}
