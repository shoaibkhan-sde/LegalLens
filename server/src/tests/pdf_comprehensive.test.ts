import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  extractAndCleanDocumentTextAsync,
  runGuard1InputGateAsync,
  containsPdfObjectNoise,
  isReadableProse,
} from '../services/astraBackend';
import { MAX_PDF_PAGES_ERROR_MSG } from '../config/constants';

async function generateTestPdfs() {
  const fixturesDir = path.resolve(process.cwd(), 'server/src/tests/fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // 1. Generate ReportLab-style Stream Encoded Legal PDF (legal_master_services_agreement.pdf)
  const legalDoc = await PDFDocument.create();
  const font = await legalDoc.embedFont(StandardFonts.Helvetica);
  const page1 = legalDoc.addPage([600, 800]);
  page1.drawText('MASTER SERVICES AGREEMENT\n\nThis Master Services Agreement ("Agreement") is made on 15th February 2026 between Alpha Corp ("Client") and Beta Solutions LLC ("Provider").\n\n1. SCOPE OF SERVICES: Provider agrees to perform cloud architecture consulting services.\n2. COMPENSATION: Client shall pay Provider Rs. 2,50,000 per month within 15 days of invoice date.\n3. TERMINATION: Either party may terminate this Agreement by giving 30 days written notice.\n4. GOVERNING LAW: This Agreement shall be governed by the laws of India.', {
    x: 50,
    y: 750,
    size: 11,
    font,
    color: rgb(0, 0, 0),
    maxWidth: 500,
    lineHeight: 16,
  });
  const legalPdfBytes = await legalDoc.save();
  const legalPdfPath = path.join(fixturesDir, 'legal_master_services_agreement.pdf');
  fs.writeFileSync(legalPdfPath, legalPdfBytes);

  // 2. Generate Illegal/Random News Article PDF (05_REJECT_news_article.pdf)
  const newsDoc = await PDFDocument.create();
  const newsPage = newsDoc.addPage([600, 800]);
  newsPage.drawText('CITY METRO EXPANSION TO ADD FOUR NEW STATIONS BY NEXT YEAR\n\nBengaluru, September 2026 — The city metro rail corporation announced yesterday that four new stations will be added to the Purple Line extension by the end of next year, easing congestion for daily commuters on the eastern corridor.', {
    x: 50,
    y: 750,
    size: 11,
    font,
    color: rgb(0, 0, 0),
    maxWidth: 500,
    lineHeight: 16,
  });
  const newsPdfBytes = await newsDoc.save();
  const newsPdfPath = path.join(fixturesDir, '05_REJECT_news_article.pdf');
  fs.writeFileSync(newsPdfPath, newsPdfBytes);

  // 3. Generate 35-Page PDF (> 30 Page Cap Limit) (35_pages_over_limit.pdf)
  const overCapDoc = await PDFDocument.create();
  for (let i = 1; i <= 35; i++) {
    const p = overCapDoc.addPage([600, 800]);
    p.drawText(`Page ${i} of 35 - Sample Document Section`, { x: 50, y: 750, font, size: 12 });
  }
  const overCapBytes = await overCapDoc.save();
  const overCapPath = path.join(fixturesDir, '35_pages_over_limit.pdf');
  fs.writeFileSync(overCapPath, overCapBytes);

  // 4. Generate 10-Page Legal PDF (<= 30 Page Cap Limit) (10_pages_under_limit.pdf)
  const underCapDoc = await PDFDocument.create();
  for (let i = 1; i <= 10; i++) {
    const p = underCapDoc.addPage([600, 800]);
    p.drawText(`EMPLOYMENT AGREEMENT PAGE ${i}\n\n1. OBLIGATIONS: Employee agrees to perform duties diligently.\n2. CONFIDENTIALITY: Proprietary data shall be protected.`, { x: 50, y: 750, font, size: 12 });
  }
  const underCapBytes = await underCapDoc.save();
  const underCapPath = path.join(fixturesDir, '10_pages_under_limit.pdf');
  fs.writeFileSync(underCapPath, underCapBytes);

  return { legalPdfPath, newsPdfPath, overCapPath, underCapPath };
}

async function runPdfRegressionSuite() {
  console.log('====================================================');
  console.log('📄 PDF COMPREHENSIVE REGRESSION & PAGE-CAP TEST SUITE');
  console.log('====================================================\n');

  const { legalPdfPath, newsPdfPath, overCapPath, underCapPath } = await generateTestPdfs();

  let passed = 0;
  let failed = 0;

  // TEST 1: 08_loan_agreement.pdf (Original failing fixture from disk)
  const loanPdfPath = path.resolve(process.cwd(), 'server/src/tests/fixtures/08_loan_agreement.pdf');
  console.log(`📁 TEST 1: Testing 08_loan_agreement.pdf...`);
  if (fs.existsSync(loanPdfPath)) {
    const loanBuf = fs.readFileSync(loanPdfPath);
    try {
      const extracted = await extractAndCleanDocumentTextAsync(loanBuf, 'application/pdf', '08_loan_agreement.pdf');
      const hasNoise = containsPdfObjectNoise(extracted);
      const isProse = isReadableProse(extracted);
      const g1Res = await runGuard1InputGateAsync(extracted);

      if (!hasNoise && isProse && g1Res.is_legal_document) {
        passed++;
        console.log(`✅ [PASS] 08_loan_agreement.pdf extracted clean text & accepted by Guard 1!`);
        console.log(`   Snippet: "${extracted.slice(0, 120)}..."`);
      } else {
        failed++;
        console.error(`❌ [FAIL] 08_loan_agreement.pdf failed check. Noise: ${hasNoise}, Prose: ${isProse}, Legal: ${g1Res.is_legal_document}`);
      }
    } catch (err: any) {
      failed++;
      console.error(`❌ [FAIL] 08_loan_agreement.pdf exception:`, err.message);
    }
  } else {
    console.warn(`⚠️ 08_loan_agreement.pdf not found at ${loanPdfPath}`);
  }

  // TEST 2: legal_master_services_agreement.pdf (Newly generated ReportLab/Stream PDF)
  console.log(`\n📁 TEST 2: Testing legal_master_services_agreement.pdf...`);
  const legalBuf = fs.readFileSync(legalPdfPath);
  try {
    const extracted = await extractAndCleanDocumentTextAsync(legalBuf, 'application/pdf', 'legal_master_services_agreement.pdf');
    const hasNoise = containsPdfObjectNoise(extracted);
    const isProse = isReadableProse(extracted);
    const g1Res = await runGuard1InputGateAsync(extracted);

    if (!hasNoise && isProse && g1Res.is_legal_document) {
      passed++;
      console.log(`✅ [PASS] legal_master_services_agreement.pdf extracted clean clause text without stream noise!`);
      console.log(`   Snippet: "${extracted.slice(0, 120)}..."`);
    } else {
      failed++;
      console.error(`❌ [FAIL] legal_master_services_agreement.pdf failed. Noise: ${hasNoise}, Prose: ${isProse}, Legal: ${g1Res.is_legal_document}`);
    }
  } catch (err: any) {
    failed++;
    console.error(`❌ [FAIL] legal_master_services_agreement.pdf exception:`, err.message);
  }

  // TEST 3: 05_REJECT_news_article.pdf (Illegal / Non-Legal News PDF)
  console.log(`\n📁 TEST 3: Testing Illegal/News PDF (05_REJECT_news_article.pdf)...`);
  const newsBuf = fs.readFileSync(newsPdfPath);
  try {
    const extracted = await extractAndCleanDocumentTextAsync(newsBuf, 'application/pdf', '05_REJECT_news_article.pdf');
    const g1Res = await runGuard1InputGateAsync(extracted);

    if (!g1Res.is_legal_document) {
      passed++;
      console.log(`✅ [PASS] News PDF correctly rejected by Guard 1!`);
      console.log(`   Rejection Reason: "${g1Res.rejection_reason}"`);
    } else {
      failed++;
      console.error(`❌ [FAIL] News PDF was incorrectly accepted!`);
    }
  } catch (err: any) {
    failed++;
    console.error(`❌ [FAIL] News PDF exception:`, err.message);
  }

  // TEST 4: 35-Page PDF (> 30 Page Cap Limit)
  console.log(`\n📁 TEST 4: Testing 35-Page PDF (> 30 Page Limit)...`);
  const overCapBuf = fs.readFileSync(overCapPath);
  try {
    await extractAndCleanDocumentTextAsync(overCapBuf, 'application/pdf', '35_pages_over_limit.pdf');
    failed++;
    console.error(`❌ [FAIL] 35-Page PDF was not rejected by page count cap!`);
  } catch (err: any) {
    if (err.message === MAX_PDF_PAGES_ERROR_MSG) {
      passed++;
      console.log(`✅ [PASS] 35-Page PDF correctly rejected at ingestion with page cap error!`);
      console.log(`   Message: "${err.message}"`);
    } else {
      failed++;
      console.error(`❌ [FAIL] 35-Page PDF threw unexpected error: "${err.message}"`);
    }
  }

  // TEST 5: 10-Page Legal PDF (<= 30 Page Cap Limit)
  console.log(`\n📁 TEST 5: Testing 10-Page PDF (<= 30 Page Limit)...`);
  const underCapBuf = fs.readFileSync(underCapPath);
  try {
    const extracted = await extractAndCleanDocumentTextAsync(underCapBuf, 'application/pdf', '10_pages_under_limit.pdf');
    const g1Res = await runGuard1InputGateAsync(extracted);
    if (g1Res.is_legal_document) {
      passed++;
      console.log(`✅ [PASS] 10-Page PDF processed normally and accepted!`);
    } else {
      failed++;
      console.error(`❌ [FAIL] 10-Page PDF failed Guard 1 classification!`);
    }
  } catch (err: any) {
    failed++;
    console.error(`❌ [FAIL] 10-Page PDF exception:`, err.message);
  }

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed} Passed, ${failed} Failed out of 5 PDF Tests`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPdfRegressionSuite();
