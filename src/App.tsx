import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { SettingsModal } from './components/SettingsModal';
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
import { ShieldCheck, Layers, AlertOctagon, Zap, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [selectedShareClause, setSelectedShareClause] = useState<SimplifiedClause | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('legallens_is_chat_open');
      if (saved !== null) return JSON.parse(saved);
    } catch { }
    return false;
  });

  const deckJumpContainerRef = useRef<HTMLDivElement | null>(null);
  const deckJumpPillRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (documentAnalysis?.clauses && documentAnalysis.clauses.length > 0) {
      const clausesList = documentAnalysis.clauses;
      const activeIndex = Math.max(
        0,
        clausesList.findIndex((c) => c.id === (activeClauseId || highlightedClauseId))
      );
      const activePill = deckJumpPillRefs.current[activeIndex];
      const container = deckJumpContainerRef.current;
      if (activePill && container) {
        const pillLeft = activePill.offsetLeft;
        const pillWidth = activePill.offsetWidth;
        const containerWidth = container.clientWidth;
        container.scrollTo({
          left: Math.max(0, pillLeft - containerWidth / 2 + pillWidth / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [activeClauseId, highlightedClauseId, documentAnalysis]);

  const [pipelineProgress, setPipelineProgress] = useState<{
    activeStep: number;
    stepStatuses: Array<'pending' | 'in_progress' | 'completed' | 'failed'>;
    elapsedMs: Record<number, number>;
  }>({
    activeStep: 0,
    stepStatuses: ['in_progress', 'pending', 'pending', 'pending', 'pending'],
    elapsedMs: {},
  });

  const handleToggleChatOpen = (open: boolean) => {
    setIsChatOpen(open);
    try {
      localStorage.setItem('legallens_is_chat_open', JSON.stringify(open));
    } catch { }

    if (open) {
      setTimeout(() => {
        const chatElem = document.getElementById('legal-chat-container') || document.getElementById('robo-assistant-container');
        if (chatElem) {
          chatElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    }
  };

  const getBaseStickyTop = () => {
    if (typeof window === 'undefined') return 76;
    const w = window.innerWidth;
    if (w < 640) return 72;
    return 76;
  };

  const [baseStickyTop, setBaseStickyTop] = useState(getBaseStickyTop());

  useEffect(() => {
    const handleResize = () => {
      setBaseStickyTop(getBaseStickyTop());
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    ApiClient.getConfigStatus().then((status) => setConfigStatus(status));

    // Prefetch Compare & Legal Aid illustrations ahead of time in background
    const prefetchAssets = () => {
      const assets = [
        '/assets/compare-illustration.png',
        '/assets/legal-aid-illustration.png',
        '/assets/empty-state-illustration.png',
      ];
      assets.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    if (typeof window !== 'undefined') {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(prefetchAssets);
      } else {
        setTimeout(prefetchAssets, 500);
      }
    }
  }, []);

  useEffect(() => {
    if (errorMessage) {
      setTimeout(() => {
        const errorBanner = document.getElementById('guard-error-banner');
        if (errorBanner) {
          errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          window.scrollTo({ top: 120, behavior: 'smooth' });
        }
      }, 120);
    }
  }, [errorMessage]);

  const handlePrefetchTab = (tab: 'compare' | 'legal_aid') => {
    const assetsToLoad =
      tab === 'compare'
        ? ['/assets/compare-illustration.png', '/assets/empty-state-illustration.png']
        : ['/assets/legal-aid-illustration.png', '/assets/empty-state-illustration.png'];

    assetsToLoad.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  };

  const activeRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelAnalysis = () => {
    // 1. Invalidate current request token so late-arriving SSE callbacks are discarded
    activeRequestIdRef.current += 1;

    // 2. Abort active HTTP fetch request immediately
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 3. Immediately reset UI & progress state
    setIsLoading(false);
    setPipelineProgress({
      activeStep: 0,
      stepStatuses: ['pending', 'pending', 'pending', 'pending', 'pending'],
      elapsedMs: {},
    });
    setDocumentAnalysis(null);
    setErrorMessage(null);
    setActiveClauseId(null);
  };

  const handleAnalyzeText = async (text: string, file?: File) => {
    // Increment request token and create new AbortController
    activeRequestIdRef.current += 1;
    const currentReqId = activeRequestIdRef.current;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setDocumentAnalysis(null);
    setErrorMessage(null);
    setActiveClauseId(null);
    setPipelineProgress({
      activeStep: 0,
      stepStatuses: ['in_progress', 'pending', 'pending', 'pending', 'pending'],
      elapsedMs: {},
    });

    try {
      const result = await ApiClient.analyzeDocument(
        text,
        file,
        undefined,
        (stageIndex, status, elapsedMs) => {
          if (currentReqId !== activeRequestIdRef.current) return;

          setPipelineProgress((prev) => {
            if (!prev) return null as any;
            const nextStatuses = [...prev.stepStatuses];
            if (stageIndex >= 0 && stageIndex < 5) {
              nextStatuses[stageIndex] = status;
            }
            const nextActive = status === 'in_progress'
              ? stageIndex
              : (status === 'completed' && stageIndex < 4 ? stageIndex + 1 : prev.activeStep);
            const nextElapsed = { ...prev.elapsedMs };
            if (elapsedMs !== undefined && stageIndex >= 0) {
              nextElapsed[stageIndex] = elapsedMs;
            }
            return {
              activeStep: nextActive,
              stepStatuses: nextStatuses,
              elapsedMs: nextElapsed,
            };
          });
        },
        controller.signal
      );

      if (currentReqId !== activeRequestIdRef.current) return;

      setDocumentAnalysis(result);
      if (result.clauses && result.clauses.length > 0) {
        setActiveClauseId(result.clauses[0].id);
      }
    } catch (err: any) {
      if (currentReqId !== activeRequestIdRef.current || err.message === 'CANCELED_BY_USER') {
        return;
      }

      const msg = err.message || 'System is busy, please try again in a moment.';
      setErrorMessage(msg);

      setPipelineProgress((prev) => {
        if (!prev) return null as any;
        const nextStatuses = [...prev.stepStatuses];
        const failedIdx = prev.activeStep >= 0 && prev.activeStep < 5 ? prev.activeStep : 0;
        nextStatuses[failedIdx] = 'failed';
        return {
          ...prev,
          stepStatuses: nextStatuses,
        };
      });
    } finally {
      if (currentReqId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyInDocument = (clauseId: string, _clauseIndex?: number) => {
    setHighlightedClauseId(clauseId);
    setActiveClauseId(clauseId);

    setTimeout(() => {
      setHighlightedClauseId(null);
    }, 3500);
  };

  return (
    <div className="min-h-screen bg-[#F6F1E7] text-[#1E1B17] flex flex-col font-sans selection:bg-[#B85C38]/20 selection:text-[#B85C38]">
      {/* Navigation Header */}
      <Navbar
        readingLevel={readingLevel}
        onToggleReadingLevel={setReadingLevel}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onPrefetchTab={handlePrefetchTab}
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

            {/* Error Message Banner (Auto-scrolled into view when Guard 1 triggers) */}
            {errorMessage && (
              <div
                id="guard-error-banner"
                className="bg-[#FFF5F5] border-2 border-[#FCA5A5] rounded-2xl p-4 flex items-center justify-between text-xs text-[#991B1B] shadow-md animate-fade-in-up scroll-mt-28 ring-4 ring-[#991B1B]/15"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-[#991B1B]/10 flex items-center justify-center shrink-0 border border-[#991B1B]/20">
                    <AlertOctagon className="w-5 h-5 text-[#991B1B]" />
                  </div>
                  <div>
                    <div className="font-bold text-[11px] uppercase tracking-wider text-[#991B1B]">
                      Guard 1 Safety & Format Alert
                    </div>
                    <span className="font-semibold text-xs text-[#7F1D1D] mt-0.5 block">{errorMessage}</span>
                  </div>
                </div>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="p-1.5 rounded-lg hover:bg-[#FCA5A5]/40 text-[#991B1B] font-bold text-sm transition-colors cursor-pointer shrink-0"
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
                  onCancelAnalysis={handleCancelAnalysis}
                />
              </div>

              {/* Chat Screen Area (Takes equal 50% width area alongside uploader when open) */}
              {isChatOpen && (
                <div
                  id="legal-chat-container"
                  className="lg:col-span-6 transition-all duration-300 animate-fade-in-up relative min-h-[500px] lg:min-h-0 scroll-mt-6"
                >
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

            {/* Visual Loading Progress Bar (Stays visible during loading OR when a pipeline step has failed) */}
            {(isLoading || pipelineProgress.stepStatuses.some((s) => s === 'failed')) && (
              <VisualProgress
                activeStepIndex={pipelineProgress.activeStep}
                stepStatuses={pipelineProgress.stepStatuses}
                elapsedMs={pipelineProgress.elapsedMs}
                errorMessage={errorMessage}
                onCancel={handleCancelAnalysis}
              />
            )}

            {/* Document Analysis Dashboard Workspace */}
            {documentAnalysis && !isLoading && (
              <div className="space-y-6">
                {/* Responsive Multi-Pane Grid Layout */}
                {/* Desktop: 2-Column Multi-pane workspace | Mobile: Stacked 1-thing-at-a-time */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column: Sticky Original Document Viewer with Tap-to-Verify */}
                  <div
                    className="lg:col-span-5 lg:sticky self-start h-[440px] transition-all duration-300"
                    style={{ top: `${baseStickyTop}px` }}
                  >
                    <DocumentViewer
                      documentTitle={documentAnalysis.document_title}
                      category={documentAnalysis.category}
                      clauses={documentAnalysis.clauses || []}
                      highlightedClauseId={highlightedClauseId || activeClauseId}
                      onClauseSelect={handleVerifyInDocument}
                    />
                  </div>

                  {/* Right Column: Single Active Card View with Synced Navigation */}
                  {(() => {
                    const clausesList = documentAnalysis.clauses || [];
                    const activeIndex = Math.max(
                      0,
                      clausesList.findIndex((c) => c.id === (activeClauseId || highlightedClauseId))
                    );
                    const activeClause = clausesList[activeIndex] || clausesList[0];

                    return (
                      <div
                        className="lg:col-span-7 lg:sticky self-start space-y-4 transition-all duration-300"
                        style={{ top: `${baseStickyTop}px` }}
                      >
                        {/* Control & Quick Jump Deck Bar */}
                        <div className="bg-[#FBF8F1]/95 backdrop-blur-md px-4 py-3 border-2 border-[#E7E1D3] rounded-[24px] shadow-md space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center space-x-2 min-w-0">
                              <h3 className="text-sm font-extrabold font-heading text-[#1E1B17] flex items-center space-x-2 shrink-0">
                                <Layers className="w-4 h-4 text-[#B85C38]" />
                                <span>Extracted Clauses ({clausesList.length})</span>
                              </h3>
                              {clausesList.length > 0 && (
                                <span className="text-[11px] font-mono font-bold bg-[#E7E1D3] text-[#1E1B17] px-2 py-0.5 rounded-full shrink-0">
                                  {activeIndex + 1} of {clausesList.length}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2 shrink-0">
                              {/* Prev / Next Clause Quick Controls with Disabled States at Ends */}
                              {clausesList.length > 1 && (
                                <div className="flex items-center space-x-1 bg-[#F6F1E7] p-1 rounded-full border border-[#E7E1D3] shadow-2xs">
                                  <button
                                    onClick={() => {
                                      if (activeIndex > 0) {
                                        handleVerifyInDocument(clausesList[activeIndex - 1].id, activeIndex - 1);
                                      }
                                    }}
                                    disabled={activeIndex === 0}
                                    className={`p-1 rounded-full transition-colors ${activeIndex === 0
                                      ? 'opacity-30 cursor-not-allowed text-[#6E6659]/50'
                                      : 'hover:bg-[#E7E1D3] text-[#1E1B17] cursor-pointer'
                                      }`}
                                    title={activeIndex === 0 ? 'No previous clause' : 'Previous Clause'}
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </button>
                                  <span className="text-[11px] font-mono font-extrabold px-1.5 text-[#6E6659]">
                                    {activeIndex + 1}/{clausesList.length}
                                  </span>
                                  <button
                                    onClick={() => {
                                      if (activeIndex < clausesList.length - 1) {
                                        handleVerifyInDocument(clausesList[activeIndex + 1].id, activeIndex + 1);
                                      }
                                    }}
                                    disabled={activeIndex === clausesList.length - 1}
                                    className={`p-1 rounded-full transition-colors ${activeIndex === clausesList.length - 1
                                      ? 'opacity-30 cursor-not-allowed text-[#6E6659]/50'
                                      : 'hover:bg-[#E7E1D3] text-[#1E1B17] cursor-pointer'
                                      }`}
                                    title={activeIndex === clausesList.length - 1 ? 'No next clause' : 'Next Clause'}
                                  >
                                    <ChevronRight className="w-4 h-4" />
                                  </button>
                                </div>
                              )}

                              {/* Contextual Reading-Level Switcher Capsule */}
                              <div className="flex items-center bg-[#F6F1E7] p-1 rounded-full border border-[#E7E1D3] shadow-xs">
                                <button
                                  onClick={() => setReadingLevel('simple')}
                                  title="Plain language explanation"
                                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${readingLevel === 'simple'
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
                                  className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 ${readingLevel === 'very_simple'
                                    ? 'bg-[#FBF8F1] text-[#1E1B17] shadow-xs border border-[#E7E1D3]'
                                    : 'text-[#6E6659] hover:text-[#1E1B17]'
                                    }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-[#B85C38]" />
                                  <span>Ultra Simple</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Quick Deck Jump Bar for instant clause access with auto-scrolling refs */}
                          {clausesList.length > 1 && (
                            <div
                              ref={deckJumpContainerRef}
                              className="flex items-center space-x-1.5 overflow-x-auto py-2 px-1.5 no-scrollbar text-xs scroll-smooth my-0.5"
                            >
                              <span className="text-[10px] font-bold text-[#6E6659] uppercase tracking-wider shrink-0 pr-1">
                                Deck Jump:
                              </span>
                              {clausesList.map((c, i) => (
                                <button
                                  key={`deck-jump-${c.id}`}
                                  ref={(el) => {
                                    deckJumpPillRefs.current[i] = el;
                                  }}
                                  onClick={() => handleVerifyInDocument(c.id, i)}
                                  className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 transition-all cursor-pointer shadow-2xs active:scale-95 my-0.5 ${i === activeIndex
                                    ? 'bg-[#B85C38] text-white border-[#B85C38] font-bold ring-2 ring-[#B85C38]/30 scale-105'
                                    : 'bg-[#F6F1E7] hover:bg-[#B85C38] hover:text-white border-[#E7E1D3] text-[#1E1B17]'
                                    }`}
                                >
                                  {i + 1} {c.clause_type}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Single Active Card View Runway (Non-clipping padding) */}
                        {activeClause && (
                          <div
                            id="active-clause-card-container"
                            key={activeClause.id}
                            className="animate-fade-in-up transition-all duration-300 pb-6 mb-4"
                          >
                            <ClauseCard
                              clause={activeClause}
                              index={activeIndex}
                              totalCards={clausesList.length}
                              readingLevel={readingLevel}
                              onVerifyInDocument={handleVerifyInDocument}
                              onOpenShareModal={setSelectedShareClause}
                              isActive={true}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Summary Overview Banner */}
                <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1D3] pb-3">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] uppercase font-bold text-[#B85C38] bg-[#B85C38]/10 px-2.5 py-0.5 rounded border border-[#B85C38]/20">
                          {documentAnalysis.category || 'Legal Document'}
                        </span>
                        <span className="text-[11px] text-[#065F46] font-semibold flex items-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Guard 1 Verified</span>
                        </span>
                      </div>
                      <h2 className="text-xl font-bold font-heading text-[#1E1B17] mt-1">
                        {documentAnalysis.document_title || 'Legal Agreement'}
                      </h2>
                    </div>

                    {/* Overall Risk Score Pill */}
                    {(() => {
                      const overallScore = typeof documentAnalysis?.overall_risk_score === 'number' && !isNaN(documentAnalysis.overall_risk_score)
                        ? documentAnalysis.overall_risk_score
                        : 0;
                      const riskText = overallScore > 60 ? 'High Risk' : overallScore > 30 ? 'Moderate Risk' : 'Low Risk';
                      const riskBadgeColor = overallScore > 60
                        ? 'bg-[#FFF5F5] text-[#991B1B] border border-[#FCA5A5]'
                        : overallScore > 30
                          ? 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
                          : 'bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7]';
                      return (
                        <div className="flex items-center space-x-2 bg-[#F6F1E7] px-3.5 py-1.5 rounded-lg border border-[#E7E1D3]">
                          <span className="text-xs font-medium text-[#6E6659]">Risk Assessment:</span>
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded flex items-center space-x-1 ${riskBadgeColor}`}
                          >
                            <AlertOctagon className="w-3.5 h-3.5 mr-1" />
                            <span>
                              {riskText} ({overallScore}/100)
                            </span>
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <p className="text-xs md:text-sm text-[#1E1B17] font-medium leading-relaxed">
                    {(readingLevel === 'very_simple'
                      ? documentAnalysis.summary_very_simple || documentAnalysis.summary_simple
                      : documentAnalysis.summary_simple || documentAnalysis.summary_very_simple) ||
                      `${documentAnalysis.document_title || 'Legal Agreement'} analyzed with ${(documentAnalysis.clauses || []).length} primary clauses extracted.`}
                  </p>
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
                    width={800}
                    height={400}
                    loading="lazy"
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onDoubleClick={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onTouchMove={(e) => e.preventDefault()}
                    className="w-full h-auto max-h-[360px] sm:max-h-[420px] md:max-h-[480px] max-w-4xl object-contain mx-auto transition-transform duration-500 ease-out hover:scale-[1.02] select-none pointer-events-none"
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
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
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
