import { synthesizeDocumentAnalysis, verifyModelAvailabilityHealthCheck } from '../services/astraBackend';
import { Guard1InputGate, SimplifiedClause } from '../../../src/types/schemas';

const canaryGuard1: Guard1InputGate = {
  is_legal_document: true,
  category: 'employment contract',
  confidence: 0.99,
};

const canaryClause: SimplifiedClause = {
  id: 'clause_canary_1',
  clause_number: '1',
  clause_type: 'notice period',
  title: 'NOTICE PERIOD CANARY',
  original_text: 'Post-confirmation, either party shall provide 90 (ninety) days written notice to terminate employment.',
  simple_explanation: null,
  very_simple_explanation: null,
  risk_level: 'watch_out',
  icon_name: 'Clock',
  one_line_consequence: 'Requires 90 days written notice before exit.',
};

async function runLiveAiCanaryTest() {
  console.log('====================================================');
  console.log('  LEGAL LENS LIVE AI CANARY & HEALTH SMOKE TEST');
  console.log('====================================================\n');

  // Step 1: Execute Model Availability Health Check
  console.log('--- STEP 1: EXECUTING MODEL AVAILABILITY HEALTH CHECK ---');
  await verifyModelAvailabilityHealthCheck();

  // Step 2: Execute Live (Non-Fixture) Document Analysis
  console.log('\n--- STEP 2: RUNNING LIVE END-TO-END DOCUMENT ANALYSIS ---');
  const sampleText = `EMPLOYMENT AGREEMENT\n1. NOTICE PERIOD: Post-confirmation, either party shall provide 90 (ninety) days written notice to terminate employment.`;

  const result = await synthesizeDocumentAnalysis(sampleText, [canaryClause], canaryGuard1, undefined, 'en');

  if (!result || !result.clauses || result.clauses.length === 0) {
    console.error('❌ [FAIL] Live Canary Test: Document synthesis returned empty result!');
    process.exit(1);
  }

  const outputClause = result.clauses[0];
  console.log(`\nCanary Output Clause Title: "${outputClause.title}"`);
  console.log(`Canary Output Simple Explanation: "${outputClause.simple_explanation}"`);
  console.log(`Canary Output Meaning Error: ${outputClause.meaning_error}`);

  if (outputClause.meaning_error) {
    console.error('❌ [FAIL] Live Canary Test: Output clause returned meaning_error = true! Live AI call chain failed.');
    process.exit(1);
  }

  if (!outputClause.simple_explanation || outputClause.simple_explanation.length < 10) {
    console.error('❌ [FAIL] Live Canary Test: Output clause returned empty or invalid simple_explanation!');
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('✅ LIVE AI CANARY TEST PASSED! Live model chain operational.');
  console.log('====================================================');
}

runLiveAiCanaryTest().catch((err) => {
  console.error('❌ [FAIL] Live Canary Test Exception:', err);
  process.exit(1);
});
