import fs from 'fs';
import path from 'path';
import { chunkDocumentTextIntoClauses } from '../services/astraBackend.js';

function buildSynthetic30PageContractText(): string {
  let pages: string[] = [];

  pages.push(`CONFIDENTIAL & PRIVILEGED — COMPREHENSIVE MASTER SERVICE & OPERATING AGREEMENT

MASTER ENTERPRISE SERVICES AGREEMENT
Formal Commercial Engagement & Comprehensive Governance Covenant

This Comprehensive Master Enterprise Services Agreement (“Agreement”) is entered into effective as of September 16, 2026 (“Effective Date”), by and between Apex Global Cloud Infrastructure LLC (“Provider”), and Horizon Logistics International Corp. (“Client”).

1. DEFINITIONS AND INTERPRETATION
1.1 Applicable Law: All federal, state, local, and municipal statutes, ordinances, and regulatory guidelines applicable to the delivery of cloud services.
1.2 Confidential Information: Any non-public proprietary materials, algorithms, business strategies, technical designs, trade secrets, and source code.
1.3 Deliverables: All software configurations, architecture documentation, automation scripts, and diagnostic modules produced under a valid Statement of Work (“SOW”).
1.4 Force Majeure Event: Acts of God, government embargoes, grid-scale power outages, cyber warfare, or catastrophic supplier failures beyond reasonable operational control.

CONTRACT REF: GBL-AGR-2026-X990 Page 1 of 30`);

  for (let i = 2; i <= 29; i++) {
    pages.push(`CONFIDENTIAL & PRIVILEGED — COMPREHENSIVE MASTER SERVICE & OPERATING AGREEMENT

ARTICLE ${i}: ${i}. ARTICLE ${i} PROVISION
${i}.1 Operational Covenants and Compliance: The Parties agree that all operations governed under this Article ${i} shall comply strictly with enterprise cloud architecture standards.
${i}.2 Statutory and Contractual Enforcement: In the event of any material ambiguity or discrepancy, the terms established herein shall supersede and control.
${i}.3 Auditability and Record Retention: Provider warrants that complete ledger entries documenting all access vectors shall be maintained.
${i}.4 Risk Allocation and Mutual Indemnification: Each Party covenants to indemnify, defend, and hold harmless the other Party against third-party claims.

Parameter Metric Specification Standard Validation Threshold Remediation Time
Uptime Guarantee-${i} High Availability Cluster 99.995% Availability < 15 Minutes

CONTRACT REF: GBL-AGR-2026-X990 Page ${i} of 30`);
  }

  pages.push(`CONFIDENTIAL & PRIVILEGED — COMPREHENSIVE MASTER SERVICE & OPERATING AGREEMENT

EXECUTION, COUNTERPARTS & FORMAL ATTESTATION
IN WITNESS WHEREOF, the Parties hereto have caused this Comprehensive Master Services Agreement to be duly executed and delivered as of the Effective Date.

FOR PROVIDER: APEX GLOBAL CLOUD INFRASTRUCTURE LLC
Authorized Signature: Marcus Vance (VP of Infrastructure & Enterprise Systems)

FOR CLIENT: HORIZON LOGISTICS INTERNATIONAL CORP.
Authorized Signature: Elena Rostova (Chief Technology Officer)

CONTRACT REF: GBL-AGR-2026-X990 Page 30 of 30`);

  return pages.join('\n\n');
}

async function runGranularityTests() {
  console.log('====================================================');
  console.log('  LEGAL LENS CLAUSE GRANULARITY & DENSITY REGRESSION TEST');
  console.log('====================================================\n');

  let passed = true;
  const fixturesDir = path.resolve(process.cwd(), 'server/src/tests/fixtures');

  // Test 1: 01_rental_agreement.txt
  const rentalPath = path.join(fixturesDir, '01_rental_agreement.txt');
  if (fs.existsSync(rentalPath)) {
    const text = fs.readFileSync(rentalPath, 'utf8');
    const clauses = chunkDocumentTextIntoClauses(text);
    console.log(`Test 1: 01_rental_agreement.txt -> ${clauses.length} clauses extracted.`);
    if (clauses.length >= 8 && clauses.length <= 14) {
      console.log(`✅ [PASS] 01_rental_agreement.txt count (${clauses.length}) is within sane range (8-14).`);
    } else {
      console.error(`❌ [FAIL] 01_rental_agreement.txt count (${clauses.length}) is out of bounds.`);
      passed = false;
    }
  }

  // Test 2: 04_employment_contract.txt
  const empPath = path.join(fixturesDir, '04_employment_contract.txt');
  if (fs.existsSync(empPath)) {
    const text = fs.readFileSync(empPath, 'utf8');
    const clauses = chunkDocumentTextIntoClauses(text);
    console.log(`Test 2: 04_employment_contract.txt -> ${clauses.length} clauses extracted.`);
    if (clauses.length >= 8 && clauses.length <= 14) {
      console.log(`✅ [PASS] 04_employment_contract.txt count (${clauses.length}) is within sane range (8-14).`);
    } else {
      console.error(`❌ [FAIL] 04_employment_contract.txt count (${clauses.length}) is out of bounds.`);
      passed = false;
    }
  }

  // Test 3: 30-Page Enterprise Agreement PDF Text
  const text30 = buildSynthetic30PageContractText();
  const clauses30 = chunkDocumentTextIntoClauses(text30);
  console.log(`Test 3: 30-Page Contract -> ${clauses30.length} clauses extracted (Expected ~30-32, Old code produced 120-152).`);
  if (clauses30.length >= 25 && clauses30.length <= 35) {
    console.log(`✅ [PASS] 30-Page Contract clause count (${clauses30.length}) correctly matches top-level provision count!`);
  } else {
    console.error(`❌ [FAIL] 30-Page Contract clause count (${clauses30.length}) is out of expected 25-35 range.`);
    passed = false;
  }

  // Verify sub-points are contained within main clause content, not split
  const defClause = clauses30.find((c) => c.title.includes('DEFINITIONS'));
  if (defClause && defClause.original_text.includes('1.1 Applicable Law') && defClause.original_text.includes('1.4 Force Majeure')) {
    console.log(`✅ [PASS] Sub-points (1.1, 1.2, 1.3, 1.4) are grouped inside single top-level Definitions clause!`);
  } else {
    console.error(`❌ [FAIL] Sub-points were not correctly grouped inside top-level clause.`);
    passed = false;
  }

  if (!passed) {
    process.exit(1);
  }
}

runGranularityTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
