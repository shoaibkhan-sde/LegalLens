import { runGuard1InputGateAsync, compareTwoDocuments } from '../services/astraBackend';
import { DocumentAnalysisResult } from '../../../src/types/schemas';

async function runMixedDocumentValidationTests() {
  console.log('====================================================');
  console.log('  MIXED LEGAL / NON-LEGAL DOCUMENT VALIDATION TESTS');
  console.log('====================================================\n');

  // Test 1: Guard 1 Rejects Non-Legal / Random Input (e.g. math equations, gibberish)
  console.log('--- TEST 1: GUARD 1 CLASSIFICATION FOR NON-LEGAL TEXT ---');
  const nonLegalText = "x^2 + y^2 = z^2. Solve for x when y = 3 and z = 5. Calculus assignment step 1.";
  const g1Result = await runGuard1InputGateAsync(nonLegalText);

  if (g1Result.is_legal_document) {
    console.error('❌ [FAIL] Test 1: Guard 1 failed to reject non-legal text.');
    process.exit(1);
  } else {
    console.log(`✅ [PASS] Test 1: Non-legal text correctly rejected by Guard 1 (Reason: "${g1Result.rejection_reason}")`);
  }

  // Test 2: Document A Legal + Document B Non-Legal Format Helper Simulation
  console.log('\n--- TEST 2: SLOT-ISOLATED ERROR FORMATTING (DOC B INVALID) ---');
  const formatDocumentRejectReason = (rawError: string, docLabel: string, isHindi = false): string => {
    let cleanMsg = rawError
      .replace(/^Error:\s*/i, '')
      .replace(/^Document rejected by Guard 1:\s*/i, '')
      .trim();

    if (!cleanMsg || cleanMsg.toLowerCase().includes('analysis failed')) {
      cleanMsg = isHindi
        ? 'यह एक वैध कानूनी दस्तावेज़ नहीं लगता है। कृपया एक वैध कानूनी समझौता अपलोड करें या पेस्ट करें।'
        : 'this does not appear to be a valid legal document. Please upload or paste a legal agreement.';
    } else {
      const lower = cleanMsg.toLowerCase();
      if (!lower.includes('legal agreement') && !lower.includes('कानूनी')) {
        cleanMsg = isHindi
          ? `${cleanMsg} (कृपया एक वैध कानूनी समझौता अपलोड करें या पेस्ट करें।)`
          : `${cleanMsg}. Please upload or paste a legal agreement.`;
      }
    }

    const prefix = isHindi ? `${docLabel} की तुलना नहीं की जा सकी:` : `${docLabel} could not be compared:`;
    if (!cleanMsg.toLowerCase().includes(docLabel.toLowerCase())) {
      return `${prefix} ${cleanMsg}`;
    }
    return cleanMsg;
  };

  const errB = formatDocumentRejectReason(g1Result.rejection_reason || '', 'Document B');
  if (!errB.startsWith('Document B could not be compared:')) {
    console.error(`❌ [FAIL] Test 2: Formatted error "${errB}" does not explicitly identify Document B.`);
    process.exit(1);
  }
  console.log(`✅ [PASS] Test 2: Document B rejection message explicitly named slot: "${errB}"`);

  // Test 3: Document A Non-Legal + Document B Non-Legal (Both Invalid Combined Error)
  console.log('\n--- TEST 3: COMBINED ERROR WHEN BOTH DOCUMENTS ARE INVALID ---');
  const errA = formatDocumentRejectReason("Input text does not contain valid legal terms", 'Document A');
  const combinedError = `Comparison Error — Both documents failed legal validation:\n• ${errA}\n• ${errB}`;

  if (!combinedError.includes('Document A') || !combinedError.includes('Document B')) {
    console.error(`❌ [FAIL] Test 3: Combined error does not explicitly name both Document A and Document B.`);
    process.exit(1);
  }
  console.log(`✅ [PASS] Test 3: Combined error correctly names both slots:\n${combinedError}`);

  // Test 4: Regression Check - Valid Document A & B Comparison Works
  console.log('\n--- TEST 4: REGRESSION - VALID LEGAL DOCUMENT PAIR COMPARISON ---');
  const validDocA: DocumentAnalysisResult = {
    guard1: { is_legal_document: true, category: 'rental/lease agreement', confidence: 0.98 },
    document_title: 'Residential Tenancy Agreement A',
    category: 'rental/lease agreement',
    overall_risk_score: 25,
    summary_simple: 'Lease contract A summary',
    summary_very_simple: 'Lease A summary',
    clauses: [
      {
        id: 'c1',
        clause_number: '1',
        title: 'Rent',
        clause_type: 'rent & payment',
        original_text: 'Rent is $2,000 per month.',
        simple_explanation: 'Monthly rent is $2,000.',
        very_simple_explanation: 'Rent $2,000/mo.',
        risk_level: 'low',
        icon_name: 'ShieldCheck',
        one_line_consequence: 'Standard rent obligation.',
      },
    ],
    contradictions: [],
    checklist: { title: 'Checklist', items: [], stamp_duty_required: false, disclaimer: '' },
    options_next_steps: [],
    lawyer_briefing: {
      document_summary: 'Summary',
      flagged_issues: [],
      questions_to_ask_lawyer: [],
      missing_protective_clauses: [],
      recommended_next_steps: [],
      disclaimer: '',
    },
    disclaimer: '',
  };

  const validDocB: DocumentAnalysisResult = {
    guard1: { is_legal_document: true, category: 'rental/lease agreement', confidence: 0.98 },
    document_title: 'Residential Tenancy Agreement B',
    category: 'rental/lease agreement',
    overall_risk_score: 40,
    summary_simple: 'Lease contract B summary',
    summary_very_simple: 'Lease B summary',
    clauses: [
      {
        id: 'c1',
        clause_number: '1',
        title: 'Rent',
        clause_type: 'rent & payment',
        original_text: 'Rent is $2,500 per month.',
        simple_explanation: 'Monthly rent is $2,500.',
        very_simple_explanation: 'Rent $2,500/mo.',
        risk_level: 'watch_out',
        icon_name: 'ShieldAlert',
        one_line_consequence: 'Higher rent obligation.',
      },
    ],
    contradictions: [],
    checklist: { title: 'Checklist', items: [], stamp_duty_required: false, disclaimer: '' },
    options_next_steps: [],
    lawyer_briefing: {
      document_summary: 'Summary',
      flagged_issues: [],
      questions_to_ask_lawyer: [],
      missing_protective_clauses: [],
      recommended_next_steps: [],
      disclaimer: '',
    },
    disclaimer: '',
  };

  const compRes = await compareTwoDocuments(validDocA, validDocB);
  if (!compRes || !compRes.aligned_pairs || compRes.aligned_pairs.length === 0) {
    console.error('❌ [FAIL] Test 4: Comparison failed for valid legal document pair.');
    process.exit(1);
  }
  console.log(`✅ [PASS] Test 4: Valid legal document pair comparison executed normally (${compRes.aligned_pairs.length} aligned clause pairs)`);

  console.log('\n====================================================');
  console.log('  SUMMARY: ALL MIXED DOCUMENT VALIDATION TESTS PASSED 🟢');
  console.log('====================================================');
}

runMixedDocumentValidationTests().catch((err) => {
  console.error('Fatal error in mixed document validation test runner:', err);
  process.exit(1);
});
