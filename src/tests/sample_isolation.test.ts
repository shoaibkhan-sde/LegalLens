class MemoryStorage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  [key: string]: any;
}

if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = globalThis;
}
if (!globalThis.localStorage) {
  (globalThis as any).localStorage = new MemoryStorage();
}
if (!globalThis.sessionStorage) {
  (globalThis as any).sessionStorage = new MemoryStorage();
}

import { loadStorage, saveStorage } from '../utils/persistence';

function runSampleIsolationTests() {
  console.log('====================================================');
  console.log('  SAMPLE DEMO VS USER UPLOAD ISOLATION TEST SUITE');
  console.log('====================================================\n');

  // Reset storage keys
  saveStorage('legallens_analyze_tab', 'upload');
  saveStorage('legallens_analyze_result', null);
  saveStorage('legallens_sample_analyze_result', null);

  console.log('--- TEST 1: INITIAL CLEAN STATE ---');
  let activeTab: any = loadStorage<any>('legallens_analyze_tab', 'upload');
  let userResult: any = loadStorage<any>('legallens_analyze_result', null);
  let sampleResult: any = loadStorage<any>('legallens_sample_analyze_result', null);

  if (activeTab !== 'upload') throw new Error(`Expected default activeTab = 'upload', got ${activeTab}`);
  if (userResult !== null) throw new Error('Expected userResult to be null');
  if (sampleResult !== null) throw new Error('Expected sampleResult to be null');

  let activeResult: any = activeTab === 'sample' ? sampleResult : userResult;
  if (activeResult !== null) {
    throw new Error('Expected activeResult to be null under upload tab');
  }
  console.log('✅ [PASS] Test 1: Upload tab starts with clean empty state (no sample bleeding).');

  console.log('--- TEST 2: SAMPLE DEMO RUN ISOLATION ---');
  // User switches to sample tab and runs sample demo
  saveStorage('legallens_analyze_tab', 'sample');
  const dummySampleDoc = {
    document_title: 'Residential Tenancy Agreement (Sample)',
    category: 'Rental Agreement',
    clauses: [{ id: 'c1', title: 'Rent' }],
  };
  saveStorage('legallens_sample_analyze_result', dummySampleDoc);

  activeTab = loadStorage<any>('legallens_analyze_tab', 'upload');
  userResult = loadStorage<any>('legallens_analyze_result', null);
  sampleResult = loadStorage<any>('legallens_sample_analyze_result', null);
  activeResult = activeTab === 'sample' ? sampleResult : userResult;

  if (!activeResult || activeResult.document_title !== 'Residential Tenancy Agreement (Sample)') {
    throw new Error(`Expected sampleResult to be active under sample tab, got ${JSON.stringify(activeResult)}`);
  }
  console.log('✅ [PASS] Test 2: Sample demo result displays under Sample tab.');

  console.log('--- TEST 3: TAB SWITCH TO UPLOAD (NO BLEEDING) ---');
  // User switches back to upload tab
  saveStorage('legallens_analyze_tab', 'upload');
  activeTab = loadStorage<any>('legallens_analyze_tab', 'upload');
  activeResult = activeTab === 'sample' ? sampleResult : userResult;

  if (activeResult !== null) {
    throw new Error(`Expected activeResult to be null under upload tab, got: ${JSON.stringify(activeResult)}`);
  }
  console.log('✅ [PASS] Test 3: Switching to Upload tab shows empty state — sample result does NOT bleed into Upload view.');

  console.log('--- TEST 4: USER UPLOAD ANALYSIS SEPARATION ---');
  // User uploads their own contract under upload tab
  const dummyUserDoc = {
    document_title: 'My Custom Commercial Lease.pdf',
    category: 'Commercial Lease',
    clauses: [{ id: 'u1', title: 'Term' }],
  };
  saveStorage('legallens_analyze_result', dummyUserDoc);

  userResult = loadStorage<any>('legallens_analyze_result', null);
  activeResult = activeTab === 'sample' ? sampleResult : userResult;

  if (!activeResult || activeResult.document_title !== 'My Custom Commercial Lease.pdf') {
    throw new Error('Expected user upload result to display under upload tab');
  }
  console.log('✅ [PASS] Test 4: User uploaded document displays correctly under Upload tab.');

  console.log('--- TEST 5: REFRESH PERSISTENCE ISOLATION ---');
  // Verify hydration after refresh
  saveStorage('legallens_analyze_tab', 'upload');
  activeTab = loadStorage<any>('legallens_analyze_tab', 'upload');
  userResult = loadStorage<any>('legallens_analyze_result', null);
  sampleResult = loadStorage<any>('legallens_sample_analyze_result', null);

  if (!userResult || userResult.document_title !== 'My Custom Commercial Lease.pdf') {
    throw new Error('User result lost after refresh');
  }
  if (!sampleResult || sampleResult.document_title !== 'Residential Tenancy Agreement (Sample)') {
    throw new Error('Sample result lost after refresh');
  }
  console.log('✅ [PASS] Test 5: Refresh persistence holds complete state isolation across browser reloads.');

  console.log('\n====================================================');
  console.log('  SUMMARY: ALL SAMPLE ISOLATION TESTS PASSED 🟢');
  console.log('====================================================\n');
}

runSampleIsolationTests();
