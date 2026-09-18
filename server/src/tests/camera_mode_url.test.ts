import { describe, it } from 'node:test';

/**
 * CAMERA MODE URL CLEANUP & REFRESH PERSISTENCE TEST SUITE
 * 
 * Verifies that:
 * 1. Landing on ?mode=camera correctly triggers camera mode on initial load.
 * 2. replaceState removes ?mode=camera and #camera from the address bar without reloading.
 * 3. Base section paths (/analyze, /compare, /legal-aid) and other query params are strictly preserved.
 * 4. Refreshing the page (subsequent load without mode=camera) defaults back to the normal upload view.
 */

// Helper to simulate DocumentCapture activeTab initialization
function initializeActiveTab(urlStr: string): 'upload' | 'camera' | 'sample' {
  const url = new URL(urlStr);
  const params = url.searchParams;
  if (params.get('mode') === 'camera' || url.hash === '#camera') {
    return 'camera';
  }
  return 'upload';
}

// Helper simulating DocumentCapture URL cleanup logic
function cleanUrlParams(urlStr: string): { cleanUrl: string; wasChanged: boolean } {
  const url = new URL(urlStr);
  let urlChanged = false;

  if (url.searchParams.has('mode')) {
    url.searchParams.delete('mode');
    urlChanged = true;
  }

  if (url.hash === '#camera') {
    url.hash = '';
    urlChanged = true;
  }

  const cleanUrl = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
  return { cleanUrl, wasChanged: urlChanged };
}

async function runCameraModeUrlTests() {
  console.log('\n====================================================================');
  console.log('   CAMERA MODE URL CLEANUP & REFRESH PERSISTENCE TEST SUITE');
  console.log('====================================================================\n');

  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, name: string, detail: string) {
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${name}`);
      console.log(`   └─ ${detail}`);
    } else {
      failedTests++;
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   └─ ${detail}`);
    }
  }

  // TEST 1: Initial Load via ?mode=camera
  const initialUrl1 = 'https://legal-lens-iota.vercel.app/?mode=camera';
  const initialTab1 = initializeActiveTab(initialUrl1);
  const { cleanUrl: cleanUrl1, wasChanged: wasChanged1 } = cleanUrlParams(initialUrl1);
  const refreshTab1 = initializeActiveTab(`https://legal-lens-iota.vercel.app${cleanUrl1}`);

  assert(
    initialTab1 === 'camera' && wasChanged1 && cleanUrl1 === '/' && refreshTab1 === 'upload',
    '1. Base Root QR Landing (?mode=camera)',
    `Initial tab: "${initialTab1}", Cleaned URL: "${cleanUrl1}", Refresh tab: "${refreshTab1}"`
  );

  // TEST 2: Section Path Landing (/analyze?mode=camera)
  const initialUrl2 = 'https://legal-lens-iota.vercel.app/analyze?mode=camera';
  const initialTab2 = initializeActiveTab(initialUrl2);
  const { cleanUrl: cleanUrl2, wasChanged: wasChanged2 } = cleanUrlParams(initialUrl2);
  const refreshTab2 = initializeActiveTab(`https://legal-lens-iota.vercel.app${cleanUrl2}`);

  assert(
    initialTab2 === 'camera' && wasChanged2 && cleanUrl2 === '/analyze' && refreshTab2 === 'upload',
    '2. Section Path Landing (/analyze?mode=camera)',
    `Initial tab: "${initialTab2}", Cleaned URL: "${cleanUrl2}", Refresh tab: "${refreshTab2}"`
  );

  // TEST 3: Compare Section Landing (/compare?mode=camera)
  const initialUrl3 = 'https://legal-lens-iota.vercel.app/compare?mode=camera';
  const initialTab3 = initializeActiveTab(initialUrl3);
  const { cleanUrl: cleanUrl3, wasChanged: wasChanged3 } = cleanUrlParams(initialUrl3);
  const refreshTab3 = initializeActiveTab(`https://legal-lens-iota.vercel.app${cleanUrl3}`);

  assert(
    initialTab3 === 'camera' && wasChanged3 && cleanUrl3 === '/compare' && refreshTab3 === 'upload',
    '3. Compare Section Landing (/compare?mode=camera)',
    `Initial tab: "${initialTab3}", Cleaned URL: "${cleanUrl3}", Refresh tab: "${refreshTab3}"`
  );

  // TEST 4: Hash Landing (#camera)
  const initialUrl4 = 'https://legal-lens-iota.vercel.app/analyze#camera';
  const initialTab4 = initializeActiveTab(initialUrl4);
  const { cleanUrl: cleanUrl4, wasChanged: wasChanged4 } = cleanUrlParams(initialUrl4);
  const refreshTab4 = initializeActiveTab(`https://legal-lens-iota.vercel.app${cleanUrl4}`);

  assert(
    initialTab4 === 'camera' && wasChanged4 && cleanUrl4 === '/analyze' && refreshTab4 === 'upload',
    '4. Hash Anchor Landing (/analyze#camera)',
    `Initial tab: "${initialTab4}", Cleaned URL: "${cleanUrl4}", Refresh tab: "${refreshTab4}"`
  );

  // TEST 5: Query Parameter Preservation (?ref=qr&mode=camera&lang=hi)
  const initialUrl5 = 'https://legal-lens-iota.vercel.app/analyze?ref=qr&mode=camera&lang=hi';
  const initialTab5 = initializeActiveTab(initialUrl5);
  const { cleanUrl: cleanUrl5, wasChanged: wasChanged5 } = cleanUrlParams(initialUrl5);
  const refreshTab5 = initializeActiveTab(`https://legal-lens-iota.vercel.app${cleanUrl5}`);

  assert(
    initialTab5 === 'camera' && wasChanged5 && cleanUrl5 === '/analyze?ref=qr&lang=hi' && refreshTab5 === 'upload',
    '5. Multi-Param Preservation (?ref=qr&mode=camera&lang=hi)',
    `Initial tab: "${initialTab5}", Cleaned URL: "${cleanUrl5}", Refresh tab: "${refreshTab5}"`
  );

  console.log('\n====================================================================');
  console.log(`RESULTS: ${passedTests}/${passedTests + failedTests} Passed (${failedTests} Failed)`);
  console.log('====================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runCameraModeUrlTests().catch((err) => {
  console.error('Fatal Camera Mode Test Error:', err);
  process.exit(1);
});
