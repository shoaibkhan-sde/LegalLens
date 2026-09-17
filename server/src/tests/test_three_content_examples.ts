import { runGuard1InputGate, runGuard1InputGateAsync } from '../services/astraBackend';

const example1 = `# LEGAL & STRUCTURED WORKSPACE
# Purpose: Core SDE preparation, open-source milestones, and algorithmic rigor.

[OPERATIONAL TARGET]
- Target: Google Off-Campus (SDE)
- Strategy: Tier-3 Bridge Strategy (Open Source / GSoC + High-Impact Systems Projects)
- Execution Standard: O(n) or O(log n) optimization mindset for all problem-solving tasks.

[CORE MILESTONES]
1. Data Structures & Algorithms:
   - Rigorous whiteboard-ready complexity analysis ($T(n) = aT(n/b) + f(n)$).
   - No-IDE dry-run practice to survive strict technical vetting.
2. Open Source & Portfolio:
   - High-level project contributions proving top-tier competency.
   - Proof of Work: Push commits, document architectural decisions, and publish technical breakdowns.

[DAILY EXECUTION RULES]
- Filter out low-efficiency tasks (The Efficiency Filter).
- Balance AI-assisted boilerplate generation with strict manual mastery of core logic.`;

const example2 = `# LEGAL COMPLIANCE & CORPORATE GOVERNANCE DIRECTIVE

[DOCUMENT REFERENCE]
- Classification: Highly Confidential / Legal Binding Policy
- Effective Date: April 1, 2026
- Governing Entity: Vertex Technologies Pvt. Ltd.

[SCOPE & OBLIGATIONS]
1. CODE OF CONDUCT: All employees and contractors must strictly adhere to statutory data protection regulations under the Digital Personal Data Protection (DPDP) Act.
2. NON-DISCLOSURE OBLIGATION: Personnel shall hold all proprietary algorithms, client data, and source code in strict confidence.
3. REMUNERATION & INDEMNITY: Violations of compliance protocols shall trigger immediate termination and liquidated damages of up to Rs. 5,00,000/-.

[GOVERNING JURISDICTION]
This policy is governed by the laws of India, with courts at Bengaluru having exclusive jurisdiction.`;

const example3 = `# LEGAL TERMS OF SERVICE & OPERATIONAL AGREEMENT

[CONTRACTING PARTIES]
This Agreement is entered into between CloudMatrix Solutions Ltd. ("Provider") and Apex Global Traders ("Client").

[PAYMENT & CONSIDERATION]
1. SERVICE FEE: Client agrees to pay Provider a fixed monthly retainer of Rs. 45,000/- due on the 1st of each month.
2. SECURITY DEPOSIT: Client has deposited an interest-free security deposit of Rs. 90,000/- refundable upon termination.

[TERMINATION & DISPUTES]
1. NOTICE PERIOD: Either party may terminate with 30 days written notice.
2. DISPUTE RESOLUTION: Disputes shall be referred to arbitration under the Arbitration and Conciliation Act, 1996.

IN WITNESS WHEREOF, the authorized representatives have executed this Agreement.`;

async function runThreeExamplesTest() {
  console.log('================================================================');
  console.log('🧪 VERIFYING 3 STRUCTURED CONTENT EXAMPLES THROUGH GUARD 1');
  console.log('================================================================\n');

  const examples = [
    { name: 'Example 1: gemini-code-1789633597371.txt (# LEGAL & STRUCTURED WORKSPACE)', text: example1 },
    { name: 'Example 2: Legal Corporate Governance Policy (# LEGAL COMPLIANCE & DIRECTIVE)', text: example2 },
    { name: 'Example 3: Legal Terms of Service (# LEGAL TERMS & OPERATIONAL AGREEMENT)', text: example3 },
  ];

  for (let i = 0; i < examples.length; i++) {
    const ex = examples[i];
    console.log(`📄 [EXAMPLE ${i + 1}] Testing: "${ex.name}"`);

    const syncRes = runGuard1InputGate(ex.text);
    const asyncRes = await runGuard1InputGateAsync(ex.text);

    console.log(`   Sync Rule Engine Result  : ${syncRes.is_legal_document ? '✅ ACCEPTED' : '❌ REJECTED'} (Category: ${syncRes.category})`);
    console.log(`   Async AI Classifier Result: ${asyncRes.is_legal_document ? '✅ ACCEPTED' : '❌ REJECTED'} (Category: ${asyncRes.category}, Confidence: ${asyncRes.confidence})`);
    if (!asyncRes.is_legal_document) {
      console.log(`   Rejection Reason         : "${asyncRes.rejection_reason}"`);
    }
    console.log('----------------------------------------------------------------\n');
  }
}

runThreeExamplesTest();
