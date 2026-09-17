import React, { useState } from 'react';
import {
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  ShieldAlert,
  FileCheck2,
  Sparkles,
  Search,
} from 'lucide-react';
import { DocumentAnalysisResult, ChatMessage, QuotaTelemetry } from '../types/schemas';
import { ActiveInputContext } from '../types/schemas';
import { ApiClient } from '../services/apiClient';
import { SpeechEngine } from '../utils/speech';
import { QuotaBar } from './QuotaBar';
import { FormattedMessageText } from './FormattedMessageText';

import { useLanguage } from '../context/LanguageContext';

interface VoiceGroundedChatProps {
  document: DocumentAnalysisResult;
  inputContext?: ActiveInputContext | null;
  onVerifyClause: (clauseId: string) => void;
}

export const VoiceGroundedChat: React.FC<VoiceGroundedChatProps> = ({
  document,
  inputContext,
  onVerifyClause,
}) => {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome_1',
      sender: 'assistant',
      text: language === 'hi'
        ? `नमस्ते! मैं आपका लीगललेंस वॉयस सहायक हूँ। मैं आपके अनुबंध (${document.document_title}) के आधार पर प्रश्नों का उत्तर दे सकता हूँ!`
        : `Hello! I am your LegalLens Voice Assistant. I can answer questions strictly grounded in your contract (${document.document_title}). Ask about deposit return, notice periods, or penalties!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quotaTelemetry, setQuotaTelemetry] = useState<QuotaTelemetry | undefined>(undefined);

  React.useEffect(() => {
    ApiClient.getConfigStatus().then((st) => {
      if (st.quota) setQuotaTelemetry(st.quota);
    }).catch(() => {});
  }, []);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsLoading(true);

    try {
      const assistantMsg = await ApiClient.sendChatMessage(document, query.trim(), messages, inputContext || null, language);
      if (assistantMsg.quota) {
        setQuotaTelemetry(assistantMsg.quota);
      }
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: language === 'hi'
            ? 'क्षमा करें, आपके प्रश्न को संसाधित करने में त्रुटि हुई। कृपया पुनः प्रयास करें।'
            : 'Sorry, I encountered an error processing your query. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
    } else {
      setIsListening(true);
      SpeechEngine.listen(
        (transcript) => {
          setInputText(transcript);
          setIsListening(false);
          handleSend(transcript);
        },
        () => setIsListening(true),
        () => setIsListening(false),
        (err) => {
          setIsListening(false);
          console.warn('Speech recognition error:', err);
        },
        language
      );
    }
  };

  const handleReadAloudMessage = (msg: ChatMessage) => {
    if (activeSpeechId === msg.id) {
      SpeechEngine.stop();
      setActiveSpeechId(null);
    } else {
      setActiveSpeechId(msg.id);
      SpeechEngine.speak(
        msg.text,
        () => setActiveSpeechId(msg.id),
        () => setActiveSpeechId(null),
        () => setActiveSpeechId(null),
        language
      );
    }
  };

  return (
    <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 shadow-xs space-y-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E7E1D3] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F6F1E7] text-[#B85C38] flex items-center justify-center border border-[#E7E1D3]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-[#1E1B17]">Voice & Grounded Q&A</h3>
            <p className="text-[10px] text-[#6E6659]">RAG-Grounded strictly in retrieved document clauses</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-[#065F46] bg-[#D1FAE5] px-2.5 py-0.5 rounded border border-[#6EE7B7] flex items-center space-x-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Guardrail Safe</span>
        </span>
      </div>

      {/* Live Dual Engine Telemetry Bar */}
      <QuotaBar quota={quotaTelemetry} />

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[420px] text-xs">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isSpeaking = activeSpeechId === msg.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col space-y-1 ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`p-3.5 rounded-xl max-w-[88%] border shadow-xs space-y-2 ${
                  isUser
                    ? 'bg-[#1E1B17] text-[#FBF8F1] border-[#1E1B17] rounded-br-none'
                    : msg.is_flagged_unsafe
                    ? 'bg-[#FFF5F5] border-[#FCA5A5] text-[#991B1B] rounded-bl-none'
                    : 'bg-[#F6F1E7] border-[#E7E1D3] text-[#1E1B17] rounded-bl-none'
                }`}
              >
                {msg.is_flagged_unsafe && (
                  <div className="flex items-center space-x-1 text-[#991B1B] font-bold text-xs border-b border-[#FCA5A5] pb-1">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Guardrail Refusal</span>
                  </div>
                )}

                <FormattedMessageText text={msg.text} />

                {/* Citations Tagging */}
                {msg.cited_clause_ids && msg.cited_clause_ids.length > 0 && (
                  <div className="pt-2 border-t border-[#E7E1D3] flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-[#6E6659] font-semibold flex items-center space-x-1">
                      <FileCheck2 className="w-3 h-3 text-[#B85C38]" />
                      <span>Citations:</span>
                    </span>
                    {msg.cited_clause_ids.map((cid) => (
                      <button
                        key={cid}
                        onClick={() => onVerifyClause(cid)}
                        className="text-[10px] bg-[#FBF8F1] hover:bg-[#E7E1D3]/60 text-[#B85C38] px-2 py-0.5 rounded border border-[#E7E1D3] font-semibold flex items-center space-x-1"
                      >
                        <Search className="w-2.5 h-2.5 text-[#065F46]" />
                        <span>Clause {cid.replace(/[^\d]/g, '') || cid}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Message Footer Actions */}
              <div className="flex items-center space-x-2 text-[10px] text-[#6E6659] px-1">
                <span>{msg.timestamp}</span>
                {!isUser && (
                  <button
                    onClick={() => handleReadAloudMessage(msg)}
                    className="text-[#6E6659] hover:text-[#B85C38] font-semibold flex items-center space-x-1 transition-colors"
                  >
                    {isSpeaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-[#B85C38]" />}
                    <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chat Input Bar */}
      <div className="flex items-center space-x-2 pt-2 border-t border-[#E7E1D3]">
        <button
          onClick={handleToggleVoiceInput}
          title="Speak your question"
          className={`p-2 rounded-lg border transition-colors ${
            isListening
              ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5] animate-pulse'
              : 'bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 text-[#B85C38] border-[#E7E1D3]'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          id="voice-grounded-chat-input"
          name="chatQuery"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isListening ? 'Listening to your voice...' : 'Type or speak a question about this contract...'}
          aria-label={isListening ? 'Listening to your voice' : 'Type or speak a question about this contract'}
          className="flex-1 bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg px-3.5 py-2 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
        />

        <button
          onClick={() => handleSend()}
          disabled={isLoading || !inputText.trim()}
          className="p-2 rounded-lg bg-[#B85C38] hover:bg-[#9C4B2B] text-white disabled:opacity-40 transition-colors shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
