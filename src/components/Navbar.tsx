import React from 'react';
import {
  FileText,
  GitCompare,
  MapPin,
  Settings,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { ServerConfigStatus } from '../types/schemas';

interface NavbarProps {
  readingLevel: 'simple' | 'very_simple';
  onToggleReadingLevel: (level: 'simple' | 'very_simple') => void;
  activeTab: 'analyze' | 'compare' | 'legal_aid';
  onSelectTab: (tab: 'analyze' | 'compare' | 'legal_aid') => void;
  configStatus: ServerConfigStatus;
  onOpenSettings: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  configStatus,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FBF8F1]/95 backdrop-blur-xs border-b border-[#E7E1D3] px-3 md:px-6 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Zone: Brand Logo & Wordmark */}
        <div className="flex items-center space-x-3 shrink-0">
          <img
            src="/assets/logo.png"
            alt="LegalLens Logo"
            className="w-10 h-10 md:w-11 md:h-11 object-contain rounded-full shrink-0"
          />
          <h1 className="text-[19px] md:text-[20px] font-semibold font-brand text-[#2D261E] tracking-tight leading-none">
            Legal<span className="text-[#B85C38] font-bold">Lens</span>
          </h1>
        </div>

        {/* Center Zone: Cohesive Tab Group (Truly Centered) */}
        <div className="flex-1 flex justify-center items-center">
          <nav className="flex items-center bg-[#F6F1E7] p-1 rounded-xl border border-[#E7E1D3] shadow-2xs">
            <button
              onClick={() => onSelectTab('analyze')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${activeTab === 'analyze'
                  ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                  : 'text-[#6E6659] hover:text-[#1E1B17] hover:bg-[#E7E1D3]/50'
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Analyze</span>
            </button>

            <button
              onClick={() => onSelectTab('compare')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${activeTab === 'compare'
                  ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                  : 'text-[#6E6659] hover:text-[#1E1B17] hover:bg-[#E7E1D3]/50'
                }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare</span>
            </button>

            <button
              onClick={() => onSelectTab('legal_aid')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${activeTab === 'legal_aid'
                  ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                  : 'text-[#6E6659] hover:text-[#1E1B17] hover:bg-[#E7E1D3]/50'
                }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span className="hidden min-[380px]:inline">Legal Aid</span>
              <span className="min-[380px]:hidden">Aid</span>
            </button>
          </nav>
        </div>

        {/* Right Zone: Grouped Controls Cluster (Quiet Status Signal + Settings) */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Subtle Global Trust Signal Badge */}
          {configStatus.demoMode ? (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[11px] font-semibold hover:bg-[#FDE68A]/70 transition-colors"
              title="Running in Demo Mode (Sample Engine Active). Click to configure API Key."
            >
              <AlertCircle className="w-3 h-3 text-[#92400E] shrink-0" />
              <span className="hidden min-[480px]:inline">Demo Mode</span>
            </button>
          ) : (
            <div
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-[11px] font-semibold"
              title="Live AI Engine Active"
            >
              <ShieldCheck className="w-3 h-3 text-[#065F46] shrink-0" />
              <span className="hidden min-[480px]:inline">Live AI</span>
            </div>
          )}

          {/* Settings Button */}
          <button
            onClick={onOpenSettings}
            title="Settings & API Key"
            className="p-2 rounded-lg bg-[#F6F1E7] hover:bg-[#E7E1D3]/70 text-[#6E6659] hover:text-[#1E1B17] transition-all duration-200 border border-[#E7E1D3]"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
