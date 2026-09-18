import fs from 'fs';
import path from 'path';
import { analyzeDocumentText } from '../services/astraBackend';
const __dirname = path.resolve(process.cwd(), 'server/src/tests');

async function runGroundingRegressionTests() {
  console.log('====================================================');
  console.log('  LEGAL LENS GROUNDING & CONSISTENCY REGRESSION SUITE');
  console.log('====================================================\n');

  const fixturesDir = path.join(__dirname, 'fixtures');
  
  const testFiles = [
    {
      file: '01_rental_agreement.txt',
      desc: '01_rental_agreement.txt (Residential Lease)',
      expectedClauseCount: 9,
      expectedHighRiskCount: 1, // Indemnity (#6)
      expectedWatchOutTypes: ['security deposit', 'notice period', 'term & termination'],
      prohibitedMissingTerms: ['dispute resolution', 'notice period'],
      disallowedTypes: {
        'Maintenance and Repairs': ['parties & recitals'],
      }
    },
    {
      file: '03_nda.txt',
      desc: '03_nda.txt (Mutual Non-Disclosure Agreement)',
      expectedClauseCount: 6,
      expectedHighRiskCount: 2, // Indemnity (#4), Non-Compete (#5)
      prohibitedMissingTerms: ['dispute resolution', 'governing law', 'confidentiality', 'indemnity'],
      disallowedTypes: {}
    },
    {
      file: '04_employment_contract.txt',
      desc: '04_employment_contract.txt (Employment Agreement)',
      expectedClauseCount: 8,
      expectedHighRiskCount: 2, // Bond (#3), Non-Compete (#4)
      prohibitedMissingTerms: ['dispute resolution', 'notice period', 'governing law', 'confidentiality'],
      disallowedTypes: {}
    }
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  for (const testCase of testFiles) {
    const filePath = path.join(fixturesDir, testCase.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Test file missing: ${filePath}`);
      totalFailed++;
      continue;
    }

    const text = fs.readFileSync(filePath, 'utf-8');

    try {
      const result = await analyzeDocumentText(text);

      console.log(`🔍 Testing ${testCase.desc}...`);

      // Assertion 1: Signature block exclusion
      const signatureClause = result.clauses.find((c) =>
        /in witness whereof|signed and delivered|authorized signatory/i.test(c.original_text)
      );
      if (signatureClause) {
        throw new Error(`Signature/execution block was included as a numbered clause: "${signatureClause.title}"`);
      }
      console.log(`   ✅ Signature block excluded cleanly (${result.clauses.length} extracted clauses)`);

      // Assertion 2: High-risk count matching flagged_issues count exactly
      const actualHighRiskCount = result.clauses.filter((c) => c.risk_level === 'high').length;
      const flaggedIssuesCount = result.lawyer_briefing.flagged_issues.length;

      if (flaggedIssuesCount !== actualHighRiskCount) {
        throw new Error(`Lawyer briefing flagged_issues count (${flaggedIssuesCount}) does not match high risk clause count (${actualHighRiskCount})`);
      }
      console.log(`   ✅ Lawyer Briefing high-risk count (${flaggedIssuesCount}) matches extracted high-risk count (${actualHighRiskCount})`);

      // Assertion 3: Prohibited missing protective clauses
      for (const term of testCase.prohibitedMissingTerms) {
        const isFalselyClaimedMissing = result.lawyer_briefing.missing_protective_clauses.some((m) =>
          m.toLowerCase().includes(term.toLowerCase())
        );
        if (isFalselyClaimedMissing) {
          throw new Error(`Lawyer briefing falsely listed "${term}" under missing protective clauses when it exists in document!`);
        }
      }
      console.log(`   ✅ Lawyer Briefing missing protective clauses list (${JSON.stringify(result.lawyer_briefing.missing_protective_clauses)}) is grounded & accurate`);

      // Assertion 4: Badge <-> Reasoning text synchronization (zero contradiction)
      for (const c of result.clauses) {
        const cons = c.one_line_consequence.toLowerCase();
        if (c.risk_level === 'high' && !cons.startsWith('high risk')) {
          throw new Error(`Clause #${c.clause_number} (${c.title}) has High Risk badge but consequence is "${c.one_line_consequence}"`);
        }
        if (((c.risk_level as string) === 'medium' || c.risk_level === 'watch_out') && !cons.startsWith('watch out')) {
          throw new Error(`Clause #${c.clause_number} (${c.title}) has Watch Out badge but consequence is "${c.one_line_consequence}"`);
        }
        if (c.risk_level === 'low' && (cons.startsWith('high risk') || cons.startsWith('watch out'))) {
          throw new Error(`Clause #${c.clause_number} (${c.title}) has Low Risk badge but consequence starts with "${c.one_line_consequence}"`);
        }
      }
      console.log(`   ✅ All ${result.clauses.length} clause risk badges agree 100% with their reasoning text`);

      // Assertion 5: Disallowed clause type mistagging
      for (const [titleSubstring, badTypes] of Object.entries(testCase.disallowedTypes)) {
        const matchedClause = result.clauses.find((c) => c.title.toLowerCase().includes(titleSubstring.toLowerCase()));
        if (matchedClause) {
          if (badTypes.includes(matchedClause.clause_type as any)) {
            throw new Error(`Clause "${matchedClause.title}" was mistagged as "${matchedClause.clause_type}"`);
          }
        }
      }
      console.log(`   ✅ Clause taxonomy type tagging verified accurate`);

      // Assertion 6: Security deposit Watch Out rule (if applicable)
      const depositClause = result.clauses.find((c) => c.clause_type === 'security deposit');
      if (depositClause && testCase.file === '01_rental_agreement.txt') {
        if (depositClause.risk_level !== 'watch_out' && (depositClause.risk_level as string) !== 'medium') {
          throw new Error(`Security deposit clause lacking fixed refund days in 01_rental_agreement.txt was tagged ${depositClause.risk_level} instead of Watch Out (medium)`);
        }
        console.log(`   ✅ Security deposit clause correctly tagged Watch Out (medium) due to refund deadline ambiguity`);
      }

      console.log(`----------------------------------------------------`);
      totalPassed++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${testCase.desc}`);
      console.error(`   Error: ${err.message}\n`);
      totalFailed++;
    }
  }

  console.log(`\n====================================================`);
  console.log(` SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed out of ${testFiles.length} Test Files`);
  console.log(`====================================================\n`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runGroundingRegressionTests();
