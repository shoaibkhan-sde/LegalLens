import React, { useState } from 'react';
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
} from 'lucide-react';
import { DocumentAnalysisResult } from '../types/schemas';
import { useLanguage } from '../context/LanguageContext';

interface ActionableOutputsProps {
  document: DocumentAnalysisResult;
}

export const ActionableOutputs: React.FC<ActionableOutputsProps> = ({ document }) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'checklist' | 'options' | 'lawyer_brief'>('checklist');

  const handleExportCalendarICS = () => {
    const events = (document?.checklist?.items || []).filter((item) => item?.due_date_or_timeframe);
    if (events.length === 0) {
      alert('No specific deadline dates found to export to calendar.');
      return;
    }

    let icsContent =
      'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//LegalLens//Legal Deadline Reminders//EN\n';

    events.forEach((item) => {
      icsContent += `BEGIN:VEVENT\nSUMMARY:LegalLens: ${item.title}\nDESCRIPTION:${item.description} - Action: ${item.action_required}\nSTATUS:CONFIRMED\nEND:VEVENT\n`;
    });

    icsContent += 'END:VCALENDAR';

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = window.document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${(document?.document_title || 'Document').replace(/\s+/g, '_')}_Deadlines.ics`);
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handlePrintLawyerBrief = () => {
    window.print();
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
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'checklist'
                ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                : 'text-[#6E6659] hover:text-[#1E1B17]'
            }`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{t('outputs.tab_checklist')}</span>
          </button>

          <button
            onClick={() => setActiveTab('options')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'options'
                ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                : 'text-[#6E6659] hover:text-[#1E1B17]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('outputs.tab_possibilities')}</span>
          </button>

          <button
            onClick={() => setActiveTab('lawyer_brief')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 cursor-pointer ${
              activeTab === 'lawyer_brief'
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
              onClick={handleExportCalendarICS}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#B85C38] hover:bg-[#9C4B2B] text-white text-xs font-bold rounded transition-colors shadow-xs cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('outputs.export_ical')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {(document?.checklist?.items || []).map((item) => (
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
        </div>
      )}

      {/* Tab 2: Possibilities & Next Steps */}
      {activeTab === 'options' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl text-xs text-[#1E1B17]">
            <strong className="text-[#B85C38]">{t('outputs.framing_note_title')}</strong> {t('outputs.framing_note_desc')}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(document?.options_next_steps || []).map((opt) => (
              <div
                key={opt.id}
                className="p-4 bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl space-y-2"
              >
                <h4 className="text-xs font-bold text-[#1E1B17] flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#B85C38]" />
                  <span>{opt.title}</span>
                </h4>
                <p className="text-xs text-[#6E6659] leading-relaxed">{opt.description}</p>

                <div className="pt-2 border-t border-[#E7E1D3] text-xs space-y-0.5">
                  <p className="text-[#065F46] font-semibold">{t('outputs.benefit')}: {opt.benefit}</p>
                  {opt.tradeoff && <p className="text-[#6E6659]">{t('outputs.tradeoff')}: {opt.tradeoff}</p>}
                </div>
              </div>
            ))}
          </div>
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
              onClick={handlePrintLawyerBrief}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#1E1B17] text-xs font-semibold rounded border border-[#E7E1D3] transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-[#B85C38]" />
              <span>Print Packet</span>
            </button>
          </div>

          {/* Flagged Issues */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#991B1B] tracking-wider">
              Flagged High-Risk Issues ({(document?.lawyer_briefing?.flagged_issues || []).length})
            </h4>

            {(document?.lawyer_briefing?.flagged_issues || []).map((issue, idx) => (
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
            ))}
          </div>

          {/* Ready to Ask Questions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#B85C38] tracking-wider">
              Ready-to-Ask Questions for Your Advocate
            </h4>
            <div className="bg-[#F6F1E7] p-4 rounded-xl border border-[#E7E1D3] space-y-2 text-xs text-[#1E1B17]">
              {(document?.lawyer_briefing?.questions_to_ask_lawyer || []).map((q, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <HelpCircle className="w-3.5 h-3.5 text-[#B85C38] shrink-0 mt-0.5" />
                  <p>{q}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Protective Clauses */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-[#6E6659] tracking-wider">
              Missing Protective Clauses
            </h4>
            <div className="bg-[#F6F1E7] p-4 rounded-xl border border-[#E7E1D3] space-y-2 text-xs text-[#1E1B17]">
              {(document?.lawyer_briefing?.missing_protective_clauses || []).map((missing, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <FileText className="w-3.5 h-3.5 text-[#B85C38] shrink-0 mt-0.5" />
                  <p>{missing}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
