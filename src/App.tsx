import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ApiKeyModal } from './components/ApiKeyModal';
import { HeroHeader } from './components/HeroHeader';
import { DocumentCapture } from './components/DocumentCapture';
import { VisualProgress } from './components/VisualProgress';
import { DocumentViewer } from './components/DocumentViewer';
import { ClauseCard } from './components/ClauseCard';
import { ComparisonView } from './components/ComparisonView';
import { VoiceGroundedChat } from './components/VoiceGroundedChat';
import { ActionableOutputs } from './components/ActionableOutputs';
import { LegalAidLocator } from './components/LegalAidLocator';
import { ExplainToFriendModal } from './components/ExplainToFriendModal';
import { RoboAiAssistant } from './components/RoboAiAssistant';
import { Footer } from './components/Footer';

import { ApiClient } from './services/apiClient';
import { DocumentAnalysisResult, SimplifiedClause, ServerConfigStatus, ActiveInputContext } from './types/schemas';
import { ShieldCheck, Layers, AlertOctagon, Zap, Sparkles } from 'lucide-react';

import { LanguageProvider, useLanguage } from './context/LanguageContext';

function AppContent() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'analyze' | 'compare' | 'legal_aid'>('analyze');
  const [readingLevel, setReadingLevel] = useState<'simple' | 'very_simple'>('simple');
  const [configStatus, setConfigStatus] = useState<ServerConfigStatus>({
    isConfigured: false,
    demoMode: true,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysisResult | null>(null);
  const [activeInputContext, setActiveInputContext] = useState<ActiveInputContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null);
  const [selectedShareClause, setSelectedShareClause] = useState<SimplifiedClause | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('legallens_is_chat_open');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return false;
  });

  const handleToggleChatOpen = (open: boolean) => {
    setIsChatOpen(open);
    try {
      localStorage.setItem('legallens_is_chat_open', JSON.stringify(open));
    } catch {}
  };

  useEffect(() => {
    ApiClient.getConfigStatus().then((status) => setConfigStatus(status));
  }, []);

  const handleAnalyzeText = async (text: string, file?: File) => {
    setIsLoading(true);
    setDocumentAnalysis(null);
    setErrorMessage(null);
    try {
      const result = await ApiClient.analyzeDocument(text, file);
      setDocumentAnalysis(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'System is busy, please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyInDocument = (clauseId: string) => {
    setHighlightedClauseId(clauseId);
    setTimeout(() => {
      setHighlightedClauseId(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#F6F1E7] text-[#1E1B17] flex flex-col font-sans selection:bg-[#B85C38]/20 selection:text-[#B85C38] overflow-x-hidden">
      {/* Navigation Header */}
      <Navbar
        readingLevel={readingLevel}
        onToggleReadingLevel={setReadingLevel}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        configStatus={configStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-6 space-y-6">
        {/* Tab 1: Analyze Document Workflow */}
        {activeTab === 'analyze' && (
          <div className="space-y-6 animate-fade-in-up">
            {/* Split Hero Section with Editorial Illustration */}
            <HeroHeader />

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="bg-[#FFF5F5] border border-[#FCA5A5] rounded-xl p-4 flex items-center justify-between text-xs text-[#991B1B] shadow-xs animate-fade-in-up">
                <div className="flex items-center space-x-2">
                  <AlertOctagon className="w-4 h-4 text-[#B85C38] shrink-0" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="p-1 rounded hover:bg-[#FCA5A5]/30 text-[#991B1B] font-bold text-sm transition-colors cursor-pointer"
                  title="Dismiss message"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Top Section Header with 3D Robo Face Avatar when chat is closed */}
            {!isChatOpen && (
              <div className="flex justify-end pr-2 -mb-4">
                <RoboAiAssistant
                  document={documentAnalysis}
                  inputContext={activeInputContext}
                  onVerifyClause={handleVerifyInDocument}
                  isOpen={isChatOpen}
                  onToggleOpen={handleToggleChatOpen}
                />
              </div>
            )}

            {/* Top Section: Dynamic Grid (100% width when chat closed, 50%/50% equal area split when chat open) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-300 items-stretch">
              {/* Document Capture Area */}
              <div className={`${isChatOpen ? 'lg:col-span-6' : 'lg:col-span-12'} transition-all duration-300`}>
                <DocumentCapture
                  onAnalyzeText={handleAnalyzeText}
                  isLoading={isLoading}
                  onInputContextChange={setActiveInputContext}
                />
              </div>

              {/* Chat Screen Area (Takes equal 50% width area alongside uploader when open) */}
              {isChatOpen && (
                <div className="lg:col-span-6 transition-all duration-300 animate-fade-in-up relative min-h-[500px] lg:min-h-0">
                  <RoboAiAssistant
                    document={documentAnalysis}
                    inputContext={activeInputContext}
                    onVerifyClause={handleVerifyInDocument}
                    isOpen={isChatOpen}
                    onToggleOpen={handleToggleChatOpen}
                  />
                </div>
              )}
            </div>

            {/* Visual Loading Progress Bar */}
            {isLoading && <VisualProgress />}

            {/* Document Analysis Dashboard Workspace */}
            {documentAnalysis && !isLoading && (
              <div className="space-y-6">
                {/* Summary Overview Banner */}
                <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1D3] pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-bold text-[#B85C38] bg-[#B85C38]/10 px-2.5 py-0.5 rounded border border-[#B85C38]/20">
                          {documentAnalysis.category}
                        </span>
                        <span className="text-[11px] text-[#065F46] font-semibold flex items-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Guard 1 Verified</span>
                        </span>
                      </div>
                      <h2 className="text-xl font-bold font-heading text-[#1E1B17] mt-1">
                        {documentAnalysis.document_title}
                      </h2>
                    </div>

                    {/* Overall Risk Score Pill */}
                    <div className="flex items-center space-x-2 bg-[#F6F1E7] px-3.5 py-1.5 rounded-lg border border-[#E7E1D3]">
                      <span className="text-xs font-medium text-[#6E6659]">Risk Assessment:</span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded flex items-center space-x-1 ${
                          documentAnalysis.overall_risk_score > 60
                            ? 'bg-[#FFF5F5] text-[#991B1B] border border-[#FCA5A5]'
                            : 'bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7]'
                        }`}
                      >
                        <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                        <span>
                          {documentAnalysis.overall_risk_score > 60 ? 'High Risk' : 'Moderate Risk'} (
                          {documentAnalysis.overall_risk_score}/100)
                        </span>
                      </span>
                    </div>
                  </div>

                  <p className="text-xs md:text-sm text-[#1E1B17] font-medium leading-relaxed">
                    {readingLevel === 'very_simple'
                      ? documentAnalysis.summary_very_simple
                      : documentAnalysis.summary_simple}
                  </p>
                </div>

                {/* Responsive Multi-Pane Grid Layout */}
                {/* Desktop: 2-Column Multi-pane workspace | Mobile: Stacked 1-thing-at-a-time */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Original Document Viewer with Tap-to-Verify */}
                  <div className="lg:col-span-5 h-full">
                    <DocumentViewer
                      documentTitle={documentAnalysis.document_title}
                      category={documentAnalysis.category}
                      clauses={documentAnalysis.clauses || []}
                      highlightedClauseId={highlightedClauseId}
                      onClauseSelect={handleVerifyInDocument}
                    />
                  </div>

                  {/* Right Column: Simplified Clauses Cards List */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E7E1D3] pb-3">
                      <h3 className="text-sm font-bold font-heading text-[#1E1B17] flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-[#B85C38]" />
                        <span>Extracted Clauses & Risk Tagging ({(documentAnalysis.clauses || []).length})</span>
                      </h3>

                      {/* Contextual Reading-Level Switcher */}
                      <div className="flex items-center bg-[#F6F1E7] p-1 rounded-lg border border-[#E7E1D3] shadow-2xs">
                        <button
                          onClick={() => setReadingLevel('simple')}
                          title="Plain language explanation"
                          className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                            readingLevel === 'simple'
                              ? 'bg-[#FBF8F1] text-[#1E1B17] shadow-xs border border-[#E7E1D3]'
                              : 'text-[#6E6659] hover:text-[#1E1B17]'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-[#B85C38]" />
                          <span>Simple</span>
                        </button>
                        <button
                          onClick={() => setReadingLevel('very_simple')}
                          title="Ultra-simple plain everyday language"
                          className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-200 ${
                            readingLevel === 'very_simple'
                              ? 'bg-[#FBF8F1] text-[#1E1B17] shadow-xs border border-[#E7E1D3]'
                              : 'text-[#6E6659] hover:text-[#1E1B17]'
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#B85C38]" />
                          <span>Ultra Simple</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {(documentAnalysis.clauses || []).map((clause) => (
                        <ClauseCard
                          key={clause.id}
                          clause={clause}
                          readingLevel={readingLevel}
                          onVerifyInDocument={handleVerifyInDocument}
                          onOpenShareModal={setSelectedShareClause}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actionable Outputs: Checklist, Possibilities, Lawyer Briefing */}
                <div className="pt-2">
                  <ActionableOutputs document={documentAnalysis} />
                </div>
              </div>
            )}

            {/* Mission Section: Family Editorial Illustration */}
            <div className="mt-16 md:mt-24 pt-8 pb-6 text-center space-y-5 hidden min-[360px]:block animate-fade-in-up">
              <div className="max-w-2xl mx-auto space-y-2.5 px-4">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold font-heading cool-shimmer-title tracking-tight">
                  {t('hero.builtForEveryone')}
                </h3>
                <p className="text-sm md:text-base text-[#6E6659] leading-relaxed font-medium max-w-lg mx-auto">
                  {t('hero.builtForEveryoneSub')}
                </p>
              </div>

              <div className="w-full flex justify-center items-center pt-4 px-2">
                <div className="animate-cool-float w-full max-w-4xl mx-auto">
                  <img
                    src="/assets/family-illustration.png"
                    alt="Illustration of a multi-generational family using LegalLens together"
                    loading="lazy"
                    className="w-full h-auto max-h-[360px] sm:max-h-[420px] md:max-h-[480px] max-w-4xl object-contain mx-auto transition-transform duration-500 ease-out hover:scale-[1.02]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Compare Contracts Workflow */}
        {activeTab === 'compare' && <ComparisonView currentDocument={documentAnalysis} />}

        {/* Tab 3: Free Legal Aid Locator Workflow */}
        {activeTab === 'legal_aid' && <LegalAidLocator />}
      </main>

      {/* Premium Level Footer (#3C481D) */}
      <Footer onSelectTab={setActiveTab} />

      {/* Modals */}
      <ApiKeyModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        configStatus={configStatus}
        onConfigUpdated={setConfigStatus}
      />

      <ExplainToFriendModal
        isOpen={!!selectedShareClause}
        onClose={() => setSelectedShareClause(null)}
        clause={selectedShareClause}
        documentTitle={documentAnalysis?.document_title}
      />
    </div>
  );
}

export function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
