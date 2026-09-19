import { synthesizeDocumentAnalysis } from '../services/astraBackend';
import { Guard1InputGate, SimplifiedClause } from '../../../src/types/schemas';

const canaryGuard1: Guard1InputGate = {
  is_legal_document: true,
  category: 'employment contract',
  confidence: 0.99,
};

const canaryClause: SimplifiedClause = {
  id: 'clause_canary_1',
  clause_number: '1',
  clause_type: 'notice period',
  title: 'NOTICE PERIOD CANARY',
  original_text: 'Post-confirmation, either party shall provide 90 (ninety) days written notice to terminate employment.',
  simple_explanation: null,
  very_simple_explanation: null,
  risk_level: 'watch_out',
  icon_name: 'Clock',
  one_line_consequence: 'Requires 90 days written notice before exit.',
};

async function test() {
  const sampleText = `EMPLOYMENT AGREEMENT\n1. NOTICE PERIOD: Post-confirmation, either party shall provide 90 (ninety) days written notice to terminate employment.`;
  const result = await synthesizeDocumentAnalysis(sampleText, [canaryClause], canaryGuard1, undefined, 'en');
  console.log('RESULT CLAUSES:', JSON.stringify(result.clauses, null, 2));
}

test();
