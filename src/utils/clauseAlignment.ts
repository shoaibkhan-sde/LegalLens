import { SimplifiedClause, AlignedClausePair, ClauseType } from '../types/schemas.js';

// Simple TF-IDF / Token Cosine Similarity calculation for clause text matching
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function calculateCosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const freqA: Record<string, number> = {};
  const freqB: Record<string, number> = {};

  tokensA.forEach((t) => (freqA[t] = (freqA[t] || 0) + 1));
  tokensB.forEach((t) => (freqB[t] = (freqB[t] || 0) + 1));

  const allWords = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  allWords.forEach((word) => {
    const a = freqA[word] || 0;
    const b = freqB[word] || 0;
    dotProduct += a * b;
    magA += a * a;
    magB += b * b;
  });

  if (magA === 0 || magB === 0) return 0;
  return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
}

function getNormalizedCategory(clause: SimplifiedClause, index: number): ClauseType {
  const typeStr = (clause.clause_type || '').toLowerCase();
  const titleStr = (clause.title || '').toLowerCase();

  const isPreambleOrRecital =
    index === 0 ||
    typeStr.includes('preamble') ||
    typeStr.includes('parties') ||
    typeStr.includes('recital') ||
    titleStr.includes('preamble') ||
    titleStr.includes('recital') ||
    titleStr.includes('parties') ||
    titleStr.includes('this agreement') ||
    titleStr.includes('agreement') ||
    titleStr.includes('terms of service');

  if (
    isPreambleOrRecital &&
    !typeStr.includes('term & termination') &&
    !typeStr.includes('indemnity') &&
    !typeStr.includes('non-compete') &&
    !typeStr.includes('penalty') &&
    !typeStr.includes('payment')
  ) {
    return 'parties & recitals' as ClauseType;
  }

  return clause.clause_type;
}

