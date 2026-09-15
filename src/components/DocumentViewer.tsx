import React, { useEffect, useRef } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { SimplifiedClause } from '../types/schemas';

interface DocumentViewerProps {
  documentTitle: string;
  category: string;
  clauses: SimplifiedClause[];
  highlightedClauseId?: string | null;
  onClauseSelect?: (clauseId: string, index?: number) => void;
}

const itemColorStyles = [
  { border: 'border-[#BE123C]', badgeBg: 'bg-[#E11D48] text-white', text: 'text-[#BE123C]', bg: 'bg-[#FFF1F2]' }, // Crimson
  { border: 'border-[#0369A1]', badgeBg: 'bg-[#0284C7] text-white', text: 'text-[#0369A1]', bg: 'bg-[#F0F9FF]' }, // Sky
  { border: 'border-[#B45309]', badgeBg: 'bg-[#D97706] text-white', text: 'text-[#B45309]', bg: 'bg-[#FFFBEB]' }, // Amber
  { border: 'border-[#047857]', badgeBg: 'bg-[#059669] text-white', text: 'text-[#047857]', bg: 'bg-[#ECFDF5]' }, // Emerald
  { border: 'border-[#6D28D9]', badgeBg: 'bg-[#7C3AED] text-white', text: 'text-[#6D28D9]', bg: 'bg-[#F5F3FF]' }, // Violet
  { border: 'border-[#9E4B2B]', badgeBg: 'bg-[#B85C38] text-white', text: 'text-[#9E4B2B]', bg: 'bg-[#FDF4F0]' }, // Terracotta
  { border: 'border-[#E11D48]', badgeBg: 'bg-[#F43F5E] text-white', text: 'text-[#E11D48]', bg: 'bg-[#FFF1F2]' }, // Rose
  { border: 'border-[#0F766E]', badgeBg: 'bg-[#0D9488] text-white', text: 'text-[#0F766E]', bg: 'bg-[#F0FDFA]' }, // Teal
  { border: 'border-[#4338CA]', badgeBg: 'bg-[#4F46E5] text-white', text: 'text-[#4338CA]', bg: 'bg-[#EEF2FF]' }, // Indigo
  { border: 'border-[#C2410C]', badgeBg: 'bg-[#EA580C] text-white', text: 'text-[#C2410C]', bg: 'bg-[#FFF7ED]' }, // Orange
  { border: 'border-[#0E7490]', badgeBg: 'bg-[#0891B2] text-white', text: 'text-[#0E7490]', bg: 'bg-[#ECFEFF]' }, // Cyan
  { border: 'border-[#7E22CE]', badgeBg: 'bg-[#9333EA] text-white', text: 'text-[#7E22CE]', bg: 'bg-[#FAF5FF]' }, // Purple
];

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

      {/* Synchronized Document Clauses Scrollable Deck View */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs font-mono leading-relaxed text-[#1E1B17] custom-scrollbar">
        {(clauses || []).map((c, idx) => {
          const isHighlighted = highlightedClauseId === c.id;
          const colorTheme = itemColorStyles[idx % itemColorStyles.length];

          return (
            <div
              key={c.id}
              ref={(el) => {
                clauseRefs.current[c.id] = el;
              }}
              onClick={() => onClauseSelect?.(c.id, idx)}
              className={`p-3.5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                isHighlighted
                  ? 'bg-[#B85C38]/15 border-[#B85C38] text-[#1E1B17] ring-2 ring-[#B85C38]/30 shadow-md scale-[1.01]'
                  : `${colorTheme.bg} ${colorTheme.border} hover:shadow-md hover:scale-[1.005]`
              }`}
            >
              <div className="flex items-center justify-between mb-2 font-sans font-extrabold text-xs">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${colorTheme.badgeBg} shrink-0`}>
                    #{idx + 1}
                  </span>
                  <span className={`truncate ${colorTheme.text}`}>
                    {c.title}
                  </span>
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
