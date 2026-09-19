import fs from 'fs';
import path from 'path';

// Polyfill in-memory localStorage & sessionStorage for Node runtime
class MemoryStorage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  [key: string]: any;
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (!globalThis.localStorage) {
  (globalThis as any).localStorage = new MemoryStorage();
}
if (!globalThis.sessionStorage) {
  (globalThis as any).sessionStorage = new MemoryStorage();
}

import {
  saveStorage,
  loadStorage,
  saveErrorStorage,
  loadErrorStorage,
  removeStorage,
  clearFeatureStorage,
  CURRENT_SCHEMA_VERSION,
  ERROR_STALENESS_THRESHOLD_MS,
} from '../../../src/utils/persistence';

async function runSessionPersistenceIsolationTestSuite() {
  console.log('====================================================');
  console.log('  SESSION PERSISTENCE & ISOLATION TEST SUITE');
  console.log('====================================================\n');

  localStorage.clear();
  sessionStorage.clear();

  // ----------------------------------------------------
  // TEST 1: ANALYZE DOCUMENT STATE PERSISTENCE & HYDRATION
  // ----------------------------------------------------
  console.log('--- TEST 1: ANALYZE DOCUMENT STATE PERSISTENCE ---');
  const sampleAnalyzeDoc = {
    document_title: 'Master Enterprise Agreement',
    category: 'service/consultancy agreement',
    overall_risk_score: 45,
    summary_simple: 'Sample enterprise agreement',
    summary_very_simple: 'Enterprise agreement',
    clauses: [
      {
        id: 'c1',
        clause_number: '1',
        clause_type: 'parties & recitals',
        title: 'Preamble',
        original_text: 'Agreement between Company and Client.',
        simple_explanation: 'Parties identified.',
        very_simple_explanation: 'Names listed.',
        risk_level: 'low',
        icon_name: 'FileText',
        one_line_consequence: 'Standard preamble.',
      },
    ],
  };

  saveStorage('legallens_analyze_result', sampleAnalyzeDoc);
  saveStorage('legallens_analyze_active_clause_id', 'c1');
  saveStorage('legallens_analyze_reading_level', 'very_simple');

  const restoredDoc = loadStorage<any>('legallens_analyze_result', null);
  const restoredClauseId = loadStorage<string | null>('legallens_analyze_active_clause_id', null);
  const restoredReadingLevel = loadStorage<string>('legallens_analyze_reading_level', 'simple');

  if (
    !restoredDoc ||
    restoredDoc.document_title !== 'Master Enterprise Agreement' ||
    restoredClauseId !== 'c1' ||
    restoredReadingLevel !== 'very_simple'
  ) {
    console.error('❌ [FAIL] Test 1: Analyze Document state failed to persist or hydrate correctly.');
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 1: Analyze Document full state persisted and hydrated cleanly.');
  }

  // ----------------------------------------------------
  // TEST 2: COMPARE CONTRACTS STATE & VALIDATION ALERT PERSISTENCE
  // ----------------------------------------------------
  console.log('\n--- TEST 2: COMPARE CONTRACTS & VALIDATION ALERT PERSISTENCE ---');
  const sampleCompResult = {
    winner_recommendation: 'Doc A has lower overall risk',
    key_differences_summary: 'Matched 3 common clauses',
    aligned_pairs: [],
  };

  saveStorage('legallens_compare_doc_a_pasted_text', 'Sample text A');
  saveStorage('legallens_compare_doc_b_pasted_text', 'Sample text B');
  saveStorage('legallens_compare_result', sampleCompResult);
  saveErrorStorage('legallens_compare_error_message', 'Comparison Error — Multiple document failures');

  const restoredDocA = loadStorage<string>('legallens_compare_doc_a_pasted_text', '');
  const restoredDocB = loadStorage<string>('legallens_compare_doc_b_pasted_text', '');
  const restoredCompRes = loadStorage<any>('legallens_compare_result', null);
  const restoredCompError = loadErrorStorage('legallens_compare_error_message');

  if (
    restoredDocA !== 'Sample text A' ||
    restoredDocB !== 'Sample text B' ||
    !restoredCompRes ||
    !restoredCompError?.includes('Comparison Error')
  ) {
    console.error('❌ [FAIL] Test 2: Compare Contracts state/validation alert failed to persist.');
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 2: Compare Contracts inputs, comparison result, and validation alert persisted cleanly.');
  }

  // ----------------------------------------------------
  // TEST 3: FREE LEGAL HELP STATE PERSISTENCE
  // ----------------------------------------------------
  console.log('\n--- TEST 3: FREE LEGAL HELP STATE PERSISTENCE ---');
  saveStorage('legallens_legalaid_state', 'Karnataka');
  saveStorage('legallens_legalaid_search', 'Bengaluru');

  const restoredState = loadStorage<string>('legallens_legalaid_state', 'All');
  const restoredSearch = loadStorage<string>('legallens_legalaid_search', '');

  if (restoredState !== 'Karnataka' || restoredSearch !== 'Bengaluru') {
    console.error('❌ [FAIL] Test 3: Free Legal Help state failed to persist.');
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 3: Free Legal Help search query and state filter persisted cleanly.');
  }

  // ----------------------------------------------------
  // TEST 4: SCHEMA VERSION MISMATCH & STALE DISCARD
  // ----------------------------------------------------
  console.log('\n--- TEST 4: SCHEMA VERSION MISMATCH DISCARD ---');
  const stalePayload = {
    version: 0, // Old schema version!
    timestamp: Date.now(),
    data: { document_title: 'Old Stale Agreement' },
  };
  localStorage.setItem('legallens_analyze_result', JSON.stringify(stalePayload));

  const hydratedAfterMismatch = loadStorage<any>('legallens_analyze_result', null);
  if (hydratedAfterMismatch !== null) {
    console.error('❌ [FAIL] Test 4: Stale schema version (v0) was not discarded on hydration!');
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 4: Mismatched schema version payload automatically discarded on hydration.');
  }

  // ----------------------------------------------------
  // TEST 5: ERROR STALENESS TIMEOUT DISCARD
  // ----------------------------------------------------
  console.log('\n--- TEST 5: ERROR STALENESS TIMEOUT DISCARD ---');
  const staleErrorPayload = {
    version: CURRENT_SCHEMA_VERSION,
    timestamp: Date.now() - (ERROR_STALENESS_THRESHOLD_MS + 10000), // 5 minutes 10 seconds ago
    data: { message: 'Old Rate Limit Error', timestamp: Date.now() - (ERROR_STALENESS_THRESHOLD_MS + 10000) },
  };
  localStorage.setItem('legallens_analyze_error_message', JSON.stringify(staleErrorPayload));

  const hydratedStaleError = loadErrorStorage('legallens_analyze_error_message');
  if (hydratedStaleError !== null) {
    console.error(`❌ [FAIL] Test 5: Stale error message older than 5 minutes was not discarded!`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 5: Stale error older than 5 minutes automatically discarded on hydration.');
  }

  // ----------------------------------------------------
  // TEST 6: CROSS-FEATURE STATE ISOLATION & CLEAR AFFORDANCE
  // ----------------------------------------------------
  console.log('\n--- TEST 6: CROSS-FEATURE ISOLATION & CLEAR AUDIT ---');
  localStorage.clear();
  sessionStorage.clear();

  // Populate Analyze state
  saveStorage('legallens_analyze_result', sampleAnalyzeDoc);
  // Populate Compare state
  saveStorage('legallens_compare_doc_a_pasted_text', 'Text A');

  // Assert isolation: clearing Analyze storage leaves Compare storage completely untouched
  clearFeatureStorage('legallens_analyze_');

  const analyzeDocCheck = loadStorage<any>('legallens_analyze_result', null);
  const compareTextCheck = loadStorage<string | null>('legallens_compare_doc_a_pasted_text', null);

  if (analyzeDocCheck !== null || compareTextCheck !== 'Text A') {
    console.error('❌ [FAIL] Test 6: Cross-feature isolation failed during clear feature storage.');
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 6: Cross-feature isolation verified. Feature state clearing operates strictly on feature-isolated keys.');
  }

  // ----------------------------------------------------
  // TEST 7: RE-RUN PRIOR ISOLATION COMPONENT AUDIT
  // ----------------------------------------------------
  console.log('\n--- TEST 7: REGRESSION - PRIOR DOCUMENT ISOLATION AUDIT ---');
  const projectRoot = path.resolve(process.cwd(), '..');
  const getFilePath = (relPath: string) => {
    if (fs.existsSync(path.join(process.cwd(), relPath))) return path.join(process.cwd(), relPath);
    return path.join(projectRoot, relPath);
  };

  const appContent = fs.readFileSync(getFilePath('src/App.tsx'), 'utf8');
  const compContent = fs.readFileSync(getFilePath('src/components/ComparisonView.tsx'), 'utf8');
  const legalAidContent = fs.readFileSync(getFilePath('src/components/LegalAidLocator.tsx'), 'utf8');

  if (appContent.includes('<ComparisonView currentDocument=')) {
    console.error('❌ [FAIL] Test 7: App.tsx leaks documentAnalysis prop to ComparisonView!');
    process.exit(1);
  }
  if (compContent.includes('currentDocument') || compContent.includes('Using active document')) {
    console.error('❌ [FAIL] Test 7: ComparisonView still has legacy shared document references!');
    process.exit(1);
  }
  if (legalAidContent.includes('documentAnalysis') || legalAidContent.includes('currentDocument')) {
    console.error('❌ [FAIL] Test 7: LegalAidLocator consumes shared document state!');
    process.exit(1);
  }
  console.log('✅ [PASS] Test 7: Prior document state isolation invariants remain 100% intact.');

  console.log('\n====================================================');
  console.log('  SUMMARY: ALL SESSION PERSISTENCE TESTS PASSED! 🟢');
  console.log('====================================================\n');
}

runSessionPersistenceIsolationTestSuite();
