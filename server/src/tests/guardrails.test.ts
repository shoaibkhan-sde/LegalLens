import fs from 'fs';
import path from 'path';
import { runGuard1InputGate, runGuard1InputGateAsync, extractAndCleanDocumentText } from '../services/astraBackend.js';

interface TestCase {
  name: string;
  filePath?: string;
  inlineText?: string;
  expectedResult: 'REJECTED' | 'ACCEPTED';
}

const getDirName = () => {
  if (typeof __dirname !== 'undefined') return __dirname;
  return path.resolve(process.cwd(), 'server/src/tests');
};

const FIXTURES_DIR = path.resolve(getDirName(), 'fixtures');

const testCases: TestCase[] = [
  {
    name: '01_rental_agreement.txt (Residential Tenancy)',
    filePath: path.join(FIXTURES_DIR, '01_rental_agreement.txt'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: '02_rental_agreement_v2_for_comparison.txt',
    filePath: path.join(FIXTURES_DIR, '02_rental_agreement_v2_for_comparison.txt'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: '03_nda.txt (Mutual Non-Disclosure Agreement)',
    filePath: path.join(FIXTURES_DIR, '03_nda.txt'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: '04_employment_agreement.txt (Service Contract)',
    filePath: path.join(FIXTURES_DIR, '04_employment_agreement.txt'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: '07_mixed_language_loan_agreement.txt (Bilingual Loan Note)',
    filePath: path.join(FIXTURES_DIR, '07_mixed_language_loan_agreement.txt'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: '08_loan_agreement.pdf (PDF Document Ingestion)',
    filePath: path.join(FIXTURES_DIR, '08_loan_agreement.pdf'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: '09_photo_employment_offer.jpg (Photo Offer Letter OCR)',
    filePath: path.join(FIXTURES_DIR, '09_photo_employment_offer.jpg'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: 'Valid Tenancy Agreement Fixture',
    filePath: path.join(FIXTURES_DIR, 'valid_rental_agreement.txt'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: 'Valid Employment Contract Fixture',
    filePath: path.join(FIXTURES_DIR, 'valid_employment_contract.txt'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: 'School Exam Paper (Text File)',
    filePath: path.join(FIXTURES_DIR, 'failing_exam_paper.txt'),
    expectedResult: 'REJECTED',
  },
  {
    name: 'Random Photo / Non-Legal Media OCR',
    filePath: path.join(FIXTURES_DIR, 'failing_random_photo_ocr.txt'),
    expectedResult: 'REJECTED',
  },
  {
    name: 'News Article Report',
    filePath: path.join(FIXTURES_DIR, 'failing_news_article.txt'),
    expectedResult: 'REJECTED',
  },
  {
    name: 'Casual Ordinary Text: Weather Query',
    inlineText: "What is the weather like in Mumbai today? Is it going to rain in the evening?",
    expectedResult: 'REJECTED',
  },
  {
    name: 'Casual Ordinary Text: Hobby Paragraph',
    inlineText: "I love playing badminton on weekends with my friends at the local sports club.",
    expectedResult: 'REJECTED',
  },
];

async function runGuardrailRegressionTests() {
  console.log('====================================================');
  console.log('   LEGAL LENS GUARD 1 COMPREHENSIVE REGRESSION SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    let content = '';
    if (tc.filePath) {
      if (!fs.existsSync(tc.filePath)) {
        console.error(`❌ [MISSING FIXTURE] ${tc.name}: ${tc.filePath}`);
        failedCount++;
        continue;
      }
      if (tc.filePath.endsWith('.pdf') || tc.filePath.endsWith('.jpg') || tc.filePath.endsWith('.jpeg')) {
        const fileBuffer = fs.readFileSync(tc.filePath);
        const mimeType = tc.filePath.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
        content = extractAndCleanDocumentText(fileBuffer, mimeType, path.basename(tc.filePath));
      } else {
        content = fs.readFileSync(tc.filePath, 'utf-8');
      }
    } else if (tc.inlineText) {
      content = tc.inlineText;
    }

    const syncResult = runGuard1InputGate(content);
    const asyncResult = await runGuard1InputGateAsync(content);
    const guard1Result = asyncResult || syncResult;

    let actualResult: 'ACCEPTED' | 'REJECTED' = guard1Result.is_legal_document ? 'ACCEPTED' : 'REJECTED';
    const isMatch = actualResult === tc.expectedResult;

    if (isMatch) {
      passedCount++;
      console.log(`✅ [PASS] ${tc.name}`);
      console.log(`   Guard 1 Status: ${actualResult} (Category: ${guard1Result.category}, Confidence: ${guard1Result.confidence})`);
      if (actualResult === 'REJECTED') {
        console.log(`   Rejection Reason: "${guard1Result.rejection_reason}"`);
      }
      console.log('----------------------------------------------------');
    } else {
      failedCount++;
      console.error(`❌ [FAIL] ${tc.name}`);
      console.error(`   Expected: ${tc.expectedResult}, Actual: ${actualResult}`);
      console.error(`   Guard 1 Rejection Reason: "${guard1Result.rejection_reason}"`);
      console.error('----------------------------------------------------');
    }
  }

  console.log(`\nTEST SUMMARY: ${passedCount} Passed, ${failedCount} Failed out of ${testCases.length} tests.`);

  if (failedCount > 0) {
    console.error('\n🔴 REGRESSION TESTS FAILED! Fix Guard 1 before proceeding.');
    process.exit(1);
  } else {
    console.log('\n🟢 ALL GUARD 1 REGRESSION TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

runGuardrailRegressionTests();

