import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument } from 'pdf-lib';
import {
  extractAndCleanDocumentText,
  extractAndCleanDocumentTextAsync,
  analyzeDocumentText,
  compareTwoDocuments,
  runGuard1InputGate,
} from '../services/astraBackend.js';
import { createDocxBufferFromText } from './test_docx_generator.js';
import { DocumentAnalysisResult } from '../../../src/types/schemas.js';

const FIXTURES_DIR = fs.existsSync(path.resolve(process.cwd(), 'server/src/tests/fixtures'))
  ? path.resolve(process.cwd(), 'server/src/tests/fixtures')
  : path.resolve(process.cwd(), 'src/tests/fixtures');

// Helper to simulate the frontend Promise.allSettled error isolation behavior
async function simulateParallelComparePipeline(
  inputA: { textOrBuffer: string | Buffer; mimeType?: string; filename?: string },
  inputB: { textOrBuffer: string | Buffer; mimeType?: string; filename?: string }
): Promise<{
  success: boolean;
  docA?: DocumentAnalysisResult;
  docB?: DocumentAnalysisResult;
  comparisonResult?: any;
  error?: string;
  docAErr?: string;
  docBErr?: string;
  latencyMs?: number;
}> {
  const startTime = Date.now();

  const processInput = async (input: { textOrBuffer: string | Buffer; mimeType?: string; filename?: string }, docName: string) => {
    let text = '';
    if (typeof input.textOrBuffer === 'string') {
      text = input.textOrBuffer;
    } else {
      const mime = input.mimeType || 'application/pdf';
      const name = input.filename || 'doc.pdf';
      if (mime.startsWith('image/')) {
        text = await extractAndCleanDocumentTextAsync(input.textOrBuffer, mime, name);
      } else {
        text = await extractAndCleanDocumentTextAsync(input.textOrBuffer, mime, name);
      }
    }

    if (!text || text.trim().length === 0) {
      throw new Error(`Document rejected by Guard 1: The document is empty or contains no readable text.`);
    }

    const g1 = runGuard1InputGate(text);
    if (!g1.is_legal_document) {
      throw new Error(g1.rejection_reason || 'Document rejected by Guard 1: Not a valid legal document.');
    }

    return await analyzeDocumentText(text, input.filename || docName);
  };

  const [resA, resB] = await Promise.allSettled([
    processInput(inputA, 'Document A'),
    processInput(inputB, 'Document B'),
  ]);

  const latencyMs = Date.now() - startTime;

  if (resA.status === 'rejected' && resB.status === 'rejected') {
    const reasonA = resA.reason?.message || String(resA.reason);
    const reasonB = resB.reason?.message || String(resB.reason);
    return {
      success: false,
      docAErr: reasonA,
      docBErr: reasonB,
      error: `Comparison Error — Multiple document failures:\n• Document A: ${reasonA}\n• Document B: ${reasonB}`,
      latencyMs,
    };
  }

  if (resA.status === 'rejected') {
    const reasonA = resA.reason?.message || String(resA.reason);
    return {
      success: false,
      docAErr: reasonA,
      error: `Document A could not be analyzed: ${reasonA}`,
      latencyMs,
    };
  }

  if (resB.status === 'rejected') {
    const reasonB = resB.reason?.message || String(resB.reason);
    return {
      success: false,
      docBErr: reasonB,
      error: `Document B could not be analyzed: ${reasonB}`,
      latencyMs,
    };
  }

  const docAObj = resA.value;
  const docBObj = resB.value;
  const comp = await compareTwoDocuments(docAObj, docBObj);

  return {
    success: true,
    docA: docAObj,
    docB: docBObj,
    comparisonResult: comp,
    latencyMs,
  };
}

