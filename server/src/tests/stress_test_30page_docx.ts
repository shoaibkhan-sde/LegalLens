import fs from 'fs';
import path from 'path';
import {
  extractAndCleanDocumentTextAsync,
  runGuard1InputGateAsync,
  chunkDocumentTextIntoClausesAsync,
  applyRiskTaggingAndGroundingAsync,
  synthesizeDocumentAnalysis,
} from '../services/astraBackend.js';

async function run30PageDocxStressTest() {
  console.log('\n======================================================');
  console.log('🚀 STRESS-TESTING GUARD 1 & PIPELINE WITH 30-PAGE .DOCX');
  console.log('======================================================\n');

  const fileAPath = path.resolve(process.cwd(), 'scratch/File_A_Genuine_30Page_Legal_Agreement.docx');
  const fileBPath = path.resolve(process.cwd(), 'scratch/File_B_NonLegal_30Page_Tech_Manual.docx');

  if (!fs.existsSync(fileAPath) || !fs.existsSync(fileBPath)) {
    console.error('❌ Test files missing in scratch/! Run generate_30page_docx_files.ts first.');
    process.exit(1);
  }

  const fileABuf = fs.readFileSync(fileAPath);
  const fileBBuf = fs.readFileSync(fileBPath);

  console.log(`📂 Loaded File A (Legal): ${fileABuf.length} bytes`);
  console.log(`📂 Loaded File B (Non-Legal): ${fileBBuf.length} bytes\n`);

  // --- TEST FILE A (GENUINE LEGAL AGREEMENT) ---
  console.log('------------------------------------------------------');
  console.log('📌 STRESS-TESTING FILE A (Genuine ~30-Page Legal Agreement)');
  console.log('------------------------------------------------------');
  const tA0 = Date.now();
  const textA = await extractAndCleanDocumentTextAsync(
    fileABuf,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'File_A_Genuine_30Page_Legal_Agreement.docx'
  );
  console.log(`1. Extracted Text Length: ${textA.length} chars (~${textA.split(/\s+/).length} words)`);
  console.log(`   Sample Start: "${textA.slice(0, 150)}..."`);
  console.log(`   Sample End: "...${textA.slice(-150)}"`);

  const g1A = await runGuard1InputGateAsync(textA);
  console.log(`2. Guard 1 Classification: ${g1A.is_legal_document ? 'ACCEPTED ✅' : 'REJECTED ❌'}`);
  console.log(`   Category: ${g1A.category} | Confidence: ${g1A.confidence}`);
  if (g1A.rejection_reason) console.log(`   Rejection Reason: "${g1A.rejection_reason}"`);

  if (!g1A.is_legal_document) {
    console.error('❌ [FAIL] File A was WRONGLY REJECTED by Guard 1!');
  } else {
    console.log('3. Chunking document into clauses...');
    const clausesA = await chunkDocumentTextIntoClausesAsync(textA);
    console.log(`   Extracted ${clausesA.length} clauses across full document.`);
    if (clausesA.length > 0) {
      console.log(`   Clause 1: "${clausesA[0].title}" (${clausesA[0].original_text.slice(0, 80)}...)`);
      console.log(`   Clause ${clausesA.length}: "${clausesA[clausesA.length - 1].title}" (${clausesA[clausesA.length - 1].original_text.slice(0, 80)}...)`);
    }

    console.log('4. Applying risk tagging & grounding...');
    const riskClausesA = await applyRiskTaggingAndGroundingAsync(clausesA, g1A.category);
    console.log(`   Processed risk scoring on ${riskClausesA.length} clauses.`);

    console.log('5. Synthesizing full document analysis...');
    const synthesisA = await synthesizeDocumentAnalysis(textA, riskClausesA, g1A, undefined, 'en');
    const highRiskCount = synthesisA.clauses.filter(c => c.risk_level === 'high').length;
    console.log(`   Overall Risk Score: ${synthesisA.overall_risk_score}/100`);
    console.log(`   High Risk Clauses: ${highRiskCount} | Total Clauses: ${synthesisA.clauses.length}`);
    console.log(`   Elapsed Time File A: ${Date.now() - tA0} ms`);
  }

  // --- TEST FILE B (NON-LEGAL TECH MANUAL) ---
  console.log('\n------------------------------------------------------');
  console.log('📌 STRESS-TESTING FILE B (Non-Legal ~30-Page Technical Manual)');
  console.log('------------------------------------------------------');
  const tB0 = Date.now();
  const textB = await extractAndCleanDocumentTextAsync(
    fileBBuf,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'File_B_NonLegal_30Page_Tech_Manual.docx'
  );
  console.log(`1. Extracted Text Length: ${textB.length} chars (~${textB.split(/\s+/).length} words)`);
  console.log(`   Sample Start: "${textB.slice(0, 150)}..."`);

  const g1B = await runGuard1InputGateAsync(textB);
  console.log(`2. Guard 1 Classification: ${g1B.is_legal_document ? 'ACCEPTED (WRONG!) ❌' : 'REJECTED (CORRECT!) ✅'}`);
  console.log(`   Category: ${g1B.category} | Confidence: ${g1B.confidence}`);
  if (g1B.rejection_reason) console.log(`   Rejection Reason: "${g1B.rejection_reason}"`);
  console.log(`   Elapsed Time File B: ${Date.now() - tB0} ms`);

  console.log('\n======================================================');
  console.log('📊 RESULTS SUMMARY');
  console.log('======================================================');
  console.log(`File A (Legal Doc): ${g1A.is_legal_document ? 'PASS ✅' : 'FAIL ❌'}`);
  console.log(`File B (Non-Legal Doc): ${!g1B.is_legal_document ? 'PASS ✅' : 'FAIL ❌'}`);
}

run30PageDocxStressTest().catch(console.error);
