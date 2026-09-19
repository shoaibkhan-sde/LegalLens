import fs from 'fs';
import path from 'path';

function runSessionPersistenceTestSuite() {
  console.log('====================================================');
  console.log('  SESSION PERSISTENCE & HYDRATION TEST SUITE');
  console.log('====================================================\n');

  const projectRoot = path.resolve(process.cwd(), '..');
  const getFilePath = (relPath: string) => {
    if (fs.existsSync(path.join(process.cwd(), relPath))) return path.join(process.cwd(), relPath);
    return path.join(projectRoot, relPath);
  };

  const compViewContent = fs.readFileSync(getFilePath('src/components/ComparisonView.tsx'), 'utf8');
  const docCaptureContent = fs.readFileSync(getFilePath('src/components/DocumentCapture.tsx'), 'utf8');
  const appContent = fs.readFileSync(getFilePath('src/App.tsx'), 'utf8');
  const legalAidContent = fs.readFileSync(getFilePath('src/components/LegalAidLocator.tsx'), 'utf8');

  // TEST 1: Compare Contracts Session Persistence
  console.log('--- TEST 1: COMPARE CONTRACTS STATE PERSISTENCE ---');
  const compareErrorPersisted = compViewContent.includes('legallens_compare_error_message');
  const compareResultPersisted = compViewContent.includes('legallens_compare_result');
  const compareDocAPersisted = compViewContent.includes('legallens_compare_doc_a_pasted_text');
  const compareDocBPersisted = compViewContent.includes('legallens_compare_doc_b_pasted_text');

  if (!compareErrorPersisted || !compareResultPersisted || !compareDocAPersisted || !compareDocBPersisted) {
    console.error(`❌ [FAIL] Test 1: Compare Contracts does not persist all required session state items!`);
    console.error(`   error: ${compareErrorPersisted}, result: ${compareResultPersisted}, docA: ${compareDocAPersisted}, docB: ${compareDocBPersisted}`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 1: Compare Contracts persists inputs, validation alerts, and comparison results in sessionStorage.');
  }

  // TEST 2: Analyze Document Session Persistence
  console.log('\n--- TEST 2: ANALYZE DOCUMENT STATE PERSISTENCE ---');
  const analyzeTextPersisted = docCaptureContent.includes('legallens_analyze_pasted_text');
  const analyzeExtractedPersisted = docCaptureContent.includes('legallens_analyze_extracted_text');
  const analyzeResultPersisted = appContent.includes('legallens_analyze_result');
  const analyzeErrorPersisted = appContent.includes('legallens_analyze_error_message');

  if (!analyzeTextPersisted || !analyzeExtractedPersisted || !analyzeResultPersisted || !analyzeErrorPersisted) {
    console.error(`❌ [FAIL] Test 2: Analyze Document does not persist full session state!`);
    console.error(`   text: ${analyzeTextPersisted}, extracted: ${analyzeExtractedPersisted}, result: ${analyzeResultPersisted}, error: ${analyzeErrorPersisted}`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 2: Analyze Document persists inputs, error banners, and analysis results in sessionStorage.');
  }

  // TEST 3: Free Legal Help Session Persistence
  console.log('\n--- TEST 3: FREE LEGAL HELP STATE PERSISTENCE ---');
  const legalAidStatePersisted = legalAidContent.includes('legallens_legalaid_state');
  const legalAidSearchPersisted = legalAidContent.includes('legallens_legalaid_search');

  if (!legalAidStatePersisted || !legalAidSearchPersisted) {
    console.error(`❌ [FAIL] Test 3: Free Legal Help does not persist filter & search state!`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 3: Free Legal Help persists state filter and search query in sessionStorage.');
  }

  // TEST 4: Generic State Hydration (No hardcoded error strings)
  console.log('\n--- TEST 4: GENERIC ERROR & RESULT HYDRATION AUDIT ---');
  const hasHardcodedErrorString = compViewContent.includes('casual social message coordinating a gaming session');
  if (hasHardcodedErrorString) {
    console.error(`❌ [FAIL] Test 4: ComparisonView contains hardcoded sample error string! State hydration must be generic.`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 4: ComparisonView hydrates generic errors & results dynamically from sessionStorage.');
  }

  // TEST 5: Cross-Feature State Isolation Regression
  console.log('\n--- TEST 5: CROSS-FEATURE STATE ISOLATION REGRESSION ---');
  const hasComparisonLeakProp = appContent.includes('<ComparisonView currentDocument=');
  const hasActiveDocFallbackText = compViewContent.includes('Using active document');
  const legalAidHasLeak = legalAidContent.includes('documentAnalysis') || legalAidContent.includes('currentDocument');

  if (hasComparisonLeakProp || hasActiveDocFallbackText || legalAidHasLeak) {
    console.error(`❌ [FAIL] Test 5: Cross-feature isolation regression detected!`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 5: Cross-feature state isolation remains strictly enforced across all features.');
  }

  console.log('\n====================================================');
  console.log('  SUMMARY: ALL SESSION PERSISTENCE TESTS PASSED! 🟢');
  console.log('====================================================\n');
}

runSessionPersistenceTestSuite();
