import React from 'react';
import { ShieldCheck, FileSearch, Layers, AlertTriangle, Sparkles, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface VisualProgressProps {
  activeStepIndex?: number;
  stepStatuses?: Array<'pending' | 'in_progress' | 'completed'>;
  elapsedMs?: Record<number, number>;
}

export const VisualProgress: React.FC<VisualProgressProps> = ({
  stepStatuses,
  elapsedMs = {},
}) => {
  const { t } = useLanguage();

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

  const completedCount = currentStatuses.filter((s) => s === 'completed').length;
  const inProgressCount = currentStatuses.filter((s) => s === 'in_progress').length;
  const progressPercentage = Math.min(100, Math.round(completedCount * 20 + (inProgressCount > 0 ? 10 : 0)));

  return (
    <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 shadow-xs space-y-5 max-w-2xl mx-auto my-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#B85C38]/10 text-[#B85C38] flex items-center justify-center border border-[#B85C38]/20">
            <Sparkles className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-[#1E1B17]">{t('pipeline.title')}</h3>
            <p className="text-xs text-[#6E6659]">{t('pipeline.subtitle')}</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#B85C38] bg-[#B85C38]/10 px-2.5 py-0.5 rounded border border-[#B85C38]/20 font-mono">
          {t('pipeline.complete', { percent: progressPercentage })}
        </span>
      </div>

      {/* Progress Bar advancing in 20% stage increments */}
      <div className="w-full bg-[#F6F1E7] h-2 rounded-full overflow-hidden border border-[#E7E1D3]">
        <div
          className="bg-[#B85C38] h-full rounded-full transition-all duration-300 ease-out"
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
          const duration = elapsedMs[idx];

          return (
            <div
              key={idx}
              title={step.desc}
              className={`flex flex-col items-center text-center p-2 rounded-lg border transition-all duration-200 ${
                isCurrent
                  ? 'bg-[#F6F1E7] border-[#B85C38] text-[#1E1B17] shadow-xs'
                  : isDone
                  ? 'bg-[#ECFDF5] border-[#10B981]/40 text-[#065F46]'
                  : 'bg-[#F6F1E7]/30 border-[#E7E1D3] text-[#94A3B8]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center mb-1 transition-colors ${
                  isCurrent
                    ? 'bg-[#B85C38] text-white font-bold animate-pulse'
                    : isDone
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : 'bg-[#F6F1E7] text-[#94A3B8] border border-[#E7E1D3]'
                }`}
              >
                {isDone ? <Check className="w-4 h-4 text-white stroke-[3]" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className="text-[10px] font-medium leading-tight">{step.label}</span>
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
