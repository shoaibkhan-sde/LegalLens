import {
  DocumentAnalysisResult,
  ComparisonResult,
  ChatMessage,
  ServerConfigStatus,
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

  public static async analyzeDocument(text?: string, file?: File): Promise<DocumentAnalysisResult> {
    const formData = new FormData();
    if (text) formData.append('text', text);
    if (file) formData.append('file', file);

    const res = await fetch('/api/analyze', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Analysis request failed' }));
      throw new Error(err.error || 'Failed to analyze document');
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
      body: JSON.stringify({ docA, docB }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Comparison request failed' }));
      throw new Error(err.error || 'Failed to compare documents');
    }

    return await res.json();
  }

  public static async sendChatMessage(
    document: DocumentAnalysisResult,
    question: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document, question, history }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Chat request failed' }));
      throw new Error(err.error || 'Failed to process chat question');
    }

    return await res.json();
  }
}
