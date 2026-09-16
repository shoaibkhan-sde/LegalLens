import { CheckCircle2, Clock, AlertOctagon } from 'lucide-react';
import { RiskLevel } from '../types/schemas';

export interface RiskStyle {
  level: 'low' | 'medium' | 'high';
  bg: string;
  border: string;
  badgeBg: string;
  pillText: string;
  iconColor: string;
  icon: typeof CheckCircle2;
  label: string;
}

export function getRiskStyle(level: RiskLevel | string, language: string = 'en'): RiskStyle {
  const normalized = (level || 'low').toLowerCase();

  switch (normalized) {
    case 'high':
      return {
        level: 'high',
        bg: 'bg-[#FFF5F5]',
        border: 'border-[#FCA5A5]',
        badgeBg: 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]',
        pillText: 'text-[#991B1B]',
        iconColor: 'text-[#991B1B]',
        icon: AlertOctagon,
        label: language === 'hi' ? 'उच्च जोखिम' : 'High Risk',
      };
    case 'medium':
    case 'watch_out':
    case 'watch out':
      return {
        level: 'medium',
        bg: 'bg-[#FFFBEB]',
        border: 'border-[#FDE68A]',
        badgeBg: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        pillText: 'text-[#92400E]',
        iconColor: 'text-[#92400E]',
        icon: Clock,
        label: language === 'hi' ? 'सावधान रहें' : 'Watch Out',
      };
    case 'low':
    default:
      return {
        level: 'low',
        bg: 'bg-[#ECFDF5]',
        border: 'border-[#A7F3D0]',
        badgeBg: 'bg-[#D1FAE5] text-[#065F46] border-[#6EE7B7]',
        pillText: 'text-[#065F46]',
        iconColor: 'text-[#065F46]',
        icon: CheckCircle2,
        label: language === 'hi' ? 'कम जोखिम' : 'Low Risk',
      };
  }
}
