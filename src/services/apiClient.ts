import {
  DocumentAnalysisResult,
  ComparisonResult,
  ChatMessage,
  ServerConfigStatus,
  ActiveInputContext,
} from '../types/schemas.js';

export class ApiClient {
  public static async getConfigStatus(): Promise<ServerConfigStatus> {
    try {
      const res = await fetch('/api/config/status');
      if (!res.ok) throw new Error('Status failed');
      return await res.json();
    } catch {
      return { isConfigured: false, demoMode: true };
    }
  }

  public static async updateApiKey(apiKey: string): Promise<ServerConfigStatus> {
    const res = await fetch('/api/config/key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) throw new Error('Failed to set API key on server.');
    const data = await res.json();
    return data.status;
  }

  private static handleApiError(res: Response, errData: any, fallbackMessage: string): never {
    if (res.status === 429) {
      throw new Error('System is busy, please try again in a moment.');
    }
    const errText = errData?.error || '';
    if (
      errText.includes('429') ||
      errText.includes('Too many') ||
      errText.includes('quota') ||
      errText.includes('busy')
    ) {
      throw new Error('System is busy, please try again in a moment.');
    }
    throw new Error(errText || fallbackMessage);
  }

  public static async extractPreviewText(file: File): Promise<{ text: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract-preview', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        return { text: '', error: "I couldn't read this document's text — try re-uploading, or use a clearer photo/scan" };
      }
      const data = await res.json();
      if (data.error) {
        return { text: '', error: data.error };
      }
      return { text: data.text || '' };
    } catch {
      return { text: '', error: "I couldn't read this document's text — try re-uploading, or use a clearer photo/scan" };
    }
  }

  private static getActiveLanguage(): 'en' | 'hi' {
    try {
      const saved = localStorage.getItem('legallens_language');
      if (saved === 'hi' || saved === 'en') return saved;
    } catch {}
    return 'en';
  }

  public static async analyzeDocument(text?: string, file?: File, language?: 'en' | 'hi'): Promise<DocumentAnalysisResult> {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (file) formData.append('file', file);
    formData.append('language', language || this.getActiveLanguage());

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Analysis request failed' }));
      this.handleApiError(res, err, 'Failed to analyze document');
    }

    return await res.json();
  }

  public static async compareDocuments(
    docA: DocumentAnalysisResult,
    docB: DocumentAnalysisResult
  ): Promise<ComparisonResult> {
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docA, docB, language: this.getActiveLanguage() }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Comparison request failed' }));
      this.handleApiError(res, err, 'Failed to compare documents');
    }

    return await res.json();
  }

  public static async sendChatMessage(
    document: DocumentAnalysisResult | null | undefined,
    question: string,
    history: ChatMessage[],
    inputContext?: ActiveInputContext | null,
    language?: 'en' | 'hi'
  ): Promise<ChatMessage> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document: document || null,
        question,
        history,
        inputContext: inputContext || null,
        language: language || this.getActiveLanguage(),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Chat request failed' }));
      this.handleApiError(res, err, 'Failed to process chat question');
    }

    return await res.json();
  }
}
