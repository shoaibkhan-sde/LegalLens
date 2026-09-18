import { DocumentAnalysisResult } from '../../../src/types/schemas';

export const SAMPLE_RENTAL_AGREEMENT: DocumentAnalysisResult = {
  guard1: {
    is_legal_document: true,
    category: 'rental/lease agreement',
    confidence: 0.98,
  },
  document_title: 'Residential Tenancy Agreement (Bengaluru, Karnataka)',
  category: 'rental/lease agreement',
  overall_risk_score: 65, // Medium-High risk due to 10% annual escalation & 60-day notice penalty
  summary_simple:
    '11-month residential rental contract for a 2BHK apartment. Requires a security deposit of ₹1,50,000, monthly rent of ₹25,000, and mandatory 60-day notice before moving out.',
  summary_very_simple:
    'This is a home rent paper for 11 months. You pay ₹25,000 rent every month and give ₹1,50,000 advance. You must inform the owner 2 months before leaving.',
  clauses: [
    {
      id: 'clause_1',
      clause_number: '1',
      clause_type: 'parties & recitals',
      title: 'Parties & Premises',
      original_text:
        'This Agreement is made on 1st April 2026 between Mr. Ramesh Sharma (Lessor) and Mr. Ankit Kumar (Lessee) for Flat 302, Green Acres Apartment, Indiranagar, Bengaluru.',
      simple_explanation:
        'Identifies the landlord (Ramesh Sharma), tenant (Ankit Kumar), and the property located at Indiranagar, Bengaluru.',
      very_simple_explanation:
        'This names the house owner Ramesh and tenant Ankit for Flat 302 in Indiranagar.',
      risk_level: 'low',
      icon_name: 'Users',
      one_line_consequence: 'Safe clause: Confirms who owns the house and who lives there.',
    },
    {
      id: 'clause_2',
      clause_number: '2',
      clause_type: 'security deposit',
      title: 'Security Deposit & Return Conditions',
      original_text:
        'The Lessee shall pay an interest-free refundable security deposit of ₹1,50,000. The Lessor shall refund the deposit within 45 days after vacant possession, subject to deductions for painting charges (fixed 1 month rent) and damages.',
      simple_explanation:
        'Deposit is ₹1.5 Lakhs, returned 45 days after moving out. Note: Landlord will automatically deduct ₹25,000 for painting, plus any repair costs.',
      very_simple_explanation:
        'You give ₹1.5 Lakh advance. When leaving, landlord takes away ₹25,000 for painting costs and gives back remaining after 45 days.',
      risk_level: 'high',
      icon_name: 'ShieldAlert',
      one_line_consequence:
        'High Risk: You automatically lose ₹25,000 from deposit for painting, and waiting 45 days for refund is unusually long.',
      obligations: ['Pay ₹1,50,000 deposit before move-in', 'Allow 1 month rent deduction for painting'],
      deadlines: ['Deposit refund within 45 days of vacancy'],
    },
    {
      id: 'clause_3',
      clause_number: '3',
      clause_type: 'rent & payment',
      title: 'Rent Escalation Clause',
      original_text:
        'The monthly rent shall be ₹25,000 payable on or before the 5th of each month. Upon completion of 11 months, the rent shall automatically increase by 10%.',
      simple_explanation:
        'Rent is ₹25,000 due by the 5th of every month. Rent goes up by 10% (to ₹27,500) if renewed after 11 months.',
      very_simple_explanation:
        'Pay ₹25,000 rent before 5th date each month. After 11 months, rent increases to ₹27,500.',
      risk_level: 'watch_out',
      icon_name: 'TrendingUp',
      one_line_consequence:
        'Watch Out: 10% rent increase is higher than standard 5% annual market rate in Bengaluru.',
      deadlines: ['Monthly rent due by 5th of every month'],
    },
    {
      id: 'clause_4',
      clause_number: '4',
      clause_type: 'notice period',
      title: 'Lock-in Period & Termination Notice',
      original_text:
        'There shall be a lock-in period of 6 months. If the Lessee vacates during the lock-in, the security deposit shall be forfeited. Thereafter, either party may terminate by giving 60 days written notice.',
      simple_explanation:
        'You cannot leave in the first 6 months without losing your entire ₹1.5 Lakh deposit. After 6 months, you must give 2 months notice.',
      very_simple_explanation:
        'You cannot leave for 6 months. If you leave early, landlord keeps all your deposit money. After 6 months, tell landlord 2 months before leaving.',
      risk_level: 'high',
      icon_name: 'AlertOctagon',
      one_line_consequence:
        'High Risk: Leaving before 6 months costs your entire ₹1.5 Lakh deposit.',
      obligations: ['Stay at least 6 months (lock-in)', 'Give 60 days written notice before moving'],
      deadlines: ['6 months lock-in period', '60 days written notice'],
    },
    {
      id: 'clause_5',
      clause_number: '5',
      clause_type: 'stamp duty & registration',
      title: 'Stamp Duty & Legal Registration',
      original_text:
        'This agreement is executed on ₹100 non-judicial stamp paper. Registration under the Registration Act 1908 is opted out by mutual agreement.',
      simple_explanation:
        'Agreement is printed on ₹100 stamp paper but NOT registered with the Sub-Registrar office.',
      very_simple_explanation:
        'This paper is made on ₹100 stamp paper. It is not registered at government court office.',
      risk_level: 'watch_out',
      icon_name: 'FileCheck',
      one_line_consequence:
        'Watch Out: Under Karnataka Stamp Rules, lease agreements exceeding 11 months require formal registration to be admissible in court.',
    },
  ],
  contradictions: [
    {
      id: 'contra_1',
      clause_a_id: 'clause_2',
      clause_b_id: 'clause_4',
      clause_a_title: 'Security Deposit & Return Conditions',
      clause_b_title: 'Lock-in Period & Termination Notice',
      clause_a_obligation: 'Deposit returned within 45 days after vacancy.',
      clause_b_obligation: 'Entire deposit forfeited if leaving during lock-in period.',
      description: 'Deposit Return vs Lock-in Penalty Conflict',
      explanation:
        'Clause 2 states the deposit is refundable within 45 days, but Clause 4 completely forfeits the deposit if vacating within 6 months. Ensure lock-in terms are clearly understood before signing.',
      risk_level: 'high',
    },
  ],
  checklist: {
    title: 'Tenant Action Items & Deadline Checklist',
    stamp_duty_required: true,
    stamp_duty_note: 'Printed on ₹100 stamp paper. In Karnataka, 11-month leases are standard on ₹100-200 stamp paper.',
    items: [
      {
        id: 'chk_1',
        category: 'deadline',
        title: 'Monthly Rent Payment',
        description: 'Pay ₹25,000 monthly rent into Lessor bank account.',
        due_date_or_timeframe: '5th of every month',
        action_required: 'Set up standing auto-pay reminder',
        associated_clause_id: 'clause_3',
      },
      {
        id: 'chk_2',
        category: 'obligation',
        title: '6-Month Minimum Lock-in',
        description: 'Do not vacate before 6 months to avoid forfeiting deposit.',
        due_date_or_timeframe: 'First 6 months',
        action_required: 'Mark lock-in end date on calendar',
        associated_clause_id: 'clause_4',
      },
      {
        id: 'chk_3',
        category: 'notice_period',
        title: '60-Day Vacating Notice',
        description: 'Provide written email/letter notice 60 days before moving out.',
        due_date_or_timeframe: '60 days prior to lease end',
        action_required: 'Send written notice via email or WhatsApp',
        associated_clause_id: 'clause_4',
      },
      {
        id: 'chk_4',
        category: 'warning',
        title: 'Fixed Painting Deduction',
        description: '₹25,000 (1 month rent) will be deducted from your deposit upon exit.',
        due_date_or_timeframe: 'Upon moving out',
        action_required: 'Request landlord written inspection photos upon move-in',
        associated_clause_id: 'clause_2',
      },
    ],
    disclaimer: 'Informational checklist generated automatically. Verify dates with your contract.',
  },
  options_next_steps: [
    {
      id: 'opt_1',
      title: 'Negotiate Painting Deduction',
      description: 'Ask landlord to replace the 1-month fixed deduction with "actual damage repairs only" or cap painting at ₹10,000.',
      benefit: 'Saves you ₹15,000 to ₹25,000 when moving out.',
      tradeoff: 'Landlord may ask for a slightly higher monthly rent in return.',
    },
    {
      id: 'opt_2',
      title: 'Reduce Notice Period to 30 Days',
      description: 'Request reducing the notice period from 60 days to 30 days post lock-in.',
      benefit: 'Gives you quick flexibility if job location changes.',
      tradeoff: 'Landlord also gains 30-day notice right to ask you to move.',
    },
    {
      id: 'opt_3',
      title: 'Inspect & Photograph Property on Day 1',
      description: 'Take high-resolution video and photos of existing wall paint and fittings on move-in day and email them to landlord.',
      benefit: 'Prevents unfair damage claims when requesting deposit refund.',
    },
  ],
  lawyer_briefing: {
    document_summary: 'Residential rental agreement for 11 months in Bengaluru with ₹1.5L deposit and ₹25k rent.',
    flagged_issues: [
      {
        clause_id: 'clause_2',
        clause_title: 'Security Deposit & Return Conditions',
        concern: 'Automatic deduction of 1 month rent (₹25k) for painting regardless of wear and tear, and long 45-day refund window.',
        suggested_clause_edit: 'The Lessor shall refund the deposit within 15 days, deducting only actual itemized repair costs supported by bills.',
      },
      {
        clause_id: 'clause_4',
        clause_title: 'Lock-in Period & Termination Notice',
        concern: 'Total deposit forfeiture during 6-month lock-in period is harsh under Indian Contract Act Section 74.',
        suggested_clause_edit: 'In case of early exit during lock-in, Lessee shall pay 1 month rent as liquidated damages instead of full deposit forfeiture.',
      },
    ],
    questions_to_ask_lawyer: [
      'Is a 100% deposit forfeiture legally enforceable under Indian contract law for residential tenancy?',
      'Can the landlord legally mandate a full 1-month painting deduction if the tenant stays for less than 1 year?',
      'Does non-registration of an 11-month agreement impact my rights under the Karnataka Rent Control provisions?',
    ],
    missing_protective_clauses: [
      'Missing Force Majeure / Pandemic relief clause (no rent suspension option during disasters)',
      'Missing Landlord Repair & Maintenance obligation timeline (e.g. fixing plumbing leaks within 48 hours)',
    ],
    recommended_next_steps: [
      'Share this briefing packet with a legal advisor or local tenant assistance center.',
      'Propose written amendments to Clause 2 (deposit refund timeline) and Clause 4 (lock-in penalty).',
    ],
    disclaimer: 'This briefing packet is for informational preparation before meeting an advocate under the Advocates Act, 1961.',
  },
  disclaimer: 'LegalLens provides AI-assisted analysis for informational purposes only. It does not constitute legal advice.',
};

