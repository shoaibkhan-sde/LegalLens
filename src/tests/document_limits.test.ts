import {
  MAX_PDF_PAGES,
  MAX_PDF_PAGES_ERROR_MSG,
  MAX_PDF_PAGES_ERROR_MSG_HI,
  MAX_PASTED_WORDS,
  MAX_PASTED_WORDS_ERROR_MSG,
  MAX_PASTED_WORDS_ERROR_MSG_HI,
  countWords,
  isWordLimitExceeded,
} from '../utils/constants';

function runLimitTests() {
  console.log('--- TEST 1: CONSTANT VALUE CHECKS ---');
  if (MAX_PDF_PAGES !== 30) {
    throw new Error(`Expected MAX_PDF_PAGES = 30, got ${MAX_PDF_PAGES}`);
  }
  if (MAX_PASTED_WORDS !== 12000) {
    throw new Error(`Expected MAX_PASTED_WORDS = 12000, got ${MAX_PASTED_WORDS}`);
  }
  console.log('✅ [PASS] Test 1: MAX_PDF_PAGES = 30, MAX_PASTED_WORDS = 12000');

  console.log('--- TEST 2: WORD COUNT HELPER ---');
  const emptyCount = countWords('');
  const spaceCount = countWords('   \n\t  ');
  const shortText = 'This is a test legal clause.';
  const shortCount = countWords(shortText);

  if (emptyCount !== 0 || spaceCount !== 0) {
    throw new Error(`Expected count 0 for whitespace, got empty=${emptyCount}, space=${spaceCount}`);
  }
  if (shortCount !== 6) {
    throw new Error(`Expected count 6 for short text, got ${shortCount}`);
  }
  console.log(`✅ [PASS] Test 2: countWords correctly returns 0 for whitespace and 6 for short text`);

  console.log('--- TEST 3: WORD LIMIT EXCEEDED EVALUATION ---');
  const withinLimitText = Array(12000).fill('word').join(' ');
  const exceededText = Array(12001).fill('word').join(' ');

  if (isWordLimitExceeded(withinLimitText)) {
    throw new Error('Expected 12000 words NOT to exceed limit');
  }
  if (!isWordLimitExceeded(exceededText)) {
    throw new Error('Expected 12001 words to exceed limit');
  }
  console.log('✅ [PASS] Test 3: 12,000 words passes, 12,001 words exceeds limit');

  console.log('--- TEST 4: ERROR MESSAGES BILINGUAL SPECIFICATION ---');
  if (!MAX_PDF_PAGES_ERROR_MSG.includes('30 pages')) {
    throw new Error(`English PDF error msg missing "30 pages": ${MAX_PDF_PAGES_ERROR_MSG}`);
  }
  if (!MAX_PDF_PAGES_ERROR_MSG_HI.includes('30 पृष्ठों')) {
    throw new Error(`Hindi PDF error msg missing "30 पृष्ठों": ${MAX_PDF_PAGES_ERROR_MSG_HI}`);
  }
  if (!MAX_PASTED_WORDS_ERROR_MSG.includes('12,000 words')) {
    throw new Error(`English word limit error msg missing "12,000 words": ${MAX_PASTED_WORDS_ERROR_MSG}`);
  }
  if (!MAX_PASTED_WORDS_ERROR_MSG_HI.includes('12,000 शब्दों')) {
    throw new Error(`Hindi word limit error msg missing "12,000 शब्दों": ${MAX_PASTED_WORDS_ERROR_MSG_HI}`);
  }
  console.log('✅ [PASS] Test 4: All error messages match exact specified requirements in EN and HI');

  console.log('\n====================================================');
  console.log('  SUMMARY: ALL DOCUMENT SIZE LIMIT TESTS PASSED 🟢');
  console.log('====================================================\n');
}

runLimitTests();
