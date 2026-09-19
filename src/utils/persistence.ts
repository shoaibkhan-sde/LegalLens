// LegalLens - Client Session State Persistence Engine

export const CURRENT_SCHEMA_VERSION = 1;
export const ERROR_STALENESS_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface PersistedEnvelope<T> {
  version: number;
  timestamp: number;
  data: T;
}

export interface StoredErrorPayload {
  message: string;
  timestamp: number;
}

export type StorageWarningListener = (warningMessage: string) => void;
const warningListeners: Set<StorageWarningListener> = new Set();

export function subscribeStorageWarning(listener: StorageWarningListener): () => void {
  warningListeners.add(listener);
  return () => warningListeners.delete(listener);
}

function notifyStorageWarning(msg: string) {
  warningListeners.forEach((l) => l(msg));
}

/**
 * Save data with schema versioning and quota fallback
 */
export function saveStorage<T>(key: string, data: T | null): boolean {
  if (typeof window === 'undefined') return false;

  if (data === null || data === undefined) {
    removeStorage(key);
    return true;
  }

  const envelope: PersistedEnvelope<T> = {
    version: CURRENT_SCHEMA_VERSION,
    timestamp: Date.now(),
    data,
  };

  const serialized = JSON.stringify(envelope);

  // 1. Try localStorage first
  try {
    localStorage.setItem(key, serialized);
    sessionStorage.setItem(key, serialized);
    return true;
  } catch (err1) {
    console.warn(`[Persistence] localStorage failed for key "${key}". Attempting sessionStorage fallback.`, err1);
    
    // 2. Try sessionStorage fallback
    try {
      sessionStorage.setItem(key, serialized);
      return true;
    } catch (err2) {
      console.error(`[Persistence] Both localStorage and sessionStorage failed for key "${key}". Quota exceeded or storage blocked.`, err2);
      notifyStorageWarning("Your session couldn't be saved — refreshing may lose this analysis due to browser storage limits.");
      return false;
    }
  }
}

/**
 * Load data with schema version validation and fallback
 */
export function loadStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return defaultValue;
  }

  if (!raw) return defaultValue;

  try {
    const parsed = JSON.parse(raw) as PersistedEnvelope<T>;
    
    // Validate schema version
    if (!parsed || typeof parsed !== 'object' || parsed.version !== CURRENT_SCHEMA_VERSION) {
      console.warn(`[Persistence] Discarding stale/mismatched schema version for key "${key}". Expected v${CURRENT_SCHEMA_VERSION}, got v${parsed?.version}.`);
      removeStorage(key);
      return defaultValue;
    }

    return parsed.data !== undefined ? parsed.data : defaultValue;
  } catch {
    console.warn(`[Persistence] Failed to parse stored state for key "${key}". Clearing stored key.`);
    removeStorage(key);
    return defaultValue;
  }
}

/**
 * Save temporary error message with timestamp
 */
export function saveErrorStorage(key: string, errorMessage: string | null): void {
  if (!errorMessage) {
    removeStorage(key);
    return;
  }
  const errorPayload: StoredErrorPayload = {
    message: errorMessage,
    timestamp: Date.now(),
  };
  saveStorage<StoredErrorPayload>(key, errorPayload);
}

/**
 * Load error message with staleness check (discarded if older than 5 minutes)
 */
export function loadErrorStorage(key: string): string | null {
  const stored = loadStorage<StoredErrorPayload | null>(key, null);
  if (!stored || !stored.message) return null;

  const age = Date.now() - (stored.timestamp || 0);
  if (age > ERROR_STALENESS_THRESHOLD_MS) {
    console.log(`[Persistence] Discarding stale error for key "${key}" (age: ${Math.round(age / 1000)}s > 300s).`);
    removeStorage(key);
    return null;
  }

  return stored.message;
}

/**
 * Remove key from both localStorage and sessionStorage
 */
export function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {}
  try {
    sessionStorage.removeItem(key);
  } catch {}
}

/**
 * Clear all LegalLens session storage keys for a specific feature prefix
 */
export function clearFeatureStorage(prefix: string): void {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keysToRemove.push(k);
    }
  } catch {}

  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && k.startsWith(prefix)) keysToRemove.push(k);
    }
  } catch {}

  keysToRemove.forEach((k) => removeStorage(k));
}
