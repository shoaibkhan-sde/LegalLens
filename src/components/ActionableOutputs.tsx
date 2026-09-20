import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Calendar,
  Briefcase,
  HelpCircle,
  Printer,
  Sparkles,
  FileCheck,
  AlertOctagon,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { DocumentAnalysisResult } from '../types/schemas';
import { useLanguage } from '../context/LanguageContext';

import { saveStorage, loadStorage } from '../utils/persistence';
import { buildICalCalendarContent } from '../utils/icalExporter';

interface ActionableOutputsProps {
  document: DocumentAnalysisResult;
}

export const ActionableOutputs: React.FC<ActionableOutputsProps> = ({ document }) => {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTabState] = useState<'checklist' | 'options' | 'lawyer_brief'>(() => {
    return loadStorage<'checklist' | 'options' | 'lawyer_brief'>('legallens_actionable_tab', 'checklist');
  });
  const setActiveTab = (tab: 'checklist' | 'options' | 'lawyer_brief') => {
    setActiveTabState(tab);
    saveStorage('legallens_actionable_tab', tab);
  };

  // Checklist Deck State
  const [checklistIndex, setChecklistIndexState] = useState<number>(() => {
    return loadStorage<number>('legallens_checklist_index', 0);
  });
  const setChecklistIndex = (idx: number | ((prev: number) => number)) => {
    setChecklistIndexState((prev) => {
      const next = typeof idx === 'function' ? idx(prev) : idx;
      saveStorage('legallens_checklist_index', next);
      return next;
    });
  };
  const [checklistViewMode, setChecklistViewMode] = useState<'card' | 'all'>('card');
  const checklistItems = document?.checklist?.items || [];
  const totalChecklistItems = checklistItems.length;
  const currentChecklistItem = checklistItems[checklistIndex] || checklistItems[0];

  // Possibilities Deck State
  const [optionsIndex, setOptionsIndexState] = useState<number>(() => {
    return loadStorage<number>('legallens_options_index', 0);
  });
  const setOptionsIndex = (idx: number | ((prev: number) => number)) => {
    setOptionsIndexState((prev) => {
      const next = typeof idx === 'function' ? idx(prev) : idx;
      saveStorage('legallens_options_index', next);
      return next;
    });
  };
  const [optionsViewMode, setOptionsViewMode] = useState<'card' | 'all'>('card');
  const optionsItems = document?.options_next_steps || [];
  const totalOptionsItems = optionsItems.length;
  const currentOptionItem = optionsItems[optionsIndex] || optionsItems[0];

  // Lawyer Briefing Issues Deck State
  const [flaggedIndex, setFlaggedIndexState] = useState<number>(() => {
    return loadStorage<number>('legallens_flagged_index', 0);
  });
  const setFlaggedIndex = (idx: number | ((prev: number) => number)) => {
    setFlaggedIndexState((prev) => {
      const next = typeof idx === 'function' ? idx(prev) : idx;
      saveStorage('legallens_flagged_index', next);
      return next;
    });
  };
  const [flaggedViewMode, setFlaggedViewMode] = useState<'card' | 'all'>('card');
  const flaggedIssues = document?.lawyer_briefing?.flagged_issues || [];
  const totalFlaggedIssues = flaggedIssues.length;
  const currentFlaggedIssue = flaggedIssues[flaggedIndex] || flaggedIssues[0];

  // Auto-scrolling refs for horizontal pill scrollers
  const checklistContainerRef = useRef<HTMLDivElement | null>(null);
  const checklistPillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const optionsContainerRef = useRef<HTMLDivElement | null>(null);
  const optionsPillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const flaggedContainerRef = useRef<HTMLDivElement | null>(null);
  const flaggedPillRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (activeTab === 'checklist') {
      const activePill = checklistPillRefs.current[checklistIndex];
      const container = checklistContainerRef.current;
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
  }, [checklistIndex, checklistViewMode, activeTab, document]);

  useEffect(() => {
    if (activeTab === 'options') {
      const activePill = optionsPillRefs.current[optionsIndex];
      const container = optionsContainerRef.current;
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
  }, [optionsIndex, optionsViewMode, activeTab, document]);

  useEffect(() => {
    if (activeTab === 'lawyer_brief') {
      const activePill = flaggedPillRefs.current[flaggedIndex];
      const container = flaggedContainerRef.current;
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
  }, [flaggedIndex, flaggedViewMode, activeTab, document]);

  const handleExportCalendarICS = () => {
    const items = document?.checklist?.items || [];
    const docTitle = document?.document_title || (language === 'hi' ? 'कानूनी दस्तावेज़' : 'Legal Agreement');

    const { icsContent, exportCount } = buildICalCalendarContent(items, docTitle, language);

    if (exportCount === 0 || !icsContent) {
      alert(
        language === 'hi'
          ? 'कैलेंडर में निर्यात करने के लिए कोई विशिष्ट समय सीमा नहीं मिली।'
          : 'No specific deadline dates or timeframes found in this checklist to export to your calendar.'
      );
      return;
    }

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = window.document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    const sanitizedTitle = docTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `${sanitizedTitle}_Deadlines.ics`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handlePrintLawyerBrief = () => {
    if (!document) return;

    const isHi = language === 'hi';
    const docTitle = document.document_title || (isHi ? 'कानूनी दस्तावेज़' : 'Legal Agreement');
    const riskScore = document.overall_risk_score ?? 0;
    const riskBadgeClass = riskScore > 60 ? 'risk-high' : riskScore > 30 ? 'risk-medium' : 'risk-low';
    const riskText = isHi
      ? (riskScore > 60 ? `उच्च जोखिम (${riskScore}/100)` : riskScore > 30 ? `मध्यम जोखिम (${riskScore}/100)` : `कम जोखिम (${riskScore}/100)`)
      : (riskScore > 60 ? `High Risk (${riskScore}/100)` : riskScore > 30 ? `Medium Risk (${riskScore}/100)` : `Low Risk (${riskScore}/100)`);

    const summaryText = document.lawyer_briefing?.document_summary || document.summary_simple || '';
    const allFlagged = document.lawyer_briefing?.flagged_issues || [];
    const questions = document.lawyer_briefing?.questions_to_ask_lawyer || [];
    const missingClauses = document.lawyer_briefing?.missing_protective_clauses || [];
    const disclaimerText = document.lawyer_briefing?.disclaimer || document.disclaimer ||
      (isHi
        ? 'लीगललेंस एक एआई सहायता उपकरण है, कानून फर्म नहीं। यह ब्रीफिंग पैकेट केवल आपके अधिवक्ता के साथ परामर्श की तैयारी हेतु बनाया गया है।'
        : 'LegalLens is an AI legal assistance tool, not a law firm. This briefing packet is generated to assist your discussion with a qualified advocate/attorney.');

    const dateStr = new Date().toLocaleDateString(isHi ? 'hi-IN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="${isHi ? 'hi' : 'en'}">
<head>
  <meta charset="utf-8">
  <title>${docTitle.replace(/\s+/g, '_')}_Lawyer_Briefing_Packet</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1E1B17;
      background-color: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #B85C38;
      padding-bottom: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand {
      font-size: 18px;
      font-weight: 800;
      color: #1E1B17;
      letter-spacing: -0.3px;
    }
    .brand span {
      color: #B85C38;
    }
    .brand-sub {
      font-size: 11px;
      color: #6E6659;
      font-weight: 500;
      margin-top: 2px;
    }
    .doc-meta {
      text-align: right;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 700;
      color: #1E1B17;
    }
    .date-stamp {
      font-size: 11px;
      color: #6E6659;
      margin-top: 2px;
    }
    .risk-badge {
      display: inline-block;
      padding: 3px 9px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11px;
      margin-top: 4px;
    }
    .risk-high { background-color: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
    .risk-medium { background-color: #FEF3C7; color: #92400E; border: 1px solid #FCD34D; }
    .risk-low { background-color: #D1FAE5; color: #065F46; border: 1px solid #6EE7B7; }

    .summary-box {
      background-color: #F6F1E7;
      border: 1px solid #E7E1D3;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .summary-title {
      margin: 0 0 6px 0;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6E6659;
    }
    .summary-text {
      margin: 0;
      color: #1E1B17;
      line-height: 1.5;
    }

    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding-bottom: 6px;
      border-bottom: 1px solid #E7E1D3;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    .title-red { color: #991B1B; }
    .title-orange { color: #B85C38; }
    .title-gray { color: #475569; }

    .issue-card {
      background-color: #FFF5F5;
      border: 1px solid #FCA5A5;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    .issue-title {
      font-weight: 700;
      color: #991B1B;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .issue-concern {
      color: #1E1B17;
      margin-bottom: 6px;
    }
    .issue-edit {
      background-color: #FBF8F1;
      border: 1px solid #E7E1D3;
      border-radius: 6px;
      padding: 6px 10px;
      font-family: monospace;
      font-size: 11px;
      color: #065F46;
    }

    .list-box {
      background-color: #F6F1E7;
      border: 1px solid #E7E1D3;
      border-radius: 8px;
      padding: 12px 14px;
      page-break-inside: avoid;
    }
    .list-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .list-item:last-child {
      margin-bottom: 0;
    }
    .bullet {
      color: #B85C38;
      font-weight: bold;
      margin-right: 8px;
      font-size: 14px;
      line-height: 1.2;
    }
    .item-text {
      color: #1E1B17;
      flex: 1;
    }

    .empty-note {
      color: #065F46;
      font-size: 12px;
      font-style: italic;
    }

    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #E7E1D3;
      font-size: 10px;
      color: #6E6659;
      text-align: center;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">LegalLens <span>Briefing</span></div>
      <div class="brand-sub">${isHi ? 'अधिवक्ता परामर्श दस्तावेज़' : 'Advocate Consultation Packet'}</div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${docTitle}</div>
      <div class="date-stamp">${dateStr}</div>
      <div class="risk-badge ${riskBadgeClass}">${riskText}</div>
    </div>
  </div>

  ${summaryText ? `
  <div class="summary-box">
    <div class="summary-title">${isHi ? 'दस्तावेज़ का संक्षिप्त सारांश' : 'Executive Document Summary'}</div>
    <p class="summary-text">${summaryText}</p>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title title-red">${isHi ? 'चिह्नित उच्च-जोखिम के मुद्दे' : 'Flagged High-Risk Issues'} (${allFlagged.length})</div>
    ${allFlagged.length > 0 ? allFlagged.map((issue) => `
      <div class="issue-card">
        <div class="issue-title">⚠️ ${issue.clause_title}</div>
        <div class="issue-concern">${issue.concern}</div>
        ${issue.suggested_clause_edit ? `<div class="issue-edit">${isHi ? 'अनुशंसित संशोधन' : 'Suggested Edit'}: ${issue.suggested_clause_edit}</div>` : ''}
      </div>
    `).join('') : `
      <div class="list-box">
        <div class="empty-note">
          ${isHi ? 'इस समझौते में कोई उच्च-जोखिम वाला मुद्दा नहीं पाया गया।' : 'No high-risk issues flagged in this agreement.'}
        </div>
      </div>
    `}
  </div>

  <div class="section">
    <div class="section-title title-orange">${isHi ? 'आपके अधिवक्ता से पूछने के लिए तैयार प्रश्न' : 'Ready-to-Ask Questions for Your Advocate'} (${questions.length})</div>
    <div class="list-box">
      ${questions.length > 0 ? questions.map((q) => `
        <div class="list-item">
          <span class="bullet">❓</span>
          <span class="item-text">${q}</span>
        </div>
      `).join('') : `
        <div class="empty-note">
          ${isHi ? 'कोई विशिष्ट प्रश्न आवश्यक नहीं हैं — यह समझौता स्पष्ट प्रतीत होता है।' : 'No specific questions flagged for this agreement.'}
        </div>
      `}
    </div>
  </div>

  <div class="section">
    <div class="section-title title-gray">${isHi ? 'गायब सुरक्षात्मक धाराएं' : 'Missing Protective Clauses'} (${missingClauses.length})</div>
    <div class="list-box">
      ${missingClauses.length > 0 ? missingClauses.map((m) => `
        <div class="list-item">
          <span class="bullet">📄</span>
          <span class="item-text">${m}</span>
        </div>
      `).join('') : `
        <div class="empty-note">
          ${isHi ? 'इस दस्तावेज़ में कोई महत्वपूर्ण सुरक्षात्मक धाराएँ गायब नहीं मिलीं।' : 'No missing protective clauses detected for this document.'}
        </div>
      `}
    </div>
  </div>

  <div class="footer">
    <div>LegalLens AI Legal Assistant • ${isHi ? 'अधिवक्ता ब्रीफिंग पैकेट' : 'Lawyer Briefing Packet'} • ${dateStr}</div>
    <div style="margin-top: 4px;">${disclaimerText}</div>
  </div>
</body>
</html>`;

    const iframe = window.document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    window.document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (window.document.body.contains(iframe)) {
            window.document.body.removeChild(iframe);
          }
        }, 1000);
      }, 250);
    }
  };

  return (
    <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 shadow-xs space-y-5">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1D3] pb-3">
        <div>
          <h2 className="text-base font-bold font-heading text-[#1E1B17]">{t('outputs.title')}</h2>
          <p className="text-xs text-[#6E6659]">{t('outputs.subtitle')}</p>
        </div>

        <div className="flex items-center space-x-1 bg-[#F6F1E7] p-1 rounded-lg border border-[#E7E1D3]">
          <button
            type="button"
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'checklist'
                ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                : 'text-[#6E6659] hover:text-[#1E1B17]'
              }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{t('outputs.tab_checklist')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('options')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'options'
                ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                : 'text-[#6E6659] hover:text-[#1E1B17]'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('outputs.tab_possibilities')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lawyer_brief')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 cursor-pointer ${activeTab === 'lawyer_brief'
                ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                : 'text-[#6E6659] hover:text-[#1E1B17]'
              }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>{t('outputs.tab_brief')}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Checklist Artifact */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#F6F1E7] p-3.5 rounded-xl border border-[#E7E1D3]">
            <div>
              <h3 className="text-xs font-bold text-[#1E1B17]">{document?.checklist?.title || t('outputs.tab_checklist')}</h3>
              <p className="text-[11px] text-[#6E6659] mt-0.5">
                {document?.checklist?.stamp_duty_required
                  ? `Stamp Duty Note: ${document?.checklist?.stamp_duty_note || 'Stamp paper required'}`
                  : 'No special stamp paper requirements detected.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCalendarICS}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#B85C38] hover:bg-[#9C4B2B] text-white text-xs font-bold rounded transition-colors shadow-xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('outputs.export_ical')}</span>
            </button>
          </div>

          {/* Checklist Deck Navigation Bar (<-, ->) & Jump Pills */}
          {totalChecklistItems > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[#F6F1E7] p-2.5 rounded-xl border border-[#E7E1D3]">
              {/* Previous / Next Arrows & Counter */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setChecklistIndex((prev) => Math.max(0, prev - 1))}
                  disabled={checklistIndex === 0}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${checklistIndex === 0
                      ? 'bg-[#E7E1D3]/40 text-[#94A3B8] border-[#E7E1D3] cursor-not-allowed opacity-50'
                      : 'bg-[#FBF8F1] text-[#1E1B17] hover:bg-[#B85C38] hover:text-white border-[#E7E1D3] shadow-xs'
                    }`}
                  title="Previous Checklist Item"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-[#1E1B17] px-2 min-w-[85px] text-center">
                  Item {checklistIndex + 1} of {totalChecklistItems}
                </span>

                <button
                  type="button"
                  onClick={() => setChecklistIndex((prev) => Math.min(totalChecklistItems - 1, prev + 1))}
                  disabled={checklistIndex === totalChecklistItems - 1}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${checklistIndex === totalChecklistItems - 1
                      ? 'bg-[#E7E1D3]/40 text-[#94A3B8] border-[#E7E1D3] cursor-not-allowed opacity-50'
                      : 'bg-[#FBF8F1] text-[#1E1B17] hover:bg-[#B85C38] hover:text-white border-[#E7E1D3] shadow-xs'
                    }`}
                  title="Next Checklist Item"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Jump Pill Deck (Clean 1, 2, 3 numbers without # symbol) */}
              <div ref={checklistContainerRef} className="flex items-center space-x-1 max-w-full overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                {checklistItems.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    ref={(el) => {
                      checklistPillRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={() => {
                      setChecklistIndex(idx);
                      setChecklistViewMode('card');
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${idx === checklistIndex && checklistViewMode === 'card'
                        ? 'bg-[#B85C38] text-white shadow-xs'
                        : 'bg-[#FBF8F1] text-[#6E6659] hover:text-[#1E1B17] hover:bg-[#E7E1D3]/60 border border-[#E7E1D3]'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <button
                type="button"
                onClick={() => setChecklistViewMode(checklistViewMode === 'card' ? 'all' : 'card')}
                className="text-[11px] font-semibold text-[#6E6659] hover:text-[#1E1B17] underline decoration-[#B85C38] shrink-0 cursor-pointer"
              >
                {checklistViewMode === 'card' ? 'View All List' : `Card View (1 of ${totalChecklistItems})`}
              </button>
            </div>
          )}

          {/* Render Active View: Single Card Deck View (default) or Full List */}
          {totalChecklistItems > 0 ? (
            checklistViewMode === 'card' ? (
              currentChecklistItem && (
                <div
                  key={currentChecklistItem.id || checklistIndex}
                  className="p-4 sm:p-5 bg-[#F6F1E7] border-2 border-[#B85C38]/40 rounded-2xl space-y-3 shadow-xs animate-fade-in-up"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-[#B85C38]/10 text-[#B85C38] flex items-center justify-center shrink-0 border border-[#B85C38]/20 mt-0.5">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="text-sm font-bold text-[#1E1B17]">{currentChecklistItem.title}</h4>
                        {currentChecklistItem.due_date_or_timeframe && (
                          <span className="text-xs bg-[#FBF8F1] text-[#B85C38] font-bold px-2.5 py-1 rounded-full border border-[#E7E1D3] flex items-center space-x-1 shadow-2xs">
                            <Clock className="w-3 h-3" />
                            <span>{currentChecklistItem.due_date_or_timeframe}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-[#6E6659] leading-relaxed">{currentChecklistItem.description}</p>
                      <div className="p-3 bg-[#FBF8F1] rounded-xl border border-[#E7E1D3] text-xs font-semibold text-[#065F46] mt-2">
                        {t('outputs.action_label')}: {currentChecklistItem.action_required}
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl flex items-start space-x-3"
                  >
                    <div className="w-7 h-7 rounded bg-[#B85C38]/10 text-[#B85C38] flex items-center justify-center shrink-0 border border-[#B85C38]/20 mt-0.5">
                      <FileCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#1E1B17]">{item.title}</h4>
                        {item.due_date_or_timeframe && (
                          <span className="text-[10px] bg-[#FBF8F1] text-[#B85C38] font-semibold px-2 py-0.5 rounded border border-[#E7E1D3] flex items-center space-x-1">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{item.due_date_or_timeframe}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6E6659]">{item.description}</p>
                      <p className="text-xs font-semibold text-[#065F46] pt-0.5">
                        {t('outputs.action_label')}: {item.action_required}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="p-4 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl text-xs text-[#6E6659] text-center font-medium">
              {language === 'hi'
                ? 'इस दस्तावेज़ के लिए कोई विशिष्ट कार्रवाई सूची आइटम नहीं मिले।'
                : 'No specific action checklist items required for this document.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Possibilities & Next Steps */}
      {activeTab === 'options' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl text-xs text-[#1E1B17]">
            <strong className="text-[#B85C38]">{t('outputs.framing_note_title')}</strong> {t('outputs.framing_note_desc')}
          </div>

          {/* Possibilities Deck Navigation Bar (<-, ->) & Jump Pills */}
          {totalOptionsItems > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[#F6F1E7] p-2.5 rounded-xl border border-[#E7E1D3]">
              {/* Previous / Next Arrows & Counter */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOptionsIndex((prev) => Math.max(0, prev - 1))}
                  disabled={optionsIndex === 0}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${optionsIndex === 0
                      ? 'bg-[#E7E1D3]/40 text-[#94A3B8] border-[#E7E1D3] cursor-not-allowed opacity-50'
                      : 'bg-[#FBF8F1] text-[#1E1B17] hover:bg-[#B85C38] hover:text-white border-[#E7E1D3] shadow-xs'
                    }`}
                  title="Previous Option"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-bold text-[#1E1B17] px-2 min-w-[95px] text-center">
                  Option {optionsIndex + 1} of {totalOptionsItems}
                </span>

                <button
                  type="button"
                  onClick={() => setOptionsIndex((prev) => Math.min(totalOptionsItems - 1, prev + 1))}
                  disabled={optionsIndex === totalOptionsItems - 1}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${optionsIndex === totalOptionsItems - 1
                      ? 'bg-[#E7E1D3]/40 text-[#94A3B8] border-[#E7E1D3] cursor-not-allowed opacity-50'
                      : 'bg-[#FBF8F1] text-[#1E1B17] hover:bg-[#B85C38] hover:text-white border-[#E7E1D3] shadow-xs'
                    }`}
                  title="Next Option"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Jump Pill Deck (Clean 1, 2, 3 numbers without # symbol) */}
              <div ref={optionsContainerRef} className="flex items-center space-x-1 max-w-full overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                {optionsItems.map((opt, idx) => (
                  <button
                    key={opt.id || idx}
                    ref={(el) => {
                      optionsPillRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={() => {
                      setOptionsIndex(idx);
                      setOptionsViewMode('card');
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${idx === optionsIndex && optionsViewMode === 'card'
                        ? 'bg-[#B85C38] text-white shadow-xs'
                        : 'bg-[#FBF8F1] text-[#6E6659] hover:text-[#1E1B17] hover:bg-[#E7E1D3]/60 border border-[#E7E1D3]'
                      }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* View Mode Toggle */}
              <button
                type="button"
                onClick={() => setOptionsViewMode(optionsViewMode === 'card' ? 'all' : 'card')}
                className="text-[11px] font-semibold text-[#6E6659] hover:text-[#1E1B17] underline decoration-[#B85C38] shrink-0 cursor-pointer"
              >
                {optionsViewMode === 'card' ? 'View All List' : `Card View (1 of ${totalOptionsItems})`}
              </button>
            </div>
          )}

          {/* Render Active View: Single Card Deck View (default) or Full Grid */}
          {totalOptionsItems > 0 ? (
            optionsViewMode === 'card' ? (
              currentOptionItem && (
                <div
                  key={currentOptionItem.id || optionsIndex}
                  className="p-5 bg-[#F6F1E7] border-2 border-[#B85C38]/40 rounded-2xl space-y-3 shadow-xs animate-fade-in-up"
                >
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-bold text-[#1E1B17] flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[#B85C38] shrink-0" />
                      <span>{currentOptionItem.title}</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-[#6E6659] leading-relaxed">{currentOptionItem.description}</p>
                  </div>

                  <div className="pt-3 border-t border-[#E7E1D3] text-xs space-y-1.5">
                    <p className="text-[#065F46] font-semibold flex items-start space-x-1.5 p-2 bg-[#FBF8F1] rounded-lg border border-[#E7E1D3]">
                      <span className="font-bold">{t('outputs.benefit')}:</span>
                      <span>{currentOptionItem.benefit}</span>
                    </p>
                    {currentOptionItem.tradeoff && (
                      <p className="text-[#6E6659] flex items-start space-x-1.5 p-2 bg-[#FBF8F1] rounded-lg border border-[#E7E1D3]">
                        <span className="font-bold text-[#1E1B17]">{t('outputs.tradeoff')}:</span>
                        <span>{currentOptionItem.tradeoff}</span>
                      </p>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {optionsItems.map((opt) => (
                  <div
                    key={opt.id}
                    className="p-4 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <h4 className="text-xs sm:text-sm font-bold text-[#1E1B17] flex items-start space-x-2">
                        <Sparkles className="w-4 h-4 text-[#B85C38] shrink-0 mt-0.5" />
                        <span>{opt.title}</span>
                      </h4>
                      <p className="text-xs text-[#6E6659] leading-relaxed">{opt.description}</p>
                    </div>

                    <div className="pt-2 border-t border-[#E7E1D3] text-xs space-y-1">
                      <p className="text-[#065F46] font-semibold flex items-start space-x-1">
                        <span>{t('outputs.benefit')}:</span>
                        <span>{opt.benefit}</span>
                      </p>
                      {opt.tradeoff && (
                        <p className="text-[#6E6659] flex items-start space-x-1">
                          <span>{t('outputs.tradeoff')}:</span>
                          <span>{opt.tradeoff}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="p-4 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl text-xs text-[#6E6659] text-center font-medium">
              {language === 'hi'
                ? 'इस दस्तावेज़ के लिए कोई अतिरिक्त बातचीत विकल्प आवश्यक नहीं हैं।'
                : 'No additional negotiation options required for this straightforward document.'}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Lawyer-Briefing Packet */}
      {activeTab === 'lawyer_brief' && (
        <div className="space-y-5 print:text-black">
          <div className="flex items-center justify-between border-b border-[#E7E1D3] pb-3">
            <div>
              <h3 className="text-sm font-bold font-heading text-[#1E1B17]">Lawyer Briefing Packet</h3>
              <p className="text-xs text-[#6E6659]">Prepare for a legal professional with ready-to-ask questions</p>
            </div>

            <button
              type="button"
              onClick={handlePrintLawyerBrief}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#1E1B17] text-xs font-semibold rounded border border-[#E7E1D3] transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#B85C38]" />
              <span>Print Packet</span>
            </button>
          </div>

          {/* Flagged Issues with Card Deck View Navigation */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase text-[#991B1B] tracking-wider">
                Flagged High-Risk Issues ({totalFlaggedIssues})
              </h4>

              {totalFlaggedIssues > 1 && (
                <button
                  type="button"
                  onClick={() => setFlaggedViewMode(flaggedViewMode === 'card' ? 'all' : 'card')}
                  className="text-[11px] font-semibold text-[#6E6659] hover:text-[#1E1B17] underline decoration-[#B85C38] cursor-pointer"
                >
                  {flaggedViewMode === 'card' ? 'View All Issues' : `Card View (1 of ${totalFlaggedIssues})`}
                </button>
              )}
            </div>

            {totalFlaggedIssues > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[#F6F1E7] p-2.5 rounded-xl border border-[#E7E1D3]">
                {/* Previous / Next Arrows & Counter */}
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFlaggedIndex((prev) => Math.max(0, prev - 1))}
                    disabled={flaggedIndex === 0}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${flaggedIndex === 0
                        ? 'bg-[#E7E1D3]/40 text-[#94A3B8] border-[#E7E1D3] cursor-not-allowed opacity-50'
                        : 'bg-[#FBF8F1] text-[#1E1B17] hover:bg-[#B85C38] hover:text-white border-[#E7E1D3] shadow-xs'
                      }`}
                    title="Previous Flagged Issue"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-bold text-[#1E1B17] px-2 min-w-[85px] text-center">
                    Issue {flaggedIndex + 1} of {totalFlaggedIssues}
                  </span>

                  <button
                    type="button"
                    onClick={() => setFlaggedIndex((prev) => Math.min(totalFlaggedIssues - 1, prev + 1))}
                    disabled={flaggedIndex === totalFlaggedIssues - 1}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${flaggedIndex === totalFlaggedIssues - 1
                        ? 'bg-[#E7E1D3]/40 text-[#94A3B8] border-[#E7E1D3] cursor-not-allowed opacity-50'
                        : 'bg-[#FBF8F1] text-[#1E1B17] hover:bg-[#B85C38] hover:text-white border-[#E7E1D3] shadow-xs'
                      }`}
                    title="Next Flagged Issue"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Jump Pill Deck (Clean 1, 2, 3 numbers without # symbol) */}
                <div ref={flaggedContainerRef} className="flex items-center space-x-1 max-w-full overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
                  {flaggedIssues.map((issue, idx) => (
                    <button
                      key={idx}
                      ref={(el) => {
                        flaggedPillRefs.current[idx] = el;
                      }}
                      type="button"
                      onClick={() => {
                        setFlaggedIndex(idx);
                        setFlaggedViewMode('card');
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all shrink-0 cursor-pointer ${idx === flaggedIndex && flaggedViewMode === 'card'
                          ? 'bg-[#991B1B] text-white shadow-xs'
                          : 'bg-[#FBF8F1] text-[#6E6659] hover:text-[#1E1B17] hover:bg-[#E7E1D3]/60 border border-[#E7E1D3]'
                        }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Render Active View: Single Issue Card Deck View (default), Full List, or Empty State */}
            {totalFlaggedIssues > 0 ? (
              flaggedViewMode === 'card' && currentFlaggedIssue ? (
                <div className="p-4 bg-[#FFF5F5] border-2 border-[#FCA5A5] rounded-xl space-y-2 animate-fade-in-up">
                  <div className="flex items-center space-x-2 text-[#991B1B] font-bold text-xs">
                    <AlertOctagon className="w-4 h-4 shrink-0" />
                    <span>{currentFlaggedIssue.clause_title}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#1E1B17] leading-relaxed">{currentFlaggedIssue.concern}</p>
                  {currentFlaggedIssue.suggested_clause_edit && (
                    <div className="p-3 bg-[#FBF8F1] rounded-xl text-xs text-[#065F46] font-mono border border-[#E7E1D3] mt-2">
                      Suggested Edit: {currentFlaggedIssue.suggested_clause_edit}
                    </div>
                  )}
                </div>
              ) : (
                flaggedIssues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-[#FFF5F5] border border-[#FCA5A5] rounded-xl space-y-1.5"
                  >
                    <div className="flex items-center space-x-2 text-[#991B1B] font-bold text-xs">
                      <AlertOctagon className="w-3.5 h-3.5" />
                      <span>{issue.clause_title}</span>
                    </div>
                    <p className="text-xs text-[#1E1B17]">{issue.concern}</p>
                    {issue.suggested_clause_edit && (
                      <div className="p-2.5 bg-[#FBF8F1] rounded text-xs text-[#065F46] font-mono border border-[#E7E1D3]">
                        Suggested Edit: {issue.suggested_clause_edit}
                      </div>
                    )}
                  </div>
                ))
              )
            ) : (
              <div className="p-3.5 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl text-xs text-[#065F46] font-medium flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-[#065F46] shrink-0" />
                <span>
                  {language === 'hi'
                    ? 'इस समझौते में कोई उच्च-जोखिम वाला मुद्दा नहीं पाया गया। सभी विश्लेषित धाराएं मानक स्वीकार्य सीमा में हैं।'
                    : 'No high-risk issues flagged in this agreement. All analyzed clauses fall within standard acceptable risk levels.'}
                </span>
              </div>
            )}
          </div>

          {/* Ready to Ask Questions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#B85C38] tracking-wider">
              Ready-to-Ask Questions for Your Advocate
            </h4>
            <div className="bg-[#F6F1E7] p-4 rounded-xl border border-[#E7E1D3] space-y-2 text-xs text-[#1E1B17]">
              {(document?.lawyer_briefing?.questions_to_ask_lawyer || []).length > 0 ? (
                (document?.lawyer_briefing?.questions_to_ask_lawyer || []).map((q, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <HelpCircle className="w-3.5 h-3.5 text-[#B85C38] shrink-0 mt-0.5" />
                    <p>{q}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-start space-x-2.5 text-[#6E6659]">
                  <HelpCircle className="w-4 h-4 text-[#B85C38] shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {language === 'hi'
                      ? 'कोई विशिष्ट प्रश्न आवश्यक नहीं हैं — यह समझौता स्पष्ट प्रतीत होता है। यदि कुछ भी अस्पष्ट है, तो अपने वकील से मुख्य शर्तों पर चर्चा करने के लिए कहें।'
                      : 'No specific questions flagged — this agreement appears straightforward. If anything is unclear, consider asking your advocate to walk through the key terms.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Missing Protective Clauses */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#6E6659] tracking-wider">
              Missing Protective Clauses
            </h4>
            <div className="bg-[#F6F1E7] p-4 rounded-xl border border-[#E7E1D3] space-y-2 text-xs text-[#1E1B17]">
              {(document?.lawyer_briefing?.missing_protective_clauses || []).length > 0 ? (
                (document?.lawyer_briefing?.missing_protective_clauses || []).map((missing, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <FileText className="w-3.5 h-3.5 text-[#B85C38] shrink-0 mt-0.5" />
                    <p>{missing}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-start space-x-2.5 text-[#065F46]">
                  <FileCheck className="w-4 h-4 text-[#065F46] shrink-0 mt-0.5" />
                  <p className="font-medium text-xs leading-relaxed">
                    {language === 'hi'
                      ? 'इस दस्तावेज़ में कोई महत्वपूर्ण सुरक्षात्मक धाराएँ गायब नहीं मिलीं। मानक सुरक्षात्मक प्रावधान मौजूद हैं।'
                      : 'No missing protective clauses detected for this document. Standard protective provisions are present.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
