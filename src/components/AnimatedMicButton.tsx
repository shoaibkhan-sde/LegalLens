import React, { useState, useEffect } from 'react';
import { Mic, AlertCircle } from 'lucide-react';

export type MicState = 'muted' | 'listening' | 'permission-denied' | 'no-speech';

interface AnimatedMicButtonProps {
  isListening: boolean;
  onToggle: () => void;
  micState?: MicState;
  language?: string;
  className?: string;
}

export const AnimatedMicButton: React.FC<AnimatedMicButtonProps> = ({
  isListening,
  onToggle,
  micState: externalState,
  language = 'en',
  className = '',
}) => {
  const isHindi = language === 'hi' || language === 'hi-IN';

  // Determine current active state
  const currentState: MicState = externalState || (isListening ? 'listening' : 'muted');

  // Screen reader live announcement text
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    switch (currentState) {
      case 'listening':
        setAnnouncement(
          isHindi
            ? 'माइक्रोफ़ोन सक्रिय, आपकी आवाज़ सुन रहे हैं'
            : 'Microphone active, listening to your voice'
        );
        break;
      case 'permission-denied':
        setAnnouncement(
          isHindi
            ? 'माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया ब्राउज़र सेटिंग्स जांचें'
            : 'Microphone access blocked. Check browser permissions'
        );
        break;
      case 'no-speech':
        setAnnouncement(
          isHindi
            ? 'कोई आवाज़ नहीं पाई गई। कृपया पुनः प्रयास करें'
            : 'No voice detected. Please try again'
        );
        break;
      default:
        setAnnouncement(isHindi ? 'माइक्रोफ़ोन बंद है' : 'Microphone muted');
        break;
    }
  }, [currentState, isHindi]);

  const getTooltip = (): string => {
    switch (currentState) {
      case 'listening':
        return isHindi
          ? 'माइक्रोफ़ोन चालू है — आवाज़ सुन रहे हैं...'
          : 'Mic active — Listening to your voice...';
      case 'permission-denied':
        return isHindi
          ? 'माइक्रोफ़ोन एक्सेस अवरुद्ध है — ब्राउज़र सेटिंग्स जांचें'
          : 'Microphone access blocked — check browser settings';
      case 'no-speech':
        return isHindi
          ? 'कोई आवाज़ नहीं मिली — थोड़ा तेज़ बोलें'
          : 'No voice detected — speak louder or try again';
      default:
        return isHindi
          ? 'बोले जाने वाले प्रश्न के लिए माइक्रोफ़ोन चालू करें'
          : 'Click to speak your question';
    }
  };

  return (
    <div className="relative inline-flex items-center">
      {/* Screen Reader Live Announcement for State Changes */}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>

      <button
        type="button"
        onClick={onToggle}
        title={getTooltip()}
        aria-label={getTooltip()}
        aria-pressed={isListening}
        className={`relative p-2 rounded-lg border transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#B85C38]/50 flex items-center justify-center ${
          currentState === 'listening'
            ? 'bg-[#B85C38] text-white border-[#B85C38] animate-mic-active shadow-md'
            : currentState === 'permission-denied'
            ? 'bg-amber-100 text-amber-900 border-amber-300 ring-2 ring-amber-400/50 animate-mic-shake'
            : currentState === 'no-speech'
            ? 'bg-amber-50 text-amber-800 border-amber-300'
            : 'bg-[#F6F1E7] hover:bg-[#E7E1D3]/70 text-[#B85C38] border-[#E7E1D3]'
        } ${className}`}
      >
        {/* Pulsing Aura Ping Layer when Listening */}
        {currentState === 'listening' && (
          <span className="absolute inset-0 rounded-lg bg-[#B85C38]/30 animate-ping opacity-65 pointer-events-none" />
        )}

        {/* Muted Icon (Plain static microphone icon without slash) */}
        {currentState === 'muted' && (
          <Mic className="w-4 h-4 text-[#B85C38]/80 transition-opacity duration-200" />
        )}

        {/* Listening Icon + Equalizer Soundwave Bars */}
        {currentState === 'listening' && (
          <div className="flex items-center space-x-1 relative z-10">
            <Mic className="w-4 h-4 text-white" />
            <div className="flex items-end space-x-[2px] h-3.5 px-0.5" aria-hidden="true">
              <span className="w-[2.5px] h-3 rounded-full bg-white/90 animate-soundwave-1" />
              <span className="w-[2.5px] h-3 rounded-full bg-white/90 animate-soundwave-2" />
              <span className="w-[2.5px] h-3 rounded-full bg-white/90 animate-soundwave-3" />
            </div>
          </div>
        )}

        {/* Permission Denied Icon */}
        {currentState === 'permission-denied' && (
          <div className="flex items-center space-x-1">
            <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
          </div>
        )}

        {/* No Speech State Icon */}
        {currentState === 'no-speech' && (
          <div className="flex items-center space-x-1">
            <Mic className="w-4 h-4 text-amber-700 animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
};
