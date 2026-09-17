// Web Speech API Voice Utility (STT & TTS)

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export class SpeechEngine {
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static activeUtterance: SpeechSynthesisUtterance | null = null;
  private static pendingTimeout: any = null;

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

    // Pick Hindi or English voice based on active language mode
    try {
      const voices = this.synth.getVoices() || [];
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

      // Resume if browser synthesis is in a paused state (iOS Safari fix)
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
      setTimeout(() => {
        try {
          if (this.synth && this.synth.paused) {
            this.synth.resume();
          }
        } catch {}
      }, 50);
    };

    // If an existing utterance was canceled above, wait a tiny tick (30ms) for mobile WebKit/Blink audio queue to flush cancel signal
    if (isCurrentlySpeaking) {
      this.pendingTimeout = setTimeout(executeSpeak, 30);
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
    onResult: (transcript: string) => void,
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
    recognition.continuous = false;
    recognition.interimResults = false;
    const isHindi = lang === 'hi' || lang === 'hi-IN';
    recognition.lang = isHindi ? 'hi-IN' : 'en-US';

    recognition.onstart = () => onStart?.();
    recognition.onend = () => onEnd?.();
    recognition.onerror = (e: SpeechRecognitionErrorEvent) => onError?.(e.error);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      if (e.results && e.results[0] && e.results[0][0]) {
        const transcript = e.results[0][0].transcript;
        onResult(transcript);
      }
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
    };
  }
}
