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
  readingLevel: 'simple' | 'very_simple';
  onVerifyInDocument: (clauseId: string) => void;
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

export const ClauseCard: React.FC<ClauseCardProps> = ({
  clause,
  readingLevel,
  onVerifyInDocument,
  onOpenShareModal,
}) => {
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
        `${clause.title}. ${explanationText}. Consequence: ${clause.one_line_consequence}`,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false),
        () => setIsPlayingAudio(false)
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
          label: 'High Risk',
        };
      case 'medium':
        return {
          bg: 'bg-[#FFFBEB] border-[#FDE68A]',
          badgeBg: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
          icon: Clock,
          label: 'Watch Out',
        };
      case 'low':
      default:
        return {
          bg: 'bg-[#ECFDF5] border-[#A7F3D0]',
          badgeBg: 'bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7]',
          icon: CheckCircle2,
          label: 'Low Risk',
        };
    }
  };

  const riskStyle = getRiskStyle(clause.risk_level);
  const RiskIcon = riskStyle.icon;
  const CardCustomIcon = ICON_MAP[clause.icon_name] || RiskIcon;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md space-y-4 ${riskStyle.bg}`}
    >
      {/* Top Card Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#FBF8F1] flex items-center justify-center border border-[#E7E1D3]">
            <CardCustomIcon className="w-4 h-4 text-[#B85C38]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B85C38] bg-[#B85C38]/10 px-2 py-0.5 rounded border border-[#B85C38]/20">
                {clause.clause_type}
              </span>
              {clause.clause_number && (
                <span className="text-[10px] text-[#6E6659] font-mono">#{clause.clause_number}</span>
              )}
            </div>
            <h4 className="text-sm font-bold font-heading text-[#1E1B17] mt-0.5">{clause.title}</h4>
          </div>
        </div>

        {/* Traffic Light Risk Badge (Semantic Risk Colors) */}
        <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${riskStyle.badgeBg}`}>
          <RiskIcon className="w-3.5 h-3.5" />
          <span>{riskStyle.label}</span>
        </div>
      </div>

      {/* Main Plain Language Explanation */}
      <div className="bg-[#FBF8F1] rounded-xl p-3.5 border border-[#E7E1D3] space-y-1.5">
        <div className="flex items-center space-x-1 text-[10px] font-semibold text-[#6E6659] uppercase tracking-wider">
          {readingLevel === 'very_simple' ? (
            <>
              <Sparkles className="w-3 h-3 text-[#B85C38]" />
              <span>Simple Meaning</span>
            </>
          ) : (
            <>
              <Zap className="w-3 h-3 text-[#B85C38]" />
              <span>Clause Meaning</span>
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
            onClick={handleToggleReadAloud}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors border ${
              isPlayingAudio
                ? 'bg-[#B85C38] text-white border-[#B85C38]'
                : 'bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#1E1B17] border-[#E7E1D3]'
            }`}
          >
            {isPlayingAudio ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#B85C38]" />}
            <span>{isPlayingAudio ? 'Stop' : 'Read'}</span>
          </button>

          {/* Tap-To-Verify Button */}
          <button
            onClick={() => onVerifyInDocument(clause.id)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#1E1B17] text-xs font-semibold transition-colors border border-[#E7E1D3]"
          >
            <Search className="w-3.5 h-3.5 text-[#065F46]" />
            <span>Verify</span>
          </button>
        </div>

        {/* Share Button */}
        <button
          onClick={() => onOpenShareModal(clause)}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#1E1B17] text-xs font-semibold transition-colors border border-[#E7E1D3]"
        >
          <Share2 className="w-3.5 h-3.5 text-[#B85C38]" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};
