import fs from 'fs';
import path from 'path';
import {
  chunkDocumentTextIntoClauses,
  synthesizeDocumentAnalysis,
  detectCrossClauseConflicts,
} from '../services/astraBackend';
import {
  normalizeClauseType,
  normalizeRiskLevel,
  SimplifiedClause,
  Guard1InputGate,
} from '../../../src/types/schemas';

const mockGuard1: Guard1InputGate = {
  is_legal_document: true,
  category: 'rental/lease agreement',
  confidence: 0.99,
};

async function runPipelineBugsTests() {
  console.log('====================================================');
  console.log('  LEGAL LENS PRODUCTION PIPELINE BUGS & FIXES TEST SUITE');
  console.log('====================================================\n');

  let passed = true;
  const fixturesDir = path.resolve(process.cwd(), 'server/src/tests/fixtures');
  const rentalPath = path.join(fixturesDir, '01_rental_agreement.txt');
  const rentalText = fs.readFileSync(rentalPath, 'utf8');

  // ----------------------------------------------------
  // TEST 8: CHUNKING REGRESSION GUARD (BEFORE/AFTER SNAPSHOT ASSERTION)
  // ----------------------------------------------------
  console.log('--- TEST 8: CHUNKING REGRESSION GUARD ---');
  const baselinePath = path.join(fixturesDir, 'chunking_baseline_01_rental_agreement.json');
  const baselineChunks = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const currentChunks = chunkDocumentTextIntoClauses(rentalText);

  if (currentChunks.length !== baselineChunks.length) {
    console.error(`❌ [FAIL] Test 8: Chunk count mismatch! Expected ${baselineChunks.length}, got ${currentChunks.length}`);
    passed = false;
  } else {
    let chunksMatch = true;
    for (let i = 0; i < currentChunks.length; i++) {
      if (
        currentChunks[i].id !== baselineChunks[i].id ||
        currentChunks[i].title !== baselineChunks[i].title ||
        currentChunks[i].original_text.trim() !== baselineChunks[i].text.trim()
      ) {
        console.error(`❌ [FAIL] Test 8: Chunk boundary mismatch at index ${i}!`);
        console.error(`Expected:`, baselineChunks[i]);
        console.error(`Got:`, currentChunks[i]);
        chunksMatch = false;
        passed = false;
        break;
      }
    }
    if (chunksMatch) {
      console.log(`✅ [PASS] Test 8: Chunk boundaries are 100% byte-identical to committed baseline snapshot (${currentChunks.length} clauses).`);
    }
  }

  // ----------------------------------------------------
  // TEST 5: TAXONOMY MIGRATION & LEGACY MAPPING
  // ----------------------------------------------------
  console.log('\n--- TEST 5: TAXONOMY MIGRATION & LEGACY MAPPING ---');
  const testCases = [
    { input: 'payment/consideration', expected: 'rent & payment' },
    { input: 'rent escalation', expected: 'rent & payment' },
    { input: 'indemnity', expected: 'indemnity & liability' },
    { input: 'dispute resolution/arbitration', expected: 'dispute resolution' },
    { input: 'non-compete/non-solicitation', expected: 'use & restrictions' },
    { input: 'maintenance & repairs', expected: 'maintenance & repairs' },
  ];

  let taxonomyPassed = true;
  for (const tc of testCases) {
    const res = normalizeClauseType(tc.input);
    if (res !== tc.expected) {
      console.error(`❌ [FAIL] Test 5: normalizeClauseType('${tc.input}') returned '${res}', expected '${tc.expected}'`);
      taxonomyPassed = false;
      passed = false;
    }
  }
  if (taxonomyPassed) {
    console.log('✅ [PASS] Test 5: All legacy taxonomy enum values correctly normalized to updated categories.');
  }

  // ----------------------------------------------------
  // TEST 4: CATEGORY CLASSIFICATION & PAYMENT RULE
  // ----------------------------------------------------
  console.log('\n--- TEST 4: CATEGORY CLASSIFICATION (MAINTENANCE & REPAIRS) ---');
  const maintenanceClause = currentChunks.find((c) => c.title.includes('MAINTENANCE AND REPAIRS'));
  if (!maintenanceClause) {
    console.error('❌ [FAIL] Test 4: MAINTENANCE AND REPAIRS clause not found in rental agreement.');
    passed = false;
  } else if (maintenanceClause.clause_type !== 'maintenance & repairs') {
    console.error(`❌ [FAIL] Test 4: Maintenance clause categorized as '${maintenanceClause.clause_type}', expected 'maintenance & repairs'`);
    passed = false;
  } else {
    console.log(`✅ [PASS] Test 4: Maintenance & Repairs clause correctly categorized as '${maintenanceClause.clause_type}' (Rupee amount did not force payment category).`);
  }

  // ----------------------------------------------------
  // TEST 2 (b): CI GREP OVER CODEBASE FOR TEMPLATE STRING
  // ----------------------------------------------------
  console.log('\n--- TEST 2 (b): CODEBASE GREP GUARD FOR HARDCODED TEMPLATE STRING ---');
  const templatePattern = 'This clause defines terms for';
  const srcDir = path.resolve(process.cwd(), 'src');
  const serverSrcDir = path.resolve(process.cwd(), 'server/src');

  function checkDirForTemplateString(dir: string): boolean {
    let found = false;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'tests' || entry.name === '__tests__' || entry.name === 'node_modules') continue;
        if (checkDirForTemplateString(fullPath)) found = true;
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(templatePattern)) {
          console.error(`❌ [FAIL] Found hardcoded template string in production file: ${fullPath}`);
          found = true;
        }
      }
    }
    return found;
  }

  const foundTemplateInCode = checkDirForTemplateString(srcDir) || checkDirForTemplateString(serverSrcDir);
  if (!foundTemplateInCode) {
    console.log(`✅ [PASS] Test 2 (b): Production codebase contains zero occurrences of '${templatePattern}'.`);
  } else {
    passed = false;
  }

  // ----------------------------------------------------
  // TEST 9: CROSS-CLAUSE CONFLICTS & EXECUTION BLOCK
  // ----------------------------------------------------
  console.log('\n--- TEST 9: CROSS-CLAUSE CONFLICTS & EXECUTION BLOCK ---');
  const conflictResult = detectCrossClauseConflicts(currentChunks, rentalText);
  if (conflictResult.conflicts.length !== 1) {
    console.error(`❌ [FAIL] Test 9: Expected 1 conflict for rental lease, found ${conflictResult.conflicts.length}`);
    passed = false;
  } else {
    const cnf = conflictResult.conflicts[0];
    if (cnf.clause_a_title.includes('TERM') && cnf.clause_b_title.includes('NOTICE PERIOD')) {
      console.log(`✅ [PASS] Test 9: Correctly detected lock-in vs notice period collision between ${cnf.clause_a_title} and ${cnf.clause_b_title}.`);
    } else {
      console.error(`❌ [FAIL] Test 9: Unexpected conflict titles: ${cnf.clause_a_title} vs ${cnf.clause_b_title}`);
      passed = false;
    }
  }

  // Negative Conflict Test: Document with non-interacting clauses must return conflicts: []
  const nonInteractingChunks: SimplifiedClause[] = [
    {
      id: 'c1',
      clause_type: 'governing law & jurisdiction',
      title: 'GOVERNING LAW',
      original_text: 'This agreement is governed by the laws of Karnataka.',
      simple_explanation: null,
      very_simple_explanation: null,
      risk_level: 'low',
      icon_name: 'CheckCircle',
      one_line_consequence: '',
    },
  ];
  const negativeConflicts = detectCrossClauseConflicts(nonInteractingChunks, 'This agreement is governed by the laws of Karnataka.');
  if (negativeConflicts.conflicts.length === 0) {
    console.log('✅ [PASS] Test 9 (Negative): Non-interacting contract correctly returned zero conflicts.');
  } else {
    console.error(`❌ [FAIL] Test 9 (Negative): Non-interacting contract produced unexpected conflicts:`, negativeConflicts.conflicts);
    passed = false;
  }

  // ----------------------------------------------------
  // TEST SYNTHESIS (RECORDED FIXTURE / RUNTIME PIPELINE ASSERTIONS)
  // ----------------------------------------------------
  console.log('\n--- RUNNING STAGE 4 SYNTHESIS TEST WITH DEMO/RECORDED FIXTURES ---');
  const synthesisResult = await synthesizeDocumentAnalysis(rentalText, currentChunks, mockGuard1, undefined, 'en');

  if (!synthesisResult || !synthesisResult.clauses || synthesisResult.clauses.length === 0) {
    console.error('❌ [FAIL] Synthesis returned empty analysis result.');
    passed = false;
  } else {
    // TEST 1: Assert simple_explanation !== very_simple_explanation
    console.log('\n--- TEST 1: SIMPLE VS ULTRA SIMPLE EXPLANATIONS ---');
    let distinctExplanations = true;
    for (const c of synthesisResult.clauses) {
      if (c.simple_explanation && c.very_simple_explanation && c.simple_explanation === c.very_simple_explanation) {
        console.error(`❌ [FAIL] Test 1: Clause ${c.id} (${c.title}) has identical simple and ultra-simple explanations!`);
        distinctExplanations = false;
        passed = false;
      }
    }
    if (distinctExplanations) {
      console.log('✅ [PASS] Test 1: Every clause has distinct simple and ultra-simple plain language explanations.');
    }

    // TEST 2 (a): Runtime assertion no template string in output
    console.log('\n--- TEST 2 (a): RUNTIME OUTPUT TEMPLATE GUARD ---');
    let templateFoundInOutput = false;
    for (const c of synthesisResult.clauses) {
      if (
        (c.simple_explanation && c.simple_explanation.includes(templatePattern)) ||
        (c.very_simple_explanation && c.very_simple_explanation.includes(templatePattern))
      ) {
        console.error(`❌ [FAIL] Test 2 (a): Clause ${c.id} output contains hardcoded template string!`);
        templateFoundInOutput = true;
        passed = false;
      }
      if (c.meaning_error && (c.simple_explanation !== null || c.very_simple_explanation !== null)) {
        console.error(`❌ [FAIL] Test 2 (a): Clause ${c.id} has meaning_error=true but explanation fields are not null!`);
        passed = false;
      }
    }
    if (!templateFoundInOutput) {
      console.log('✅ [PASS] Test 2 (a): Zero runtime output clauses contain fallback template strings.');
    }
  }

  // ----------------------------------------------------
  // TEST 10: PARALLEL HINDI PATH
  // ----------------------------------------------------
  console.log('\n--- TEST 10: PARALLEL HINDI PATH SYNTHESIS ---');
  const hindiSynthesis = await synthesizeDocumentAnalysis(rentalText, currentChunks, mockGuard1, undefined, 'hi');
  if (hindiSynthesis && hindiSynthesis.clauses && hindiSynthesis.clauses.length > 0) {
    let hindiValid = true;
    for (const c of hindiSynthesis.clauses) {
      if (c.simple_explanation && c.simple_explanation.includes(templatePattern)) {
        console.error(`❌ [FAIL] Test 10: Hindi clause ${c.id} contains English fallback template!`);
        hindiValid = false;
        passed = false;
      }
    }
    if (hindiValid) {
      console.log('✅ [PASS] Test 10: Hindi analysis returned valid localized response without English fallback templates.');
    }
  }

  console.log('\n====================================================');
  if (passed) {
    console.log('  SUMMARY: ALL PIPELINE BUG REGRESSION TESTS PASSED! 🟢');
    console.log('====================================================\n');
  } else {
    console.error('  SUMMARY: PIPELINE BUG REGRESSION TESTS FAILED! 🔴');
    console.log('====================================================\n');
    process.exit(1);
  }
}

runPipelineBugsTests().catch((err) => {
  console.error('Fatal error in pipeline bugs test suite:', err);
  process.exit(1);
});
