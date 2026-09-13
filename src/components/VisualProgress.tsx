import React, { useEffect, useState } from 'react';
import { ShieldCheck, FileSearch, Layers, AlertTriangle, Sparkles } from 'lucide-react';

const STEPS = [
  { label: 'Guard 1 Check', icon: ShieldCheck, desc: 'Validating legal document taxonomy' },
  { label: 'OCR & Parsing', icon: FileSearch, desc: 'Extracting clause text & layout' },
  { label: 'Clause Chunking', icon: Layers, desc: 'Categorizing into 18 clause types' },
  { label: 'Risk Tagging', icon: AlertTriangle, desc: 'Identifying red/yellow risk flags' },
  { label: 'AI Synthesis', icon: Sparkles, desc: 'Generating checklist & lawyer brief' },
];

export const VisualProgress: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(timer);
  }, []);

  const progressPercentage = ((activeStep + 1) / STEPS.length) * 100;

  return (
    <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 shadow-xs space-y-5 max-w-2xl mx-auto my-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#B85C38]/10 text-[#B85C38] flex items-center justify-center border border-[#B85C38]/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-[#1E1B17]">Document Pipeline Analysis</h3>
            <p className="text-xs text-[#6E6659]">Processing legal clauses & risk guardrails</p>
          </div>
        </div>
        <span className="text-xs font-semibold text-[#B85C38] bg-[#B85C38]/10 px-2.5 py-0.5 rounded border border-[#B85C38]/20">
          {Math.round(progressPercentage)}% Complete
        </span>
      </div>

      {/* Clean Linear Burnt Terracotta Progress Bar */}
      <div className="w-full bg-[#F6F1E7] h-2 rounded-full overflow-hidden border border-[#E7E1D3]">
        <div
          className="bg-[#B85C38] h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicators Grid */}
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={idx}
              className={`flex flex-col items-center text-center p-2 rounded-lg border transition-all duration-200 ${
                isCurrent
                  ? 'bg-[#F6F1E7] border-[#B85C38]/40 text-[#1E1B17]'
                  : isDone
                  ? 'bg-[#F6F1E7]/60 border-[#E7E1D3] text-[#6E6659]'
                  : 'bg-[#F6F1E7]/30 border-[#E7E1D3] text-[#94A3B8]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded flex items-center justify-center mb-1 transition-colors ${
                  isCurrent
                    ? 'bg-[#B85C38] text-white font-bold'
                    : isDone
                    ? 'bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7]'
                    : 'bg-[#F6F1E7] text-[#94A3B8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-medium leading-tight">{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
