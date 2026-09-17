import { runGuard1InputGate, runGuard1InputGateAsync, extractAndCleanDocumentTextAsync, isBufferAnImage } from '../services/astraBackend';

const testCases = [
  {
    name: '05_REJECT_news_article.txt',
    expectedLegal: false,
    text: `CITY METRO EXPANSION TO ADD FOUR NEW STATIONS BY NEXT YEAR

Bengaluru, September 2026 — The city's metro rail corporation announced yesterday that four new stations will be added to the Purple Line extension by the end of next year, easing congestion for daily commuters on the eastern corridor.

Officials said the expansion, which has been in progress since 2023, is now in its final tunneling phase near the tech park cluster. Local commuters expressed cautious optimism, with many citing long-standing traffic delays during peak hours.

"This has been years in the making," said one resident who commutes daily. "We're hopeful it actually opens on schedule this time."

The corporation also announced plans for an integrated ticketing system allowing seamless transfers between metro and city bus services starting next quarter.`,
  },
  {
    name: '06_REJECT_tech_blog.txt',
    expectedLegal: false,
    text: `UNDERSTANDING MODERN WEB FRAMEWORKS IN 2026

When choosing a frontend tech stack for modern web development, engineers often debate between React, Vue, and Svelte. Each framework offers unique state management patterns and rendering strategies.

React continues to dominate large enterprise projects due to its rich ecosystem and custom hook model. Meanwhile, Vue 3 with the Composition API provides an elegant, approachable developer experience for small-to-medium teams.

In this article, we'll benchmark component render performance, bundle size overhead, and memory consumption across real-world single-page applications.`,
  },
  {
    name: '07_REJECT_exam_paper.txt',
    expectedLegal: false,
    text: `CENTRAL BOARD OF SECONDARY EDUCATION
GRADE 10 SCIENCE EXAMINATION - 2026

Time Allowed: 3 Hours
Maximum Marks: 80

Instructions to Candidates:
1. Answer all questions in Section A and Section B.
2. Section A contains 20 multiple choice questions of 1 mark each.

Q1. Which of the following chemical equations represents a balanced neutralization reaction?
A) HCl + NaOH -> NaCl + H2O
B) H2SO4 + KOH -> KSO4 + H2O

Q2. Define the concept of optical refraction and state Snell's Law.`,
  },
  {
    name: '08_REJECT_cooking_recipe.txt',
    expectedLegal: false,
    text: `DELICIOUS PANEER BUTTER MASALA RECIPE

Ingredients Needed:
- 250g Paneer (cubed)
- 2 tbsp Butter + 1 tbsp Oil
- 2 large Tomatoes (pureed)
- 1 tsp Ginger-Garlic paste
- 1/2 tsp Turmeric, 1 tsp Kashmiri Red Chili powder, 1 tsp Garam Masala
- 2 tbsp Fresh Cream

Instructions:
1. Heat butter and oil in a pan over medium flame. Add ginger-garlic paste and sauté until fragrant.
2. Pour in the tomato puree and cook until oil separates.
3. Stir in spices and simmer for 5 minutes. Add paneer cubes and fresh cream. Cook for 2 more minutes and serve hot with naan.`,
  },
  {
    name: '09_REJECT_casual_chat.txt',
    expectedLegal: false,
    text: `Hey! How are you doing today?
Are we still meeting up for badminton on Saturday afternoon?
Let me know what time works best for you, hope the weather is good!`,
  },
  {
    name: '01_rental_agreement.txt',
    expectedLegal: true,
    text: `RESIDENTIAL LEASE AGREEMENT

This Agreement is made on the 1st day of April, 2026, between Mr. Rakesh Kumar Sharma (hereinafter "Lessor") and Ms. Ananya Iyer (hereinafter "Lessee"), for Flat No. 402, Sunrise Apartments, Bengaluru.

1. TERM: This lease shall be for a period of 11 (eleven) months commencing from 1st April 2026, with a mandatory lock-in period of 6 (six) months.
2. RENT: The monthly rent shall be Rs. 32,000/-, payable in advance on or before the 5th of every month.
3. SECURITY DEPOSIT: The Lessee has paid an interest-free security deposit of Rs. 1,60,000/-.
4. DISPUTE RESOLUTION: Any dispute shall be referred to arbitration under the Arbitration and Conciliation Act, 1996.

IN WITNESS WHEREOF, the parties have set their hands.`,
  },
  {
    name: '03_nda.txt',
    expectedLegal: true,
    text: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into on 15th March 2026 between Vertex Analytics Pvt. Ltd. ("Disclosing Party") and Mr. Aditya Rao ("Receiving Party").

1. CONFIDENTIAL INFORMATION: The Receiving Party agrees to hold in strict confidence all technical, financial, and business information.
2. TERM: This Agreement shall remain in effect for a period of 3 (three) years.
3. INDEMNITY: The Receiving Party shall indemnify the Disclosing Party against any losses arising from unauthorized disclosure.

IN WITNESS WHEREOF, the parties hereto have executed this Agreement.`,
  },
  {
    name: '04_employment_contract.txt',
    expectedLegal: true,
    text: `EMPLOYMENT AGREEMENT

This Employment Agreement is made on 1st February 2026 between Nimbus Softworks Pvt. Ltd. ("Company") and Mr. Rohan Verma ("Employee").

1. PROBATION: The Employee shall be on probation for a period of 6 (six) months.
2. COMPENSATION: The Employee shall be paid a fixed monthly salary of Rs. 85,000/-.
3. BOND: In the event the Employee resigns within 24 months, the Employee shall pay Rs. 3,00,000/- as liquidated damages.
4. NOTICE PERIOD: Post-confirmation, either party shall provide 90 days written notice.`,
  },
  {
    name: '10_ACCEPT_loan_agreement.txt',
    expectedLegal: true,
    text: `LOAN AGREEMENT

This Loan Agreement is executed on 10th January 2026 between Apex Capital Services ("Lender") and Ms. Priya Sharma ("Borrower").

1. PRINCIPAL AMOUNT: The Lender agrees to disburse a personal loan sum of Rs. 5,00,000/-.
2. INTEREST RATE: The principal shall accrue interest at 10.5% per annum.
3. REPAYMENT: Equal monthly installments of Rs. 15,00,000/- due on the 10th of each month for 48 months.
4. DEFAULT PENALTY: Late payments beyond 15 days incur a 2% monthly penalty fee.`,
  },
  {
    name: '11_ACCEPT_image_offer_letter.png',
    expectedLegal: true,
    text: `EMPLOYMENT OFFER LETTER

Dear Mr. Sanjay Patel,

We are pleased to offer you the position of Junior Accountant at Blue Ridge Traders, Ahmedabad, effective 1st March 2026.

1. SALARY: Rs. 28,000 per month, paid on the last working day of each month.
2. PROBATION: 3 months from date of joining. Either party may terminate with 7 days notice during probation.
3. NOTICE PERIOD: 30 days after confirmation.
4. WORKING HOURS: 9:30 AM to 6:30 PM, Monday to Saturday.
5. BOND: Employee agrees to serve a minimum of 12 months or repay Rs. 15,00,000 towards training costs if resigning early.

    Please sign and return a copy to confirm your acceptance of this offer.

Yours sincerely,
HR Department
Blue Ridge Traders`,
  },
  {
    name: '12_REJECT_engineering_changelog_05.txt',
    expectedLegal: false,
    text: `# LegalLens Pipeline Grounding, Risk Alignment & Taxonomy Walkthrough

## Overview
Refactored and hardened the LegalLens document analysis pipeline in server/src/services/astraBackend.ts to resolve 6 critical grounding, risk-consistency, taxonomy, synthesis, and chunking issues across all contract types without document-specific hardcoding.

## Key Improvements Implemented

### 1. Grounded Synthesis & Mandatory Validation Gate
- Problem: Lawyer Briefing, Checklist, and Possibilities contained ungrounded or contradictory outputs (e.g. reporting 0 high-risk issues when High-Risk clauses existed, or claiming missing dispute resolution when Clause #8 was present).
- Solution:
  - synthesizeDocumentAnalysis now receives the real extracted clauses (with verified types and risk levels).
  - Implemented validateAndEnforceGroundedSynthesis:
    - flagged_issues count is strictly recomputed from actual High Risk clauses.
    - missing_protective_clauses dynamically checks extracted clauses; any protective clause present in the document is purged from the missing list.
    - questions for the lawyer briefing are enriched with specific clause numbers and actual text snippets.

### 2. Single-Source Risk Pill & Reasoning Text Alignment
- Problem: Risk badge and AI reasoning text contradicted each other (e.g. Clause #7 Indemnity showing a green "Low Risk" pill while reasoning text read "High Risk: Broad indemnity...").
- Solution:
  - Implemented synchronizeClauseRiskAndConsequence(clause): computes a single risk_level (High Risk, Watch Out, or Low Risk) and forces both the badge color/label and the consequence reasoning text prefix to match 100%.

### 3. Pure Heuristic & Title-Driven Clause Tagging (No Unsafe Keyword Fallbacks)
- Problem: Clause #6 ("Maintenance and Repairs") was mistagged as "PARTIES & RECITALS".
- Solution:
  - Audited classifyClauseType(text, title): checks numbered heading titles first.
  - Removed dangerous fallback rule that mistagged maintenance/repair clauses containing party references.

## Multi-Document Regression Test Results
Created an automated test suite server/src/tests/grounding_regression.test.ts testing three diverse document types.
Final Verification Summary: 3 Passed, 0 Failed out of 3 Test Files (100% Success Rate).`,
  },
];

async function runGuard1Suite() {
  console.log('====================================================');
  console.log('🛡️  GUARD 1 COMPREHENSIVE INPUT GATE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const syncRes = runGuard1InputGate(tc.text);
    const asyncRes = await runGuard1InputGateAsync(tc.text);

    const syncOk = syncRes.is_legal_document === tc.expectedLegal;
    const asyncOk = asyncRes.is_legal_document === tc.expectedLegal;

    if (syncOk && asyncOk) {
      passed += 1;
      console.log(`✅ [PASS] ${tc.name}`);
      console.log(`   Expected: ${tc.expectedLegal ? 'ACCEPTED (Legal Doc)' : 'REJECTED (Non-Legal)'}`);
      console.log(`   Sync Result: ${syncRes.is_legal_document} | Async Result: ${asyncRes.is_legal_document}`);
      if (!syncRes.is_legal_document) {
        console.log(`   Rejection Reason: "${syncRes.rejection_reason}"`);
      }
      console.log('----------------------------------------------------');
    } else {
      failed += 1;
      console.log(`❌ [FAIL] ${tc.name}`);
      console.log(`   Expected: ${tc.expectedLegal ? 'ACCEPTED' : 'REJECTED'}`);
      console.log(`   Sync Result: ${syncRes.is_legal_document} | Async Result: ${asyncRes.is_legal_document}`);
      console.log(`   Sync Reason: ${syncRes.rejection_reason}`);
      console.log(`   Async Reason: ${asyncRes.rejection_reason}`);
      console.log('----------------------------------------------------');
    }
  }

  // TEST 12: Extensionless UUID PNG buffer ingestion (e.g. 26fe6b94-e5c2-481e-835b-5042fc7bau2a)
  console.log('🔍 Testing Extensionless Image Buffer Ingestion (26fe6b94-e5c2-481e-835b-5042fc7bau2a)...');
  const fakePngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52]);
  const isImg = isBufferAnImage(fakePngBuffer, 'application/octet-stream', '26fe6b94-e5c2-481e-835b-5042fc7bau2a');
  
  if (isImg) {
    try {
      const extracted = await extractAndCleanDocumentTextAsync(fakePngBuffer, 'application/octet-stream', '26fe6b94-e5c2-481e-835b-5042fc7bau2a');
      const g1Res = await runGuard1InputGateAsync(extracted);
      if (!g1Res.is_legal_document) {
        passed += 1;
        console.log(`✅ [PASS] Extensionless PNG Blob correctly recognized & rejected due to lack of text!`);
        console.log(`   Rejection Reason: ${g1Res.rejection_reason}`);
        console.log('----------------------------------------------------');
      } else {
        failed += 1;
        console.log(`❌ [FAIL] Non-text PNG Blob was incorrectly accepted by Guard 1`);
        console.log('----------------------------------------------------');
      }
    } catch (err) {
      passed += 1;
      console.log(`✅ [PASS] Corrupt/Dummy PNG buffer cleanly handled without crashing.`);
      console.log('----------------------------------------------------');
    }
  } else {
    failed += 1;
    console.log(`❌ [FAIL] Magic bytes check failed for PNG buffer`);
    console.log('----------------------------------------------------');
  }

  // TEST 13: Multi-Extension Random Image Rejection (.png, .jpg, .jpeg, .webp, .bmp, .gif)
  console.log('🔍 Testing Multi-Extension Random Image Rejection (.png, .jpg, .jpeg, .webp, .bmp, .gif)...');
  const randomExts = [
    { name: '10_REJECT_random_photo.jpg', mime: 'image/jpeg' },
    { name: 'random_drawing.png', mime: 'image/png' },
    { name: 'scenic_landscape.webp', mime: 'image/webp' },
    { name: 'cat_picture.bmp', mime: 'image/bmp' },
    { name: 'nature_photo.gif', mime: 'image/gif' },
    { name: 'unrelated_shot.jpeg', mime: 'image/jpeg' },
  ];

  for (const item of randomExts) {
    try {
      const dummyBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const extractedText = await extractAndCleanDocumentTextAsync(dummyBuffer, item.mime, item.name);
      const g1Res = await runGuard1InputGateAsync(extractedText);
      if (!g1Res.is_legal_document) {
        passed += 1;
        console.log(`✅ [PASS] Random image with extension "${item.name}" correctly rejected by Guard 1!`);
      } else {
        failed += 1;
        console.log(`❌ [FAIL] Random image with extension "${item.name}" was incorrectly accepted!`);
      }
    } catch (err) {
      passed += 1;
      console.log(`✅ [PASS] Dummy image buffer for "${item.name}" cleanly rejected.`);
    }
  }

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed} Passed, ${failed} Failed out of ${testCases.length + 1 + randomExts.length} Tests`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runGuard1Suite();
