import React from 'react';
import {
  Scale,
  ShieldCheck,
  ArrowUp,
  Sparkles,
  Lock,
  FileText,
  BookOpen,
  ShieldAlert,
  CheckCircle2,
  Linkedin,
  Github,
  Globe,
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
  onSelectTab?: (tab: 'analyze' | 'compare' | 'legal_aid') => void;
}

const LineworkPatternBlock: React.FC = () => (
  <div className="w-1/2 flex flex-col justify-evenly h-full shrink-0 py-4 px-4 space-y-6">
    {/* Row 1 */}
    <div className="flex justify-around items-center w-full">
      {/* Motif 1: Scale of Justice */}
      <svg className="w-16 h-16 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="M7 21h10"/>
        <path d="M12 3v18"/>
        <path d="M3 7h18"/>
      </svg>

      {/* Motif 2: Document with Folded Paper Corner */}
      <svg className="w-14 h-14 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="14" y2="17"/>
      </svg>

      {/* Motif 3: Security Shield */}
      <svg className="w-16 h-16 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>

      {/* Motif 4: Legal Gavel */}
      <svg className="w-14 h-14 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m14 13-7.5 7.5c-.8.8-2 .8-2.8 0s-.8-2 0-2.8L11 10"/>
        <path d="m16 16 2 2"/>
        <path d="m8 8 2 2"/>
        <path d="m9 5 7 7-3 3-7-7z"/>
      </svg>

      {/* Motif 5: Verified Legal Seal */}
      <svg className="w-14 h-14 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    </div>

    {/* Row 2 (Staggered Layout) */}
    <div className="flex justify-around items-center w-full pl-12">
      {/* Motif 5: Verified Legal Seal */}
      <svg className="w-14 h-14 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>

      {/* Motif 1: Scale of Justice */}
      <svg className="w-16 h-16 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/>
        <path d="M7 21h10"/>
        <path d="M12 3v18"/>
        <path d="M3 7h18"/>
      </svg>

      {/* Motif 4: Legal Gavel */}
      <svg className="w-14 h-14 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="m14 13-7.5 7.5c-.8.8-2 .8-2.8 0s-.8-2 0-2.8L11 10"/>
        <path d="m16 16 2 2"/>
        <path d="m8 8 2 2"/>
        <path d="m9 5 7 7-3 3-7-7z"/>
      </svg>

      {/* Motif 2: Document with Folded Paper Corner */}
      <svg className="w-14 h-14 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="14" y2="17"/>
      </svg>

      {/* Motif 3: Security Shield */}
      <svg className="w-16 h-16 text-[#B85C38]" viewBox="0 0 24 24" fill="none" stroke="#B85C38" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    </div>
  </div>
);

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  const { t } = useLanguage();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#17140F] text-[#FBF8F1] pt-14 pb-8 px-4 sm:px-6 md:px-12 border-t border-[#2A251D] mt-auto relative overflow-hidden">
      {/* Decorative ambient background accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#B85C38]/5 rounded-full blur-3xl pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#B85C38]/5 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Subtle Animated Linework Pattern Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none opacity-[0.10]">
        <div className="flex w-[200%] h-full items-center animate-footer-drift">
          <LineworkPatternBlock />
          <LineworkPatternBlock />
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-10 relative z-10">
        {/* Top Header Row: Brand Identity, Trust Badges, and Scroll-to-Top */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-10 border-b border-[#2A251D]">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-[#28221A] flex items-center justify-center shadow-md border border-[#3D3428]">
                <Scale className="w-6 h-6 text-[#B85C38]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
                LegalLens
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#28221A] text-[#D97757] border border-[#3D3428]">
                GenAI v2.0
              </span>
            </div>
            <p className="text-sm text-[#A39E93] leading-relaxed">
              {t('footer.brand_sub')}
            </p>
          </div>

          {/* Quick Trust Badges & Back-to-Top */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#241F17] border border-[#383126] text-xs font-semibold text-[#E2DDD3]">
              <ShieldCheck className="w-4 h-4 text-[#B85C38]" />
              <span>{t('footer.grounded_badge')}</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#241F17] border border-[#383126] text-xs font-semibold text-[#E2DDD3]">
              <Lock className="w-4 h-4 text-[#B85C38]" />
              <span>{t('footer.privacy_badge')}</span>
            </div>

            <button
              onClick={scrollToTop}
              title="Back to top"
              className="p-2.5 rounded-xl bg-[#28221A] hover:bg-[#383025] text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 border border-[#3D3428] flex items-center justify-center"
            >
              <ArrowUp className="w-5 h-5 text-[#D97757]" />
            </button>
          </div>
        </div>

        {/* Middle Navigation Grid: Core Features, Statutory Rights, and Supported Documents */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 pt-2">
          {/* Column 1: Core Intelligence Features */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white font-bold text-base font-heading">
              <Sparkles className="w-4 h-4 text-[#B85C38]" />
              <span>{t('footer.col1_title')}</span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#A39E93]">
              <li className="flex items-center space-x-2 hover:text-white transition-colors cursor-pointer" onClick={() => onSelectTab?.('analyze')}>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>{t('footer.feat1')}</span>
              </li>
              <li className="flex items-center space-x-2 hover:text-white transition-colors cursor-pointer" onClick={() => onSelectTab?.('analyze')}>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>{t('footer.feat2')}</span>
              </li>
              <li className="flex items-center space-x-2 hover:text-white transition-colors cursor-pointer" onClick={() => onSelectTab?.('compare')}>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>{t('footer.feat3')}</span>
              </li>
              <li className="flex items-center space-x-2 hover:text-white transition-colors cursor-pointer" onClick={() => onSelectTab?.('analyze')}>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>{t('footer.feat4')}</span>
              </li>
              <li className="flex items-center space-x-2 hover:text-white transition-colors cursor-pointer" onClick={() => onSelectTab?.('analyze')}>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>{t('footer.feat5')}</span>
              </li>
            </ul>
          </div>

          {/* Column 2: Legal Protection & Statutory Rights */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white font-bold text-base font-heading">
              <BookOpen className="w-4 h-4 text-[#B85C38]" />
              <span>{t('footer.col2_title')}</span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#A39E93]">
              <li className="hover:text-white transition-colors">
                {t('footer.law1')}
              </li>
              <li className="hover:text-white transition-colors">
                {t('footer.law2')}
              </li>
              <li className="hover:text-white transition-colors">
                {t('footer.law3')}
              </li>
              <li className="hover:text-white transition-colors cursor-pointer" onClick={() => onSelectTab?.('legal_aid')}>
                {t('footer.law4')}
              </li>
              <li className="hover:text-white transition-colors">
                {t('footer.law5')}
              </li>
            </ul>
          </div>

          {/* Column 3: Supported Document Types */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-white font-bold text-base font-heading">
              <FileText className="w-4 h-4 text-[#B85C38]" />
              <span>{t('footer.col3_title')}</span>
            </div>
            <ul className="space-y-2.5 text-xs text-[#A39E93]">
              <li className="hover:text-white transition-colors">
                {t('footer.doc1')}
              </li>
              <li className="hover:text-white transition-colors">
                {t('footer.doc2')}
              </li>
              <li className="hover:text-white transition-colors">
                {t('footer.doc3')}
              </li>
              <li className="hover:text-white transition-colors">
                {t('footer.doc4')}
              </li>
              <li className="hover:text-white transition-colors">
                {t('footer.doc5')}
              </li>
            </ul>
          </div>
        </div>

        {/* Statutory Disclaimer Box */}
        <div className="p-4 rounded-xl bg-[#201B14] border border-[#332B20] space-y-1.5">
          <div className="flex items-center space-x-2 text-xs font-bold text-[#E2DDD3]">
            <ShieldAlert className="w-4 h-4 text-[#D8B45B]" />
            <span>{t('footer.disclaimer_title')}</span>
          </div>
          <p className="text-[11px] text-[#A39E93] leading-relaxed">
            {t('footer.disclaimer')}
          </p>
        </div>

        {/* Bottom Bar: Copyright & System Status */}
        <div className="pt-6 border-t border-[#2A251D] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A39E93]">
          <p>{t('footer.copyright')}</p>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#B85C38] animate-pulse" />
            <span className="text-[11px] font-medium text-[#C0BBAF]">
              {t('footer.status')}
            </span>
          </div>
        </div>

        {/* Prominent & Centered "Connect with me" Social Row */}
        <div className="pt-6 border-t border-[#2A251D] flex flex-col items-center justify-center space-y-3.5">
          <span className="text-xs font-bold uppercase tracking-wider text-[#A39E93] font-heading">
            {t('footer.connect')}
          </span>
          <div className="flex items-center space-x-4">
            {/* LinkedIn */}
            <a
              href="https://www.linkedin.com/in/shoaibkhan-sde/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              className="w-12 h-12 rounded-full bg-[#241F17] border border-[#B85C38]/60 text-[#D97757] hover:bg-[#B85C38] hover:text-white hover:border-[#B85C38] hover:shadow-lg hover:shadow-[#B85C38]/35 transition-all duration-200 ease-out flex items-center justify-center hover:scale-110 hover:-translate-y-1 active:scale-95 group"
            >
              <Linkedin className="w-6 h-6 transition-transform duration-200 group-hover:scale-105" />
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/shoaibkhan-sde/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className="w-12 h-12 rounded-full bg-[#241F17] border border-[#B85C38]/60 text-[#D97757] hover:bg-[#B85C38] hover:text-white hover:border-[#B85C38] hover:shadow-lg hover:shadow-[#B85C38]/35 transition-all duration-200 ease-out flex items-center justify-center hover:scale-110 hover:-translate-y-1 active:scale-95 group"
            >
              <Github className="w-6 h-6 transition-transform duration-200 group-hover:scale-105" />
            </a>

            {/* Portfolio */}
            <a
              href="https://shoaibkhan-sde.github.io/my-portfolio/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Portfolio website"
              className="w-12 h-12 rounded-full bg-[#241F17] border border-[#B85C38]/60 text-[#D97757] hover:bg-[#B85C38] hover:text-white hover:border-[#B85C38] hover:shadow-lg hover:shadow-[#B85C38]/35 transition-all duration-200 ease-out flex items-center justify-center hover:scale-110 hover:-translate-y-1 active:scale-95 group"
            >
              <Globe className="w-6 h-6 transition-transform duration-200 group-hover:scale-105" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
