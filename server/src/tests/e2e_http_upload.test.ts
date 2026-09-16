import fs from 'fs';
import path from 'path';

async function runE2EHttpUploadTest() {
  console.log('====================================================');
  console.log('🌐 LIVE HTTP E2E UPLOAD INTEGRATION TEST');
  console.log('====================================================\n');

  // TEST 1: Legal Image Document Upload (09_photo_employment_offer.jpg)
  const fixturePath = path.resolve(process.cwd(), 'server/src/tests/fixtures/09_photo_employment_offer.jpg');
  console.log(`📁 Loading legal image fixture from: ${fixturePath}`);

  let fileBuffer: Buffer;
  if (fs.existsSync(fixturePath)) {
    fileBuffer = fs.readFileSync(fixturePath);
  } else {
    fileBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  }

  const formData = new FormData();
  const blob = new Blob([fileBuffer as any], { type: 'image/jpeg' });
  formData.append('file', blob, '09_photo_employment_offer.jpg');
  formData.append('language', 'en');

  console.log(`🚀 Sending HTTP POST request to http://localhost:3001/api/analyze?stream=true...`);
  console.log(`   Payload Filename: "09_photo_employment_offer.jpg" | Mime: "image/jpeg" | Buffer Length: ${fileBuffer.length} bytes`);

  try {
    const res = await fetch('http://localhost:3001/api/analyze?stream=true', {
      method: 'POST',
      headers: { 'Accept': 'text/event-stream' },
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`❌ HTTP Request Failed with Status ${res.status}:`, errText);
      process.exit(1);
    }

    if (!res.body) {
      console.error('❌ Response body is missing');
      process.exit(1);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: any = null;
    let streamError: string | null = null;
    let guard1Completed = false;

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
            }
          } else if (event === 'result') {
            finalResult = parsed;
          } else if (event === 'error') {
            streamError = parsed.error;
          }
        } catch {}
      }
    }

    if (streamError) {
      console.error(`\n❌ TEST 1 FAILED: Legal image emitted SSE error: "${streamError}"`);
      process.exit(1);
    }

    if (guard1Completed && finalResult) {
      console.log(`✅ [PASS] Legal Image Document (09_photo_employment_offer.jpg) accepted & analyzed successfully!`);
      console.log(`   Title: "${finalResult.document_title}" | Category: "${finalResult.category}" | Clauses: ${finalResult.clauses?.length}`);
    } else {
      console.error('\n❌ TEST 1 FAILED: Legal image did not return final result.');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ TEST 1 Exception:', err);
    process.exit(1);
  }

  // TEST 2: Random / Non-Legal Image Upload Rejection (10_REJECT_random_photo.jpg)
  console.log('\n----------------------------------------------------');
  console.log('🔍 Testing Random Image Upload Rejection (10_REJECT_random_photo.jpg)...');

  const randomImageBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
  const rejectFormData = new FormData();
  const rejectBlob = new Blob([randomImageBuffer as any], { type: 'image/jpeg' });
  rejectFormData.append('file', rejectBlob, '10_REJECT_random_photo.jpg');
  rejectFormData.append('language', 'en');

  try {
    const res = await fetch('http://localhost:3001/api/analyze?stream=true', {
      method: 'POST',
      headers: { 'Accept': 'text/event-stream' },
      body: rejectFormData,
    });

    if (!res.body) {
      console.error('❌ Response body is missing');
      process.exit(1);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamError: string | null = null;
    let finalResult: any = null;

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
          if (event === 'result') {
            finalResult = parsed;
          } else if (event === 'error') {
            streamError = parsed.error;
          }
        } catch {}
      }
    }

    const isRejected = streamError && (
      streamError.toLowerCase().includes('rejected') ||
      streamError.toLowerCase().includes('not a legal document') ||
      streamError.toLowerCase().includes('no textual content') ||
      streamError.toLowerCase().includes('no legal content') ||
      streamError.toLowerCase().includes('couldn\'t read')
    );

    if (isRejected) {
      console.log(`✅ [PASS] Random Image (10_REJECT_random_photo.jpg) correctly rejected by Guard 1!`);
      console.log(`   Rejection Reason: "${streamError}"`);
    } else if (finalResult) {
      console.error(`❌ TEST 2 FAILED: Random image was incorrectly accepted and analyzed!`);
      process.exit(1);
    } else {
      console.error(`❌ TEST 2 FAILED: Expected Guard 1 rejection error, got: "${streamError}"`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ TEST 2 Exception:', err);
    process.exit(1);
  }

  console.log('\n====================================================');
  console.log('✅ ALL LIVE HTTP E2E UPLOAD TESTS PASSED SUCCESFULLY!');
  console.log('====================================================\n');
}

runE2EHttpUploadTest();

