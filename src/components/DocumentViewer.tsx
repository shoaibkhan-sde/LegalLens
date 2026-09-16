import React, { useEffect, useRef } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { SimplifiedClause } from '../types/schemas';
import { getRiskStyle } from '../utils/risk';
import { useLanguage } from '../context/LanguageContext';

interface DocumentViewerProps {
  documentTitle: string;
  category: string;
  clauses: SimplifiedClause[];
  highlightedClauseId?: string | null;
  onClauseSelect?: (clauseId: string, index?: number) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentTitle,
  category,
  clauses,
  highlightedClauseId,
  onClauseSelect,
}) => {
  const { language } = useLanguage();
  const clauseRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightedClauseId && clauseRefs.current[highlightedClauseId] && containerRef.current) {
      const el = clauseRefs.current[highlightedClauseId];
      const container = containerRef.current;
      if (el) {
        const elTop = el.offsetTop;
        const elHeight = el.offsetHeight;
        const containerHeight = container.clientHeight;
        container.scrollTo({
          top: Math.max(0, elTop - containerHeight / 2 + elHeight / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedClauseId]);

  return (
    <div
      className="bg-[#FBF8F1] border-2 border-[#E7E1D3] rounded-[28px] p-4 sm:p-5 shadow-lg flex flex-col h-[440px] overflow-hidden transition-all duration-300"
      style={{
        boxShadow: '0 12px 32px -4px rgba(30, 27, 23, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Pinned Document Header */}
      <div className="flex items-center justify-between border-b border-[#E7E1D3] pb-3 mb-3 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#F6F1E7] text-[#B85C38] flex items-center justify-center border border-[#E7E1D3] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold font-heading text-[#1E1B17] truncate">{documentTitle}</h3>
            <span className="text-[10px] uppercase font-semibold text-[#6E6659] tracking-wider block truncate">
              {category} • Original Text
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-[11px] text-[#065F46] bg-[#D1FAE5] px-2.5 py-0.5 rounded-full border border-[#6EE7B7] font-extrabold shrink-0 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Linked</span>
        </div>
      </div>

      {/* Synchronized Document Clauses Scrollable View */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-2 space-y-3 text-xs font-mono leading-relaxed text-[#1E1B17] custom-scrollbar">
        {(clauses || []).map((c, idx) => {
          const isHighlighted = highlightedClauseId === c.id;
          const riskStyle = getRiskStyle(c.risk_level, language);
          const RiskIcon = riskStyle.icon;

          return (
            <div
              key={c.id}
              ref={(el) => {
                clauseRefs.current[c.id] = el;
              }}
              onClick={() => onClauseSelect?.(c.id, idx)}
              className={`p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer bg-[#FBF8F1] my-0.5 ${
                isHighlighted
                  ? 'border-[#B85C38] ring-1 ring-[#B85C38]/40 shadow-md scale-[1.002]'
                  : 'border-[#E7E1D3] hover:border-[#B85C38]/40 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2 font-sans font-extrabold text-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black shrink-0 ${
                      isHighlighted
                        ? 'bg-[#B85C38] text-white'
                        : 'bg-[#E7E1D3] text-[#1E1B17]'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="truncate text-[#1E1B17] font-bold">
                    {c.title}
                  </span>
                </div>

                {/* Same Risk Pill as ClauseCard */}
                <div
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs shrink-0 ${riskStyle.badgeBg}`}
                >
                  <RiskIcon className="w-3 h-3 shrink-0" />
                  <span>{riskStyle.label}</span>
                </div>
              </div>

              <p className="whitespace-pre-wrap font-sans text-[#1E1B17] leading-relaxed text-[11px] sm:text-xs">
                {c.original_text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
