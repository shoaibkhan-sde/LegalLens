import fs from 'fs';
import path from 'path';
import { extractAndCleanDocumentTextAsync, runGuard1InputGateAsync } from '../services/astraBackend.js';

async function testGeneratedImages() {
  console.log('====================================================');
  console.log('🧪 TESTING GUARD 1 ON GENERATED REAL IMAGE ASSETS');
  console.log('====================================================\n');

  const artifactDir = `C:\\Users\\MCM\\.gemini\\antigravity-ide\\brain\\073348ba-04b0-4fa4-b3a3-c4f04321b4ca`;

  const images = [
    {
      name: 'Legal Image 1 (Lease Agreement)',
      file: 'test_legal_lease_1789630013379.jpg',
      expectedLegal: true,
      originalFilename: 'test_legal_lease.jpg'
    },
    {
      name: 'Legal Image 2 (Employment Offer Letter)',
      file: 'test_legal_offer_1789630220964.jpg',
      expectedLegal: true,
      originalFilename: 'test_legal_offer.jpg'
    },
    {
      name: 'Illegal Image 1 (Cartoon Illustration / Asset)',
      file: 'test_illegal_cartoon_1789630247117.jpg',
      expectedLegal: false,
      originalFilename: 'header-img2-Photoroom.png'
    },
    {
      name: 'Illegal Image 2 (Scenic Nature Sunset Photo)',
      file: 'test_illegal_landscape_1789630270538.jpg',
      expectedLegal: false,
      originalFilename: 'test_illegal_landscape.jpg'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const img of images) {
    const fullPath = path.join(artifactDir, img.file);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Image file missing: ${fullPath}`);
      failed += 1;
      continue;
    }

    const fileBuf = fs.readFileSync(fullPath);
    console.log(`📷 Ingesting "${img.name}" (${fileBuf.length} bytes)...`);
    const extractedText = await extractAndCleanDocumentTextAsync(fileBuf, 'image/jpeg', img.originalFilename);
    const g1Res = await runGuard1InputGateAsync(extractedText);

    const isMatch = g1Res.is_legal_document === img.expectedLegal;
    if (isMatch) {
      passed += 1;
      console.log(`✅ [PASS] ${img.name}`);
      console.log(`   Filename Passed to Backend: "${img.originalFilename}"`);
      console.log(`   Guard 1 Status: ${g1Res.is_legal_document ? 'ACCEPTED' : 'REJECTED'}`);
      if (!g1Res.is_legal_document) {
        console.log(`   Rejection Reason: "${g1Res.rejection_reason}"`);
      }
      console.log('----------------------------------------------------');
    } else {
      failed += 1;
      console.log(`❌ [FAIL] ${img.name}`);
      console.log(`   Filename Passed to Backend: "${img.originalFilename}"`);
      console.log(`   Expected: ${img.expectedLegal ? 'ACCEPTED' : 'REJECTED'}, Got: ${g1Res.is_legal_document ? 'ACCEPTED' : 'REJECTED'}`);
      if (!g1Res.is_legal_document) {
        console.log(`   Rejection Reason: "${g1Res.rejection_reason}"`);
      }
      console.log('----------------------------------------------------');
    }
  }

  // RENAME REPRODUCIBILITY TEST:
  // Test swapping filenames (e.g. giving Illegal image a "legal" filename, and Legal image a "reject" filename)
  console.log('\n🔄 RUNNING RENAME REPRODUCIBILITY VERIFICATION (SWAPPED FILENAMES)...');

  // Test 1: Cartoon illustration with "valid_rental_agreement.png" filename
  const cartoonPath = path.join(artifactDir, 'test_illegal_cartoon_1789630247117.jpg');
  if (fs.existsSync(cartoonPath)) {
    const cartoonBuf = fs.readFileSync(cartoonPath);
    const text = await extractAndCleanDocumentTextAsync(cartoonBuf, 'image/png', 'valid_rental_agreement.png');
    const res = await runGuard1InputGateAsync(text);
    if (!res.is_legal_document) {
      passed += 1;
      console.log(`✅ [PASS] Cartoon image renamed to "valid_rental_agreement.png" was correctly REJECTED based on content!`);
      console.log(`   Reason: "${res.rejection_reason}"`);
    } else {
      failed += 1;
      console.log(`❌ [FAIL] Cartoon image renamed to "valid_rental_agreement.png" was incorrectly accepted!`);
    }
  }

  // Test 2: Legal lease image with "10_REJECT_random_photo.jpg" filename
  const leasePath = path.join(artifactDir, 'test_legal_lease_1789630013379.jpg');
  if (fs.existsSync(leasePath)) {
    const leaseBuf = fs.readFileSync(leasePath);
    const text = await extractAndCleanDocumentTextAsync(leaseBuf, 'image/jpeg', '10_REJECT_random_photo.jpg');
    const res = await runGuard1InputGateAsync(text);
    if (res.is_legal_document) {
      passed += 1;
      console.log(`✅ [PASS] Legal lease image renamed to "10_REJECT_random_photo.jpg" was correctly ACCEPTED based on content!`);
      console.log(`   Category: "${res.category}" | Confidence: ${res.confidence}`);
    } else {
      failed += 1;
      console.log(`❌ [FAIL] Legal lease image renamed to "10_REJECT_random_photo.jpg" was incorrectly rejected!`);
    }
  }

  console.log('\n====================================================');
  console.log(` GENERATED IMAGES TEST SUMMARY: ${passed} Passed, ${failed} Failed out of ${images.length + 2} Tests`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testGeneratedImages();
