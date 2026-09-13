// LegalLens - Core Schema Definitions & Taxonomy Types

export type DocumentCategory =
  | 'rental/lease agreement'
  | 'sale agreement/deed'
  | 'employment contract'
  | 'NDA'
  | 'MOU'
  | 'service/consultancy agreement'
  | 'partnership/LLP deed'
  | "founders'/shareholders' agreement"
  | 'loan agreement/promissory note'
  | 'power of attorney'
  | 'franchise agreement'
  | 'vendor/supplier agreement'
  | 'gift deed'
  | 'insurance policy'
  | 'affidavit'
  | 'other';

export const DOCUMENT_CATEGORY_ENUM: DocumentCategory[] = [
  'rental/lease agreement',
  'sale agreement/deed',
  'employment contract',
  'NDA',
  'MOU',
  'service/consultancy agreement',
  'partnership/LLP deed',
  "founders'/shareholders' agreement",
  'loan agreement/promissory note',
  'power of attorney',
  'franchise agreement',
  'vendor/supplier agreement',
  'gift deed',
  'insurance policy',
  'affidavit',
  'other',
];

export type ClauseType =
  | 'parties & recitals'
  | 'term & termination'
  | 'payment/consideration'
  | 'security deposit'
  | 'rent escalation'
  | 'confidentiality'
  | 'indemnity'
  | 'limitation of liability'
  | 'force majeure'
  | 'non-compete/non-solicitation'
  | 'assignment'
  | 'renewal'
  | 'notice period'
  | 'dispute resolution/arbitration'
  | 'governing law & jurisdiction'
  | 'stamp duty & registration'
  | 'penalty/liquidated damages'
  | 'other';

export const CLAUSE_TYPE_ENUM: ClauseType[] = [
  'parties & recitals',
  'term & termination',
  'payment/consideration',
  'security deposit',
  'rent escalation',
  'confidentiality',
  'indemnity',
  'limitation of liability',
  'force majeure',
  'non-compete/non-solicitation',
  'assignment',
  'renewal',
  'notice period',
  'dispute resolution/arbitration',
  'governing law & jurisdiction',
  'stamp duty & registration',
  'penalty/liquidated damages',
  'other',
];

export type RiskLevel = 'low' | 'medium' | 'high';

export interface Guard1InputGate {
  is_legal_document: boolean;
  category: DocumentCategory;
  confidence: number;
  rejection_reason?: string;
}

export interface SimplifiedClause {
  id: string;
  clause_number?: string;
  clause_type: ClauseType;
  title: string;
  original_text: string;
  simple_explanation: string; // Plain language
  very_simple_explanation: string; // Ultra-simple plain language
  risk_level: RiskLevel;
  icon_name: string; // Lucide icon name for visual understanding
  one_line_consequence: string; // Color + Icon + Plain language consequence
  obligations?: string[];
  deadlines?: string[];
}

export interface InternalContradiction {
  id: string;
  clause_a_id: string;
  clause_b_id: string;
  description: string;
  explanation: string;
  risk_level: RiskLevel;
}

export interface DocumentAnalysisResult {
  guard1: Guard1InputGate;
  document_title: string;
  category: DocumentCategory;
  overall_risk_score: number; // 0-100 score
  summary_simple: string;
  summary_very_simple: string;
  clauses: SimplifiedClause[];
  contradictions: InternalContradiction[];
  checklist: ChecklistArtifact;
  options_next_steps: NextStepsOption[];
  lawyer_briefing: LawyerBriefingArtifact;
  disclaimer: string;
}

export interface ChecklistItem {
  id: string;
  category: 'deadline' | 'obligation' | 'notice_period' | 'stamp_duty' | 'warning';
  title: string;
  description: string;
  due_date_or_timeframe?: string;
  action_required: string;
  associated_clause_id?: string;
}

export interface ChecklistArtifact {
  title: string;
  items: ChecklistItem[];
  stamp_duty_required: boolean;
  stamp_duty_note?: string;
  disclaimer: string;
}

export interface NextStepsOption {
  id: string;
  title: string;
  description: string;
  benefit: string;
  tradeoff?: string;
}

export interface FlaggedIssue {
  clause_id: string;
  clause_title: string;
  concern: string;
  suggested_clause_edit?: string;
}

export interface LawyerBriefingArtifact {
  document_summary: string;
  flagged_issues: FlaggedIssue[];
  questions_to_ask_lawyer: string[];
  missing_protective_clauses: string[];
  recommended_next_steps: string[];
  disclaimer: string;
}

export interface AlignedClausePair {
  id: string;
  clause_type: ClauseType;
  doc_a_clause?: SimplifiedClause;
  doc_b_clause?: SimplifiedClause;
  status: 'matched' | 'a_only' | 'b_only';
  similarity_score: number;
  difference_summary?: string;
  risk_delta?: 'a_safer' | 'b_safer' | 'equal' | 'both_risky';
}

export interface ComparisonResult {
  doc_a_title: string;
  doc_b_title: string;
  aligned_pairs: AlignedClausePair[];
  a_only_clauses: SimplifiedClause[];
  b_only_clauses: SimplifiedClause[];
  key_differences_summary: string;
  winner_recommendation?: string;
  disclaimer: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  cited_clause_ids?: string[];
  timestamp: string;
  is_flagged_unsafe?: boolean;
  safety_reason?: string;
}

export interface ServerConfigStatus {
  isConfigured: boolean;
  demoMode: boolean;
}
