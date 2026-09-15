import React, { useState, useEffect, useRef } from 'react';
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
  ArrowDown,
  History,
  Trash2,
  Plus,
  Clock,
} from 'lucide-react';
import { DocumentAnalysisResult, ChatMessage, QuotaTelemetry, ActiveInputContext } from '../types/schemas';
import { ApiClient } from '../services/apiClient';
import { SpeechEngine } from '../utils/speech';
import { QuotaBar } from './QuotaBar';
import { FormattedMessageText } from './FormattedMessageText';
import { useLanguage } from '../context/LanguageContext';
import { localizeChatMessageText, localizeChatMessage } from '../utils/chatLocalization';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  messages: ChatMessage[];
}

interface RoboAiAssistantProps {
  document?: DocumentAnalysisResult | null;
  inputContext?: ActiveInputContext | null;
  onVerifyClause?: (clauseId: string) => void;
  isOpen?: boolean;
  onToggleOpen?: (open: boolean) => void;
}

const STORAGE_ACTIVE_KEY = 'legallens_active_messages';
const STORAGE_HISTORY_KEY = 'legallens_chat_history';
const STORAGE_SESSION_ID_KEY = 'legallens_current_session_id';

export const RoboAiAssistant: React.FC<RoboAiAssistantProps> = ({
  document,
  inputContext,
  onVerifyClause,
  isOpen: externalIsOpen,
  onToggleOpen,
}) => {
  const { language, t } = useLanguage();
  const [internalIsOpen, setInternalIsOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('legallens_is_chat_open');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return false;
  });
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;

  const toggleOpen = (openState: boolean) => {
    try {
      localStorage.setItem('legallens_is_chat_open', JSON.stringify(openState));
    } catch {}
    if (onToggleOpen) {
      onToggleOpen(openState);
    } else {
      setInternalIsOpen(openState);
    }

    if (openState) {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const chatElem = window.document.getElementById('legal-chat-container') || window.document.getElementById('robo-assistant-container');
          if (chatElem) {
            chatElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }, 120);
    }
  };

  // Restore active session ID
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem(STORAGE_SESSION_ID_KEY);
      if (savedId) return savedId;
    } catch {}
    return `chat_${Date.now()}`;
  });

  // Restore active messages from localStorage on load if available
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [quotaTelemetry, setQuotaTelemetry] = useState<QuotaTelemetry | undefined>(undefined);
  const [showScrollBottom, setShowScrollBottom] = useState<boolean>(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Update/save current session in chatHistory without duplicating
  const saveOrUpdateCurrentSession = (msgsToSave: ChatMessage[]) => {
    if (msgsToSave.length <= 1) return;
    const firstUserMsg = msgsToSave.find((m) => m.sender === 'user');
    if (!firstUserMsg) return;

    const title = firstUserMsg.text.slice(0, 32) + '...';
    const sessionToSave: ChatSession = {
      id: currentSessionId,
      title,
      timestamp: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      messages: [...msgsToSave],
    };

    setChatHistory((prev) => {
      const existingIndex = prev.findIndex((s) => s.id === currentSessionId);
      let updated: ChatSession[];
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = sessionToSave;
      } else {
        updated = [sessionToSave, ...prev].slice(0, 10);
      }

      try {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Persist active messages & update session
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(messages));
        localStorage.setItem(STORAGE_SESSION_ID_KEY, currentSessionId);
      } catch {}
      saveOrUpdateCurrentSession(messages);
    }
  }, [messages, currentSessionId]);

  // Initial welcome message and dynamic update when language changes
  useEffect(() => {
    const isHi = language === 'hi';
    setMessages((prev) => {
      const hasUserMessages = prev.some((m) => m.sender === 'user');
      if (!hasUserMessages) {
        let welcomeText = isHi
          ? `नमस्ते! मैं आपका कानूनी AI सहायक हूँ। कोई भी कानूनी प्रश्न पूछें, या विश्लेषण करने के लिए अनुबंध अपलोड करें!`
          : `Hi! I am your Legal Assistant. Ask any legal question (e.g. deposit rules, notice periods in Bengaluru), or upload a contract to analyze!`;
        if (document) {
          welcomeText = isHi
            ? `नमस्ते! मैं आपका लीगललेंस AI सहायक हूँ। अपने अनुबंध (${document.document_title}) के बारे में कुछ भी पूछें। मैं खंड, जमा वापसी या नोटिस अवधि समझा सकता हूँ!`
            : `Hello! I am your LegalLens AI Assistant. Ask me anything about your contract (${document.document_title}). I can explain clauses, deposit refunds, or notice periods!`;
        } else if (inputContext?.uploadedFileName) {
          welcomeText = isHi
            ? `नमस्ते! मुझे दिखता है कि आपने **${inputContext.uploadedFileName}** अपलोड किया है! इसके बारे में कुछ भी पूछें या खंड देखने के लिए "Analyze Document" पर क्लिक करें!`
            : `Hi! I see you uploaded **${inputContext.uploadedFileName}** (${inputContext.uploadedFileSize || 'File'}) in Document Capture! Ask me anything about it or click "Analyze Document" to view clause simplifications!`;
        } else if (inputContext?.pastedText) {
          welcomeText = isHi
            ? `नमस्ते! मुझे दिखता है कि आपने पाठ पेस्ट किया है! इसके बारे में कुछ भी पूछें या विश्लेषण के लिए "Analyze Document" पर क्लिक करें!`
            : `Hi! I see you pasted text in Document Capture! Ask me anything about your text or click "Analyze Document" to analyze clauses!`;
        }

        return [
          {
            id: prev[0]?.id || `welcome_${Date.now()}`,
            sender: 'assistant',
            text: welcomeText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ];
      } else {
        // If thread has user messages, convert all assistant messages to target language
        return prev.map((msg) => {
          if (msg.sender === 'assistant') {
            return {
              ...msg,
              text: localizeChatMessageText(msg.text, language),
            };
          }
          return msg;
        });
      }
    });
  }, [language, document?.document_title, inputContext?.uploadedFileName, inputContext?.pastedText]);

  useEffect(() => {
    ApiClient.getConfigStatus().then((st) => {
      if (st.quota) setQuotaTelemetry(st.quota);
    }).catch(() => {});
  }, []);

  const scrollToBottom = (smooth: boolean = true) => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // Only show scroll-to-bottom arrow if content actually overflows and user scrolled up away from bottom
    const hasOverflow = scrollHeight > clientHeight + 30;
    const isScrolledUp = hasOverflow && (scrollHeight - scrollTop - clientHeight > 60);
    setShowScrollBottom(isScrolledUp);
  };

  // Auto-scroll to bottom on mount / when chat is opened to show latest conversation
  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const timer = setTimeout(() => {
        scrollToBottom(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleStartNewChat = () => {
    const newId = `chat_${Date.now()}`;
    setCurrentSessionId(newId);
    const isHi = language === 'hi';
    const welcomeMsg: ChatMessage = {
      id: `welcome_${Date.now()}`,
      sender: 'assistant',
      text: document
        ? (isHi
            ? `नमस्ते! मैं आपका लीगललेंस AI सहायक हूँ। अपने अनुबंध (${document.document_title}) के बारे में कुछ भी पूछें।`
            : `Hello! I am your LegalLens AI Assistant. Ask me anything about your contract (${document.document_title}).`)
        : (isHi
            ? `नमस्ते! मैं आपका कानूनी सहायक हूँ। कोई भी प्रश्न पूछें या विश्लेषण के लिए अनुबंध अपलोड करें!`
            : `Hi! I am your Legal Assistant. Ask any legal question or upload a contract to analyze!`),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcomeMsg]);
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify([welcomeMsg]));
      localStorage.setItem(STORAGE_SESSION_ID_KEY, newId);
    } catch {}
    setShowHistoryModal(false);
    setShowScrollBottom(false);
    setTimeout(() => scrollToBottom(false), 60);
  };

  const handleSelectHistorySession = (session: ChatSession) => {
    setCurrentSessionId(session.id);
    const adaptedMessages = session.messages.map((m) => {
      if (m.sender === 'assistant') {
        return { ...m, text: localizeChatMessageText(m.text, language) };
      }
      return m;
    });
    setMessages(adaptedMessages);
    try {
      localStorage.setItem(STORAGE_ACTIVE_KEY, JSON.stringify(adaptedMessages));
      localStorage.setItem(STORAGE_SESSION_ID_KEY, session.id);
    } catch {}
    setShowHistoryModal(false);
    setShowScrollBottom(false);
    setTimeout(() => scrollToBottom(false), 60);
  };

  const handleDeleteHistorySession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatHistory((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    if (sessionId === currentSessionId) {
      handleStartNewChat();
    }
  };

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
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const assistantMsg = await ApiClient.sendChatMessage(document || null, query.trim(), messages, inputContext || null, language);
      if (assistantMsg.quota) {
        setQuotaTelemetry(assistantMsg.quota);
      }
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const isHi = language === 'hi';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: isHi
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
          console.warn('Speech recognition error:', err);
          setIsListening(false);
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

  // If closed: Render Compact Launcher Button with "ASK ME" label and jumping animation
  if (!isOpen) {
    return (
      <div className="relative group animate-chat-popin z-20">
        <button
          type="button"
          onClick={() => toggleOpen(true)}
          className="relative flex items-center space-x-2 px-3.5 py-2 rounded-2xl bg-gradient-to-b from-[#FBF8F1] via-[#F6F1E7] to-[#E7E1D3] border-2 border-[#B85C38]/40 hover:border-[#B85C38] shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 animate-robo-jump group cursor-pointer"
        >
          <div className="relative w-9 h-9 overflow-hidden rounded-xl bg-white p-0.5 border border-[#E7E1D3] shrink-0 hover-robo-smile">
            <img
              src="/assets/robo-avatar.png"
              alt="LegalLens AI Avatar"
              draggable="false"
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onDoubleClick={(e) => e.preventDefault()}
              className="w-full h-full object-contain drop-shadow-md group-hover:drop-shadow-[0_0_15px_rgba(56,189,248,0.8)] select-none pointer-events-none"
            />
            <div className="absolute top-[40%] left-[26%] w-[48%] h-[20%] bg-[#0B132B] rounded-md animate-robo-blink pointer-events-none opacity-90" />
            <span className="absolute top-0.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#38BDF8] animate-robo-glow shadow-[0_0_10px_#38BDF8]" />
          </div>
          <span className="text-xs font-bold font-heading text-[#B85C38] tracking-wider uppercase pr-1">{t('robo.askMe')}</span>
        </button>
      </div>
    );
  }

  // If open: Render Embedded Chat Screen with Fixed Height, History & Clean Controls
  return (
    <div
      id="robo-assistant-container"
      className="bg-[#FBF8F1] border-2 border-[#E7E1D3] rounded-2xl shadow-md overflow-hidden flex flex-col h-[500px] lg:h-full lg:absolute lg:inset-0 animate-chat-popin relative scroll-mt-6"
    >
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-[#F6F1E7] via-[#FBF8F1] to-[#F6F1E7] px-4 py-3 border-b border-[#E7E1D3] flex items-center justify-between shrink-0 relative">
        <div className="flex items-center space-x-3">
          <div className="relative w-9 h-9 rounded-xl bg-white p-0.5 border border-[#E7E1D3] overflow-hidden shrink-0">
            <img
              src="/assets/robo-avatar.png"
              alt="LegalLens AI Avatar"
              draggable="false"
              onDragStart={(e) => e.preventDefault()}
              onContextMenu={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onDoubleClick={(e) => e.preventDefault()}
              className="w-full h-full object-contain select-none pointer-events-none"
            />
          </div>

          <div>
            <h3 className="text-xs sm:text-sm font-bold font-heading text-[#1E1B17]">
              {t('robo.title')}
            </h3>
            <p className="text-[10px] text-[#6E6659]">
              {document ? `${t('robo.grounded')}: ${document.document_title}` : t('robo.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Previous Chats History Button */}
          <button
            type="button"
            onClick={() => setShowHistoryModal((prev) => !prev)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#F6F1E7] hover:bg-[#E7E1D3] text-[#1E1B17] border border-[#E7E1D3] transition-colors text-xs font-semibold cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-[#B85C38]" />
            <span className="hidden sm:inline text-[11px]">{t('robo.history')}</span>
          </button>

          {/* CLOSE Button */}
          <button
            type="button"
            onClick={() => toggleOpen(false)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#F6F1E7] hover:bg-[#E7E1D3] text-[#1E1B17] border border-[#E7E1D3] transition-colors text-xs font-bold cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-[#1E1B17]" />
            <span className="text-[11px] uppercase font-bold">{t('robo.close')}</span>
          </button>
        </div>
      </div>

      {/* Previous Chats History Popover */}
      {showHistoryModal && (
        <div className="absolute top-14 right-3 w-72 bg-[#FBF8F1] border-2 border-[#E7E1D3] rounded-xl shadow-xl z-30 p-3 animate-fade-in-up space-y-2">
          <div className="flex items-center justify-between border-b border-[#E7E1D3] pb-2">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-[#1E1B17]">
              <Clock className="w-4 h-4 text-[#B85C38]" />
              <span>{t('robo.historyTitle')} ({chatHistory.length}/10)</span>
            </div>
            <button
              onClick={handleStartNewChat}
              className="text-[10px] font-bold bg-[#B85C38] hover:bg-[#9C4B2B] text-white px-2 py-1 rounded flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>{t('robo.newChat')}</span>
            </button>
          </div>

          {chatHistory.length === 0 ? (
            <p className="text-[11px] text-[#6E6659] py-3 text-center">{t('robo.emptyHistory')}</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {chatHistory.map((sess) => {
                const isActive = sess.id === currentSessionId;
                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectHistorySession(sess)}
                    className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-all ${
                      isActive
                        ? 'bg-[#FBF8F1] border-2 border-[#B85C38] shadow-xs'
                        : 'bg-[#F6F1E7] hover:bg-[#E7E1D3]/70 border-[#E7E1D3]'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="flex items-center space-x-1.5">
                        <p className="font-semibold text-[#1E1B17] truncate text-[11px]">{sess.title}</p>
                        {isActive && (
                          <span className="text-[9px] font-extrabold text-[#B85C38] bg-[#B85C38]/10 px-1.5 py-0.5 rounded border border-[#B85C38]/20 shrink-0">
                            {t('robo.active')}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-[#6E6659]">{sess.timestamp} ({sess.messages.length} msgs)</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistorySession(sess.id, e)}
                      className="p-1 rounded hover:bg-[#FFF5F5] text-[#6E6659] hover:text-[#991B1B] transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Live Dual Engine Quota Telemetry Bar */}
      <div className="px-3 pt-2.5 shrink-0">
        <QuotaBar quota={quotaTelemetry} />
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3 text-xs min-h-0"
      >
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
                      <span>{t('robo.citations')}:</span>
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
                    <span>{isSpeaking ? t('robo.stop') : t('robo.listen')}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-[#6E6659] bg-[#F6F1E7] p-3 rounded-xl border border-[#E7E1D3] w-fit animate-pulse">
            <Bot className="w-4 h-4 text-[#B85C38] animate-spin" />
            <span>{t('robo.thinking')}</span>
          </div>
        )}
      </div>

      {/* Floating "Scroll to Bottom" circular button (only shown when scrolled up in overflow) */}
      {showScrollBottom && (
        <button
          type="button"
          onClick={() => {
            scrollToBottom(true);
            setShowScrollBottom(false);
          }}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-[#B85C38] hover:bg-[#9C4B2B] text-white p-2.5 rounded-full shadow-lg border border-[#9C4B2B] transition-all duration-200 animate-bounce-subtle z-20 flex items-center justify-center cursor-pointer hover:scale-105"
        >
          <ArrowDown className="w-4 h-4 text-white" />
        </button>
      )}

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
            isListening ? (language === 'hi' ? 'आवाज़ सुन रहे हैं...' : 'Listening to voice...') : t('robo.inputPlaceholder')
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
