import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Clock, RefreshCw, Cpu } from 'lucide-react';
import { QuotaTelemetry } from '../types/schemas';

interface QuotaBarProps {
  quota?: QuotaTelemetry;
  compact?: boolean;
}

const getWallClockResetSeconds = () => {
  const secondInMin = Math.floor((Date.now() % 60000) / 1000);
  return Math.max(1, 60 - secondInMin);
};

export const QuotaBar: React.FC<QuotaBarProps> = ({ quota, compact = false }) => {
  const [localSeconds, setLocalSeconds] = useState<number>(getWallClockResetSeconds());
  const [localUsedRpm, setLocalUsedRpm] = useState<number>(quota?.usedRpm || 0);
  const [localUsedTpm, setLocalUsedTpm] = useState<number>(quota?.usedTpm || 0);

  useEffect(() => {
    if (quota) {
      setLocalUsedRpm(quota.usedRpm);
      setLocalUsedTpm(quota.usedTpm);
    }
  }, [quota]);

  // Live real wall-clock 1-minute countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      const remainingSec = getWallClockResetSeconds();
      setLocalSeconds(remainingSec);
      if (remainingSec === 60) {
        // Reset window counters at exact minute boundary
        setLocalUsedRpm(0);
        setLocalUsedTpm(0);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const totalRpm = quota?.totalRpm || 60;
  const totalTpm = quota?.totalTpm || 12000;

  const remainingRpm = Math.max(0, totalRpm - localUsedRpm);
  const remainingTpm = Math.max(0, totalTpm - localUsedTpm);

  const rpmPct = Math.min(100, Math.max(0, Math.round((remainingRpm / totalRpm) * 100)));
  const tpmPct = Math.min(100, Math.max(0, Math.round((remainingTpm / totalTpm) * 100)));

  const engineLabel = quota?.activeEngine || 'Primary Engine';
  const isBackupActive = engineLabel === 'Backup Engine';

  const getBarColor = (pct: number) => {
    if (pct > 50) return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
    if (pct > 20) return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]';
  };

  const getTextColor = (pct: number) => {
    if (pct > 50) return 'text-emerald-700 font-bold';
    if (pct > 20) return 'text-amber-700 font-bold';
    return 'text-rose-700 font-bold';
  };

  return (
    <div className="bg-[#FAF7F2] border border-[#EADBCC] rounded-xl p-3 shadow-xs text-xs text-[#4A3E3D] transition-all">
      {/* Top Telemetry Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EADBCC]/60 mb-2">
        <div className="flex items-center gap-1.5 font-semibold text-[#2D2120]">
          <Cpu className="w-4 h-4 text-[#C15C3D]" />
          <span>Groq Dual-Engine</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${
              isBackupActive
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBackupActive ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            {engineLabel} {isBackupActive ? '(Auto-Swapped)' : '(Active)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#7A6E6D] bg-[#F3EDE2] px-2 py-0.5 rounded-md border border-[#E2D5C3]">
          <Clock className="w-3 h-3 text-[#C15C3D] animate-spin" style={{ animationDuration: '6s' }} />
          <span>Refill Window: <strong className="text-[#2D2120]">{localSeconds}s</strong></span>
        </div>
      </div>

      {/* Progress Bars Container - Aligned Side-by-Side on Same Level */}
      <div className="grid grid-cols-2 gap-3 items-[stretch]">
        {/* Remaining RPM Capacity Bar */}
        <div className="flex flex-col justify-between bg-[#F3EDE2]/50 p-2 rounded-lg border border-[#E2D5C3]/60">
          <div className="flex items-center justify-between gap-1 mb-1.5 text-[11px] leading-none">
            <span className="font-semibold text-[#2D2120] flex items-center gap-1.5 truncate">
              <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>RPM Quota</span>
            </span>
            <span className="font-mono text-[11px] shrink-0">
              <strong className={getTextColor(rpmPct)}>{remainingRpm}</strong>
              <span className="text-[#7A6E6D]">/{totalRpm}</span>
            </span>
          </div>
          <div className="w-full h-3.5 bg-[#E6DCCF] rounded-full overflow-hidden p-0.5 border border-[#D8CABE] shadow-inner">
            <div
              className={`h-full transition-all duration-500 rounded-full ${getBarColor(rpmPct)}`}
              style={{ width: `${rpmPct}%` }}
            />
          </div>
        </div>

        {/* Remaining TPM Capacity Bar */}
        <div className="flex flex-col justify-between bg-[#F3EDE2]/50 p-2 rounded-lg border border-[#E2D5C3]/60">
          <div className="flex items-center justify-between gap-1 mb-1.5 text-[11px] leading-none">
            <span className="font-semibold text-[#2D2120] flex items-center gap-1.5 truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>TPM Quota</span>
            </span>
            <span className="font-mono text-[11px] shrink-0">
              <strong className={getTextColor(tpmPct)}>{remainingTpm >= 1000 ? `${(remainingTpm / 1000).toFixed(1)}k` : remainingTpm}</strong>
              <span className="text-[#7A6E6D]">/{totalTpm >= 1000 ? `${(totalTpm / 1000).toFixed(0)}k` : totalTpm}</span>
            </span>
          </div>
          <div className="w-full h-3.5 bg-[#E6DCCF] rounded-full overflow-hidden p-0.5 border border-[#D8CABE] shadow-inner">
            <div
              className={`h-full transition-all duration-500 rounded-full ${getBarColor(tpmPct)}`}
              style={{ width: `${tpmPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
