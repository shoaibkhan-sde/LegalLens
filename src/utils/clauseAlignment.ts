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

  // Group clauses by type
  const typeMapA = new Map<ClauseType, SimplifiedClause[]>();
  const typeMapB = new Map<ClauseType, SimplifiedClause[]>();

  clausesA.forEach((c) => {
    const list = typeMapA.get(c.clause_type) || [];
    list.push(c);
    typeMapA.set(c.clause_type, list);
  });

  clausesB.forEach((c) => {
    const list = typeMapB.get(c.clause_type) || [];
    list.push(c);
    typeMapB.set(c.clause_type, list);
  });

  // For each clause type present in A
  typeMapA.forEach((aList, type) => {
    const bList = typeMapB.get(type) || [];

    aList.forEach((clauseA) => {
      let bestMatch: SimplifiedClause | null = null;
      let bestSim = 0;

      bList.forEach((clauseB) => {
        if (usedBIds.has(clauseB.id)) return;
        const sim = calculateCosineSimilarity(
          clauseA.original_text + ' ' + clauseA.simple_explanation,
          clauseB.original_text + ' ' + clauseB.simple_explanation
        );
        if (sim > bestSim) {
          bestSim = sim;
          bestMatch = clauseB;
        }
      });

      // If good match found within same clause_type OR if it's the only one of this type
      if (bestMatch && (bestSim >= 0.25 || (aList.length === 1 && bList.length === 1))) {
        const match = bestMatch as SimplifiedClause;
        usedAIds.add(clauseA.id);
        usedBIds.add(match.id);

        const pair: AlignedClausePair = {
          id: `pair_${clauseA.id}_${match.id}`,
          clause_type: type,
          doc_a_clause: clauseA,
          doc_b_clause: match,
          status: 'matched',
          similarity_score: Math.round(bestSim * 100) / 100,
          risk_delta:
            clauseA.risk_level === match.risk_level
              ? clauseA.risk_level === 'high'
                ? 'both_risky'
                : 'equal'
              : clauseA.risk_level === 'low'
              ? 'a_safer'
              : match.risk_level === 'low'
              ? 'b_safer'
              : 'equal',
        };
        alignedPairs.push(pair);
      }
    });
  });

  // Unmatched in A -> a_only
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

  // Unmatched in B -> b_only
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

  // Pairs needing deeper LLM diff synthesis
  const pairsNeedingDiff = alignedPairs.filter((p) => p.status === 'matched');

  return {
    alignedPairs,
    aOnlyClauses,
    bOnlyClauses,
    pairsNeedingDiff,
  };
}
