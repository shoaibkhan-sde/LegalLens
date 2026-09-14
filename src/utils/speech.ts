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

    // Cancel active speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower, clear tone for low literacy / accessibility
    utterance.pitch = 1.0;

    const isHindi = lang === 'hi' || lang === 'hi-IN';
    utterance.lang = isHindi ? 'hi-IN' : 'en-US';

    // Pick Hindi or English voice based on active language mode
    const voices = this.synth.getVoices();
    let preferredVoice: SpeechSynthesisVoice | undefined;

    if (isHindi) {
      preferredVoice =
        voices.find((v) => v.lang.includes('hi-IN') || v.lang.includes('hi_IN') || v.lang.startsWith('hi')) ||
        voices.find((v) => v.name.toLowerCase().includes('hindi')) ||
        voices.find((v) => v.lang.includes('IN'));

      if (!preferredVoice || (!preferredVoice.lang.includes('hi') && !preferredVoice.name.toLowerCase().includes('hindi'))) {
        console.warn('⚠️ Hindi TTS voice not found on device/browser. Falling back to default system voice with hi-IN language tag.');
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

    utterance.onstart = () => onStart?.();
    utterance.onend = () => {
      this.activeUtterance = null;
      onEnd?.();
    };
    utterance.onerror = (event) => {
      this.activeUtterance = null;
      onError?.(event);
    };

    this.activeUtterance = utterance;
    this.synth.speak(utterance);
  }

  public static stop(): void {
    if (this.synth) {
      this.synth.cancel();
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
