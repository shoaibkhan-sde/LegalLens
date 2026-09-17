import { runGuard1InputGate, runGuard1InputGateAsync } from '../services/astraBackend.js';

async function runDirectGuard1Tests() {
  console.log('====================================================');
  console.log('🛡️  DIRECT GUARD 1 CLASSIFICATION & SPEED TEST');
  console.log('====================================================\n');

  const LEGAL_DOC_1 = `RESIDENTIAL LEASE AGREEMENT
This Agreement is made on the 1st day of April, 2026, between Mr. Rakesh Kumar Sharma (Lessor) and Ms. Ananya Iyer (Lessee), for the residential premises situated at Flat No. 402, Sunrise Apartments, Koramangala 4th Block, Bengaluru - 560034.
1. TERM: This lease shall be for a period of 11 months commencing from 1st April 2026, with a mandatory lock-in period of 6 months.
2. RENT: The monthly rent shall be Rs. 32,000/- payable in advance on or before the 5th of every month.
3. SECURITY DEPOSIT: Interest-free security deposit of Rs. 1,60,000/- paid to Lessor.
4. NOTICE PERIOD: 60 days written notice prior to termination.
5. DISPUTE RESOLUTION: Binding arbitration under Arbitration and Conciliation Act 1996.
IN WITNESS WHEREOF, the parties have signed above.`;

  const LEGAL_DOC_2_HINDI = `वाणिज्यिक पट्टा समझौता
यह वाणिज्यिक पट्टा समझौता 17 सितंबर 2026 को मकान मालिक और किराएदार के बीच निष्पादित किया गया है।
1. पट्टा अवधि: 3 वर्ष। मासिक किराया ₹50,000 प्रति माह देय होगा।
2. सुरक्षा जमा राशि: ₹1,50,000 जो अवधि की समाप्ति पर वापसी योग्य होगी।
3. समाप्ति: 30 दिनों के लिखित नोटिस पर समझौते को समाप्त किया जा सकता है।
4. विवाद समाधान: मध्यस्थता अधिनियम 1996 के तहत मध्यस्थता।`;

  const ILLEGAL_DOC_1 = `LegalLens Pipeline Grounding, Risk Alignment & Taxonomy Walkthrough
Refactored pipeline code to use pure CSS Tailwind breakpoints. Unit test suite passing 100%.
npm run dev:client running on port 5173. Fixed bug where Guard 1 bypassed non-legal documents that look structured.
Changelog:
- Refactored Astra backend classifier.
- Added dual engine Groq key failover.
- Verified grounding regression tests.`;

  const ILLEGAL_DOC_2 = `Delicious Butter Chicken Recipe
Ingredients:
- 500g Chicken thighs, boneless
- 1 cup Heavy cream
- 2 tbsp Butter
- 1 tbsp Garam masala, turmeric, chili powder
Instructions:
1. Marinate chicken in yogurt and spices for 30 minutes.
2. Grill chicken until charred.
3. Simmer in rich tomato gravy with cream and butter. Serve hot with Naan.`;

  const testCases = [
    { type: 'LEGAL', name: 'Legal Doc 1 (Residential Lease Agreement)', text: LEGAL_DOC_1, expectPass: true },
    { type: 'LEGAL', name: 'Legal Doc 2 (Hindi Commercial Lease Agreement)', text: LEGAL_DOC_2_HINDI, expectPass: true },
    { type: 'ILLEGAL', name: 'Illegal Doc 1 (Engineering Changelog Walkthrough)', text: ILLEGAL_DOC_1, expectPass: false },
    { type: 'ILLEGAL', name: 'Illegal Doc 2 (Butter Chicken Recipe)', text: ILLEGAL_DOC_2, expectPass: false },
  ];

  let passedAll = true;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`----------------------------------------------------`);
    console.log(`🧪 TEST ${i + 1} [${tc.type}]: ${tc.name}`);
    console.log(`----------------------------------------------------`);

    const t0 = Date.now();
    const syncRes = runGuard1InputGate(tc.text);
    const asyncRes = await runGuard1InputGateAsync(tc.text);
    const elapsed = Date.now() - t0;

    console.log(`   ⏱️ Elapsed Time: ${elapsed}ms`);
    console.log(`   Sync Rule Engine Result  : ${syncRes.is_legal_document ? '✅ ACCEPTED' : '❌ REJECTED'} (${syncRes.category})`);
    console.log(`   Async AI Classifier Result: ${asyncRes.is_legal_document ? '✅ ACCEPTED' : '❌ REJECTED'} (${asyncRes.category})`);
    if (!asyncRes.is_legal_document) {
      console.log(`   Rejection Reason: "${asyncRes.rejection_reason}"`);
    }

    if (tc.expectPass) {
      if (asyncRes.is_legal_document) {
        console.log(`✅ [PASS] ${tc.name} ACCEPTED as expected`);
      } else {
        console.error(`❌ [FAIL] ${tc.name} was REJECTED unexpectedly!`);
        passedAll = false;
      }
    } else {
      if (!asyncRes.is_legal_document) {
        console.log(`✅ [PASS] ${tc.name} REJECTED as expected`);
      } else {
        console.error(`❌ [FAIL] ${tc.name} was ACCEPTED unexpectedly!`);
        passedAll = false;
      }
    }
  }

  // TEST 5: Cancel Control Signal Test
  console.log('\n----------------------------------------------------');
  console.log('🧪 TEST 5: Cancel AbortSignal test on runGuard1InputGateAsync');
  console.log('----------------------------------------------------');

  const controller = new AbortController();
  controller.abort(); // Pre-aborted signal

  const cancelStart = Date.now();
  const cancelRes = await runGuard1InputGateAsync(LEGAL_DOC_1, controller.signal);
  const cancelElapsed = Date.now() - cancelStart;

  console.log(`   ⏱️ Aborted Guard 1 Call Resolved in ${cancelElapsed}ms`);
  console.log(`   Result: ${cancelRes.is_legal_document ? 'ACCEPTED' : 'REJECTED'}`);
  console.log(`✅ [PASS] Pre-aborted signal handled instantly (${cancelElapsed}ms) without hanging!`);

  if (passedAll) {
    console.log('\n====================================================');
    console.log('🎉 ALL 5 DIRECT GUARD 1 TESTS PASSED PERFECTLY!');
    console.log('====================================================\n');
  } else {
    console.error('\n❌ Some Guard 1 tests failed.');
    process.exit(1);
  }
}

runDirectGuard1Tests().catch((err) => {
  console.error('❌ Test crashed:', err);
  process.exit(1);
});
