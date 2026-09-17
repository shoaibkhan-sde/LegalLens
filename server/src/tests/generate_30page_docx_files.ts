import fs from 'fs';
import path from 'path';
import { createZipBuffer } from './test_docx_generator.js';

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildDocxFromTextParagraphs(paragraphs: string[]): Buffer {
  const xmlParagraphs = paragraphs
    .map((p) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(p)}</w:t></w:r></w:p>`)
    .join('\n');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${xmlParagraphs}
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  return createZipBuffer({
    '[Content_Types].xml': contentTypesXml,
    '_rels/.rels': relsXml,
    'word/document.xml': documentXml,
  });
}

// Generator for File A: ~30 pages (13,000+ words) of genuine commercial lease & services agreement legal contract
export function generateFileALegalDocxParagraphs(): string[] {
  const p: string[] = [];

  p.push("MASTER COMMERCIAL LEASE AND INFRASTRUCTURE SERVICES AGREEMENT");
  p.push("THIS MASTER COMMERCIAL LEASE AND INFRASTRUCTURE SERVICES AGREEMENT (this \"Agreement\") is entered into as of January 15, 2026 (\"Effective Date\"), by and between APEX COMMERCIAL REALTY HOLDINGS LLC, a Delaware limited liability company having its principal place of business at 100 Financial Tower, Suite 400, Wilmington, DE 19801 (\"Landlord\" or \"Lessor\"), and NEXUS GLOBAL ENTERPRISE SOLUTIONS INC., a Delaware corporation having its principal place of business at 500 Technology Parkway, Austin, TX 78701 (\"Tenant\" or \"Lessee\"). Landlord and Tenant may collectively be referred to herein as the \"Parties\" or individually as a \"Party\".");

  p.push("RECITALS");
  p.push("WHEREAS, Landlord owns that certain real estate property, commercial complex, and datacenter infrastructure building situated at 100 Financial Tower, Austin, Texas (the \"Premises\"); and");
  p.push("WHEREAS, Tenant desires to lease from Landlord, and Landlord desires to lease to Tenant, approximately 85,000 rentable square feet comprising Floors 10 through 14 of the Premises, together with dedicated optical fiber connectivity, backup power generator capacity, and specialized server facility hosting rights, upon the terms, conditions, and covenants hereinafter set forth.");
  p.push("NOW, THEREFORE, in consideration of the mutual covenants, conditions, and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties hereby agree as follows:");

  p.push("ARTICLE 1. DEFINITIONS AND INTERPRETATION");
  p.push("1.1 Defined Terms. As used in this Agreement, the following terms shall have the meanings set forth below:");
  p.push("(a) \"Base Rent\" shall mean the initial annual rental fee of $4,250,000.00 USD, payable in equal monthly installments of $354,166.67 USD, subject to the annual escalations specified in Section 3.2.");
  p.push("(b) \"Additional Rent\" shall mean all taxes, operating expenses, common area maintenance fees, utility surcharges, insurance premiums, and late payment interest owed by Tenant under Articles 4 and 5.");
  p.push("(c) \"Commencement Date\" shall mean March 1, 2026, or such date on which Landlord delivers vacant possession of the Premises with Tenant Improvements substantially completed.");
  p.push("(d) \"Expiration Date\" shall mean February 28, 2041, unless earlier terminated pursuant to Article 18 or extended pursuant to Section 2.3.");
  p.push("(e) \"Permitted Use\" shall mean high-density software engineering offices, cloud datacenter hosting, customer operations, executive suites, and ancillary commercial activities customary to enterprise tech firms.");

  // Generate ~35 realistic, detailed legal sections
  const sections = [
    {
      num: "2. PREMISES, LEASE TERM, AND RENEWAL OPTIONS",
      content: [
        "2.1 Demise of Premises. Landlord hereby leases to Tenant, and Tenant hereby takes and leases from Landlord, the Premises consisting of 85,000 rentable square feet, together with exclusive rights to Parking Bay Section B (comprising 250 reserved spaces) and non-exclusive access to Common Areas.",
        "2.2 Lease Term. The initial term of this Lease (\"Initial Term\") shall commence on the Commencement Date and expire on the Expiration Date, spanning a total duration of fifteen (15) consecutive calendar years.",
        "2.3 Option to Renew. Tenant shall have two (2) consecutive options to extend the term of this Lease for additional periods of five (5) years each (\"Option Terms\"), provided Tenant is not in material default beyond applicable notice and cure periods at the time of exercise.",
        "2.4 Rent During Extension Terms. Base Rent for each Option Term shall be adjusted to ninety-five percent (95%) of the then-prevailing Fair Market Rental Value for comparable commercial class-A space in Austin, Texas."
      ]
    },
    {
      num: "3. BASE RENT, ESCALATIONS, AND PAYMENT MECHANICS",
      content: [
        "3.1 Payment Obligations. Tenant covenants to pay to Landlord, without notice, demand, deduction, set-off, or abatement except as expressly provided herein, the monthly Base Rent on or before the first (1st) day of each calendar month during the Term.",
        "3.2 Annual Rent Escalation. On each anniversary of the Commencement Date, the annual Base Rent shall automatically increase by three and one-half percent (3.5%) over the Base Rent payable for the immediately preceding lease year.",
        "3.3 Late Payment Charge & Default Interest. Any installment of Rent not received by Landlord within five (5) business days after its due date shall incur a late payment charge equal to five percent (5%) of the delinquent amount. Additionally, interest shall accrue on overdue amounts at the rate of twelve percent (12%) per annum or the maximum legal rate.",
        "3.4 Electronic Wire Transfer. All payments under this Agreement shall be remitted electronically in immediately available US Dollars to Landlord's designated bank account at JPMorgan Chase Bank, N.A."
      ]
    },
    {
      num: "4. SECURITY DEPOSIT AND LETTER OF CREDIT",
      content: [
        "4.1 Security Deposit Obligation. Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of $1,062,500.00 USD (\"Security Deposit\"), representing three (3) months of initial Base Rent, to secure the faithful performance of Tenant's obligations.",
        "4.2 Letter of Credit Option. In lieu of cash, Tenant may satisfy the Security Deposit requirement by delivering an irrevocable, transferable standby Letter of Credit issued by a major US financial institution acceptable to Landlord.",
        "4.3 Application of Deposit. If Tenant defaults in the performance of any provision of this Lease beyond notice and cure periods, Landlord may apply all or part of the Security Deposit to cure such default or compensate Landlord for damages incurred.",
        "4.4 Replenishment. If Landlord applies any portion of the Security Deposit, Tenant shall, within ten (10) business days following written demand, restore the Security Deposit to its full required amount."
      ]
    },
    {
      num: "5. OPERATING EXPENSES, TAXES, AND UTILITIES",
      content: [
        "5.1 Tenant's Proportionate Share. Tenant shall pay to Landlord as Additional Rent Tenant's Proportionate Share (calculated as 42.5% of total rentable building area) of all Operating Expenses incurred in operating, maintaining, and managing the building.",
        "5.2 Real Property Taxes. Real property taxes, special assessments, and municipal utility taxes assessed against the land and improvements shall be reimbursed by Tenant in accordance with its Proportionate Share within thirty (30) days of invoice.",
        "5.3 Direct Utility Metering. Tenant shall pay directly to utility providers all charges for electricity, water, gas, chilled water for cooling, telecommunications, and trash disposal separately metered to the Premises.",
        "5.4 Audit Rights. Tenant shall have the right, upon thirty (30) days prior written notice, to audit Landlord's books and records relating to Operating Expenses for any calendar year within twelve (12) months following receipt of the annual reconciliation statement."
      ]
    },
    {
      num: "6. MAINTENANCE, REPAIRS, AND ALTERATIONS",
      content: [
        "6.1 Landlord Obligations. Landlord shall, at its sole cost and expense, maintain and keep in good repair and structural integrity the foundation, exterior walls, roof structure, load-bearing columns, central HVAC boilers, and main utility risers.",
        "6.2 Tenant Obligations. Tenant shall keep the interior of the Premises, non-structural partitions, internal electrical wiring, server rack cooling units, and fixtures in clean, operable, and good condition, ordinary wear and tear excepted.",
        "6.3 Alterations & Fixtures. Tenant shall not make structural alterations, additions, or improvements without Landlord's prior written approval. Non-structural alterations under $100,000.00 USD shall not require Landlord's consent provided written notice is given.",
        "6.4 Removal of Alterations. Upon expiration or termination of the Lease, Tenant shall remove all trade fixtures, specialized data servers, cabling, and personal property, repairing any damage caused by such removal."
      ]
    },
    {
      num: "7. INDEMNIFICATION, LIABILITY, AND INSURANCE MANDATES",
      content: [
        "7.1 Tenant Indemnification. Tenant covenants to defend, indemnify, and hold harmless Landlord, its officers, directors, members, agents, and employees from and against any claims, losses, liabilities, costs, damages, and legal fees arising from Tenant's use of the Premises or breach of this Agreement.",
        "7.2 Landlord Indemnification. Landlord agrees to indemnify, defend, and hold harmless Tenant from and against all claims, liabilities, and damages resulting directly from Landlord's gross negligence, willful misconduct, or breach of structural repair duties.",
        "7.3 Commercial General Liability Insurance. Tenant shall maintain during the Term commercial general liability insurance with coverage limits of not less than $5,000,000.00 per occurrence and $10,000,000.00 in the aggregate, naming Landlord as an additional insured.",
        "7.4 Property & Business Interruption Insurance. Tenant shall maintain all-risk property insurance covering trade fixtures, server equipment, and tenant improvements, along with business interruption insurance covering at least twelve (12) months of loss."
      ]
    },
    {
      num: "8. LIMITATION OF LIABILITY AND WAIVER OF SUBROGATION",
      content: [
        "8.1 Consequential Damages Waiver. NEITHER LANDLORD NOR TENANT SHALL BE LIABLE TO THE OTHER FOR ANY INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, PUNITIVE, OR LOST PROFIT DAMAGES ARISING OUT OF OR IN CONNECTION WITH THIS LEASE.",
        "8.2 Landlord Exculpation. Tenant agrees to look solely to Landlord's equity interest in the Building for the recovery of any judgment against Landlord, and no personal liability shall attach to Landlord's members, officers, or partners.",
        "8.3 Mutual Waiver of Subrogation. Landlord and Tenant hereby release each other and waive all rights of recovery against each other for loss or damage to property covered by fire or extended property insurance policies."
      ]
    },
    {
      num: "9. DEFAULT, REMEDIES, AND TERMINATION RIGHTS",
      content: [
        "9.1 Events of Default. The occurrence of any of the following shall constitute an Event of Default by Tenant under this Lease:",
        "(a) Failure to pay Base Rent or Additional Rent within ten (10) days after receipt of written notice of non-payment.",
        "(b) Failure to perform any non-monetary covenant within thirty (30) days after written notice specifying the failure.",
        "(c) Insolvency, bankruptcy filing, general assignment for the benefit of creditors, or appointment of a receiver for Tenant's assets.",
        "9.2 Landlord Remedies. Upon an Event of Default, Landlord may terminate this Lease, re-enter the Premises, relet the space, and accelerate all remaining Rent payments due under the Term, discounted to present value at 5% per annum.",
        "9.3 Tenant Remedies & Cure. If Landlord fails to perform any repair obligation within thirty (30) days after written notice, Tenant may perform such repair and offset the reasonable cost against monthly Base Rent."
      ]
    },
    {
      num: "10. DISPUTE RESOLUTION, GOVERNING LAW, AND ARBITRATION",
      content: [
        "10.1 Governing Law. This Agreement shall be governed by, construed, and enforced in accordance with the substantive laws of the State of Texas, without regard to conflict of law principles.",
        "10.2 Mandatory Executive Mediation. Before initiating legal proceedings, senior executive representatives of both Parties shall meet in person in Austin, Texas, to attempt good-faith resolution of any dispute within fifteen (15) days of notice.",
        "10.3 Binding AAA Arbitration. Any unresolved controversy or claim arising out of this Lease shall be settled by binding arbitration administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules.",
        "10.4 Waiver of Jury Trial. LANDLORD AND TENANT HEREBY KNOWINGLY, VOLUNTARILY, AND INTENTIONALLY WAIVE ANY RIGHT TO TRIAL BY JURY IN ANY ACTION OR PROCEEDING ARISING FROM THIS LEASE."
      ]
    }
  ];

  // Repeat & elaborate sections to build ~30 full pages of dense, realistic contract text (~13,000 words)
  for (let round = 1; round <= 3; round++) {
    for (const sec of sections) {
      p.push(`SECTION ${sec.num} (PART ${round})`);
      for (const paragraphText of sec.content) {
        // Expand text to be realistic, dense, and full-length
        p.push(`${paragraphText} (Expanded Clause Schedule ${round}): The Parties explicitly agree that all rights, covenants, indemnities, payment schedules, default triggers, and remedies described herein are binding upon their respective successors, permitted assigns, legal representatives, corporate affiliates, and subsidiaries under strict commercial law enforcement.`);
        p.push(`Furthermore, for the purposes of Section ${sec.num} in Part ${round}, both Landlord and Tenant acknowledge having thoroughly reviewed these obligations with independent legal counsel, agreeing that no ambiguity shall be construed against either drafting Party.`);
      }
    }
  }

  // Add signature block
  p.push("IN WITNESS WHEREOF, the Parties hereto have caused this Master Commercial Lease and Infrastructure Services Agreement to be executed by their duly authorized corporate officers as of the Effective Date written above.");
  p.push("LANDLORD: APEX COMMERCIAL REALTY HOLDINGS LLC\nBy: _______________________________\nName: Marcus V. Vance\nTitle: Chief Executive Officer & Managing Director\nDate: January 15, 2026");
  p.push("TENANT: NEXUS GLOBAL ENTERPRISE SOLUTIONS INC.\nBy: _______________________________\nName: Sarah Jenkins-Sterling\nTitle: Chief Operating Officer & Senior Vice President\nDate: January 15, 2026");

  return p;
}

// Generator for File B: ~30 pages (13,000+ words) of non-legal technical engineering software architecture manual
export function generateFileBNonLegalDocxParagraphs(): string[] {
  const p: string[] = [];

  p.push("DISTRIBUTED SYSTEMS AND SOFTWARE ARCHITECTURE ENGINEERING MANUAL");
  p.push("Volume IV: Scalable Microservices, Consensus Protocols, Storage Engine Internals, and High-Throughput Message Pipeline Optimization.");
  p.push("Author: Platform Architecture Working Group, Cloud Engineering Division.");
  p.push("Publication Date: Edition 2026.4 — Technical Specification & Operations Handbook.");

  p.push("CHAPTER 1: HIGH-AVAILABILITY SYSTEM DESIGN PRINCIPLES");
  p.push("1.1 Overview of Distributed Consensus. Modern distributed systems rely on fault-tolerant state machine replication to maintain consistency across heterogeneous cluster nodes. The Raft consensus algorithm splits execution into leader election, log replication, and safety enforcement. When a leader node detects heartbeats timing out, it transitions to candidate state and increments the term counter.");
  p.push("1.2 Quorum Slicing and Network Partitions. To guarantee consistency during network split-brain scenarios, consensus algorithms mandate a strict majority quorum where Q = floor(N / 2) + 1. If a 5-node cluster experiences a partition separating two nodes from three nodes, only the 3-node partition retains write quorum capability.");

  const techChapters = [
    {
      title: "CHAPTER 2: MEMORY MANAGEMENT AND GARBAGE COLLECTION IN RUST AND C++",
      paragraphs: [
        "2.1 Zero-Cost Abstractions and RAII Mechanics. Resource Acquisition Is Initialization (RAII) ensures that heap allocations, socket handles, and mutex locks are automatically reclaimed when ownership scopes expire.",
        "2.2 Memory Safety without Garbage Collection. Rust's borrow checker validates ownership, mutable references, and lifetime bounds at compile time. By rejecting aliased mutability, data races are rendered structurally impossible during execution.",
        "2.3 Cache Line Alignment and False Sharing. When multiple CPU cores modify adjacent byte ranges residing on the same 64-byte cache line, hardware cache coherency protocols cause bus invalidation storms."
      ]
    },
    {
      title: "CHAPTER 3: DATABASE INDEXING: LSM-TREES VERSUS B+ TREES",
      paragraphs: [
        "3.1 Write-Heavy Workloads and Log-Structured Merge Trees. LSM-Tree storage engines buffer incoming writes in memory tables (MemTables) while appending entries to a write-ahead log (WAL) for durability.",
        "3.2 SSTable Compaction Strategies. As MemTables flush to disk, sorted string tables (SSTables) accumulate across level tiers. Size-tiered compaction merges tables of comparable size, reducing read amplification at the expense of write amplification.",
        "3.3 Random Read Optimization with Bloom Filters. To prevent costly disk seeks for non-existent keys, probabilistic Bloom filter bit arrays are loaded into RAM to check set membership in O(1) time."
      ]
    },
    {
      title: "CHAPTER 4: HIGH-THROUGHPUT NETWORKING WITH GRPC AND PROTOBUF",
      paragraphs: [
        "4.1 HTTP/2 Multiplexing over Single TCP Connections. gRPC utilizes HTTP/2 binary framing to send multiple concurrent request/response streams over a single established TCP socket.",
        "4.2 Protocol Buffer Serialization Efficiency. Unlike JSON or XML which incur parsing overhead from string tokens, Protocol Buffers compile fields into varint-encoded field tags and wire-type byte streams.",
        "4.3 Streaming RPC Architecture. Bi-directional streaming allows client and server endpoints to exchange asynchronous streams of data chunks without waiting for request-reply roundtrips."
      ]
    },
    {
      title: "CHAPTER 5: KUBERNETES CONTAINER ORCHESTRATION AND INGRESS ROUTING",
      paragraphs: [
        "5.1 Control Plane Component Operations. The Kubernetes API server acts as the centralized gateway for state reconciliation. Controllers observe etcd configuration changes and drive pod allocations across worker nodes.",
        "5.2 CNI Network Fabrics and eBPF Packet Filtering. Modern Kubernetes clusters leverage eBPF programs loaded directly into the Linux kernel to bypass iptables overhead and route packet flows with minimal latency.",
        "5.3 Rolling Deployments and Readiness Probes. Deployment controllers manage gradual pod replacements, evaluating liveness and readiness HTTP probes before routing ingress traffic to new replicas."
      ]
    }
  ];

  // Repeat and expand chapters to reach ~30 pages (13,000+ words) of technical manual text
  for (let round = 1; round <= 10; round++) {
    for (const chap of techChapters) {
      p.push(`${chap.title} (Module Architecture Deep-Dive Section ${round})`);
      for (const para of chap.paragraphs) {
        p.push(`${para} (Module Architecture Deep-Dive ${round}): In production benchmark deployments, platform engineers must measure end-to-end latency metrics, P99 tail latency distributions, throughput IOPS limits, garbage collection pause intervals, and CPU instruction cache misses. System configuration flags should be tuned in accordance with benchmark trace logs.`);
        p.push(`Detailed implementation and operations handbook notes for Module Architecture Deep-Dive ${round}: Ensure all background worker thread pools specify explicit task queue depth caps to prevent out-of-memory (OOM) kernel panics during high-concurrency peak traffic bursts. Network socket buffers and TCP window scaling parameters must be tuned to match hardware interface bandwidth.`);
        p.push(`Sub-component technical documentation section ${round}.${para.slice(0, 3)}: The memory management subsystem coordinates with kernel page allocators to minimize fragmentation across long-running daemon execution runs.`);
      }
    }
  }

  return p;
}

// Generate the physical .docx test files
async function main() {
  const outputDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileAParagraphs = generateFileALegalDocxParagraphs();
  const fileBParagraphs = generateFileBNonLegalDocxParagraphs();

  const fileABuffer = buildDocxFromTextParagraphs(fileAParagraphs);
  const fileBBuffer = buildDocxFromTextParagraphs(fileBParagraphs);

  const fileAPath = path.join(outputDir, 'File_A_Genuine_30Page_Legal_Agreement.docx');
  const fileBPath = path.join(outputDir, 'File_B_NonLegal_30Page_Tech_Manual.docx');

  fs.writeFileSync(fileAPath, fileABuffer);
  fs.writeFileSync(fileBPath, fileBBuffer);

  const totalWordsA = fileAParagraphs.join(' ').split(/\s+/).length;
  const totalWordsB = fileBParagraphs.join(' ').split(/\s+/).length;

  console.log(`\n✅ Generated 30-page test files successfully!`);
  console.log(`   File A (Legal): ${fileAPath} | Size: ${fileABuffer.length} bytes | Words: ~${totalWordsA}`);
  console.log(`   File B (Non-Legal): ${fileBPath} | Size: ${fileBBuffer.length} bytes | Words: ~${totalWordsB}`);
}

if (process.argv[1]?.includes('generate_30page_docx_files')) {
  main().catch(console.error);
}
