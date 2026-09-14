import fs from 'fs';
import path from 'path';
import assert from 'assert';
import {
  extractAndCleanDocumentText,
  chunkDocumentTextIntoClauses,
  applyRiskTaggingAndGrounding,
  verifyGuard2aGrounding,
  analyzeDocumentText,
  compareTwoDocuments,
} from '../services/astraBackend.js';

const getDirName = () => {
  if (typeof __dirname !== 'undefined') return __dirname;
  return path.resolve(process.cwd(), 'server/src/tests');
};

const FIXTURES_DIR = path.resolve(getDirName(), 'fixtures');

async function runPipelineHardeningTests() {
  console.log('====================================================');
  console.log('   LEGAL LENS HARDENED PIPELINE STAGES 1-4 TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function logPass(testName: string, detail?: string) {
    passed++;
    console.log(`✅ [PASS] ${testName}`);
    if (detail) console.log(`   ${detail}`);
    console.log('----------------------------------------------------');
  }

  function logFail(testName: string, err: any) {
    failed++;
    console.error(`❌ [FAIL] ${testName}`);
    console.error(`   Error: ${err.message || String(err)}`);
    console.error('----------------------------------------------------');
  }

  // STAGE 1: OCR & PARSING
  console.log('\n--- STAGE 1: OCR & PARSING ---');
  try {
    const pdfBuffer = fs.readFileSync(path.join(FIXTURES_DIR, '08_loan_agreement.pdf'));
    const pdfText = extractAndCleanDocumentText(pdfBuffer, 'application/pdf', '08_loan_agreement.pdf');
    assert(pdfText.includes('LOAN AGREEMENT'), 'PDF text missing title');
    assert(pdfText.includes('Capital Lender') || pdfText.includes('Vikram Singh'), 'PDF text missing key parties');
    logPass('1.1 PDF Extraction (08_loan_agreement.pdf)', `Extracted ${pdfText.length} chars cleanly.`);
  } catch (err) {
    logFail('1.1 PDF Extraction (08_loan_agreement.pdf)', err);
  }

  try {
    const photoBuffer = fs.readFileSync(path.join(FIXTURES_DIR, '09_photo_employment_offer.jpg'));
    let threwCorrectly = false;
    try {
      extractAndCleanDocumentText(photoBuffer, 'image/jpeg', '09_photo_employment_offer.jpg');
    } catch (e: any) {
      if (e.message === "Couldn't read this clearly — try a clearer photo" || e.message.includes("clearer photo") || e.message.includes("couldn't read")) {
        threwCorrectly = true;
      }
    }
    assert(threwCorrectly, 'Expected explicit low-confidence rejection message');
    logPass('1.2 Degraded Photo Low-Confidence Rejection (09_photo_employment_offer.jpg)', 'Explicitly rejected with "Couldn\'t read this clearly — try a clearer photo"');
  } catch (err) {
    logFail('1.2 Degraded Photo Low-Confidence Rejection (09_photo_employment_offer.jpg)', err);
  }

  try {
    const hindiBuffer = fs.readFileSync(path.join(FIXTURES_DIR, '07_mixed_language_loan_agreement.txt'));
    const hindiText = extractAndCleanDocumentText(hindiBuffer, 'text/plain', '07_mixed_language_loan_agreement.txt');
    assert(hindiText.includes('LOAN AGREEMENT'), 'Missing English text');
    assert(hindiText.includes('ऋण समझौता'), 'Missing Devanagari title');
    assert(hindiText.includes('लेंडर') && hindiText.includes('उधारकर्ता'), 'Missing Hindi party names');
    logPass('1.3 Mixed Language Devanagari & English Intact (07_mixed_language_loan_agreement.txt)', 'Preserved both English and Devanagari text intact.');
  } catch (err) {
    logFail('1.3 Mixed Language Devanagari & English Intact (07_mixed_language_loan_agreement.txt)', err);
  }

  // STAGE 2: CLAUSE CHUNKING
  console.log('\n--- STAGE 2: CLAUSE CHUNKING ---');
  try {
    const text01 = fs.readFileSync(path.join(FIXTURES_DIR, '01_rental_agreement.txt'), 'utf-8');
    const chunks01 = chunkDocumentTextIntoClauses(text01);
    const types01 = chunks01.map((c) => c.clause_type);
    assert(types01.includes('dispute resolution/arbitration'), '01 missing arbitration clause');
    assert(types01.includes('indemnity'), '01 missing indemnity clause');

    const text02 = fs.readFileSync(path.join(FIXTURES_DIR, '02_rental_agreement_v2_for_comparison.txt'), 'utf-8');
    const chunks02 = chunkDocumentTextIntoClauses(text02);
    const types02 = chunks02.map((c) => c.clause_type);
    assert(!types02.includes('dispute resolution/arbitration'), '02 wrongly contains arbitration clause');
    assert(!types02.includes('indemnity'), '02 wrongly contains indemnity clause');

    logPass('2.1 Semantic Chunking & Taxonomy Alignment (01 vs 02)', 'Correctly identified arbitration and indemnity in 01 and recognized absence in 02.');
  } catch (err) {
    logFail('2.1 Semantic Chunking & Taxonomy Alignment (01 vs 02)', err);
  }

  // STAGE 3: RISK TAGGING
  console.log('\n--- STAGE 3: RISK TAGGING & GROUNDING ---');
  try {
    const text01 = fs.readFileSync(path.join(FIXTURES_DIR, '01_rental_agreement.txt'), 'utf-8');
    const res01 = await analyzeDocumentText(text01);
    assert(res01.clauses.every((c) => ['low', 'medium', 'high'].includes(c.risk_level)), 'Clause missing risk level');
    assert(res01.clauses.every((c) => c.one_line_consequence.length > 0), 'Clause missing consequence');

    const depositPenalty = res01.clauses.find((c) => c.original_text.toLowerCase().includes('forfeited'));
    assert(depositPenalty && depositPenalty.risk_level === 'high', 'Planted deposit penalty not flagged HIGH risk');

    const text04 = fs.readFileSync(path.join(FIXTURES_DIR, '04_employment_agreement.txt'), 'utf-8');
    const res04 = await analyzeDocumentText(text04);
    const nonCompete = res04.clauses.find((c) => c.clause_type === 'non-compete/non-solicitation');
    assert(nonCompete && nonCompete.risk_level === 'high', 'Planted non-compete not flagged HIGH risk');

    const bond = res04.clauses.find((c) => c.original_text.includes('3,00,000'));
    assert(bond && bond.risk_level === 'high', 'Planted Rs 3,00,000 bond not flagged HIGH risk');

    logPass('3.1 100% Risk Coverage & Planted Risk Tagging Severity', 'All clauses tagged. Deposit penalty, non-compete, and service bond consistently flagged HIGH risk.');
  } catch (err) {
    logFail('3.1 100% Risk Coverage & Planted Risk Tagging Severity', err);
  }

  try {
    const clauseText = 'Tenant agrees to pay Rs 1,50,000 deposit.';
    const grounded = verifyGuard2aGrounding(clauseText, 'Watch Out: Deposit of Rs 1,50,000 required.');
    assert(grounded.isGrounded === true, 'Grounded consequence misflagged');

    const ungrounded = verifyGuard2aGrounding(clauseText, 'High Risk: Criminal jail time of 5 years and Rs 99,00,000 penalty.');
    assert(ungrounded.isGrounded === false, 'Ungrounded consequence not caught');
    logPass('3.2 Guard 2a Grounding Verification', 'Correctly validated grounded consequences and corrected hallucinated claims.');
  } catch (err) {
    logFail('3.2 Guard 2a Grounding Verification', err);
  }

  // STAGE 4: AI SYNTHESIS & COMPARISON
  console.log('\n--- STAGE 4: AI SYNTHESIS & COMPARISON ---');
  try {
    const text01 = fs.readFileSync(path.join(FIXTURES_DIR, '01_rental_agreement.txt'), 'utf-8');
    const res01 = await analyzeDocumentText(text01);
    assert(res01.disclaimer, 'Root disclaimer missing');
    assert(res01.checklist.disclaimer, 'Checklist disclaimer missing');
    assert(res01.lawyer_briefing.disclaimer, 'Briefing disclaimer missing');

    const text02 = fs.readFileSync(path.join(FIXTURES_DIR, '02_rental_agreement_v2_for_comparison.txt'), 'utf-8');
    const res02 = await analyzeDocumentText(text02);

    const comp = await compareTwoDocuments(res01, res02);
    assert(comp.disclaimer, 'Comparison disclaimer missing');
    assert(comp.a_only_clauses.some((c) => c.clause_type === 'dispute resolution/arbitration'), 'Missing arbitration in A_only');
    assert(comp.a_only_clauses.some((c) => c.clause_type === 'indemnity'), 'Missing indemnity in A_only');
    assert(comp.b_only_clauses.length > 0, 'Missing B_only subletting clause');
    assert(comp.key_differences_summary.includes('Present in Document A only:'), 'Summary missing A_only surface');
    assert(comp.key_differences_summary.includes('Present in Document B only:'), 'Summary missing B_only surface');

    logPass('4.1 Schema Compliance & Asymmetric Surface Comparison (01 vs 02)', 'Surfaced a_only (Arbitration, Indemnity) and b_only clauses. Confirmed disclaimer on all schemas.');
  } catch (err) {
    logFail('4.1 Schema Compliance & Asymmetric Surface Comparison (01 vs 02)', err);
  }

  try {
    const text04 = fs.readFileSync(path.join(FIXTURES_DIR, '04_employment_agreement.txt'), 'utf-8');
    const res04 = await analyzeDocumentText(text04);
    const briefingQs = res04.lawyer_briefing.questions_to_ask_lawyer.join(' ');
    assert(briefingQs.includes('Section 27'), 'Briefing missing Section 27 question');
    assert(briefingQs.includes('service bond'), 'Briefing missing service bond question');
    logPass('4.2 Document-Specific Lawyer Briefing Questions', 'Lawyer briefing generated specific questions tied to non-compete Section 27 and service bond.');
  } catch (err) {
    logFail('4.2 Document-Specific Lawyer Briefing Questions', err);
  }

  console.log(`\n====================================================`);
  console.log(` SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    console.error('🔴 STAGE HARDENING TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('🟢 ALL 4 PIPELINE STAGES CONFIRMED AND HARDENED CLEANLY!\n');
    process.exit(0);
  }
}

runPipelineHardeningTests();