export function alignClauses(
  clausesA: SimplifiedClause[],
  clausesB: SimplifiedClause[]
): {
  alignedPairs: AlignedClausePair[];
  aOnlyClauses: SimplifiedClause[];
  bOnlyClauses: SimplifiedClause[];
  pairsNeedingDiff: AlignedClausePair[];
} {
  const alignedPairs: AlignedClausePair[] = [];
  const usedBIds = new Set<string>();
  const usedAIds = new Set<string>();

  // Group clauses by effective category
  const typeMapA = new Map<ClauseType, SimplifiedClause[]>();
  const typeMapB = new Map<ClauseType, SimplifiedClause[]>();

  clausesA.forEach((c, idx) => {
    const cat = getNormalizedCategory(c, idx);
    const list = typeMapA.get(cat) || [];
    list.push(c);
    typeMapA.set(cat, list);
  });

  clausesB.forEach((c, idx) => {
    const cat = getNormalizedCategory(c, idx);
    const list = typeMapB.get(cat) || [];
    list.push(c);
    typeMapB.set(cat, list);
  });

  // Collect all unique clause categories across both documents
  const allCategories = new Set<ClauseType>([...Array.from(typeMapA.keys()), ...Array.from(typeMapB.keys())]);

  allCategories.forEach((cat) => {
    const aList = typeMapA.get(cat) || [];
    const bList = typeMapB.get(cat) || [];

    if (aList.length > 0 && bList.length > 0) {
      // Build candidate matches within the same category
      const candidatePairs: Array<{
        clauseA: SimplifiedClause;
        clauseB: SimplifiedClause;
        similarity: number;
      }> = [];

      aList.forEach((cA) => {
        bList.forEach((cB) => {
          const sim = calculateCosineSimilarity(
            cA.original_text + ' ' + (cA.simple_explanation || '') + ' ' + cA.title,
            cB.original_text + ' ' + (cB.simple_explanation || '') + ' ' + cB.title
          );
          candidatePairs.push({ clauseA: cA, clauseB: cB, similarity: sim });
        });
      });

      // Sort candidate pairs by similarity descending so highest similarity matches first
      candidatePairs.sort((x, y) => y.similarity - x.similarity);

      candidatePairs.forEach(({ clauseA, clauseB, similarity }) => {
        if (usedAIds.has(clauseA.id) || usedBIds.has(clauseB.id)) return;

        // Allow match for same category if similarity >= 0.05 or if both are single/preamble entries
        if (similarity >= 0.05 || cat === 'parties & recitals' || (aList.length === 1 && bList.length === 1)) {
          usedAIds.add(clauseA.id);
          usedBIds.add(clauseB.id);

          alignedPairs.push({
            id: `pair_${clauseA.id}_${clauseB.id}`,
            clause_type: cat,
            doc_a_clause: clauseA,
            doc_b_clause: clauseB,
            status: 'matched',
            similarity_score: Math.round(similarity * 100) / 100,
            risk_delta:
              clauseA.risk_level === clauseB.risk_level
                ? clauseA.risk_level === 'high'
                  ? 'both_risky'
                  : 'equal'
                : clauseA.risk_level === 'low'
                ? 'a_safer'
                : clauseB.risk_level === 'low'
                ? 'b_safer'
                : 'equal',
          });
        }
      });
    }
  });

  // Cross-category semantic backup pass for remaining unmatched clauses if similarity is high (>= 0.35)
  const remainingA = clausesA.filter((cA) => !usedAIds.has(cA.id));
  const remainingB = clausesB.filter((cB) => !usedBIds.has(cB.id));

  const crossCandidates: Array<{
    clauseA: SimplifiedClause;
    clauseB: SimplifiedClause;
    similarity: number;
  }> = [];

  remainingA.forEach((cA) => {
    remainingB.forEach((cB) => {
      const sim = calculateCosineSimilarity(
        cA.original_text + ' ' + (cA.simple_explanation || '') + ' ' + cA.title,
        cB.original_text + ' ' + (cB.simple_explanation || '') + ' ' + cB.title
      );
      if (sim >= 0.35) {
        crossCandidates.push({ clauseA: cA, clauseB: cB, similarity: sim });
      }
    });
  });

  crossCandidates.sort((x, y) => y.similarity - x.similarity);

  crossCandidates.forEach(({ clauseA, clauseB, similarity }) => {
    if (usedAIds.has(clauseA.id) || usedBIds.has(clauseB.id)) return;
    usedAIds.add(clauseA.id);
    usedBIds.add(clauseB.id);

    alignedPairs.push({
      id: `pair_${clauseA.id}_${clauseB.id}`,
      clause_type: clauseA.clause_type || clauseB.clause_type,
      doc_a_clause: clauseA,
      doc_b_clause: clauseB,
      status: 'matched',
      similarity_score: Math.round(similarity * 100) / 100,
      risk_delta:
        clauseA.risk_level === clauseB.risk_level
          ? clauseA.risk_level === 'high'
            ? 'both_risky'
            : 'equal'
          : clauseA.risk_level === 'low'
          ? 'a_safer'
          : clauseB.risk_level === 'low'
          ? 'b_safer'
          : 'equal',
    });
  });

  // Unmatched in A -> a_only with cA's true clause_type
  const aOnlyClauses = clausesA.filter((cA) => !usedAIds.has(cA.id));
  aOnlyClauses.forEach((cA) => {
    alignedPairs.push({
      id: `pair_a_only_${cA.id}`,
      clause_type: cA.clause_type,
      doc_a_clause: cA,
      status: 'a_only',
      similarity_score: 0,
      risk_delta: cA.risk_level === 'high' ? 'both_risky' : 'a_safer',
    });
  });

  // Unmatched in B -> b_only with cB's true clause_type
  const bOnlyClauses = clausesB.filter((cB) => !usedBIds.has(cB.id));
  bOnlyClauses.forEach((cB) => {
    alignedPairs.push({
      id: `pair_b_only_${cB.id}`,
      clause_type: cB.clause_type,
      doc_b_clause: cB,
      status: 'b_only',
      similarity_score: 0,
      risk_delta: cB.risk_level === 'high' ? 'both_risky' : 'b_safer',
    });
  });

  const pairsNeedingDiff = alignedPairs.filter((p) => p.status === 'matched');

  return {
    alignedPairs,
    aOnlyClauses,
    bOnlyClauses,
    pairsNeedingDiff,
  };
}
