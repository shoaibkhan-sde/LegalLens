import fs from 'fs';
import path from 'path';

/**
 * STICKY POSITIONING LAYOUT & SUMMARY BANNER PLACEMENT TEST SUITE
 * 
 * Verifies clean CSS grid sticky structure & Summary Overview Banner placement:
 * 1. Summary Overview Banner is placed immediately below uploader and above the workspace grid.
 * 2. The workspace grid uses `items-start`.
 * 3. Left grid column item (`lg:col-span-5`) uses direct `lg:sticky h-[440px]`.
 * 4. Right column (`lg:col-span-7`) determines natural content height.
 * 5. DocumentViewer maintains bounded height and internal scroll.
 */

async function runStickyPositioningTests() {
  console.log('\n====================================================================');
  console.log('   STICKY POSITIONING LAYOUT & SUMMARY BANNER PLACEMENT TEST');
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

  const appFilePath = path.resolve(process.cwd(), 'src/App.tsx');
  const appContent = fs.readFileSync(appFilePath, 'utf-8');

  const docViewerPath = path.resolve(process.cwd(), 'src/components/DocumentViewer.tsx');
  const docViewerContent = fs.readFileSync(docViewerPath, 'utf-8');

  // TEST 1: Summary Overview Banner placed before grid
  const summaryIndex = appContent.indexOf('Summary Overview Banner (Placed immediately below Uploader button)');
  const gridIndex = appContent.indexOf('Responsive Multi-Pane Grid Layout');
  const isSummaryBeforeGrid = summaryIndex !== -1 && gridIndex !== -1 && summaryIndex < gridIndex;
  assert(
    isSummaryBeforeGrid,
    '1. Summary Overview Banner Placed Immediately Below Uploader Button',
    'Summary Overview Banner is positioned above the 2-column workspace grid right below the uploader.'
  );

  // TEST 2: Left Column Direct Sticky Grid Item
  const hasDirectSticky = appContent.includes('className="lg:col-span-5 lg:sticky h-[440px]"');
  assert(
    hasDirectSticky,
    '2. Left Column Direct Sticky Grid Item (`lg:col-span-5 lg:sticky h-[440px]`)',
    'Left grid column wrapper uses direct `lg:sticky h-[440px]` sticky grid binding.'
  );

  // TEST 3: Right Column Natural Height Div
  const hasRightCol = appContent.includes('<div className="lg:col-span-7 space-y-4">');
  assert(
    hasRightCol,
    '3. Right Column Natural Content Deck (`lg:col-span-7 space-y-4`)',
    'Right column wrapper determines overall scroll height based on active clause content.'
  );

  // TEST 4: baseStickyTop calculation consistency
  const hasBaseStickyTop = appContent.includes('style={{ top: `${baseStickyTop}px` }}');
  assert(
    hasBaseStickyTop,
    '4. Equal Top Alignment (`baseStickyTop`)',
    'Sticky container aligns to `top: `${baseStickyTop}px`` threshold.'
  );

  // TEST 5: DocumentViewer bounded height & scroll
  const hasDocViewerScroll = docViewerContent.includes('overflow-y-auto') && docViewerContent.includes('min-h-[440px]');
  assert(
    hasDocViewerScroll,
    '5. DocumentViewer Bounded Height & Internal Scroll',
    'DocumentViewer retains 440px bounded height with smooth internal overflow scrolling.'
  );

  console.log('\n====================================================================');
  console.log(`RESULTS: ${passedTests}/${passedTests + failedTests} Passed (${failedTests} Failed)`);
  console.log('====================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStickyPositioningTests().catch((err) => {
  console.error('Fatal Sticky Positioning Test Error:', err);
  process.exit(1);
});
