// Web Speech API Voice Utility (STT & TTS) with Mobile Latency Optimization

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export class SpeechEngine {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  private static pendingTimeout: any = null;

  // Cached voice registry & pre-warm state to eliminate mobile cold-start delays
  private static cachedVoices: SpeechSynthesisVoice[] = [];
  private static isVoicesLoaded: boolean = false;
  private static isUnlocked: boolean = false;

  // Initialize voice pre-fetching & fallback polling for older WebKit / Android WebViews
  public static initVoices(): void {
    if (!this.synth) return;

    const populate = () => {
      try {
        const list = this.synth?.getVoices() || [];
        if (list.length > 0) {
          this.cachedVoices = list;
          this.isVoicesLoaded = true;
        }
      } catch {}
    };

    populate();

    if (typeof window !== 'undefined' && this.synth) {
      this.synth.onvoiceschanged = populate;
      // Fallback polling for browsers where onvoiceschanged does not trigger reliably
      setTimeout(populate, 50);
      setTimeout(populate, 250);
      setTimeout(populate, 1000);
    }
  }

  // Pre-warm Speech Synthesis instance & Audio Context synchronously inside user gesture
  public static warmup(): void {
    if (!this.synth) return;
    try {
      this.initVoices();
      if (this.synth.paused) {
        this.synth.resume();
      }
    } catch {}
  }

  // Register synchronous gesture listener on window to unlock iOS Safari & Android Chrome audio daemon
  public static registerGestureUnlock(): void {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      if (this.isUnlocked) return;
      this.isUnlocked = true;
      try {
        SpeechEngine.warmup();
        // Play an immediate 0-volume silent dummy utterance synchronously inside trusted gesture
        if (SpeechEngine.synth && SpeechEngine.cachedVoices.length > 0) {
          const silent = new SpeechSynthesisUtterance('');
          silent.volume = 0;
          SpeechEngine.synth.speak(silent);
        }
      } catch {}

      window.removeEventListener('touchstart', unlock, true);
      window.removeEventListener('touchend', unlock, true);
      window.removeEventListener('click', unlock, true);
    };

    window.addEventListener('touchstart', unlock, { capture: true, once: true });
    window.addEventListener('touchend', unlock, { capture: true, once: true });
    window.addEventListener('click', unlock, { capture: true, once: true });
  }

  // Text-to-Speech (Read Aloud)
  public static speak(
    text: string,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void,
    lang: string = 'en'
  ): void {
    if (!this.synth) {
      console.warn('Speech synthesis not supported in this browser.');
      onError?.('Browser unsupported');
      return;
    }

    // Ensure voices are loaded / cached
    if (this.cachedVoices.length === 0) {
      try {
        this.cachedVoices = this.synth.getVoices() || [];
      } catch {}
    }

    // Clear any queued pending speak timeouts
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }

    const isCurrentlySpeaking = this.synth.speaking || this.synth.pending;

    // Only cancel if speech is actively playing or queued
    if (isCurrentlySpeaking) {
      try {
        this.synth.cancel();
      } catch {}
    }

    // Create Utterance synchronously within the user tap event
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower, clear tone for accessible reading
    utterance.pitch = 1.0;

    const isHindi = lang === 'hi' || lang === 'hi-IN';
    utterance.lang = isHindi ? 'hi-IN' : 'en-US';

    // Pick Hindi or English voice instantly from cached voices (0ms lookup)
    try {
      const voices = this.cachedVoices.length > 0 ? this.cachedVoices : (this.synth.getVoices() || []);
      let preferredVoice: SpeechSynthesisVoice | undefined;

      if (voices.length > 0) {
        if (isHindi) {
          preferredVoice =
            voices.find((v) => v.lang.includes('hi-IN') || v.lang.includes('hi_IN') || v.lang.startsWith('hi')) ||
            voices.find((v) => v.name.toLowerCase().includes('hindi')) ||
            voices.find((v) => v.lang.includes('IN'));

          if (!preferredVoice || (!preferredVoice.lang.includes('hi') && !preferredVoice.name.toLowerCase().includes('hindi'))) {
            preferredVoice = voices.find((v) => v.default) || voices[0];
          }
        } else {
          preferredVoice =
            voices.find((v) => v.lang.includes('en-IN') || v.lang.includes('en_IN')) ||
            voices.find((v) => v.lang.startsWith('en')) ||
            voices.find((v) => v.default) ||
            voices[0];
        }

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }
      }
    } catch {}

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      this.activeUtterance = null;
      onEnd?.();
    };

    utterance.onerror = (event: any) => {
      this.activeUtterance = null;
      // Filter out harmless mobile cancel/interrupted events when speech is stopped or replaced
      if (event?.error !== 'interrupted' && event?.error !== 'canceled') {
        onError?.(event);
      } else {
        onEnd?.();
      }
    };

    this.activeUtterance = utterance;

    const executeSpeak = () => {
      if (!this.synth) return;

      // Resume if browser synthesis is in a paused state (iOS Safari & Android Chrome fix)
      try {
        if (this.synth.paused) {
          this.synth.resume();
        }
      } catch {}

      try {
        this.synth.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis speak error:', err);
        onError?.(err);
        return;
      }

      // iOS Safari fallback check: resume if engine enters paused state immediately after speak()
      if (typeof window !== 'undefined' && /iPhone|iPad|iPod|Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent)) {
        setTimeout(() => {
          try {
            if (this.synth && this.synth.paused) {
              this.synth.resume();
            }
          } catch {}
        }, 30);
      }
    };

    // Execute immediately within user gesture frame without artificial timeouts if not already speaking
    if (isCurrentlySpeaking) {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => executeSpeak());
      } else {
        executeSpeak();
      }
    } else {
      executeSpeak();
    }
  }

  public static stop(): void {
    if (this.pendingTimeout) {
      clearTimeout(this.pendingTimeout);
      this.pendingTimeout = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch {}
      this.activeUtterance = null;
    }
  }

  public static isSpeaking(): boolean {
    return !!this.synth && this.synth.speaking;
  }

  // Speech-to-Text (Voice Input)
  public static listen(
    onInterim: (draftText: string) => void,
    onFinal: (finalText: string) => void,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: string) => void,
    lang: string = 'en'
  ): { stop: () => void } | null {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.('Speech recognition not supported in this browser.');
      return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    const isHindi = lang === 'hi' || lang === 'hi-IN';
    recognition.lang = isHindi ? 'hi-IN' : 'en-US';

    let finalTranscript = '';
    let silenceTimer: any = null;
    let isFinished = false;

    const clearSilenceTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    const finishListening = () => {
      if (isFinished) return;
      isFinished = true;
      clearSilenceTimer();

      try {
        recognition.stop();
      } catch {}

      const cleanText = finalTranscript.trim();
      if (cleanText) {
        onFinal(cleanText);
      }
      onEnd?.();
    };

    const resetSilenceTimer = () => {
      clearSilenceTimer();
      // 1.2s of silence after spoken text triggers auto-completion
      silenceTimer = setTimeout(() => {
        finishListening();
      }, 1200);
    };

    recognition.onstart = () => onStart?.();
    
    recognition.onend = () => {
      if (!isFinished) {
        finishListening();
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      clearSilenceTimer();
      if (!isFinished) {
        isFinished = true;
        if (finalTranscript.trim() && (e.error === 'no-speech' || e.error === 'aborted')) {
          onFinal(finalTranscript.trim());
          onEnd?.();
        } else {
          onError?.(e.error);
        }
      }
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let currentInterim = '';

      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const result = e.results[i];
        const textChunk = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += textChunk + ' ';
        } else {
          currentInterim += textChunk;
        }
      }

      const fullDraft = (finalTranscript + currentInterim).trim();
      if (fullDraft) {
        onInterim(fullDraft);
        resetSilenceTimer();
      }
    };

    try {
      recognition.start();
    } catch (err: any) {
      onError?.(err?.message || 'Failed to start speech recognition');
      return null;
    }

    return {
      stop: () => {
        finishListening();
      },
    };
  }
}

// Auto-initialize voice cache & gesture unlock on window load
if (typeof window !== 'undefined') {
  SpeechEngine.initVoices();
  SpeechEngine.registerGestureUnlock();
}
