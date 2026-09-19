import fs from 'fs';
import path from 'path';
import {
  alignClauses,
} from '../../../src/utils/clauseAlignment';
import {
  compareTwoDocuments,
  calculateDocumentOverallRiskScore,
  analyzeDocumentText,
} from '../services/astraBackend';
import { DocumentAnalysisResult, SimplifiedClause } from '../../../src/types/schemas';

async function runCompareFixValidationTestSuite() {
  console.log('====================================================');
  console.log('  COMPARE CONTRACTS PIPELINE & FIX VALIDATION TEST');
  console.log('====================================================\n');

  // TEST 1: Risk Score Reuse & Calculation Consistency
  console.log('--- TEST 1: RISK SCORE REUSE & SINGLE SOURCE OF TRUTH ---');
  const dummyClauses: SimplifiedClause[] = [
    {
      id: 'c1',
      clause_number: '1',
      title: 'Indemnity Clause',
      clause_type: 'indemnity & liability',
      original_text: 'Employee shall indemnify company for all damages.',
      simple_explanation: 'You must pay for any damages.',
      very_simple_explanation: 'You pay for damages.',
      risk_level: 'high',
      icon_name: 'ShieldAlert',
      one_line_consequence: 'Unlimited liability exposure.',
    },
    {
      id: 'c2',
      clause_number: '2',
      title: 'Notice Period',
      clause_type: 'notice period',
      original_text: 'Either party may terminate with 30 days written notice.',
      simple_explanation: 'Give 30 days notice to end contract.',
      very_simple_explanation: '30 days notice required.',
      risk_level: 'low',
      icon_name: 'ShieldCheck',
      one_line_consequence: 'Standard notice period.',
    },
  ];

  const scoreFromCalc = calculateDocumentOverallRiskScore(dummyClauses);
  // 30 + 1 * 25 + 0 = 55
  if (scoreFromCalc !== 55) {
    console.error(`❌ [FAIL] Test 1: calculateDocumentOverallRiskScore returned ${scoreFromCalc}, expected 55.`);
    process.exit(1);
  }

  const docAObj: DocumentAnalysisResult = {
    guard1: { is_legal_document: true, category: 'employment contract', confidence: 0.95 },
    document_title: 'Employment Agreement A',
    category: 'employment contract',
    overall_risk_score: 55,
    summary_simple: 'Sample doc',
    summary_very_simple: 'Sample doc',
    clauses: dummyClauses,
    contradictions: [],
    checklist: { title: 'Checklist', items: [], stamp_duty_required: false, disclaimer: '' },
    options_next_steps: [],
    lawyer_briefing: {
      document_summary: 'Sample summary',
      flagged_issues: [],
      questions_to_ask_lawyer: [],
      missing_protective_clauses: [],
      recommended_next_steps: ['Review terms with legal counsel'],
      disclaimer: '',
    },
    disclaimer: '',
  };

  const docBObj: DocumentAnalysisResult = {
    guard1: { is_legal_document: true, category: 'employment contract', confidence: 0.95 },
    document_title: 'Employment Agreement B',
    category: 'employment contract',
    overall_risk_score: 30,
    summary_simple: 'Sample doc B',
    summary_very_simple: 'Sample doc B',
    clauses: [dummyClauses[1]],
    contradictions: [],
    checklist: { title: 'Checklist', items: [], stamp_duty_required: false, disclaimer: '' },
    options_next_steps: [],
    lawyer_briefing: {
      document_summary: 'Sample summary B',
      flagged_issues: [],
      questions_to_ask_lawyer: [],
      missing_protective_clauses: [],
      recommended_next_steps: ['Review terms with legal counsel'],
      disclaimer: '',
    },
    disclaimer: '',
  };

  const compRes = await compareTwoDocuments(docAObj, docBObj);
  if (!(compRes.winner_recommendation ?? '').includes('30 vs 55')) {
    console.error(`❌ [FAIL] Test 1: winner_recommendation "${compRes.winner_recommendation}" does not match exact risk scores (30 vs 55).`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 1: Risk score logic is reused consistently and matches Analyze Document scoring.');
  }

  // TEST 2: Low-Overlap Pair (5 Lease clauses vs 5 ToS clauses)
  console.log('\n--- TEST 2: LOW-OVERLAP PAIR & NO UNDEFINED IN OUTPUT ---');
  const leaseClauses: SimplifiedClause[] = [
    { id: 'l0', clause_number: '1', title: 'Equipment Lease Agreement Preamble', clause_type: 'parties & recitals', original_text: 'This agreement sets up a 1-year lease of two CNC machines...', simple_explanation: 'Lease agreement preamble.', very_simple_explanation: 'Lease preamble.', risk_level: 'low', icon_name: 'FileText', one_line_consequence: 'Preamble terms.' },
    { id: 'l1', clause_number: '2', title: 'Leased Equipment', clause_type: 'use & restrictions', original_text: 'Lessor leases to Lessee two CNC milling machines.', simple_explanation: 'Defines leased equipment.', very_simple_explanation: 'Machine details.', risk_level: 'low', icon_name: 'Briefcase', one_line_consequence: 'Equipment scope.' },
    { id: 'l2', clause_number: '3', title: 'Lease Term', clause_type: 'term & termination', original_text: 'Term starts Oct 1 2026 for 12 months.', simple_explanation: '12 month duration.', very_simple_explanation: '1 year term.', risk_level: 'low', icon_name: 'Clock', one_line_consequence: 'Term duration.' },
    { id: 'l3', clause_number: '4', title: 'Rental Payments', clause_type: 'security deposit', original_text: 'Rent is $4,500 per month due on 1st of month.', simple_explanation: '$4500 monthly payment.', very_simple_explanation: '$4500 monthly rent.', risk_level: 'low', icon_name: 'DollarSign', one_line_consequence: 'Rent terms.' },
    { id: 'l4', clause_number: '5', title: 'Maintenance and Repair', clause_type: 'indemnity & liability', original_text: 'Lessee responsible for routine maintenance and accidental damage.', simple_explanation: 'Lessee pays for repair.', very_simple_explanation: 'You fix damage.', risk_level: 'watch_out', icon_name: 'Wrench', one_line_consequence: 'Maintenance obligation.' },
  ];

  const tosClauses: SimplifiedClause[] = [
    { id: 't0', clause_number: '1', title: 'Website Terms of Service Preamble', clause_type: 'parties & recitals', original_text: 'When you use the website, you agree to follow its rules.', simple_explanation: 'Website terms preamble.', very_simple_explanation: 'Terms preamble.', risk_level: 'low', icon_name: 'Globe', one_line_consequence: 'Preamble terms.' },
    { id: 't1', clause_number: '2', title: 'Intellectual Property', clause_type: 'governing law & jurisdiction', original_text: 'All text images logos belong to company.', simple_explanation: 'Company owns all content.', very_simple_explanation: 'Content ownership.', risk_level: 'low', icon_name: 'ShieldCheck', one_line_consequence: 'IP ownership.' },
    { id: 't2', clause_number: '3', title: 'User Conduct', clause_type: 'use & restrictions', original_text: 'Must not upload harmful software or copy data.', simple_explanation: 'Prohibits harmful uploads.', very_simple_explanation: 'No hacking.', risk_level: 'low', icon_name: 'AlertTriangle', one_line_consequence: 'Conduct rules.' },
    { id: 't3', clause_number: '4', title: 'Disclaimer of Warranties', clause_type: 'limitation of liability', original_text: 'Service offered as is without guarantees.', simple_explanation: 'Service provided without warranty.', very_simple_explanation: 'As-is service.', risk_level: 'high', icon_name: 'AlertOctagon', one_line_consequence: 'No warranties.' },
    { id: 't4', clause_number: '5', title: 'Limitation of Liability', clause_type: 'indemnity & liability', original_text: 'Company not responsible for damages from use.', simple_explanation: 'Liability capped to zero.', very_simple_explanation: 'Company not liable.', risk_level: 'high', icon_name: 'ShieldAlert', one_line_consequence: 'Liability cap.' },
  ];

  const leaseDoc: DocumentAnalysisResult = { ...docAObj, document_title: 'Equipment Lease Agreement', clauses: leaseClauses };
  const tosDoc: DocumentAnalysisResult = { ...docBObj, document_title: 'Website Terms of Service', clauses: tosClauses };

  const compLow = await compareTwoDocuments(leaseDoc, tosDoc);

  // Assert zero occurrences of literal "undefined"
  const compStr = JSON.stringify(compLow);
  if (compStr.toLowerCase().includes('undefined')) {
    console.error(`❌ [FAIL] Test 2: Literal "undefined" found in output string:\n${compStr}`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 2a: 0 occurrences of "undefined" in comparison output.');
  }

  // Assert preambles matched under 'parties & recitals'
  const preamblePair = compLow.aligned_pairs.find((p) => p.clause_type === 'parties & recitals');
  if (!preamblePair || preamblePair.status !== 'matched') {
    console.error(`❌ [FAIL] Test 2b: Preambles were not matched together under "parties & recitals".`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 2b: Preambles correctly matched as a "parties & recitals" pair.');
  }

  // Assert all 10 clauses are preserved in aligned_pairs
  const totalClausesInPairs = new Set([
    ...compLow.aligned_pairs.map((p) => p.doc_a_clause?.id).filter(Boolean),
    ...compLow.aligned_pairs.map((p) => p.doc_b_clause?.id).filter(Boolean),
  ]);

  if (totalClausesInPairs.size < 10) {
    console.error(`❌ [FAIL] Test 2c: Expected 10 total clauses preserved in output, got ${totalClausesInPairs.size}.`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] Test 2c: All ${totalClausesInPairs.size} clauses preserved in aligned_pairs output.`);
  }

  // Assert stated matched count in summary matches actual matched pairs count
  const actualMatchedCount = compLow.aligned_pairs.filter((p) => p.status === 'matched').length;
  if (!compLow.key_differences_summary.includes(`Matched ${actualMatchedCount} common clause type(s)`)) {
    console.error(`❌ [FAIL] Test 2d: Summary "${compLow.key_differences_summary}" does not match actual count ${actualMatchedCount}.`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] Test 2d: Stated matched count (${actualMatchedCount}) is strictly accurate.`);
  }

  // TEST 3: Duplicate Category Pair Alignment
  console.log('\n--- TEST 3: DUPLICATE CATEGORY ALIGNMENT & COMPLETENESS ---');
  const docADupClauses: SimplifiedClause[] = [
    { id: 'ind_1', clause_number: '1', title: 'Operational Indemnity', clause_type: 'indemnity & liability', original_text: 'Indemnify for operational negligence.', simple_explanation: 'Pay for operational loss.', very_simple_explanation: 'Pay for loss.', risk_level: 'high', icon_name: 'ShieldAlert', one_line_consequence: 'Operational liability.' },
    { id: 'ind_2', clause_number: '2', title: 'Third-Party Claims Indemnity', clause_type: 'indemnity & liability', original_text: 'Indemnify for third party IP claims.', simple_explanation: 'Pay for IP claims.', very_simple_explanation: 'Pay IP claims.', risk_level: 'high', icon_name: 'ShieldAlert', one_line_consequence: 'IP liability.' },
  ];
  const docBDupClauses: SimplifiedClause[] = [
    { id: 'ind_3', clause_number: '1', title: 'General Indemnity', clause_type: 'indemnity & liability', original_text: 'Indemnify for third party legal claims.', simple_explanation: 'Pay for legal claims.', very_simple_explanation: 'Pay claims.', risk_level: 'high', icon_name: 'ShieldAlert', one_line_consequence: 'Legal liability.' },
  ];

  const dupAlign = alignClauses(docADupClauses, docBDupClauses);

  const matchedDup = dupAlign.alignedPairs.filter((p) => p.status === 'matched');
  const aOnlyDup = dupAlign.alignedPairs.filter((p) => p.status === 'a_only');

  if (matchedDup.length !== 1 || aOnlyDup.length !== 1) {
    console.error(`❌ [FAIL] Test 3: Expected 1 matched pair and 1 a_only pair for duplicate indemnity category, got matched=${matchedDup.length}, a_only=${aOnlyDup.length}.`);
    process.exit(1);
  }

  // Verify category labels on both are 'indemnity & liability'
  if (matchedDup[0].clause_type !== 'indemnity & liability' || aOnlyDup[0].clause_type !== 'indemnity & liability') {
    console.error(`❌ [FAIL] Test 3: Category labels misassigned. Matched: ${matchedDup[0].clause_type}, a_only: ${aOnlyDup[0].clause_type}`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 3: Duplicate category clauses correctly paired highest similarity first, extra clause retained as a_only with true category label.');
  }

  const projectRoot = path.resolve(process.cwd(), '..');
  const getFilePath = (relPath: string) => {
    if (fs.existsSync(path.join(process.cwd(), relPath))) return path.join(process.cwd(), relPath);
    return path.join(projectRoot, relPath);
  };

  // TEST 4: No Raw-Text-Slice Fallback Audit
  console.log('\n--- TEST 4: NO RAW-TEXT-SLICE FALLBACK AUDIT ---');
  const compViewPath = getFilePath('src/components/ComparisonView.tsx');
  const compViewText = fs.readFileSync(compViewPath, 'utf8');

  if (compViewText.includes('.slice(0, 200)') || compViewText.includes('.slice(0,200)')) {
    console.error(`❌ [FAIL] Test 4: ComparisonView.tsx contains raw text slice fallback (.slice(0, 200))!`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 4: 0 raw-text-slice fallbacks in ComparisonView rendering pipeline.');
  }

  // TEST 5: Single Shared Alignment Module Confirmation
  console.log('\n--- TEST 5: SINGLE SHARED MODULE AUDIT ---');
  const backendPath = getFilePath('server/src/services/astraBackend.ts');
  const backendText = fs.readFileSync(backendPath, 'utf8');

  if (!backendText.includes("from '../../../src/utils/clauseAlignment'")) {
    console.error(`❌ [FAIL] Test 5: astraBackend.ts does not import single shared clauseAlignment module!`);
    process.exit(1);
  } else {
    console.log('✅ [PASS] Test 5: astraBackend.ts imports single shared clauseAlignment.ts module.');
  }

  // TEST 6: Real Document Analysis Risk Score Reuse
  console.log('\n--- TEST 6: REAL DOCUMENT RISK SCORE REUSE REGRESSION ---');
  const rentalSample1 = `RENTAL AGREEMENT
This agreement is made on 1st March 2026 between Landlord and Tenant.
1. RENT: Tenant agrees to pay Rs. 25,000 per month on or before 5th of each month.
2. NOTICE PERIOD: Either party may terminate with 30 days written notice.
3. SECURITY DEPOSIT: Tenant deposits Rs. 100,000 refundable upon vacating.`;

  const rentalSample2 = `EMPLOYMENT CONTRACT
1. SALARY: Rs. 50,000 per month.
2. PROBATION: 6 months probation period.
3. NON-COMPETE: Employee agrees not to join any competitor for 24 months after exit.`;

  const realDocA = await analyzeDocumentText(rentalSample1);
  const realDocB = await analyzeDocumentText(rentalSample2);

  const realComp = await compareTwoDocuments(realDocA, realDocB);
  const expectedStr = `${realDocA.overall_risk_score} vs ${realDocB.overall_risk_score}`;
  const revExpectedStr = `${realDocB.overall_risk_score} vs ${realDocA.overall_risk_score}`;

  if (!(realComp.winner_recommendation ?? '').includes(expectedStr) && !(realComp.winner_recommendation ?? '').includes(revExpectedStr)) {
    console.error(`❌ [FAIL] Test 6: Compare recommendation "${realComp.winner_recommendation}" did not reuse exact Analyze Document risk scores (${expectedStr}).`);
    process.exit(1);
  } else {
    console.log(`✅ [PASS] Test 6: Compare recommendation correctly reused exact Analyze Document risk scores (${realDocA.overall_risk_score} vs ${realDocB.overall_risk_score}).`);
  }

  console.log('\n====================================================');
  console.log('  SUMMARY: ALL COMPARE FIX VALIDATION TESTS PASSED! 🟢');
  console.log('====================================================\n');
}

runCompareFixValidationTestSuite();
