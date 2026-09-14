import fs from 'fs';
import path from 'path';
import { runGuard1InputGate, analyzeDocumentText } from '../services/astraBackend.js';

interface TestCase {
  name: string;
  filePath: string;
  expectedResult: 'REJECTED' | 'ACCEPTED';
}

const getDirName = () => {
  if (typeof __dirname !== 'undefined') return __dirname;
  return path.resolve(process.cwd(), 'server/src/tests');
};

const FIXTURES_DIR = path.resolve(getDirName(), 'fixtures');

const testCases: TestCase[] = [
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
    name: 'Valid Residential Tenancy Agreement',
    filePath: path.join(FIXTURES_DIR, 'valid_rental_agreement.txt'),
    expectedResult: 'ACCEPTED',
  },
  {
    name: 'Valid Employment Service Agreement',
    filePath: path.join(FIXTURES_DIR, 'valid_employment_contract.txt'),
    expectedResult: 'ACCEPTED',
  },
];

async function runGuardrailRegressionTests() {
  console.log('====================================================');
  console.log('   LEGAL LENS GUARD 1 REGRESSION TEST SUITE');
  console.log('====================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    if (!fs.existsSync(tc.filePath)) {
      console.error(`❌ [MISSING FIXTURE] ${tc.name}: ${tc.filePath}`);
      failedCount++;
      continue;
    }

    const content = fs.readFileSync(tc.filePath, 'utf-8');
    const guard1Result = runGuard1InputGate(content);

    let actualResult: 'ACCEPTED' | 'REJECTED' = guard1Result.is_legal_document ? 'ACCEPTED' : 'REJECTED';

    let fullPipelineError: string | null = null;
    try {
      await analyzeDocumentText(content);
    } catch (err: any) {
      fullPipelineError = err.message || String(err);
    }

    const isMatch = actualResult === tc.expectedResult;

    if (isMatch) {
      passedCount++;
      console.log(`✅ [PASS] ${tc.name}`);
      console.log(`   Guard 1 Status: ${actualResult} (Confidence: ${guard1Result.confidence})`);
      if (actualResult === 'REJECTED') {
        console.log(`   Rejection Reason: "${guard1Result.rejection_reason}"`);
      }
      console.log('----------------------------------------------------');
    } else {
      failedCount++;
      console.error(`❌ [FAIL] ${tc.name}`);
      console.error(`   Expected: ${tc.expectedResult}, Actual: ${actualResult}`);
      console.error(`   Guard 1 Rejection Reason: "${guard1Result.rejection_reason}"`);
      if (fullPipelineError) console.error(`   Pipeline Error: "${fullPipelineError}"`);
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
