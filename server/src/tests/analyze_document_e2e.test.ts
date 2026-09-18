import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { PDFDocument } from 'pdf-lib';
import { createDocxBufferFromText } from './test_docx_generator.js';

const FIXTURES_DIR = fs.existsSync(path.resolve(process.cwd(), 'server/src/tests/fixtures'))
  ? path.resolve(process.cwd(), 'server/src/tests/fixtures')
  : path.resolve(process.cwd(), 'src/tests/fixtures');

async function runAnalyzeDocumentE2ETests() {
  console.log('====================================================================');
  console.log('   ANALYZE DOCUMENT SECTION END-TO-END QA TEST SUITE');
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
  const txtHindiLegal = fs.readFileSync(path.join(FIXTURES_DIR, '07_mixed_language_loan_agreement.txt'), 'utf-8');
  const txtExamNonLegal = fs.readFileSync(path.join(FIXTURES_DIR, 'failing_exam_paper.txt'), 'utf-8');

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

  // Degraded / Blurry Scanned Photo Fixture
  const imgLowQualityBlurry = Buffer.from('DEGRADED OCR SCAN UNREADABLE BLURRY PHOTO TEXT degraded_blurry_scan.jpg');
  
  // Camera Snapshot Photo Fixture (Simulating In-App Snap with Phone Camera)
  const cameraSnapshotPhoto = Buffer.from(`\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x60\x00\x60\x00\x00
EMPLOYMENT OFFER LETTER SNAPSHOT FROM CAMERA
This Offer Letter is issued by Blue Ridge Traders Pvt Ltd to Mr. Sanjay Patel for Junior Accountant position.
1. SALARY: Rs. 28,000 per month.
2. PROBATION: 3 months with 7 days notice.`);

  // Corrupted PDF Buffer
  const corruptedBuffer = Buffer.from('%PDF-1.4 % corrupted binary junk data 0000 1111 **** $$$$');

  // Large 25-Page DOCX Fixture
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

  // Helper to parse SSE stream response from /api/analyze?stream=true
  async function streamAnalyzeRequest(formData: FormData): Promise<{
    finalResult: any;
    streamError: string | null;
    guard1Completed: boolean;
  }> {
    const res = await fetch('http://localhost:3001/api/analyze?stream=true', {
      method: 'POST',
      headers: { 'Accept': 'text/event-stream' },
      body: formData,
    });

    if (!res.body) throw new Error('Response body missing');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: any = null;
    let streamError: string | null = null;
    let guard1Completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        const eventMatch = block.match(/^event:\s*(.+)$/m);
        const dataMatch = block.match(/^data:\s*(.+)$/m);

        const event = eventMatch ? eventMatch[1].trim() : 'message';
        const rawData = dataMatch ? dataMatch[1].trim() : '';

        if (!rawData) continue;

        try {
          const parsed = JSON.parse(rawData);
          if (event === 'progress' && parsed.stage === 'guard1' && parsed.status === 'completed') {
            guard1Completed = true;
          } else if (event === 'result') {
            finalResult = parsed;
          } else if (event === 'error') {
            streamError = parsed.error;
          }
        } catch {}
      }
    }

    return { finalResult, streamError, guard1Completed };
  }

  // -------------------------------------------------------------------------
  // TEST CASES
  // -------------------------------------------------------------------------

  // 1. Password-Protected PDF Upload to /api/analyze
  console.log('--- TEST 1: Password-Protected PDF Single-Document Analysis ---');
  const encFormData = new FormData();
  encFormData.append('file', new Blob([passwordProtectedPdf as any], { type: 'application/pdf' }), 'encrypted.pdf');
  encFormData.append('language', 'en');

  const res1 = await streamAnalyzeRequest(encFormData);
  assertTest(
    '1. Password-Protected PDF -> Distinct Error Message via /api/analyze',
    !!res1.streamError && res1.streamError.includes('Password-protected PDF detected'),
    !!res1.streamError ? `Distinct error returned: "${res1.streamError}"` : `Failed!`
  );

  // 2. Password-Protected PDF on /api/extract-preview
  console.log('\n--- TEST 2: Password-Protected PDF Preview Extraction (/api/extract-preview) ---');
  const encPreviewFormData = new FormData();
  encPreviewFormData.append('file', new Blob([passwordProtectedPdf as any], { type: 'application/pdf' }), 'encrypted.pdf');
  
  const resPreviewEnc = await fetch('http://localhost:3001/api/extract-preview', {
    method: 'POST',
    body: encPreviewFormData,
  });
  const dataPreviewEnc = await resPreviewEnc.json();
  assertTest(
    '2. Password-Protected PDF -> Distinct Error via /api/extract-preview',
    !!dataPreviewEnc.error && dataPreviewEnc.error.includes('Password-protected PDF detected'),
    !!dataPreviewEnc.error ? `Preview returned distinct error: "${dataPreviewEnc.error}"` : `Failed!`
  );

  // 3. Low-Quality / Blurry Scanned Image Upload to /api/analyze
  console.log('\n--- TEST 3: Low-Quality / Blurry Scanned Image Single-Document Analysis ---');
  const blurryFormData = new FormData();
  blurryFormData.append('file', new Blob([imgLowQualityBlurry as any], { type: 'image/jpeg' }), 'degraded_blurry_scan.jpg');
  blurryFormData.append('language', 'en');

  const res3 = await streamAnalyzeRequest(blurryFormData);
  assertTest(
    '3. Low-Quality / Blurry Image Scan -> Graceful OCR Error via /api/analyze',
    !!res3.streamError && (res3.streamError.includes("Couldn't read this clearly") || res3.streamError.includes("Unable to extract readable text")),
    !!res3.streamError ? `Graceful OCR error returned: "${res3.streamError}"` : `Failed!`
  );

  // 4. Low-Quality Scanned Image on /api/extract-preview
  console.log('\n--- TEST 4: Low-Quality Scanned Image Preview Extraction (/api/extract-preview) ---');
  const blurryPreviewFormData = new FormData();
  blurryPreviewFormData.append('file', new Blob([imgLowQualityBlurry as any], { type: 'image/jpeg' }), 'degraded_blurry_scan.jpg');

  const resPreviewBlurry = await fetch('http://localhost:3001/api/extract-preview', {
    method: 'POST',
    body: blurryPreviewFormData,
  });
  const dataPreviewBlurry = await resPreviewBlurry.json();
  assertTest(
    '4. Low-Quality Image -> Graceful Error via /api/extract-preview',
    !!dataPreviewBlurry.error && (dataPreviewBlurry.error.includes("Couldn't read this clearly") || dataPreviewBlurry.error.includes("Unable to extract readable text")),
    !!dataPreviewBlurry.error ? `Preview returned graceful OCR error: "${dataPreviewBlurry.error}"` : `Failed!`
  );

  // 5. Camera-Captured Image Upload Payload to /api/analyze
  console.log('\n--- TEST 5: Camera-Captured Image Upload Payload ---');
  const cameraFormData = new FormData();
  cameraFormData.append('file', new Blob([cameraSnapshotPhoto as any], { type: 'image/png' }), 'camera_snapshot.png');
  cameraFormData.append('language', 'en');

  const res5 = await streamAnalyzeRequest(cameraFormData);
  assertTest(
    '5. Camera-Captured Image Payload -> Route Through Hardened Extraction Pipeline',
    res5.guard1Completed && !!res5.finalResult,
    res5.finalResult ? `Camera snapshot analyzed cleanly. Title: "${res5.finalResult.document_title}"` : `Failed!`
  );

  // 6. Corrupted PDF Buffer to /api/analyze
  console.log('\n--- TEST 6: Corrupted PDF Buffer Single-Document Analysis ---');
  const corruptFormData = new FormData();
  corruptFormData.append('file', new Blob([corruptedBuffer as any], { type: 'application/pdf' }), 'corrupted.pdf');
  corruptFormData.append('language', 'en');

  const res6 = await streamAnalyzeRequest(corruptFormData);
  assertTest(
    '6. Corrupted PDF -> Graceful Ingestion Error via /api/analyze',
    !!res6.streamError && res6.streamError.includes('Unable to extract readable text from this PDF'),
    !!res6.streamError ? `Corrupted PDF error returned: "${res6.streamError}"` : `Failed!`
  );

  // 7. Non-English (Hindi Devanagari) Document Upload to /api/analyze
  console.log('\n--- TEST 7: Non-English (Hindi Devanagari) Single-Document Analysis ---');
  const hindiFormData = new FormData();
  hindiFormData.append('text', txtHindiLegal);
  hindiFormData.append('language', 'hi');

  const res7 = await streamAnalyzeRequest(hindiFormData);
  assertTest(
    '7. Non-English (Hindi Devanagari) -> Parallel Bilingual Analysis Succeeded',
    res7.guard1Completed && !!res7.finalResult && (res7.finalResult.document_title?.includes('ऋण') || res7.finalResult.category === 'loan agreement/promissory note'),
    res7.finalResult ? `Hindi document analyzed. Title: "${res7.finalResult.document_title}"` : `Failed!`
  );

  // 8. Large 25-Page Document Single-Document Analysis Performance & Retention
  console.log('\n--- TEST 8: Quantified Large 25-Page Document Single-Document Analysis ---');
  const largeFormData = new FormData();
  largeFormData.append('file', new Blob([docxLarge25Page as any], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), 'large_25page_lease.docx');
  largeFormData.append('language', 'en');

  const startTime = Date.now();
  const res8 = await streamAnalyzeRequest(largeFormData);
  const latencyMs = Date.now() - startTime;

  const MAX_LATENCY_CEILING_MS = 15000;
  const EXPECTED_MIN_CLAUSE_COUNT = 30;
  const isLatencyAcceptable = latencyMs < MAX_LATENCY_CEILING_MS;
  const extractedClauseCount = res8.finalResult?.clauses?.length || 0;
  const isClauseCountRetained = extractedClauseCount >= EXPECTED_MIN_CLAUSE_COUNT;
  const hasLastClauseIntact = res8.finalResult?.clauses?.some((c: any) => c.original_text?.includes('SECTION 30')) || false;

  assertTest(
    '8. Quantified Large 25-Page Document Analysis Performance & Retention',
    res8.guard1Completed && !!res8.finalResult && isLatencyAcceptable && isClauseCountRetained && hasLastClauseIntact,
    res8.finalResult
      ? `Completed in ${latencyMs}ms (<${MAX_LATENCY_CEILING_MS}ms ceiling). Extracted ${extractedClauseCount} clauses (>=${EXPECTED_MIN_CLAUSE_COUNT} expected). Final Clause #30 intact.`
      : `Failed large document analysis!`
  );

  // 9. Non-Legal Exam Paper Single-Document Rejection
  console.log('\n--- TEST 9: Non-Legal Exam Paper Single-Document Rejection ---');
  const examFormData = new FormData();
  examFormData.append('text', txtExamNonLegal);
  examFormData.append('language', 'en');

  const res9 = await streamAnalyzeRequest(examFormData);
  assertTest(
    '9. Non-Legal Exam Paper -> Guard 1 Single-Document Rejection',
    !!res9.streamError && (res9.streamError.toLowerCase().includes('examination paper') || res9.streamError.toLowerCase().includes('test paper') || res9.streamError.toLowerCase().includes('not a binding legal agreement')),
    !!res9.streamError ? `Exam paper rejected: "${res9.streamError}"` : `Failed!`
  );

  console.log('\n====================================================================');
  console.log(`RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('====================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAnalyzeDocumentE2ETests().catch((err) => {
  console.error('Fatal Analyze Document Test Error:', err);
  process.exit(1);
});
