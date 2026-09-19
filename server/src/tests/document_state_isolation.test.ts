import fs from 'fs';
import path from 'path';

function runDocumentStateIsolationAuditTest() {
  console.log('====================================================');
  console.log('  DOCUMENT STATE ISOLATION & LEAK AUDIT TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Verify App.tsx does not pass documentAnalysis to ComparisonView
  const projectRoot = path.resolve(process.cwd(), '..');
  const appTsxPath = fs.existsSync(path.join(process.cwd(), 'src/App.tsx'))
    ? path.join(process.cwd(), 'src/App.tsx')
    : path.join(projectRoot, 'src/App.tsx');
  const appTsxContent = fs.readFileSync(appTsxPath, 'utf8');

  console.log('--- TEST 1: APP.TSX FEATURE PROPS AUDIT ---');
  const hasComparisonLeakProp = appTsxContent.includes('<ComparisonView currentDocument=');
  if (hasComparisonLeakProp) {
    console.error('❌ [FAIL] Test 1: App.tsx is passing currentDocument to ComparisonView!');
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 1: ComparisonView is isolated from documentAnalysis in App.tsx.');
  }

  // Test 2: Verify ComparisonView.tsx has no currentDocument fallback logic
  const compViewPath = fs.existsSync(path.join(process.cwd(), 'src/components/ComparisonView.tsx'))
    ? path.join(process.cwd(), 'src/components/ComparisonView.tsx')
    : path.join(projectRoot, 'src/components/ComparisonView.tsx');
  const compViewContent = fs.readFileSync(compViewPath, 'utf8');

  console.log('\n--- TEST 2: COMPARISONVIEW.TSX FALLBACK AUDIT ---');
  const hasActiveDocFallbackText = compViewContent.includes('Using active document');
  const hasCurrentDocProp = compViewContent.includes('currentDocument');
  
  if (hasActiveDocFallbackText || hasCurrentDocProp) {
    console.error(`❌ [FAIL] Test 2: ComparisonView still contains legacy active document fallback references (currentDocument: ${hasCurrentDocProp}, textFallback: ${hasActiveDocFallbackText})!`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 2: ComparisonView has 0 references to shared active document fallback.');
  }

  // Test 3: Audit all feature components for cross-feature document leaks
  console.log('\n--- TEST 3: CROSS-FEATURE CONSUMER AUDIT ---');
  const legalAidPath = fs.existsSync(path.join(process.cwd(), 'src/components/LegalAidLocator.tsx'))
    ? path.join(process.cwd(), 'src/components/LegalAidLocator.tsx')
    : path.join(projectRoot, 'src/components/LegalAidLocator.tsx');
  const legalAidContent = fs.readFileSync(legalAidPath, 'utf8');
  const legalAidHasLeak = legalAidContent.includes('documentAnalysis') || legalAidContent.includes('currentDocument');

  if (legalAidHasLeak) {
    console.error('❌ [FAIL] Test 3: LegalAidLocator consumes shared document state!');
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 3: LegalAidLocator does not consume shared document state.');
  }

  console.log('\n====================================================');
  console.log('  SUMMARY: ALL DOCUMENT STATE ISOLATION TESTS PASSED! 🟢');
  console.log('====================================================\n');
}

runDocumentStateIsolationAuditTest();
