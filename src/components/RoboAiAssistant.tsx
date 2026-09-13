import React, { useState, useEffect } from 'react';
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
  Bot,
  X,
  Sparkle,
} from 'lucide-react';
import { DocumentAnalysisResult, ChatMessage } from '../types/schemas';
import { ApiClient } from '../services/apiClient';
import { SpeechEngine } from '../utils/speech';

interface RoboAiAssistantProps {
  document?: DocumentAnalysisResult | null;
  onVerifyClause?: (clauseId: string) => void;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
}

export const RoboAiAssistant: React.FC<RoboAiAssistantProps> = ({
  document,
  onVerifyClause,
  isOpen: externalIsOpen,
  onToggleOpen,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const toggleOpen = (openState: boolean) => {
    if (onToggleOpen) {
      onToggleOpen(openState);
    } else {
      setInternalIsOpen(openState);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      id: `welcome_${Date.now()}`,
      sender: 'assistant',
      text: document
        ? `Hello! I am your LegalLens 3D AI Assistant. Ask me anything about your contract (${document.document_title}). I can explain clauses, deposit refunds, or notice periods!`
        : `Hi! I am your 3D Legal Assistant. Ask any legal question (e.g. deposit rules, notice periods in Bengaluru), or upload a contract to analyze!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([welcomeMsg]);
  }, [document?.document_title]);

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
      if (document) {
        const assistantMsg = await ApiClient.sendChatMessage(document, query.trim(), messages);
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setTimeout(() => {
          const fallbackMsg: ChatMessage = {
            id: `ast_${Date.now()}`,
            sender: 'assistant',
            text: `Under standard rental guidelines in Bengaluru and major Indian metros: Security deposits are refundable within 30 days post-lease minus legitimate damage deductions; notice periods are typically 30-60 days. Upload your contract above for clause-by-clause precision!`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages((prev) => [...prev, fallbackMsg]);
          setIsLoading(false);
        }, 500);
        return;
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: 'Sorry, I encountered an error processing your query. Please try again.',
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
        }
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
        () => setActiveSpeechId(null)
      );
    }
  };

  // If closed: Render ONLY the jumping 3D Robo Face Avatar with arced "Ask Me" text on hover
  if (!isOpen) {
    return (
      <div className="relative inline-block group">
        {/* Arched Text "Ask Me" over the 3D Robo head (Visible on hover only) */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-32 h-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-200 z-50">
          <svg viewBox="0 0 120 40" className="w-full h-full overflow-visible">
            <path id="robo-head-arc" d="M 10,32 Q 60,6 110,32" fill="transparent" />
            <text className="font-black text-[13px] fill-[#B85C38] tracking-widest uppercase drop-shadow-xs font-brand">
              <textPath href="#robo-head-arc" startOffset="50%" textAnchor="middle">
                Ask Me
              </textPath>
            </text>
          </svg>
        </div>

        {/* Pure 3D Robo Face Avatar with Jumping, Eye-blinking, Antenna Glow, and Hover Smile Animations */}
        <button
          type="button"
          onClick={() => toggleOpen(true)}
          className="relative focus:outline-none block cursor-pointer select-none"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 animate-robo-jump hover-robo-smile transition-transform duration-300 transform group-hover:scale-110">
            <img
              src="/assets/robo-avatar.png"
              alt="Interactive 3D Robo AI Assistant"
              className="w-full h-full object-contain drop-shadow-md group-hover:drop-shadow-[0_0_20px_rgba(56,189,248,0.8)]"
            />

            {/* Eye Blink Eyelid Overlay on Visor */}
            <div className="absolute top-[40%] left-[26%] w-[48%] h-[20%] bg-[#0B132B] rounded-md animate-robo-blink pointer-events-none opacity-90" />

            {/* Cyan Antenna Sphere Glow */}
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#38BDF8] animate-robo-glow shadow-[0_0_12px_#38BDF8]" />
          </div>
        </button>
      </div>
    );
  }

  // If open: Render Full Embedded Chat Screen with Header, Messages & Input
  return (
    <div className="bg-[#FBF8F1] border-2 border-[#E7E1D3] rounded-2xl shadow-md overflow-hidden flex flex-col h-full min-h-[460px] animate-chat-popin">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#F6F1E7] via-[#FBF8F1] to-[#F6F1E7] px-4 py-3 border-b border-[#E7E1D3] flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-3">
          {/* Animated 3D Robo Avatar in Header */}
          <div className="relative w-10 h-10 rounded-xl bg-white p-0.5 border border-[#E7E1D3] overflow-hidden shrink-0 hover-robo-smile">
            <img
              src="/assets/robo-avatar.png"
              alt="3D Robo Avatar"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-[40%] left-[26%] w-[48%] h-[20%] bg-[#0B132B] rounded-md animate-robo-blink pointer-events-none opacity-90" />
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-robo-glow" />
          </div>

          <div>
            <h3 className="text-xs sm:text-sm font-bold font-heading text-[#1E1B17] flex items-center space-x-1.5">
              <span>LegalLens AI Assistant</span>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
            </h3>
            <p className="text-[10px] text-[#6E6659]">
              {document ? `Grounded: ${document.document_title}` : 'Ask questions or inspect clauses'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-bold text-[#0284C7] bg-[#E0F2FE] px-2 py-0.5 rounded-full border border-[#7DD3FC] hidden sm:inline-flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-[#0284C7]" />
            <span>3D AI</span>
          </span>

          {/* Cross (X) Close Button to compact back to face only & restore 100% uploader width */}
          <button
            type="button"
            onClick={() => toggleOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#E7E1D3] text-[#6E6659] hover:text-[#1E1B17] transition-colors"
            title="Close AI Chat & Expand Document Uploader"
          >
            <X className="w-4.5 h-4.5 text-[#1E1B17]" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs min-h-[260px] max-h-[380px]">
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

                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

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
                        onClick={() => onVerifyClause?.(cid)}
                        className="text-[10px] bg-[#FBF8F1] hover:bg-[#E7E1D3]/60 text-[#B85C38] px-2 py-0.5 rounded border border-[#E7E1D3] font-semibold flex items-center space-x-1"
                      >
                        <Search className="w-2.5 h-2.5 text-[#065F46]" />
                        <span>Clause #{cid.replace(/[^\d]/g, '') || cid}</span>
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
                    {isSpeaking ? (
                      <VolumeX className="w-3 h-3" />
                    ) : (
                      <Volume2 className="w-3 h-3 text-[#B85C38]" />
                    )}
                    <span>{isSpeaking ? 'Stop' : 'Listen'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-[#6E6659] bg-[#F6F1E7] p-3 rounded-xl border border-[#E7E1D3] w-fit animate-pulse">
            <Bot className="w-4 h-4 text-[#B85C38] animate-spin" />
            <span>3D Robo is thinking...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-[#F6F1E7] border-t border-[#E7E1D3] flex items-center space-x-2 shrink-0">
        <button
          onClick={handleToggleVoiceInput}
          title="Speak your question"
          className={`p-2 rounded-lg border transition-colors ${
            isListening
              ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5] animate-pulse'
              : 'bg-[#FBF8F1] hover:bg-[#E7E1D3]/50 text-[#B85C38] border-[#E7E1D3]'
          }`}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={
            isListening ? 'Listening to voice...' : 'Ask about notice period, deposit, terms...'
          }
          className="flex-1 bg-[#FBF8F1] border border-[#E7E1D3] rounded-lg px-3 py-2 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
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
