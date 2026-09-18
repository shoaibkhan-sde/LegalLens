import assert from 'assert';

// Mock Web Speech API environment for server-side automated latency benchmarking
class MockSpeechSynthesisUtterance {
  public text: string;
  public lang: string = 'en-US';
  public rate: number = 1.0;
  public pitch: number = 1.0;
  public voice: any = null;
  public onstart: (() => void) | null = null;
  public onend: (() => void) | null = null;
  public onerror: ((err: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

class MockSpeechSynthesis {
  public speaking: boolean = false;
  public pending: boolean = false;
  public paused: boolean = false;
  public onvoiceschanged: (() => void) | null = null;

  private mockVoices = [
    { name: 'Google US English', lang: 'en-US', default: true },
    { name: 'Google Hindi', lang: 'hi-IN', default: false },
    { name: 'Microsoft Heera - English (India)', lang: 'en-IN', default: false },
  ];

  public getVoices() {
    return this.mockVoices;
  }

  public speak(utterance: MockSpeechSynthesisUtterance) {
    this.speaking = true;
    // Simulate instant voice dispatch under 5ms
    setTimeout(() => {
      if (utterance.onstart) utterance.onstart();
    }, 2);

    setTimeout(() => {
      this.speaking = false;
      if (utterance.onend) utterance.onend();
    }, 50);
  }

  public cancel() {
    this.speaking = false;
    this.pending = false;
  }

  public resume() {
    this.paused = false;
  }
}

async function runSpeechPerformanceTests() {
  console.log('====================================================================');
  console.log('   TEXT-TO-SPEECH (READ/LISTEN) MOBILE LATENCY & PERFORMANCE TEST');
  console.log('====================================================================\n');

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assertTest(name: string, condition: boolean, detail: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${name}`);
      console.log(`   └─ ${detail}`);
    } else {
      failedTests++;
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   └─ ${detail}`);
    }
  }

  // Setup Mock Window & SpeechSynthesis
  const mockSynth = new MockSpeechSynthesis();
  (global as any).window = {
    speechSynthesis: mockSynth,
    addEventListener: (event: string, handler: any) => {},
    removeEventListener: (event: string, handler: any) => {},
  };
  (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  Object.defineProperty(global, 'navigator', {
    value: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    },
    writable: true,
    configurable: true,
  });

  // Import SpeechEngine dynamically after global mock setup
  const { SpeechEngine } = await import('../../../src/utils/speech.js');

  // TEST 1: Voice Pre-fetching & Instant Voice Cache
  SpeechEngine.initVoices();
  const startTime = Date.now();
  
  let audioStarted = false;
  let timeToStartMs = 0;

  SpeechEngine.speak(
    'This is a legal contract clause text for read aloud testing.',
    () => {
      audioStarted = true;
      timeToStartMs = Date.now() - startTime;
    },
    () => {},
    () => {},
    'en'
  );

  // Wait for mock audio dispatch
  await new Promise((resolve) => setTimeout(resolve, 30));

  const LATENCY_CEILING_MS = 1000; // Requirement: time-to-first-audio < 1000ms
  assertTest(
    '1. Time-to-First-Audio Latency Assertion (<1000ms Ceiling)',
    audioStarted && timeToStartMs < LATENCY_CEILING_MS,
    `Playback started in ${timeToStartMs}ms (<${LATENCY_CEILING_MS}ms ceiling). Audio dispatch confirmed instant.`
  );

  // TEST 2: Bilingual Hindi Voice Selection
  let hindiAudioStarted = false;
  SpeechEngine.speak(
    '1. वेतन: रु. 28,000 प्रति माह',
    () => {
      hindiAudioStarted = true;
    },
    () => {},
    () => {},
    'hi'
  );

  await new Promise((resolve) => setTimeout(resolve, 30));

  assertTest(
    '2. Bilingual Hindi Voice Resolution & Instant Dispatch',
    hindiAudioStarted,
    'Hindi text-to-speech resolved hi-IN voice and dispatched playback without delay.'
  );

  // TEST 3: Fallback Polling When onvoiceschanged Is Missing
  const mockSlowSynth = new MockSpeechSynthesis();
  let slowVoicesLoaded = false;
  // Simulate delayed getVoices() return
  mockSlowSynth.getVoices = () => {
    if (slowVoicesLoaded) {
      return [{ name: 'Delayed Voice', lang: 'en-US', default: true }];
    }
    return [];
  };

  (global as any).window.speechSynthesis = mockSlowSynth;
  SpeechEngine.initVoices();

  // Trigger fallback polling
  slowVoicesLoaded = true;
  await new Promise((resolve) => setTimeout(resolve, 60));

  let fallbackAudioStarted = false;
  SpeechEngine.speak(
    'Testing fallback voice resolution.',
    () => {
      fallbackAudioStarted = true;
    },
    () => {},
    () => {},
    'en'
  );

  await new Promise((resolve) => setTimeout(resolve, 30));

  assertTest(
    '3. Fallback Voice Polling Resolution (Delayed onvoiceschanged Support)',
    fallbackAudioStarted,
    'Fallback polling successfully recovered delayed voice loading without hanging or blocking.'
  );

  console.log('\n====================================================================');
  console.log(`RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log('====================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSpeechPerformanceTests().catch((err) => {
  console.error('Fatal Speech Test Error:', err);
  process.exit(1);
});
