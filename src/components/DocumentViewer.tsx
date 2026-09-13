import React, { useEffect, useRef } from 'react';
import { FileText, Eye, CheckCircle2 } from 'lucide-react';
import { SimplifiedClause } from '../types/schemas';

interface DocumentViewerProps {
  documentTitle: string;
  category: string;
  clauses: SimplifiedClause[];
  highlightedClauseId?: string | null;
  onClauseSelect?: (clauseId: string) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentTitle,
  category,
  clauses,
  highlightedClauseId,
  onClauseSelect,
}) => {
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightedClauseId && clauseRefs.current[highlightedClauseId]) {
      const el = clauseRefs.current[highlightedClauseId];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedClauseId]);

  return (
    <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E7E1D3] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F6F1E7] text-[#B85C38] flex items-center justify-center border border-[#E7E1D3]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-[#1E1B17] line-clamp-1">{documentTitle}</h3>
            <span className="text-[10px] uppercase font-semibold text-[#6E6659] tracking-wider">
              {category} • Original Text
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-[11px] text-[#065F46] bg-[#D1FAE5] px-2.5 py-0.5 rounded border border-[#6EE7B7] font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Tap-to-Verify Linked</span>
        </div>
      </div>

      {/* Original Document Clauses Scrollable View */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[600px] text-xs font-mono leading-relaxed text-[#1E1B17]">
        {(clauses || []).map((c) => {
          const isHighlighted = highlightedClauseId === c.id;

          return (
            <div
              key={c.id}
              ref={(el) => {
                clauseRefs.current[c.id] = el;
              }}
              onClick={() => onClauseSelect?.(c.id)}
              className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                isHighlighted
                  ? 'bg-[#B85C38]/15 border-[#B85C38] text-[#1E1B17] clause-highlight-active'
                  : 'bg-[#F6F1E7] border-[#E7E1D3] hover:border-[#CBD5E1] text-[#1E1B17]'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 font-sans font-bold text-xs text-[#B85C38]">
                <span>
                  {c.clause_number ? `[Clause ${c.clause_number}] ` : ''}
                  {c.title}
                </span>
                <div className="flex items-center space-x-1 text-[10px] text-[#6E6659]">
                  <Eye className="w-3 h-3" />
                  <span>Verify</span>
                </div>
              </div>

              <p className="whitespace-pre-wrap font-sans text-[#1E1B17] leading-relaxed">{c.original_text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
