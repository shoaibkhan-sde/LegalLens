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
import { SimplifiedClause, RiskLevel } from '../types/schemas';
import { SpeechEngine } from '../utils/speech';

interface ClauseCardProps {
  clause: SimplifiedClause;
  index?: number;
  totalCards?: number;
  readingLevel: 'simple' | 'very_simple';
  onVerifyInDocument: (clauseId: string, index?: number) => void;
  onOpenShareModal: (clause: SimplifiedClause) => void;
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

  // Color + Icon traffic light risk styling (Semantic Risk Colors - Preserved)
  const getRiskStyle = (level: RiskLevel) => {
    switch (level) {
      case 'high':
        return {
          bg: 'bg-[#FFF5F5] border-[#FCA5A5]',
          badgeBg: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]',
          icon: AlertOctagon,
          label: language === 'hi' ? 'उच्च जोखिम' : 'High Risk',
        };
      case 'medium':
        return {
          bg: 'bg-[#FFFBEB] border-[#FDE68A]',
          badgeBg: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
          icon: Clock,
          label: language === 'hi' ? 'सावधान रहें' : 'Watch Out',
        };
      case 'low':
      default:
        return {
          bg: 'bg-[#ECFDF5] border-[#A7F3D0]',
          badgeBg: 'bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7]',
          icon: CheckCircle2,
          label: language === 'hi' ? 'कम जोखिम' : 'Low Risk',
        };
    }
  };

  const riskStyle = getRiskStyle(clause.risk_level);
  const RiskIcon = riskStyle.icon;
  const CardCustomIcon = ICON_MAP[clause.icon_name] || RiskIcon;

  // Vibrant PromptWars-style deck tab colors
  const tabColors = [
    { bg: 'bg-[#E11D48] text-white', border: 'border-[#BE123C]' }, // Rose Pink
    { bg: 'bg-[#0284C7] text-white', border: 'border-[#0369A1]' }, // Sky Blue
    { bg: 'bg-[#D97706] text-white', border: 'border-[#B45309]' }, // Amber
    { bg: 'bg-[#059669] text-white', border: 'border-[#047857]' }, // Emerald
    { bg: 'bg-[#7C3AED] text-white', border: 'border-[#6D28D9]' }, // Violet
    { bg: 'bg-[#B85C38] text-white', border: 'border-[#9E4B2B]' }, // Terracotta
  ];
  const tabStyle = tabColors[(index ?? 0) % tabColors.length];

  return (
    <div
      className="rounded-[28px] border-2 border-[#E7E1D3] shadow-lg hover:shadow-2xl transition-all duration-300 backdrop-blur-xs overflow-hidden bg-[#FBF8F1]"
      style={{
        boxShadow: '0 12px 32px -4px rgba(30, 27, 23, 0.14), 0 4px 12px -2px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Pinned PromptWars Header Tab Bar */}
      <div
        onClick={() => onVerifyInDocument?.(clause.id, index)}
        className={`h-[46px] px-4.5 flex items-center justify-between gap-3 rounded-t-[26px] cursor-pointer select-none transition-colors border-b ${tabStyle.bg} ${tabStyle.border}`}
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <span className="text-[11px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-white/25 text-white shrink-0">
            #{(index ?? 0) + 1}
          </span>
          <h4 className="text-xs sm:text-sm font-bold font-heading text-white truncate">{clause.title}</h4>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 text-white/90 hidden sm:inline-block">
            {clause.clause_type}
          </span>
          <div className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold border ${riskStyle.badgeBg}`}>
            <RiskIcon className="w-3 h-3" />
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

        {/* Card Action Toolbar - Icon + 1-2 words on EVERY button (Ration Accent) */}
        <div className="flex items-center justify-between pt-1 border-t border-[#E7E1D3]">
          <div className="flex items-center space-x-2">
            {/* Read Aloud Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleReadAloud();
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors border ${isPlayingAudio
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
                onVerifyInDocument(clause.id);
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
