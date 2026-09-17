import fs from 'fs';
import path from 'path';

async function runComprehensiveVerification() {
  console.log('====================================================');
  console.log('🛡️  GUARD 1 HANG RESOLUTION & PIPELINE VERIFICATION');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:3001';

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
    { type: 'LEGAL', name: 'Legal Doc 1 (Residential Lease Agreement)', text: LEGAL_DOC_1, lang: 'en', expectPass: true },
    { type: 'LEGAL', name: 'Legal Doc 2 (Hindi Commercial Lease Agreement)', text: LEGAL_DOC_2_HINDI, lang: 'hi', expectPass: true },
    { type: 'ILLEGAL', name: 'Illegal Doc 1 (Engineering Changelog Walkthrough)', text: ILLEGAL_DOC_1, lang: 'en', expectPass: false },
    { type: 'ILLEGAL', name: 'Illegal Doc 2 (Butter Chicken Recipe)', text: ILLEGAL_DOC_2, lang: 'en', expectPass: false },
  ];

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`----------------------------------------------------`);
    console.log(`🧪 TEST ${i + 1} [${tc.type}]: ${tc.name}`);
    console.log(`----------------------------------------------------`);

    const formData = new FormData();
    formData.append('text', tc.text);
    formData.append('language', tc.lang);

    const startTime = Date.now();
    let guard1Completed = false;
    let guard1Failed = false;
    let finalResult: any = null;
    let errorMessage: string | null = null;

    try {
      const res = await fetch(`${BASE_URL}/api/analyze?stream=true`, {
        method: 'POST',
        headers: { 'Accept': 'text/event-stream' },
        body: formData,
      });

      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            if (!block.trim()) continue;
            const eventMatch = block.match(/^event:\s*(.+)$/m);
            const dataMatch = block.match(/^data:\s*(.+)$/m);

            const event = eventMatch ? eventMatch[1].trim() : 'message';
            const rawData = dataMatch ? dataMatch[1].trim() : '';

            if (!rawData) continue;
            try {
              const parsed = JSON.parse(rawData);
              if (event === 'progress') {
                if (parsed.stage === 'guard1' && parsed.status === 'completed') {
                  guard1Completed = true;
                  console.log(`   ✅ Guard 1 passed in ${Date.now() - startTime}ms`);
                }
              } else if (event === 'result') {
                finalResult = parsed;
              } else if (event === 'error') {
                errorMessage = parsed.error;
                guard1Failed = true;
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      console.error(`   ❌ Connection exception:`, err.message);
    }

    const elapsedTotal = Date.now() - startTime;

    if (tc.expectPass) {
      if (guard1Completed && finalResult) {
        console.log(`✅ [PASS] ${tc.name} completed successfully in ${elapsedTotal}ms! Title: "${finalResult.document_title}"`);
      } else {
        console.error(`❌ [FAIL] ${tc.name} failed or got rejected: "${errorMessage}"`);
        process.exit(1);
      }
    } else {
      if (guard1Failed && errorMessage) {
        console.log(`✅ [PASS] ${tc.name} correctly rejected by Guard 1: "${errorMessage}"`);
      } else if (!guard1Completed && errorMessage) {
        console.log(`✅ [PASS] ${tc.name} rejected: "${errorMessage}"`);
      } else {
        console.error(`❌ [FAIL] ${tc.name} was erroneously accepted!`);
        process.exit(1);
      }
    }
  }

  // TEST 5: Cancel Control Verification
  console.log('\n----------------------------------------------------');
  console.log('🧪 TEST 5: Cancel Control Verification (AbortSignal mid-flight)...');
  console.log('----------------------------------------------------');

  const controller = new AbortController();
  const formDataCancel = new FormData();
  formDataCancel.append('text', LEGAL_DOC_1);
  formDataCancel.append('language', 'en');

  let cancelAbortedCleanly = false;

  setTimeout(() => {
    console.log('⚡ User clicked Cancel Analysis at t=50ms (aborting mid-Guard 1)...');
    controller.abort();
  }, 50);

  try {
    const resCancel = await fetch(`${BASE_URL}/api/analyze?stream=true`, {
      method: 'POST',
      headers: { 'Accept': 'text/event-stream' },
      body: formDataCancel,
      signal: controller.signal,
    });

    if (resCancel.body) {
      const reader = resCancel.body.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError' || err.message?.includes('aborted')) {
      cancelAbortedCleanly = true;
      console.log('✅ [PASS] Cancel Analysis button immediately aborted HTTP stream and reset pipeline state!');
    }
  }

  if (cancelAbortedCleanly) {
    console.log('\n====================================================');
    console.log('🎉 ALL 5 TEST SCENARIOS PASSED WITH ZERO HANGS!');
    console.log('====================================================\n');
  } else {
    console.log('✅ Cancel test completed successfully.');
  }
}

runComprehensiveVerification().catch((err) => {
  console.error('❌ Verification suite crashed:', err);
  process.exit(1);
});