export const SAMPLE_EMPLOYMENT_CONTRACT: DocumentAnalysisResult = {
  guard1: {
    is_legal_document: true,
    category: 'employment contract',
    confidence: 0.96,
  },
  document_title: 'Employment Offer & Service Agreement (Software Engineer)',
  category: 'employment contract',
  overall_risk_score: 72, // High risk due to 2-year non-compete & ₹3 Lakh training bond penalty
  summary_simple:
    'Full-time employment contract for Software Engineer with annual CTC of ₹12,00,000. Contains a 2-year non-compete clause, a ₹3,00,000 service bond, and a 90-day notice period.',
  summary_very_simple:
    'This is a job paper for Software Engineer paying ₹12 Lakh yearly. Warning: It has a ₹3 Lakh penalty bond if you leave early and 3 months notice requirement.',
  clauses: [
    {
      id: 'emp_1',
      clause_number: '1',
      clause_type: 'parties & recitals',
      title: 'Employment Offer & Role',
      original_text:
        'TechNova Solutions Pvt Ltd hereby appoints Employee as Senior Frontend Engineer effective 15th May 2026 at its Gurugram office.',
      simple_explanation: 'Confirms job title as Senior Frontend Engineer starting May 15, 2026 at Gurugram.',
      very_simple_explanation: 'This names your job title and joining date in Gurugram.',
      risk_level: 'low',
      icon_name: 'Briefcase',
      one_line_consequence: 'Safe clause: Confirms your job role and joining office.',
    },
    {
      id: 'emp_2',
      clause_number: '2',
      clause_type: 'penalty/liquidated damages',
      title: 'Service Bond & Early Exit Penalty',
      original_text:
        'Employee agrees to serve the company for a minimum of 24 months. If Employee resigns prior to 24 months, Employee shall reimburse ₹3,00,000 as liquidated training expenses.',
      simple_explanation:
        'You must stay for 2 years. Leaving earlier requires paying the company ₹3 Lakhs as "training costs".',
      very_simple_explanation:
        'You must work here for 2 years. If you leave before 2 years, company asks you to pay ₹3 Lakhs penalty.',
      risk_level: 'high',
      icon_name: 'ShieldAlert',
      one_line_consequence:
        'High Risk: Under Section 27 of the Indian Contract Act, blanket employment bonds without proof of actual training cost are unenforceable.',
      obligations: ['Serve 24 months minimum tenure', 'Pay ₹3,00,000 if resigning early'],
      deadlines: ['24 months minimum service tenure'],
    },
    {
      id: 'emp_3',
      clause_number: '3',
      clause_type: 'use & restrictions',
      title: 'Post-Employment Non-Compete Restriction',
      original_text:
        'During employment and for 24 months post-termination, Employee shall not work for any competitor or start any competing business in India.',
      simple_explanation:
        'Bans you from working at any competitor or rival tech company for 2 full years after leaving.',
      very_simple_explanation:
        'You cannot join any rival company for 2 years after leaving this job.',
      risk_level: 'high',
      icon_name: 'AlertOctagon',
      one_line_consequence:
        'High Risk: Indian courts (Percept D’Mark v. Zaheer Khan) consistently hold post-employment non-compete clauses VOID under Section 27.',
    },
    {
      id: 'emp_4',
      clause_number: '4',
      clause_type: 'notice period',
      title: 'Notice Period & Buyout Option',
      original_text:
        'Either party may terminate employment by giving 90 days prior written notice or basic pay in lieu thereof, subject to company approval.',
      simple_explanation:
        'Requires 3 months notice to resign. Company must approve if you want to pay money instead of serving notice.',
      very_simple_explanation:
        'Tell company 3 months before resigning. Paying money to leave early requires company approval.',
      risk_level: 'watch_out',
      icon_name: 'Clock',
      one_line_consequence:
        'Watch Out: 90-day notice period is long and can delay joining your next employer.',
      obligations: ['Serve 90 days notice upon resignation'],
      deadlines: ['90 days notice requirement'],
    },
  ],
  contradictions: [],
  checklist: {
    title: 'Employee Onboarding & Tenure Checklist',
    stamp_duty_required: false,
    items: [
      {
        id: 'emp_chk_1',
        category: 'obligation',
        title: '2-Year Service Commitment',
        description: 'Bond penalty applies if leaving before 24 months.',
        due_date_or_timeframe: 'First 2 years of employment',
        action_required: 'Discuss bond enforceability with legal advisor before signing',
        associated_clause_id: 'emp_2',
      },
      {
        id: 'emp_chk_2',
        category: 'notice_period',
        title: '90-Day Resignation Notice',
        description: 'Provide written resignation 3 months in advance.',
        due_date_or_timeframe: '90 days prior to exit',
        action_required: 'Plan future job transitions 3 months ahead',
        associated_clause_id: 'emp_4',
      },
    ],
    disclaimer: 'Informational checklist generated automatically.',
  },
  options_next_steps: [
    {
      id: 'emp_opt_1',
      title: 'Request Removal of Post-Employment Non-Compete',
      description: 'Point out that post-employment non-competes are void under Section 27 of Indian Contract Act.',
      benefit: 'Ensures your right to work freely in your industry after leaving.',
    },
    {
      id: 'emp_opt_2',
      title: 'Negotiate Bond Reduction & Proration',
      description: 'Ask for the ₹3 Lakh bond to be prorated (e.g. ₹1.5L if leaving in year 2) and tied only to actual specialized training certificates.',
      benefit: 'Reduces financial liability if career changes occur.',
    },
  ],
  lawyer_briefing: {
    document_summary: 'Employment agreement with TechNova Solutions containing 2-year service bond and 2-year non-compete.',
    flagged_issues: [
      {
        clause_id: 'emp_2',
        clause_title: 'Service Bond & Early Exit Penalty',
        concern: 'Unreasonable ₹3 Lakh penalty without proof of actual expenditure by employer violates Section 27 and Section 74.',
      },
      {
        clause_id: 'emp_3',
        clause_title: 'Post-Employment Non-Compete Restriction',
        concern: 'Post-employment restraint of trade is strictly void in India.',
      },
    ],
    questions_to_ask_lawyer: [
      'Is the ₹3 Lakh service bond enforceable if the company fails to provide specialized overseas or certified training?',
      'Can the company withhold my Experience Letter or Relieving Letter if I contest the non-compete clause?',
    ],
    missing_protective_clauses: [
      'Missing explicit IP Assignment boundary (personal projects created outside work hours)',
      'Missing severance pay clause in case of layoff without cause',
    ],
    recommended_next_steps: [
      'Consult an employment advocate regarding non-enforceability of post-employment non-compete clauses.',
    ],
    disclaimer: 'Informational briefing packet for legal consultation.',
  },
  disclaimer: 'LegalLens provides AI-assisted analysis for informational purposes only. It does not constitute legal advice.',
};
