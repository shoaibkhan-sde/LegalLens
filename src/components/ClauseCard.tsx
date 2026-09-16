import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Search,
  Share2,
  ShieldAlert,
  AlertOctagon,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileCheck,
  Users,
  Briefcase,
  Zap,
  Sparkles,
} from 'lucide-react';
import { SimplifiedClause } from '../types/schemas';
import { SpeechEngine } from '../utils/speech';
import { getRiskStyle } from '../utils/risk';

interface ClauseCardProps {
  clause: SimplifiedClause;
  index?: number;
  totalCards?: number;
  readingLevel: 'simple' | 'very_simple';
  onVerifyInDocument: (clauseId: string, index?: number) => void;
  onOpenShareModal: (clause: SimplifiedClause) => void;
  isActive?: boolean;
}

const ICON_MAP: Record<string, any> = {
  ShieldAlert,
  AlertOctagon,
  Clock,
  CheckCircle: CheckCircle2,
  CheckCircle2,
  TrendingUp,
  FileCheck,
  Users,
  Briefcase,
};

import { useLanguage } from '../context/LanguageContext';

export const ClauseCard: React.FC<ClauseCardProps> = ({
  clause,
  index,
  totalCards,
  readingLevel,
  onVerifyInDocument,
  onOpenShareModal,
  isActive = false,
}) => {
  const { t, language } = useLanguage();
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const explanationText =
    readingLevel === 'very_simple' ? clause.very_simple_explanation : clause.simple_explanation;

  const handleToggleReadAloud = () => {
    if (isPlayingAudio) {
      SpeechEngine.stop();
      setIsPlayingAudio(false);
    } else {
      setIsPlayingAudio(true);
      SpeechEngine.speak(
        `${clause.title}. ${explanationText}. ${clause.one_line_consequence}`,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false),
        () => setIsPlayingAudio(false),
        language
      );
    }
  };

  const riskStyle = getRiskStyle(clause.risk_level, language);
  const RiskIcon = riskStyle.icon;

  return (
    <div
      className={`rounded-[24px] border-2 transition-all duration-300 backdrop-blur-xs overflow-hidden bg-[#FBF8F1] ${
        isActive
          ? 'border-[#B85C38] shadow-xl ring-1 ring-[#B85C38]/30'
          : 'border-[#E7E1D3] shadow-md hover:shadow-lg'
      }`}
      style={
        isActive
          ? {
              boxShadow: '0 16px 36px -4px rgba(184, 92, 56, 0.22), 0 6px 16px -2px rgba(0, 0, 0, 0.08)',
            }
          : {
              boxShadow: '0 8px 24px -4px rgba(30, 27, 23, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)',
            }
      }
    >
      {/* Pinned Card Header Bar (Native Sticky Deck Header) */}
      <div
        onClick={() => onVerifyInDocument?.(clause.id, index)}
        className={`h-[46px] px-4 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors border-b ${
          isActive
            ? 'bg-[#F6F1E7] border-[#B85C38]/40'
            : 'bg-[#F6F1E7] border-[#E7E1D3] hover:bg-[#E7E1D3]/50'
        }`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <span
            className={`text-[11px] font-extrabold font-mono px-2.5 py-0.5 rounded-full shrink-0 transition-colors ${
              isActive
                ? 'bg-[#B85C38] text-white'
                : 'bg-[#E7E1D3] text-[#1E1B17]'
            }`}
          >
            #{(index ?? 0) + 1}
          </span>
          <h4 className="text-xs sm:text-sm font-bold font-heading text-[#1E1B17] truncate">
            {clause.title}
          </h4>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#E7E1D3]/70 text-[#6E6659] hidden sm:inline-block">
            {clause.clause_type}
          </span>
          <div
            className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs ${riskStyle.badgeBg}`}
          >
            <RiskIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{riskStyle.label}</span>
          </div>
        </div>
      </div>

      {/* Card Body Content */}
      <div className="p-4 space-y-3.5">
        {/* Main Plain Language Explanation */}
        <div className="bg-[#FBF8F1] rounded-xl p-3.5 border border-[#E7E1D3] space-y-1.5">
          <div className="flex items-center space-x-1 text-[10px] font-semibold text-[#6E6659] uppercase tracking-wider">
            {readingLevel === 'very_simple' ? (
              <>
                <Sparkles className="w-3 h-3 text-[#B85C38]" />
                <span>{language === 'hi' ? 'सरल अर्थ' : 'Simple Meaning'}</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-[#B85C38]" />
                <span>{language === 'hi' ? 'खंड का अर्थ' : 'Clause Meaning'}</span>
              </>
            )}
          </div>
          <p className="text-xs font-medium text-[#1E1B17] leading-relaxed">{explanationText}</p>
        </div>

        {/* Traffic Light One-Line Consequence */}
        <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-[#FBF8F1]/80 border border-[#E7E1D3] text-xs">
          <RiskIcon className="w-4 h-4 shrink-0 mt-0.5 text-[#B85C38]" />
          <p className="text-[#1E1B17] font-medium leading-normal">{clause.one_line_consequence}</p>
        </div>

        {/* Card Action Toolbar */}
        <div className="flex items-center justify-between pt-1 border-t border-[#E7E1D3]">
          <div className="flex items-center space-x-2">
            {/* Read Aloud Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleReadAloud();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors border ${
                isPlayingAudio
                  ? 'bg-[#B85C38] text-white border-[#B85C38]'
                  : 'bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#1E1B17] border-[#E7E1D3]'
              }`}
            >
              {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#B85C38]" />}
              <span>{isPlayingAudio ? (language === 'hi' ? 'रोकें' : 'Stop') : (language === 'hi' ? 'सुनें' : 'Read')}</span>
            </button>

            {/* Tap-To-Verify Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onVerifyInDocument(clause.id, index);
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#1E1B17] text-xs font-semibold transition-colors border border-[#E7E1D3]"
            >
              <Search className="w-3.5 h-3.5 text-[#065F46]" />
              <span>{language === 'hi' ? 'जाँचें' : 'Verify'}</span>
            </button>
          </div>

          {/* Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenShareModal(clause);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#1E1B17] text-xs font-semibold transition-colors border border-[#E7E1D3]"
          >
            <Share2 className="w-3.5 h-3.5 text-[#B85C38]" />
            <span>{language === 'hi' ? 'शेयर' : 'Share'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
