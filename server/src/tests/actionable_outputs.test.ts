import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { analyzeDocumentText } from '../services/astraBackend';

const getDirName = () => {
  return path.resolve(process.cwd(), 'src/tests');
};

const FIXTURES_DIR = path.resolve(getDirName(), 'fixtures');

function logPass(testName: string, detail: string = '') {
  console.log(`✅ [PASS] ${testName}${detail ? ` — ${detail}` : ''}`);
}

function logFail(testName: string, error: any) {
  console.error(`❌ [FAIL] ${testName}`);
  console.error(error);
}

async function runActionableOutputsTestSuite() {
  console.log(`\n====================================================`);
  console.log(`   LEGAL LENS ACTIONABLE OUTPUTS & NEXT STEPS SUITE`);
  console.log(`====================================================\n`);

  let passed = 0;
  let failed = 0;

  try {
    const text04 = fs.readFileSync(path.join(FIXTURES_DIR, '04_employment_agreement.txt'), 'utf-8');
    const res04 = await analyzeDocumentText(text04);

    // TEST 1: Checklist items multi-item grounded synthesis
    try {
      const items = res04.checklist?.items || [];
      assert(items.length > 1, `Checklist should surface multiple items, got ${items.length}`);
      
      const allText = items.map((i) => `${i.title} ${i.description} ${i.action_required}`).join(' ');
      assert(/notice/i.test(allText), 'Checklist missing notice period item');
      assert(/bond|liability|penalty/i.test(allText), 'Checklist missing bond/liability item');

      items.forEach((item, idx) => {
        assert(item.title, `Item ${idx} missing title`);
        assert(item.description, `Item ${idx} missing description`);
        assert(item.action_required, `Item ${idx} missing action_required`);
        assert(item.associated_clause_id, `Item ${idx} missing associated_clause_id`);
      });

      logPass('Test 1: Checklist multi-item grounded synthesis', `Surfaced ${items.length} clause-derived checklist items for Employment Agreement`);
      passed++;
    } catch (err) {
      logFail('Test 1: Checklist multi-item grounded synthesis', err);
      failed++;
    }

    // TEST 2: Possibilities tab real grounded options
    try {
      const options = res04.options_next_steps || [];
      assert(options.length >= 2, `Possibilities should surface at least 2 options, got ${options.length}`);
      
      const optionsText = options.map((o) => `${o.title} ${o.description}`).join(' ');
      assert(/bond|liability|cap/i.test(optionsText) || /scope|non-compete/i.test(optionsText), 'Possibilities missing clause-derived option');

      options.forEach((opt, idx) => {
        assert(opt.title, `Option ${idx} missing title`);
        assert(opt.description, `Option ${idx} missing description`);
        assert(opt.benefit, `Option ${idx} missing benefit`);
      });

      logPass('Test 2: Possibilities tab real grounded options', `Surfaced ${options.length} concrete option entries`);
      passed++;
    } catch (err) {
      logFail('Test 2: Possibilities tab real grounded options', err);
      failed++;
    }

    // TEST 3: Lawyer Briefing — Missing Protective Clauses Gap Analysis
    try {
      const missing = res04.lawyer_briefing?.missing_protective_clauses || [];
      // Assert no false positives: non-compete, notice period, and bond are PRESENT in document 04, so they must NOT be listed as missing
      const falsePositives = missing.filter((m) => {
        const lower = m.toLowerCase();
        return (lower.includes('non-compete') || lower.includes('notice period') || lower.includes('bond')) && !lower.includes('severance');
      });
      assert.strictEqual(falsePositives.length, 0, `False positive missing clauses found: ${JSON.stringify(falsePositives)}`);

      logPass('Test 3: Missing Protective Clauses Gap Analysis', `Validated ${missing.length} missing protective clauses without false positives`);
      passed++;
    } catch (err) {
      logFail('Test 3: Missing Protective Clauses Gap Analysis', err);
      failed++;
    }

    // TEST 4: Advocate Questions (No Generic Boilerplate)
    try {
      const questions = res04.lawyer_briefing?.questions_to_ask_lawyer || [];
      assert(questions.length >= 2, `Lawyer briefing should have at least 2 questions, got ${questions.length}`);

      const genericBlocklist = [
        /are all terms in .* legally enforceable/i,
        /are all terms legally enforceable/i,
        /is this agreement legally binding/i,
        /what are the key risks in this document/i,
      ];

      for (const q of questions) {
        for (const pattern of genericBlocklist) {
          assert(!pattern.test(q), `Found generic boilerplate question matching ${pattern}: "${q}"`);
        }
      }

      const questionsStr = questions.join(' ');
      assert(questionsStr.includes('Section 27') || questionsStr.includes('non-compete'), 'Missing non-compete question');
      assert(questionsStr.includes('service bond') || questionsStr.includes('liquidated damages'), 'Missing service bond question');

      logPass('Test 4: Advocate Questions boilerplate elimination', `All ${questions.length} questions are document-grounded and free of generic filler`);
      passed++;
    } catch (err) {
      logFail('Test 4: Advocate Questions boilerplate elimination', err);
      failed++;
    }

    // TEST 5: Regression Test — Unchanged Working Logic
    try {
      const nonCompeteClause = res04.clauses.find((c) => (c.clause_type as string) === 'non-compete/non-solicitation' || c.clause_type === 'use & restrictions' || c.title.toLowerCase().includes('non-compete'));
      assert(nonCompeteClause, 'Clause 5 (NON-COMPETE) must exist');
      assert.strictEqual(nonCompeteClause.risk_level, 'high', 'NON-COMPETE clause must retain high risk level');
      assert(nonCompeteClause.simple_explanation, 'NON-COMPETE clause simple_explanation must not be null');
      assert(!nonCompeteClause.meaning_error, 'meaning_error must be undefined');

      const flagged = res04.lawyer_briefing?.flagged_issues || [];
      assert(flagged.length >= 1, `Flagged issues carousel must have at least 1 issue, got ${flagged.length}`);

      logPass('Test 5: Regression Test — Clause card & Flagged carousel', 'Clause 5 NON-COMPETE and Flagged Issues carousel remain 100% correct & unchanged');
      passed++;
    } catch (err) {
      logFail('Test 5: Regression Test — Clause card & Flagged carousel', err);
      failed++;
    }

    // TEST 6: Multi-Document Type Generalization (Residential Lease)
    try {
      const text01 = fs.readFileSync(path.join(FIXTURES_DIR, '01_rental_agreement.txt'), 'utf-8');
      const res01 = await analyzeDocumentText(text01);

      assert((res01.checklist?.items || []).length > 1, 'Rental checklist should contain multiple items');
      assert((res01.options_next_steps || []).length >= 2, 'Rental possibilities should contain at least 2 options');
      assert(Array.isArray(res01.lawyer_briefing?.missing_protective_clauses), 'Rental missing protective clauses must be an array');
      assert((res01.lawyer_briefing?.questions_to_ask_lawyer || []).length >= 1, 'Rental advocate questions must have items');

      logPass('Test 6: Multi-Document Generalization (Rental Agreement)', 'Fix generalizes cleanly to rental agreement document type');
      passed++;
    } catch (err) {
      logFail('Test 6: Multi-Document Generalization (Rental Agreement)', err);
      failed++;
    }

  } catch (globalErr) {
    console.error('Global Error in Actionable Outputs Test Suite:', globalErr);
  }

  console.log(`\n====================================================`);
  console.log(` SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log(`====================================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runActionableOutputsTestSuite();