async function runE2ECompareMatrixTests() {
  console.log('====================================================================');
  console.log('   COMPARE CONTRACTS PIPELINE END-TO-END QA MATRIX TEST SUITE');
  console.log('====================================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assertTest(name: string, condition: boolean, detail: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${name}`);
      console.log(`   └─ ${detail}`);
    } else {
      failedTests++;
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   └─ ${detail}`);
    }
  }

  // -------------------------------------------------------------------------
  // FIXTURE INGESTION & GENERATION
  // -------------------------------------------------------------------------
  const txtLegalA = fs.readFileSync(path.join(FIXTURES_DIR, '01_rental_agreement.txt'), 'utf-8');
  const txtLegalB = fs.readFileSync(path.join(FIXTURES_DIR, '03_nda.txt'), 'utf-8');
  const txtHindiLegal = fs.readFileSync(path.join(FIXTURES_DIR, '07_mixed_language_loan_agreement.txt'), 'utf-8');
  const pdfLegalA = fs.readFileSync(path.join(FIXTURES_DIR, '08_loan_agreement.pdf'));
  const pdfLegalB = fs.readFileSync(path.join(FIXTURES_DIR, 'legal_master_services_agreement.pdf'));
  const imgOfferLetter = fs.readFileSync(path.join(FIXTURES_DIR, '09_photo_employment_offer.jpg'));

  const txtNewsNonLegal = fs.readFileSync(path.join(FIXTURES_DIR, 'failing_news_article.txt'), 'utf-8');
  const txtExamNonLegal = fs.readFileSync(path.join(FIXTURES_DIR, 'failing_exam_paper.txt'), 'utf-8');
  const pdfNewsNonLegal = fs.readFileSync(path.join(FIXTURES_DIR, '05_REJECT_news_article.pdf'));

  const gibberishText = 'asdfghjkl 12345 qwerty uiop zxcvbnm test 999';
  const illegalRequestText = 'Detailed guide on breaking into secure servers, disabling anti-theft alarms, and stealing hardware.';

  // DOCX Legal Fixture A (Master Services Agreement)
  const docxLegalA = createDocxBufferFromText([
    'MASTER SERVICES AGREEMENT',
    'This Master Services Agreement ("Agreement") is entered into as of January 1, 2026, by and between Alpha Solutions Inc. ("Provider") and Beta Corp ("Client").',
    '1. SERVICES & SCOPE: Provider agrees to perform software engineering and cloud consulting services as described in attached Statements of Work.',
    '2. PAYMENT TERMS & COMPENSATION: Client shall pay Provider within 30 days of receiving a valid invoice. Late payments accrue interest at 1.5% per month.',
    '3. CONFIDENTIALITY: Both parties agree to maintain strict confidentiality regarding all proprietary technical and business data shared during the term.',
    '4. INDEMNIFICATION & LIABILITY: Provider agrees to indemnify Client against third-party IP infringement claims up to the total fees paid under this Agreement.',
    '5. GOVERNING LAW & JURISDICTION: This Agreement shall be governed by and construed in accordance with the laws of California.'
  ]);

  // DOCX Legal Fixture B (Employment Contract)
  const docxLegalB = createDocxBufferFromText([
    'EMPLOYMENT AGREEMENT',
    'This Employment Agreement is entered into on February 1, 2026 between TechCorp Pvt Ltd ("Employer") and Mr. Rahul Sharma ("Employee").',
    '1. POSITION & DUTIES: Employee is hired as Senior Software Engineer responsible for backend application development.',
    '2. COMPENSATION & BENEFIT: Base salary shall be Rs. 1,50,000 per month, subject to standard tax deductions.',
    '3. NOTICE PERIOD & TERMINATION: Either party may terminate this agreement by providing 30 days written notice.',
    '4. NON-COMPETE & NON-SOLICITATION: Employee agrees not to engage with direct competitors during employment and for 12 months post-termination.'
  ]);

  // DOCX Non-Legal Fixture (News Article)
  const docxNewsNonLegal = createDocxBufferFromText([
    'DAILY TECH NEWS & MARKET REVIEWS',
    'Reported by News Desk on March 15, 2026.',
    'Tech giants announced new artificial intelligence models today. Industry analysts expect significant productivity gains across corporate sectors.',
    'Stock markets reacted positively to the news with tech indices closing 2.4% higher.'
  ]);

  // Large 25-Page DOCX Fixture with 30 distinct numbered clauses for quantitative verification
  const largeDocxParagraphs: string[] = [
    'COMPREHENSIVE MULTI-PAGE ENTERPRISE LEASE & SERVICE AGREEMENT',
    'This Master Agreement is entered into as of January 1, 2026 between Global Enterprise Corp ("Lessor") and Omni Services Ltd ("Lessee").'
  ];
  for (let i = 1; i <= 30; i++) {
    largeDocxParagraphs.push(
      `SECTION ${i}. OBLIGATION AND SPECIFICATION CLAUSE ${i}: Both parties explicitly agree to adhere to clause parameter ${i}. Lessee shall remit payment and comply with operational guidelines ${i}. Provider guarantees uptime and SLA compliance level ${i}. Any dispute arising under section ${i} shall be resolved via binding arbitration.`
    );
  }
  const docxLarge25Page = createDocxBufferFromText(largeDocxParagraphs);

  // Encrypted / Password-Protected PDF Fixture containing standard PDF /Encrypt trailer dictionary
  const passwordProtectedPdf = Buffer.from(`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kinds [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 72 712 Td (Secret Protected Legal Document) Tj ET
endstream
endobj
5 0 obj
<< /Filter /Standard /V 2 /R 3 /O (12345678901234567890123456789012) /U (12345678901234567890123456789012) /P -60 >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000202 00000 n 
0000000296 00000 n 
trailer
<< /Size 6 /Root 1 0 R /Encrypt 5 0 R >>
startxref
420
%%EOF`);

  // Clear Legal Image Fixtures with valid JPEG headers & readable legal text
  const imgLegalClearA = Buffer.from(`\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x60\x00\x60\x00\x00
EMPLOYMENT OFFER LETTER AND SERVICE CONTRACT
This Employment Offer Letter is issued by Blue Ridge Traders Pvt Ltd ("Employer") to Mr. Sanjay Patel ("Employee"), effective March 1, 2026.
1. SALARY AND COMPENSATION: Base salary shall be Rs. 50,000 per month, payable on the last working day of each month.
2. PROBATION AND NOTICE: Probation period is 3 months. Either party may terminate with 15 days notice during probation.
3. GOVERNING LAW: This offer letter is governed by laws of India and courts at Ahmedabad.
Signed by HR Department Blue Ridge Traders.`);

  const imgLegalClearB = Buffer.from(`\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x60\x00\x60\x00\x00
MASTER SERVICES AGREEMENT AND CONSULTING CONTRACT
This Consulting Agreement is made on January 15, 2026 between Apex Systems ("Client") and Vertex Labs ("Consultant").
1. SERVICES AND SCOPE: Consultant shall provide cloud architecture and DevOps engineering services.
2. COMPENSATION AND FEES: Client agrees to pay Rs. 1,20,000 per milestone within 30 days of invoice receipt.
3. CONFIDENTIALITY: Both parties agree to protect proprietary technical data and trade secrets.`);

  const imgHindiLegal = Buffer.from(`\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x60\x00\x60\x00\x00
रोजगार प्रस्ताव पत्र (EMPLOYMENT OFFER LETTER)
प्रिय श्री संजय पटेल, हमें आपको ब्लू रिज ट्रेडर्स (Blue Ridge Traders) में जूनियर अकाउंटेंट के पद की पेशकश करते हुए प्रसन्नता हो रही है।
1. वेतन (SALARY): रु. 28,000 प्रति माह, जिसका भुगतान प्रत्येक माह के अंतिम कार्य दिवस पर किया जाएगा।
2. परिवीक्षा काल (PROBATION): कार्यभार ग्रहण करने की तिथि से 3 माह।
3. नोटिस अवधि (NOTICE PERIOD): 30 दिन।`);

  const imgLowQualityBlurry = Buffer.from('DEGRADED OCR SCAN UNREADABLE BLURRY PHOTO TEXT degraded_blurry_scan.jpg');
  const imgNonLegalRandom = Buffer.from('unrelated photograph scenic photo random photo image scan containing no text 10_REJECT_random_photo.jpg');

  // -------------------------------------------------------------------------
  // SECTION 1: SAME FILE TYPE, BOTH LEGAL
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: SAME FILE TYPE, BOTH LEGAL ---');

  // 1.1 Text (Legal) + Text (Legal)
  const res1_1 = await simulateParallelComparePipeline({ textOrBuffer: txtLegalA }, { textOrBuffer: txtLegalB });
  assertTest(
    '1.1 Text (Legal) + Text (Legal)',
    res1_1.success && !!res1_1.comparisonResult?.aligned_pairs,
    res1_1.success
      ? `Compared ${res1_1.comparisonResult.doc_a_title} vs ${res1_1.comparisonResult.doc_b_title}. Aligned ${res1_1.comparisonResult.aligned_pairs.length} clauses.`
      : `Failed unexpectedly: ${res1_1.error}`
  );

  // 1.2 PDF (Legal) + PDF (Legal)
  const res1_2 = await simulateParallelComparePipeline(
    { textOrBuffer: pdfLegalA, mimeType: 'application/pdf', filename: '08_loan_agreement.pdf' },
    { textOrBuffer: pdfLegalB, mimeType: 'application/pdf', filename: 'legal_msa.pdf' }
  );
  assertTest(
    '1.2 PDF (Legal) + PDF (Legal)',
    res1_2.success && !!res1_2.comparisonResult?.aligned_pairs,
    res1_2.success
      ? `Compared ${res1_2.comparisonResult.doc_a_title} vs ${res1_2.comparisonResult.doc_b_title}. Winner recommendation generated.`
      : `Failed unexpectedly: ${res1_2.error}`
  );

  // 1.3 DOCX (Legal) + DOCX (Legal)
  const res1_3 = await simulateParallelComparePipeline(
    { textOrBuffer: docxLegalA, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'msa.docx' },
    { textOrBuffer: docxLegalB, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'employment.docx' }
  );
  assertTest(
    '1.3 DOCX (Legal) + DOCX (Legal)',
    res1_3.success && !!res1_3.comparisonResult?.aligned_pairs,
    res1_3.success
      ? `Compared DOCX documents. Aligned ${res1_3.comparisonResult.aligned_pairs.length} clauses.`
      : `Failed unexpectedly: ${res1_3.error}`
  );

  // 1.4 Image (Legal Clear Scan) + Image (Legal Clear Scan)
  const res1_4 = await simulateParallelComparePipeline(
    { textOrBuffer: imgLegalClearA, mimeType: 'image/jpeg', filename: '09_photo_employment_offer.jpg' },
    { textOrBuffer: imgLegalClearB, mimeType: 'image/jpeg', filename: '09_photo_offer_b.jpg' }
  );
  assertTest(
    '1.4 Image (Legal Clear Scan) + Image (Legal Clear Scan)',
    res1_4.success && !!res1_4.comparisonResult,
    res1_4.success
      ? `Successfully extracted OCR text from image pair and completed comparison.`
      : `Failed unexpectedly: ${res1_4.error}`
  );

  // 1.5 Text (Hindi Legal) + Text (English Legal)
  const res1_5 = await simulateParallelComparePipeline({ textOrBuffer: txtHindiLegal }, { textOrBuffer: txtLegalA });
  assertTest(
    '1.5 Text (Hindi Legal) + Text (English Legal)',
    res1_5.success && !!res1_5.comparisonResult?.aligned_pairs,
    res1_5.success
      ? `Successfully analyzed and compared Hindi Devanagari legal agreement.`
      : `Failed unexpectedly: ${res1_5.error}`
  );

  // -------------------------------------------------------------------------
  // SECTION 2: SAME FILE TYPE, BOTH ILLEGAL / RANDOM
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: SAME FILE TYPE, BOTH ILLEGAL / RANDOM ---');

  // 2.1 Text (News) + Text (Exam)
  const res2_1 = await simulateParallelComparePipeline({ textOrBuffer: txtNewsNonLegal }, { textOrBuffer: txtExamNonLegal });
  assertTest(
    '2.1 Text (News) + Text (Exam) - Double Rejection',
    !res2_1.success && !!res2_1.docAErr && !!res2_1.docBErr && res2_1.error!.includes('Multiple document failures'),
    !res2_1.success
      ? `Correctly returned double rejection message: "${res2_1.error?.replace(/\n/g, ' ')}"`
      : `Failed! Unexpectedly accepted non-legal texts.`
  );

  // 2.2 PDF (News) + PDF (News)
  const res2_2 = await simulateParallelComparePipeline(
    { textOrBuffer: pdfNewsNonLegal, mimeType: 'application/pdf', filename: 'news.pdf' },
    { textOrBuffer: pdfNewsNonLegal, mimeType: 'application/pdf', filename: 'news2.pdf' }
  );
  assertTest(
    '2.2 PDF (News) + PDF (News) - Double Rejection',
    !res2_2.success && !!res2_2.docAErr && !!res2_2.docBErr,
    !res2_2.success ? `Correctly rejected non-legal PDF files.` : `Failed! Accepted non-legal PDF.`
  );

  // 2.3 DOCX (News Non-Legal) + DOCX (News Non-Legal)
  const res2_3 = await simulateParallelComparePipeline(
    { textOrBuffer: docxNewsNonLegal, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'news.docx' },
    { textOrBuffer: docxNewsNonLegal, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'news2.docx' }
  );
  assertTest(
    '2.3 DOCX (News) + DOCX (News) - Double Rejection',
    !res2_3.success && !!res2_3.docAErr && !!res2_3.docBErr,
    !res2_3.success ? `Correctly rejected non-legal DOCX files.` : `Failed! Accepted non-legal DOCX.`
  );

  // 2.4 Image (Random Photo) + Image (Random Photo)
  const res2_4 = await simulateParallelComparePipeline(
    { textOrBuffer: imgNonLegalRandom, mimeType: 'image/jpeg', filename: '10_REJECT_random_photo.jpg' },
    { textOrBuffer: imgNonLegalRandom, mimeType: 'image/jpeg', filename: 'random_scenic.jpg' }
  );
  assertTest(
    '2.4 Image (Random Photo) + Image (Random Photo) - Double Rejection',
    !res2_4.success && !!res2_4.docAErr && !!res2_4.docBErr,
    !res2_4.success ? `Guard 1 correctly rejected non-legal random image photo files.` : `Failed! Accepted non-legal image.`
  );

  // -------------------------------------------------------------------------
  // SECTION 3: SAME FILE TYPE, MIXED VALIDITY
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: SAME FILE TYPE, MIXED VALIDITY ---');

  // 3.1 Text (Legal) + Text (News Non-Legal) -> Doc B Rejection
  const res3_1 = await simulateParallelComparePipeline({ textOrBuffer: txtLegalA }, { textOrBuffer: txtNewsNonLegal });
  assertTest(
    '3.1 Text (Legal) + Text (News) - Isolated Doc B Rejection',
    !res3_1.success && !res3_1.docAErr && !!res3_1.docBErr && res3_1.error!.startsWith('Document B could not be analyzed'),
    !res3_1.success ? `Correctly identified Document B failure: "${res3_1.error}"` : `Failed! Expected isolated Document B rejection.`
  );

  // 3.2 PDF (News Non-Legal) + PDF (Legal) -> Doc A Rejection
  const res3_2 = await simulateParallelComparePipeline(
    { textOrBuffer: pdfNewsNonLegal, mimeType: 'application/pdf', filename: 'news.pdf' },
    { textOrBuffer: pdfLegalA, mimeType: 'application/pdf', filename: 'loan.pdf' }
  );
  assertTest(
    '3.2 PDF (News) + PDF (Legal) - Isolated Doc A Rejection',
    !res3_2.success && !!res3_2.docAErr && !res3_2.docBErr && res3_2.error!.startsWith('Document A could not be analyzed'),
    !res3_2.success ? `Correctly identified Document A failure: "${res3_2.error}"` : `Failed! Expected isolated Document A rejection.`
  );

  // 3.3 DOCX (Legal) + DOCX (News Non-Legal) -> Doc B Rejection
  const res3_3 = await simulateParallelComparePipeline(
    { textOrBuffer: docxLegalA, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'msa.docx' },
    { textOrBuffer: docxNewsNonLegal, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'news.docx' }
  );
  assertTest(
    '3.3 DOCX (Legal) + DOCX (News) - Isolated Doc B Rejection',
    !res3_3.success && !res3_3.docAErr && !!res3_3.docBErr,
    !res3_3.success ? `Correctly isolated DOCX B failure.` : `Failed!`
  );

  // -------------------------------------------------------------------------
  // SECTION 4: DIFFERENT FILE TYPES, BOTH LEGAL (CROSS-TYPE MATRIX)
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: DIFFERENT FILE TYPES, BOTH LEGAL (CROSS-TYPE MATRIX) ---');

  // 4.1 PDF (Legal) + Text (Legal)
  const res4_1 = await simulateParallelComparePipeline(
    { textOrBuffer: pdfLegalA, mimeType: 'application/pdf', filename: 'loan.pdf' },
    { textOrBuffer: txtLegalB }
  );
  assertTest(
    '4.1 PDF (Legal) + Text (Legal)',
    res4_1.success && !!res4_1.comparisonResult,
    res4_1.success ? `Cross-type PDF + Text comparison produced valid result.` : `Failed: ${res4_1.error}`
  );

  // 4.2 DOCX (Legal) + PDF (Legal)
  const res4_2 = await simulateParallelComparePipeline(
    { textOrBuffer: docxLegalA, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'msa.docx' },
    { textOrBuffer: pdfLegalA, mimeType: 'application/pdf', filename: 'loan.pdf' }
  );
  assertTest(
    '4.2 DOCX (Legal) + PDF (Legal)',
    res4_2.success && !!res4_2.comparisonResult,
    res4_2.success ? `Cross-type DOCX + PDF comparison succeeded.` : `Failed: ${res4_2.error}`
  );

  // 4.3 DOCX (Legal) + Text (Legal)
  const res4_3 = await simulateParallelComparePipeline(
    { textOrBuffer: docxLegalB, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'employment.docx' },
    { textOrBuffer: txtLegalA }
  );
  assertTest(
    '4.3 DOCX (Legal) + Text (Legal)',
    res4_3.success && !!res4_3.comparisonResult,
    res4_3.success ? `Cross-type DOCX + Text comparison succeeded.` : `Failed: ${res4_3.error}`
  );

  // 4.4 Image (Legal) + PDF (Legal)
  const res4_4 = await simulateParallelComparePipeline(
    { textOrBuffer: imgLegalClearA, mimeType: 'image/jpeg', filename: '09_photo_employment_offer.jpg' },
    { textOrBuffer: pdfLegalB, mimeType: 'application/pdf', filename: 'msa.pdf' }
  );
  assertTest(
    '4.4 Image (Legal) + PDF (Legal)',
    res4_4.success && !!res4_4.comparisonResult,
    res4_4.success ? `Cross-type Image + PDF comparison succeeded.` : `Failed: ${res4_4.error}`
  );

  // 4.5 Image (Legal) + Text (Legal)
  const res4_5 = await simulateParallelComparePipeline(
    { textOrBuffer: imgLegalClearA, mimeType: 'image/jpeg', filename: '09_photo_employment_offer.jpg' },
    { textOrBuffer: txtLegalB }
  );
  assertTest(
    '4.5 Image (Legal) + Text (Legal)',
    res4_5.success && !!res4_5.comparisonResult,
    res4_5.success ? `Cross-type Image + Text comparison succeeded.` : `Failed: ${res4_5.error}`
  );

  // 4.6 PDF (English Legal) + Text (Hindi Devanagari Legal)
  const res4_6 = await simulateParallelComparePipeline(
    { textOrBuffer: pdfLegalB, mimeType: 'application/pdf', filename: 'msa.pdf' },
    { textOrBuffer: txtHindiLegal }
  );
  assertTest(
    '4.6 PDF (English Legal) + Text (Hindi Devanagari Legal)',
    res4_6.success && !!res4_6.comparisonResult,
    res4_6.success ? `Cross-type English PDF + Hindi Text comparison succeeded.` : `Failed: ${res4_6.error}`
  );

  // 4.7 Image (Hindi Legal) + PDF (English Legal)
  const res4_7 = await simulateParallelComparePipeline(
    { textOrBuffer: imgHindiLegal, mimeType: 'image/jpeg', filename: 'hindi_offer_scan.jpg' },
    { textOrBuffer: pdfLegalA, mimeType: 'application/pdf', filename: 'loan.pdf' }
  );
  assertTest(
    '4.7 Image (Hindi Legal) + PDF (English Legal)',
    res4_7.success && !!res4_7.comparisonResult,
    res4_7.success ? `Cross-type Hindi Image + English PDF comparison succeeded.` : `Failed: ${res4_7.error}`
  );

  // -------------------------------------------------------------------------
  // SECTION 5: DIFFERENT FILE TYPES, MIXED VALIDITY
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 5: DIFFERENT FILE TYPES, MIXED VALIDITY ---');

  // 5.1 PDF (Legal) + Text (Exam Non-Legal)
  const res5_1 = await simulateParallelComparePipeline(
    { textOrBuffer: pdfLegalA, mimeType: 'application/pdf', filename: 'loan.pdf' },
    { textOrBuffer: txtExamNonLegal }
  );
  assertTest(
    '5.1 PDF (Legal) + Text (Exam Paper) -> Doc B Failure',
    !res5_1.success && !res5_1.docAErr && !!res5_1.docBErr,
    !res5_1.success ? `Doc B correctly identified as non-legal exam paper.` : `Failed!`
  );

  // 5.2 Text (Gibberish) + PDF (Legal)
  const res5_2 = await simulateParallelComparePipeline(
    { textOrBuffer: gibberishText },
    { textOrBuffer: pdfLegalB, mimeType: 'application/pdf', filename: 'msa.pdf' }
  );
  assertTest(
    '5.2 Text (Gibberish) + PDF (Legal) -> Doc A Failure',
    !res5_2.success && !!res5_2.docAErr && !res5_2.docBErr,
    !res5_2.success ? `Doc A correctly identified as gibberish.` : `Failed!`
  );

  // 5.3 DOCX (News Non-Legal) + PDF (Legal)
  const res5_3 = await simulateParallelComparePipeline(
    { textOrBuffer: docxNewsNonLegal, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'news.docx' },
    { textOrBuffer: pdfLegalA, mimeType: 'application/pdf', filename: 'loan.pdf' }
  );
  assertTest(
    '5.3 DOCX (News Non-Legal) + PDF (Legal) -> Doc A Failure',
    !res5_3.success && !!res5_3.docAErr && !res5_3.docBErr,
    !res5_3.success ? `Doc A DOCX correctly identified as non-legal news article.` : `Failed!`
  );

  // 5.4 Image (Random Photo Non-Legal) + Text (Legal)
  const res5_4 = await simulateParallelComparePipeline(
    { textOrBuffer: imgNonLegalRandom, mimeType: 'image/jpeg', filename: '10_REJECT_random_photo.jpg' },
    { textOrBuffer: txtLegalA }
  );
  assertTest(
    '5.4 Image (Random Photo) + Text (Legal) -> Doc A Failure',
    !res5_4.success && !!res5_4.docAErr && !res5_4.docBErr,
    !res5_4.success ? `Doc A Image correctly identified as non-legal photo.` : `Failed!`
  );

  // -------------------------------------------------------------------------
  // SECTION 6: EDGE CASES, SECURITY & QUANTIFIED PERFORMANCE
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 6: EDGE CASES, SECURITY & QUANTIFIED PERFORMANCE ---');

  // 6.1 Empty Document
  const res6_1 = await simulateParallelComparePipeline({ textOrBuffer: '' }, { textOrBuffer: txtLegalA });
  assertTest(
    '6.1 Empty Document -> Doc A Failure',
    !res6_1.success && !!res6_1.docAErr && res6_1.docAErr.includes('empty'),
    !res6_1.success ? `Empty document rejected with clear message: "${res6_1.error}"` : `Failed!`
  );

  // 6.2 Extremely Short Sentence
  const res6_2 = await simulateParallelComparePipeline({ textOrBuffer: 'John agrees to sell a car.' }, { textOrBuffer: txtLegalA });
  assertTest(
    '6.2 Extremely Short Text -> Doc A Failure',
    !res6_2.success && !!res6_2.docAErr && (res6_2.docAErr.includes('too short') || res6_2.docAErr.includes('lacks essential legal document structure')),
    !res6_2.success ? `Short text rejected: "${res6_2.error}"` : `Failed!`
  );

  // 6.3 Illegal / Harmful Content Request
  const res6_3 = await simulateParallelComparePipeline({ textOrBuffer: illegalRequestText }, { textOrBuffer: txtLegalA });
  assertTest(
    '6.3 Illegal Request -> Doc A Rejection',
    !res6_3.success && !!res6_3.docAErr,
    !res6_3.success ? `Illegal request text rejected: "${res6_3.error}"` : `Failed!`
  );

  // 6.4 Corrupted PDF Buffer
  const corruptedBuffer = Buffer.from('%PDF-1.4 % corrupted binary junk data 0000 1111 **** $$$$');
  const res6_4 = await simulateParallelComparePipeline(
    { textOrBuffer: corruptedBuffer, mimeType: 'application/pdf', filename: 'corrupted.pdf' },
    { textOrBuffer: txtLegalA }
  );
  assertTest(
    '6.4 Corrupted PDF -> Graceful Error Handling',
    !res6_4.success && !!res6_4.docAErr,
    !res6_4.success ? `Corrupted PDF handled gracefully: "${res6_4.error}"` : `Failed!`
  );

  // 6.5 Encrypted / Password-Protected PDF -> Distinct Error Message
  const res6_5 = await simulateParallelComparePipeline(
    { textOrBuffer: passwordProtectedPdf, mimeType: 'application/pdf', filename: 'encrypted.pdf' },
    { textOrBuffer: txtLegalA }
  );
  assertTest(
    '6.5 Password-Protected PDF -> Distinct Error Message',
    !res6_5.success && !!res6_5.docAErr && res6_5.docAErr.toLowerCase().includes('password-protected'),
    !res6_5.success
      ? `Distinct Password Error returned: "${res6_5.docAErr}"`
      : `Failed! Expected distinct password-protected error message.`
  );

  // 6.6 Low-Quality / Blurry Image Scan -> Graceful OCR Error Handling
  const res6_6 = await simulateParallelComparePipeline(
    { textOrBuffer: imgLowQualityBlurry, mimeType: 'image/jpeg', filename: 'degraded_blurry_scan.jpg' },
    { textOrBuffer: txtLegalA }
  );
  assertTest(
    '6.6 Low-Quality / Blurry Image Scan -> Graceful OCR Error',
    !res6_6.success && !!res6_6.docAErr && (res6_6.docAErr.includes("Couldn't read this clearly") || res6_6.docAErr.includes("Unable to extract readable text")),
    !res6_6.success
      ? `Graceful OCR error returned: "${res6_6.docAErr}"`
      : `Failed! Expected explicit low-quality scan error.`
  );

  // 6.7 Large 25+ Page Document -> Quantified Latency & Clause Retention Assertions
  const res6_7 = await simulateParallelComparePipeline(
    { textOrBuffer: docxLarge25Page, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'large_25page_lease.docx' },
    { textOrBuffer: docxLegalA, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', filename: 'msa.docx' }
  );

  const MAX_LATENCY_CEILING_MS = 15000;
  const EXPECTED_MIN_CLAUSE_COUNT = 30;
  const isLatencyAcceptable = (res6_7.latencyMs || 99999) < MAX_LATENCY_CEILING_MS;
  const extractedClauseCount = res6_7.docA?.clauses.length || 0;
  const isClauseCountRetained = extractedClauseCount >= EXPECTED_MIN_CLAUSE_COUNT;
  const hasLastClauseIntact = res6_7.docA?.clauses.some(c => c.original_text.includes('SECTION 30')) || false;

  assertTest(
    '6.7 Quantified Large 25-Page Document Performance & Non-Truncation',
    res6_7.success && isLatencyAcceptable && isClauseCountRetained && hasLastClauseIntact,
    res6_7.success
      ? `Completed in ${res6_7.latencyMs}ms (<${MAX_LATENCY_CEILING_MS}ms ceiling). Extracted ${extractedClauseCount} clauses (>=${EXPECTED_MIN_CLAUSE_COUNT} expected). Final Clause #30 verified intact.`
      : `Failed large document processing: ${res6_7.error}`
  );

  console.log('\n====================================================================');
  console.log(`RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('====================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runE2ECompareMatrixTests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
