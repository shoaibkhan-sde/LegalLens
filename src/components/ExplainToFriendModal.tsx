import React, { useState } from 'react';
import { Share2, X, Copy, Check, Sparkles } from 'lucide-react';
import { SimplifiedClause } from '../types/schemas';
import { useLanguage } from '../context/LanguageContext';

interface ExplainToFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  clause?: SimplifiedClause | null;
  documentTitle?: string;
}

export const ExplainToFriendModal: React.FC<ExplainToFriendModalProps> = ({
  isOpen,
  onClose,
  clause,
  documentTitle,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !clause) return null;

  const plainMeaning = clause.very_simple_explanation || clause.simple_explanation || 'Meaning temporarily unavailable for this clause.';

  const shareText = `Hey! Here is a simple explanation of a clause in my agreement (${documentTitle}):\n\nClause: ${clause.title}\nPlain Meaning: ${plainMeaning}\nWatch out: ${clause.one_line_consequence}\n\nSummarized with LegalLens GenAI`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B17]/60 backdrop-blur-xs p-4">
      <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-6 max-w-md w-full shadow-lg relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6E6659] hover:text-[#1E1B17] cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#B85C38]/10 text-[#B85C38] flex items-center justify-center border border-[#B85C38]/20">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold font-heading text-[#1E1B17]">{t('explain_friend.title')}</h3>
            <p className="text-xs text-[#6E6659]">{t('explain_friend.subtitle')}</p>
          </div>
        </div>

        {/* Card Preview */}
        <div className="p-4 bg-[#F6F1E7] rounded-xl border border-[#E7E1D3] space-y-2 text-xs">
          <div className="flex items-center space-x-1.5 text-[#B85C38] font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{clause.title}</span>
          </div>
          <p className="text-[#1E1B17] leading-relaxed">{plainMeaning}</p>
          <div className="p-2.5 bg-[#FBF8F1] rounded text-[#1E1B17] font-medium border border-[#E7E1D3]">
            {t('explain_friend.consequence')}: {clause.one_line_consequence}
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 bg-[#B85C38] hover:bg-[#9C4B2B] text-white text-xs font-bold rounded-lg shadow-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? t('explain_friend.copied_btn') : t('explain_friend.copy_btn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

