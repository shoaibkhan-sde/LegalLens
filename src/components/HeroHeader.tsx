import React from 'react';
import { ShieldCheck, Zap, Volume2, AlertOctagon } from 'lucide-react';

export const HeroHeader: React.FC = () => {
  return (
    <section className="py-2 md:py-4 my-2 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
        {/* Left Column: Headline, Subheading & Feature Pills (55-60% width on Desktop) */}
        <div className="w-full md:w-[58%] space-y-3.5 text-left">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#B85C38]/10 text-[#B85C38] border border-[#B85C38]/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GenAI Legal Partner • Assist, Not Replace</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-heading text-[#1E1B17] tracking-tight leading-tight">
            Understand Any Contract in Simple, Everyday Language
          </h1>

          <p className="text-xs sm:text-sm text-[#6E6659] leading-relaxed font-normal max-w-2xl">
            LegalLens turns complex legal documents into simple explanations, flags hidden risks, compares contracts side-by-side, and helps you prepare for a conversation with a lawyer.
          </p>

          {/* Key Feature Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
              <Zap className="w-3 h-3 text-[#B85C38]" />
              <span>Simple Explanations</span>
            </span>
            <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
              <AlertOctagon className="w-3 h-3 text-[#991B1B]" />
              <span>Traffic-Light Risk Tagging</span>
            </span>
            <span className="text-[11px] font-medium text-[#1E1B17] bg-[#FBF8F1] px-2.5 py-1 rounded border border-[#E7E1D3] flex items-center space-x-1">
              <Volume2 className="w-3 h-3 text-[#065F46]" />
              <span>Voice Read Aloud</span>
            </span>
          </div>
        </div>

        {/* Right Column: Editorial Hero Illustration (40-45% width on Desktop) */}
        {/* Directly on page canvas with zero surrounding card box, border, or shadow */}
        {/* Hidden on screens smaller than 380px so functional capture options take priority */}
        <div className="w-full md:w-[42%] flex justify-center items-center">
          <img
            src="/assets/hero-illustration.png"
            alt="Illustration of a person comfortably reviewing a legal document on their phone with LegalLens"
            loading="eager"
            fetchPriority="high"
            className="w-full h-auto max-w-xs sm:max-w-md lg:max-w-lg object-contain hidden min-[380px]:block mx-auto"
          />
        </div>
      </div>
    </section>
  );
};
