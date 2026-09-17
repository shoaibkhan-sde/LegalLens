import React from 'react';
import { ShieldCheck, FileSearch, Layers, AlertTriangle, Sparkles, Check, X, AlertOctagon, XCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface VisualProgressProps {
  activeStepIndex?: number;
  stepStatuses?: Array<'pending' | 'in_progress' | 'completed' | 'failed'>;
  elapsedMs?: Record<number, number>;
  errorMessage?: string | null;
  onCancel?: () => void;
}

export const VisualProgress: React.FC<VisualProgressProps> = ({
  stepStatuses,
  elapsedMs = {},
  errorMessage,
  onCancel,
}) => {
  const { t, language } = useLanguage();

  const STEPS = [
    { key: 'guard1', label: t('pipeline.step_guard1'), icon: ShieldCheck, desc: t('pipeline.step_guard1_desc') },
    { key: 'ocr', label: t('pipeline.step_ocr'), icon: FileSearch, desc: t('pipeline.step_ocr_desc') },
    { key: 'chunking', label: t('pipeline.step_chunking'), icon: Layers, desc: t('pipeline.step_chunking_desc') },
    { key: 'tagging', label: t('pipeline.step_tagging'), icon: AlertTriangle, desc: t('pipeline.step_tagging_desc') },
    { key: 'synthesis', label: t('pipeline.step_synthesis'), icon: Sparkles, desc: t('pipeline.step_synthesis_desc') },
  ];

  const currentStatuses = stepStatuses && stepStatuses.length === 5
    ? stepStatuses
    : ['pending', 'pending', 'pending', 'pending', 'pending'];

  const failedIdx = currentStatuses.findIndex((s) => s === 'failed');
  const hasFailed = failedIdx !== -1;

  const completedCount = currentStatuses.filter((s) => s === 'completed').length;
  const inProgressCount = currentStatuses.filter((s) => s === 'in_progress').length;
  
  let progressPercentage = Math.min(100, Math.round(completedCount * 20 + (inProgressCount > 0 ? 10 : 0)));
  if (hasFailed) {
    progressPercentage = Math.max(10, (failedIdx + 1) * 20);
  }

  return (
    <div
      id="architectural-pipeline-container"
      className={`border rounded-2xl p-5 shadow-sm space-y-5 max-w-3xl mx-auto my-6 animate-fade-in-up scroll-mt-28 transition-all ${
        hasFailed
          ? 'bg-[#FFF5F5] border-[#FCA5A5] ring-4 ring-[#991B1B]/15'
          : 'bg-[#FBF8F1] border-[#E7E1D3]'
      }`}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${
              hasFailed
                ? 'bg-[#991B1B]/10 text-[#991B1B] border-[#991B1B]/30'
                : 'bg-[#B85C38]/10 text-[#B85C38] border-[#B85C38]/20'
            }`}
          >
            {hasFailed ? (
              <AlertOctagon className="w-5 h-5 text-[#991B1B]" />
            ) : (
              <Sparkles className="w-4 h-4 animate-spin text-[#B85C38]" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-[#1E1B17]">
              {hasFailed
                ? language === 'hi'
                  ? 'दस्तावेज़ पाइपलाइन विश्लेषण - त्रुटि'
                  : 'Document Pipeline Analysis — Halt'
                : t('pipeline.title')}
            </h3>
            <p className="text-xs text-[#6E6659]">
              {hasFailed
                ? language === 'hi'
                  ? `चरण ${failedIdx + 1} पर ऑडिट रुक गया (${STEPS[failedIdx]?.label || 'Guard 1'})`
                  : `Audit stopped at Step ${failedIdx + 1}: ${STEPS[failedIdx]?.label || 'Guard 1'}`
                : t('pipeline.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onCancel && !hasFailed && (
            <button
              onClick={onCancel}
              title={t('pipeline.btn_cancel_desc')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#991B1B] bg-[#991B1B]/10 hover:bg-[#991B1B]/20 border border-[#FCA5A5] transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <XCircle className="w-4 h-4 text-[#991B1B]" />
              <span>{t('pipeline.btn_cancel')}</span>
            </button>
          )}

          {hasFailed ? (
            <span className="text-xs font-bold text-[#991B1B] bg-[#991B1B]/10 px-2.5 py-1 rounded-lg border border-[#FCA5A5] font-mono flex items-center space-x-1">
              <X className="w-3.5 h-3.5 text-[#991B1B] stroke-[3]" />
              <span>
                {language === 'hi' ? `चरण ${failedIdx + 1} पर विफल` : `FAILED AT STEP ${failedIdx + 1}`}
              </span>
            </span>
          ) : (
            <span className="text-xs font-semibold text-[#B85C38] bg-[#B85C38]/10 px-2.5 py-0.5 rounded border border-[#B85C38]/20 font-mono">
              {t('pipeline.complete', { percent: progressPercentage })}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#F6F1E7] h-2.5 rounded-full overflow-hidden border border-[#E7E1D3]">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            hasFailed ? 'bg-[#991B1B]' : 'bg-[#B85C38]'
          }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicators Grid */}
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const status = currentStatuses[idx] || 'pending';
          const isDone = status === 'completed';
          const isCurrent = status === 'in_progress';
          const isFailed = status === 'failed';
          const duration = elapsedMs[idx];

          return (
            <div
              key={idx}
              title={step.desc}
              className={`flex flex-col items-center text-center p-2 rounded-xl border transition-all duration-200 ${
                isFailed
                  ? 'bg-[#FFF5F5] border-[#FCA5A5] text-[#991B1B] shadow-xs ring-2 ring-[#991B1B]/30'
                  : isCurrent
                  ? 'bg-[#F6F1E7] border-[#B85C38] text-[#1E1B17] shadow-xs'
                  : isDone
                  ? 'bg-[#ECFDF5] border-[#10B981]/40 text-[#065F46]'
                  : 'bg-[#F6F1E7]/30 border-[#E7E1D3] text-[#94A3B8]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center mb-1 transition-colors ${
                  isFailed
                    ? 'bg-[#991B1B] text-white shadow-xs'
                    : isCurrent
                    ? 'bg-[#B85C38] text-white font-bold animate-pulse'
                    : isDone
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : 'bg-[#F6F1E7] text-[#94A3B8] border border-[#E7E1D3]'
                }`}
              >
                {isFailed ? (
                  <X className="w-4 h-4 text-white stroke-[3]" />
                ) : isDone ? (
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>

              <span
                className={`text-[10px] leading-tight ${
                  isFailed
                    ? 'font-bold text-[#991B1B]'
                    : isCurrent || isDone
                    ? 'font-bold text-[#1E1B17]'
                    : 'font-medium text-[#94A3B8]'
                }`}
              >
                {step.label}
              </span>

              {isFailed && (
                <span className="text-[9px] font-bold font-mono text-[#991B1B] uppercase mt-0.5 bg-[#991B1B]/10 px-1 py-0.2 rounded border border-[#FCA5A5]/60">
                  {language === 'hi' ? 'विफल' : 'FAILED'}
                </span>
              )}

              {isDone && duration !== undefined && (
                <span className="text-[9px] font-mono text-[#059669] mt-0.5">
                  {duration >= 1000 ? `${(duration / 1000).toFixed(1)}s` : `${duration}ms`}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
