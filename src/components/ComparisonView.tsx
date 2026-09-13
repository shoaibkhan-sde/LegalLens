import React, { useState } from 'react';
import {
  GitCompare,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { DocumentAnalysisResult, ComparisonResult } from '../types/schemas';
import { ApiClient } from '../services/apiClient';
import { AutoResizeTextarea } from './AutoResizeTextarea';

interface ComparisonViewProps {
  currentDocument?: DocumentAnalysisResult | null;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ currentDocument }) => {
  const [docAText, setDocAText] = useState<string>('');
  const [docBText, setDocBText] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunComparison = async () => {
    setIsLoading(true);
    try {
      const textA =
        docAText.trim() ||
        (currentDocument && currentDocument.clauses
          ? currentDocument.clauses.map((c) => c.original_text).join('\n')
          : `RESIDENTIAL LEASE AGREEMENT A (Bengaluru)\nRent ₹25,000. Security Deposit ₹1,50,000. Notice 60 days. Lock-in 6 months.`);

      const textB =
        docBText.trim() ||
        `RESIDENTIAL LEASE AGREEMENT B (Bengaluru)\nRent ₹23,000. Security Deposit ₹1,00,000. Notice 30 days. Lock-in 3 months. Force Majeure relief included.`;

      const docAObj = await ApiClient.analyzeDocument(textA);
      const docBObj = await ApiClient.analyzeDocument(textB);

      const result = await ApiClient.compareDocuments(docAObj, docBObj);
      setComparisonResult(result);
    } catch (err: any) {
      alert(err.message || 'Comparison failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Editorial Compare Banner Illustration */}
      <div className="w-full flex justify-center items-center">
        <img
          src="/assets/compare-illustration.png"
          alt="Illustration of two documents being compared, connected by a scale motif"
          loading="lazy"
          className="w-full h-auto max-h-[140px] sm:max-h-[160px] md:max-h-[180px] object-contain hidden min-[380px]:block mx-auto"
        />
      </div>

      {/* Comparison Setup Panel */}
      <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-3 border-b border-[#E7E1D3] pb-3">
          <div className="w-9 h-9 rounded-lg bg-[#F6F1E7] text-[#B85C38] flex items-center justify-center border border-[#E7E1D3]">
            <GitCompare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-heading text-[#1E1B17]">Compare Two Agreements</h2>
            <p className="text-xs text-[#6E6659]">
              Clause-aligned diffing, asymmetric missing clause detection, and risk delta summary
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#B85C38] mb-1.5 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Document A (e.g. Current Agreement)</span>
            </label>
            <AutoResizeTextarea
              rows={4}
              value={docAText}
              onChange={(e) => setDocAText(e.target.value)}
              placeholder={
                currentDocument
                  ? `Using active document: "${currentDocument.document_title}"`
                  : 'Paste Document A text or use active loaded document...'
              }
              className="w-full bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg p-3 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B85C38] mb-1.5 flex items-center space-x-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Document B (e.g. Counter-Offer Draft)</span>
            </label>
            <AutoResizeTextarea
              rows={4}
              value={docBText}
              onChange={(e) => setDocBText(e.target.value)}
              placeholder="Paste Document B text here..."
              className="w-full bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg p-3 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
            />
          </div>
        </div>

        <button
          onClick={handleRunComparison}
          disabled={isLoading}
          className="w-full py-2.5 bg-[#B85C38] hover:bg-[#9C4B2B] text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-40 shadow-xs"
        >
          <GitCompare className="w-4 h-4" />
          <span>{isLoading ? 'Aligning & Comparing Clauses...' : 'Compare Contracts Side-by-Side'}</span>
        </button>
      </div>

      {/* Initial Empty State before Comparison is Run */}
      {!comparisonResult && !isLoading && (
        <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <img
            src="/assets/empty-state-illustration.png"
            alt="Illustration of a magnifying glass examining a document"
            loading="lazy"
            className="w-24 h-24 object-contain mx-auto"
          />
          <div>
            <h3 className="text-xs font-bold text-[#1E1B17]">No Contracts Compared Yet</h3>
            <p className="text-xs text-[#6E6659] mt-1 max-w-sm mx-auto">
              Paste agreement text into Document A and Document B above, then click "Compare Contracts Side-by-Side" to view clause alignment.
            </p>
          </div>
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-5">
          {/* Winner / Key Takeaway Card */}
          <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 shadow-xs space-y-2">
            <div className="flex items-center space-x-2 text-[#B85C38] font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Comparison Recommendation</span>
            </div>
            <p className="text-sm font-semibold text-[#1E1B17]">{comparisonResult.winner_recommendation}</p>
            <p className="text-xs text-[#6E6659]">{comparisonResult.key_differences_summary}</p>
          </div>

          {/* Aligned Clauses Table */}
          <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold font-heading text-[#1E1B17]">Clause-by-Clause Comparison</h3>

            <div className="space-y-3">
              {(comparisonResult?.aligned_pairs || []).map((pair) => (
                <div
                  key={pair.id}
                  className={`p-4 rounded-xl border transition-all ${
                    pair.status === 'matched'
                      ? 'bg-[#F6F1E7] border-[#E7E1D3]'
                      : pair.status === 'a_only'
                      ? 'bg-[#FEF3C7] border-[#FDE68A]'
                      : 'bg-[#F6F1E7] border-[#E7E1D3]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase text-[#B85C38] bg-[#B85C38]/10 px-2 py-0.5 rounded border border-[#B85C38]/20">
                      {pair.clause_type}
                    </span>

                    {pair.status === 'matched' && (
                      <span className="text-[11px] font-semibold text-[#065F46] flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Matched Clause ({Math.round(pair.similarity_score * 100)}% similarity)</span>
                      </span>
                    )}
                    {pair.status === 'a_only' && (
                      <span className="text-[11px] font-bold text-[#92400E] flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Present ONLY in Document A (Missing in B)</span>
                      </span>
                    )}
                    {pair.status === 'b_only' && (
                      <span className="text-[11px] font-bold text-[#1E1B17] flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#B85C38]" />
                        <span>Present ONLY in Document B (Missing in A)</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Doc A Side */}
                    <div className="p-3 bg-[#FBF8F1] rounded-lg border border-[#E7E1D3]">
                      <div className="font-bold text-[#1E1B17] mb-1">Doc A: {pair.doc_a_clause?.title || '—'}</div>
                      <p className="text-[#6E6659]">
                        {pair.doc_a_clause?.simple_explanation || 'No matching clause in Document A.'}
                      </p>
                    </div>

                    {/* Doc B Side */}
                    <div className="p-3 bg-[#FBF8F1] rounded-lg border border-[#E7E1D3]">
                      <div className="font-bold text-[#1E1B17] mb-1">Doc B: {pair.doc_b_clause?.title || '—'}</div>
                      <p className="text-[#6E6659]">
                        {pair.doc_b_clause?.simple_explanation || 'No matching clause in Document B.'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
