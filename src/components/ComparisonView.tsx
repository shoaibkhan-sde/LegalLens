import React, { useState } from 'react';
import {
  GitCompare,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Upload,
  UploadCloud,
  X,
  Loader2,
  FileCheck2,
  Trash2,
} from 'lucide-react';
import { DocumentAnalysisResult, ComparisonResult, ActiveInputContext } from '../types/schemas';
import { ApiClient } from '../services/apiClient';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { RoboAiAssistant } from './RoboAiAssistant';

import { useLanguage } from '../context/LanguageContext';

interface ComparisonViewProps {
  currentDocument?: DocumentAnalysisResult | null;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ currentDocument }) => {
  const { language, t } = useLanguage();

  // Document A State
  const [docAMode, setDocAMode] = useState<'paste' | 'upload'>('paste');
  const [docAPastedText, setDocAPastedText] = useState<string>(() => {
    try {
      return sessionStorage.getItem('legallens_doc_a_pasted_text') || '';
    } catch {
      return '';
    }
  });
  const [docAFile, setDocAFile] = useState<File | null>(null);
  const [docAExtractedText, setDocAExtractedText] = useState<string>('');
  const [isExtractingA, setIsExtractingA] = useState<boolean>(false);
  const [docAError, setDocAError] = useState<string | null>(null);

  // Document B State
  const [docBMode, setDocBMode] = useState<'paste' | 'upload'>('paste');
  const [docBPastedText, setDocBPastedText] = useState<string>(() => {
    try {
      return sessionStorage.getItem('legallens_doc_b_pasted_text') || '';
    } catch {
      return '';
    }
  });
  const [docBFile, setDocBFile] = useState<File | null>(null);
  const [docBExtractedText, setDocBExtractedText] = useState<string>('');
  const [isExtractingB, setIsExtractingB] = useState<boolean>(false);
  const [docBError, setDocBError] = useState<string | null>(null);

  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('legallens_is_compare_chat_open');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return false;
  });

  const handleToggleChatOpen = (openState: boolean) => {
    setIsChatOpen(openState);
    try {
      localStorage.setItem('legallens_is_compare_chat_open', JSON.stringify(openState));
    } catch {}
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUploadA = async (file: File) => {
    setDocAFile(file);
    setDocAError(null);
    setIsExtractingA(true);
    try {
      const res = await ApiClient.extractPreviewText(file);
      if (res.text && res.text.trim().length > 10) {
        setDocAExtractedText(res.text);
      } else {
        setDocAError(res.error || "Could not extract text from file — try a clearer PDF, DOCX or image.");
        setDocAExtractedText('');
      }
    } catch (err: any) {
      setDocAError(err.message || "Failed to parse file text.");
      setDocAExtractedText('');
    } finally {
      setIsExtractingA(false);
    }
  };

  const handleFileUploadB = async (file: File) => {
    setDocBFile(file);
    setDocBError(null);
    setIsExtractingB(true);
    try {
      const res = await ApiClient.extractPreviewText(file);
      if (res.text && res.text.trim().length > 10) {
        setDocBExtractedText(res.text);
      } else {
        setDocBError(res.error || "Could not extract text from file — try a clearer PDF, DOCX or image.");
        setDocBExtractedText('');
      }
    } catch (err: any) {
      setDocBError(err.message || "Failed to parse file text.");
      setDocBExtractedText('');
    } finally {
      setIsExtractingB(false);
    }
  };

  const activeTextA =
    docAMode === 'upload'
      ? docAExtractedText.trim()
      : (docAPastedText.trim() ||
        (currentDocument && currentDocument.clauses
          ? currentDocument.clauses.map((c) => c.original_text).join('\n')
          : ''));

  const activeTextB =
    docBMode === 'upload'
      ? docBExtractedText.trim()
      : docBPastedText.trim();

  const activeTitleA =
    docAMode === 'upload' && docAFile
      ? docAFile.name
      : (currentDocument ? currentDocument.document_title : 'Document A');

  const activeTitleB =
    docBMode === 'upload' && docBFile
      ? docBFile.name
      : 'Document B';

  const hasDocA = Boolean(activeTextA);
  const hasDocB = Boolean(activeTextB);
  const isCompareDisabled = !hasDocA || !hasDocB || isLoading || isExtractingA || isExtractingB;

  const comparisonInputContext: ActiveInputContext = {
    isComparisonMode: true,
    docATitle: activeTitleA,
    docAText: activeTextA,
    docBTitle: activeTitleB,
    docBText: activeTextB,
    comparisonResult: comparisonResult,
    hasInput: Boolean(activeTextA || activeTextB),
  };

  React.useEffect(() => {
    if (errorMessage) {
      setTimeout(() => {
        const errorBanner = document.getElementById('comparison-error-banner');
        if (errorBanner) {
          errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
    }
  }, [errorMessage]);

  const handleRunComparison = async () => {
    if (isCompareDisabled) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const textA = activeTextA;
      const textB = activeTextB;

      // Parallelize Document A & Document B analysis with isolated error handling
      const [resA, resB] = await Promise.allSettled([
        ApiClient.analyzeDocument(textA),
        ApiClient.analyzeDocument(textB),
      ]);

      if (resA.status === 'rejected' && resB.status === 'rejected') {
        const reasonA = resA.reason?.message || String(resA.reason || 'Analysis failed');
        const reasonB = resB.reason?.message || String(resB.reason || 'Analysis failed');
        setErrorMessage(
          `Comparison Error — Multiple document failures:\n• Document A: ${reasonA}\n• Document B: ${reasonB}`
        );
        return;
      }

      if (resA.status === 'rejected') {
        const reasonA = resA.reason?.message || String(resA.reason || 'Analysis failed');
        setErrorMessage(`Document A could not be analyzed: ${reasonA}`);
        return;
      }

      if (resB.status === 'rejected') {
        const reasonB = resB.reason?.message || String(resB.reason || 'Analysis failed');
        setErrorMessage(`Document B could not be analyzed: ${reasonB}`);
        return;
      }

      const docAObj = resA.value;
      const docBObj = resB.value;

      const result = await ApiClient.compareDocuments(docAObj, docBObj);
      setComparisonResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'System is busy, please try again in a moment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Editorial Compare Banner Illustration */}
      <div className="w-full flex justify-center items-center relative h-[140px] sm:h-[160px] md:h-[180px] hidden min-[380px]:flex select-none pointer-events-none">
        <img
          src="/assets/compare-illustration.png"
          alt="Illustration of two documents being compared, connected by a scale motif"
          loading="eager"
          draggable="false"
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onDoubleClick={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
          onTouchMove={(e) => e.preventDefault()}
          className="w-full h-auto max-h-[140px] sm:max-h-[160px] md:max-h-[180px] object-contain mx-auto select-none pointer-events-none"
        />
      </div>

      {/* Floating 3D Robo Face Avatar when chat is closed */}
      {!isChatOpen && (
        <div className="flex justify-end pr-2 -mb-4">
          <RoboAiAssistant
            sectionId="compare"
            document={null}
            inputContext={comparisonInputContext}
            isOpen={isChatOpen}
            onToggleOpen={handleToggleChatOpen}
          />
        </div>
      )}

      {/* Top Section: Dynamic Grid (100% width when chat closed, 50%/50% equal area split when chat open) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-300 items-stretch">
        {/* Comparison Main Setup & Results Column */}
        <div className={`${isChatOpen ? 'lg:col-span-6' : 'lg:col-span-12'} transition-all duration-300 space-y-6`}>
          {/* Error Message Banner */}
          {errorMessage && (
            <div
              id="comparison-error-banner"
              className="bg-[#FFF5F5] border-2 border-[#FCA5A5] rounded-2xl p-4 flex items-center justify-between text-xs text-[#991B1B] shadow-md animate-fade-in-up scroll-mt-28 ring-4 ring-[#991B1B]/15"
            >
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#991B1B]/10 flex items-center justify-center shrink-0 border border-[#991B1B]/20">
                  <AlertTriangle className="w-5 h-5 text-[#991B1B]" />
                </div>
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider text-[#991B1B]">
                    Comparison Validation Alert
                  </div>
                  <span className="font-semibold text-xs text-[#7F1D1D] mt-0.5 block">{errorMessage}</span>
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="p-1.5 rounded-lg hover:bg-[#FCA5A5]/40 text-[#991B1B] font-bold text-sm transition-colors cursor-pointer shrink-0"
                title="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Comparison Setup Panel */}
          <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-3 border-b border-[#E7E1D3] pb-3">
              <div className="w-9 h-9 rounded-lg bg-[#F6F1E7] text-[#B85C38] flex items-center justify-center border border-[#E7E1D3]">
                <GitCompare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold font-heading text-[#1E1B17]">{t('comparison.title')}</h2>
                <p className="text-xs text-[#6E6659]">
                  {t('comparison.subtitle')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Document A Slot */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-semibold text-[#B85C38] flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('comparison.doc_a')}</span>
                  </label>

                  <div className="inline-flex p-0.5 rounded-lg bg-[#E7E1D3]/50 border border-[#E7E1D3] text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDocAMode('paste')}
                      className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                        docAMode === 'paste'
                          ? 'bg-[#B85C38] text-white shadow-xs'
                          : 'text-[#6E6659] hover:text-[#1E1B17]'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>{language === 'hi' ? 'टेक्स्ट पेस्ट करें' : 'Paste Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDocAMode('upload')}
                      className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                        docAMode === 'upload'
                          ? 'bg-[#B85C38] text-white shadow-xs'
                          : 'text-[#6E6659] hover:text-[#1E1B17]'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{language === 'hi' ? 'फ़ाइल अपलोड करें' : 'Upload File'}</span>
                    </button>
                  </div>
                </div>

                {/* Source Indicator Badge */}
                {activeTextA && (
                  <div className="text-[10px] text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded border border-[#6EE7B7] flex items-center justify-between">
                    <span className="font-semibold truncate">
                      {docAMode === 'upload' && docAFile
                        ? `📄 Doc A: "${docAFile.name}" (${formatFileSize(docAFile.size)} • ${docAExtractedText.length} chars)`
                        : `📝 Doc A: Pasted Text (${activeTextA.length} chars)`}
                    </span>
                    {docAMode === 'upload' && docAFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setDocAFile(null);
                          setDocAExtractedText('');
                        }}
                        className="text-[#991B1B] hover:text-[#7F1D1D] ml-1 font-bold cursor-pointer"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {docAMode === 'paste' ? (
                  <AutoResizeTextarea
                    rows={4}
                    value={docAPastedText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDocAPastedText(val);
                      try {
                        sessionStorage.setItem('legallens_doc_a_pasted_text', val);
                      } catch {}
                    }}
                    placeholder={
                      currentDocument
                        ? `Using active document: "${currentDocument.document_title}"`
                        : t('comparison.placeholder_a')
                    }
                    className="w-full bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg p-3 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
                  />
                ) : (
                  <div className="space-y-2">
                    {!docAFile ? (
                      <div className="relative border-2 border-dashed border-[#E7E1D3] hover:border-[#B85C38] rounded-xl p-4 text-center transition-colors bg-[#F6F1E7]/60 group cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUploadA(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <UploadCloud className="w-6 h-6 mx-auto text-[#B85C38] group-hover:scale-110 transition-transform duration-200 mb-1" />
                        <p className="text-xs font-semibold text-[#1E1B17]">
                          {language === 'hi' ? 'PDF, DOCX, TXT या इमेज ड्रैग करें' : 'Drag & drop PDF, DOCX, TXT or image'}
                        </p>
                        <p className="text-[10px] text-[#6E6659] mt-0.5">
                          {language === 'hi' ? 'या फ़ाइल चुनने के लिए क्लिक करें' : 'or click to browse from device'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <FileCheck2 className="w-4 h-4 text-[#B85C38] shrink-0" />
                            <span className="font-semibold text-[#1E1B17] truncate">{docAFile.name}</span>
                          </div>
                          <span className="text-[10px] text-[#6E6659] shrink-0">{formatFileSize(docAFile.size)}</span>
                        </div>

                        {isExtractingA && (
                          <div className="flex items-center space-x-2 text-xs text-[#B85C38]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{language === 'hi' ? 'पाठ निकाला जा रहा है...' : 'Extracting document text...'}</span>
                          </div>
                        )}

                        {docAError && (
                          <p className="text-[11px] text-[#991B1B] font-semibold">{docAError}</p>
                        )}

                        {docAExtractedText && (
                          <div className="text-[10px] text-[#6E6659] bg-[#FBF8F1] p-2 rounded border border-[#E7E1D3] max-h-24 overflow-y-auto font-mono">
                            {docAExtractedText.slice(0, 300)}...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Document B Slot */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-semibold text-[#B85C38] flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('comparison.doc_b')}</span>
                  </label>

                  <div className="inline-flex p-0.5 rounded-lg bg-[#E7E1D3]/50 border border-[#E7E1D3] text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setDocBMode('paste')}
                      className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                        docBMode === 'paste'
                          ? 'bg-[#B85C38] text-white shadow-xs'
                          : 'text-[#6E6659] hover:text-[#1E1B17]'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>{language === 'hi' ? 'टेक्स्ट पेस्ट करें' : 'Paste Text'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDocBMode('upload')}
                      className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 cursor-pointer ${
                        docBMode === 'upload'
                          ? 'bg-[#B85C38] text-white shadow-xs'
                          : 'text-[#6E6659] hover:text-[#1E1B17]'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{language === 'hi' ? 'फ़ाइल अपलोड करें' : 'Upload File'}</span>
                    </button>
                  </div>
                </div>

                {/* Source Indicator Badge */}
                {activeTextB && (
                  <div className="text-[10px] text-[#065F46] bg-[#D1FAE5] px-2 py-0.5 rounded border border-[#6EE7B7] flex items-center justify-between">
                    <span className="font-semibold truncate">
                      {docBMode === 'upload' && docBFile
                        ? `📄 Doc B: "${docBFile.name}" (${formatFileSize(docBFile.size)} • ${docBExtractedText.length} chars)`
                        : `📝 Doc B: Pasted Text (${activeTextB.length} chars)`}
                    </span>
                    {docBMode === 'upload' && docBFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setDocBFile(null);
                          setDocBExtractedText('');
                        }}
                        className="text-[#991B1B] hover:text-[#7F1D1D] ml-1 font-bold cursor-pointer"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {docBMode === 'paste' ? (
                  <AutoResizeTextarea
                    rows={4}
                    value={docBPastedText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDocBPastedText(val);
                      try {
                        sessionStorage.setItem('legallens_doc_b_pasted_text', val);
                      } catch {}
                    }}
                    placeholder={t('comparison.placeholder_b')}
                    className="w-full bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg p-3 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
                  />
                ) : (
                  <div className="space-y-2">
                    {!docBFile ? (
                      <div className="relative border-2 border-dashed border-[#E7E1D3] hover:border-[#B85C38] rounded-xl p-4 text-center transition-colors bg-[#F6F1E7]/60 group cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc,.txt,image/*"
                          onChange={(e) => e.target.files?.[0] && handleFileUploadB(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <UploadCloud className="w-6 h-6 mx-auto text-[#B85C38] group-hover:scale-110 transition-transform duration-200 mb-1" />
                        <p className="text-xs font-semibold text-[#1E1B17]">
                          {language === 'hi' ? 'PDF, DOCX, TXT या इमेज ड्रैग करें' : 'Drag & drop PDF, DOCX, TXT or image'}
                        </p>
                        <p className="text-[10px] text-[#6E6659] mt-0.5">
                          {language === 'hi' ? 'या फ़ाइल चुनने के लिए क्लिक करें' : 'or click to browse from device'}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <FileCheck2 className="w-4 h-4 text-[#B85C38] shrink-0" />
                            <span className="font-semibold text-[#1E1B17] truncate">{docBFile.name}</span>
                          </div>
                          <span className="text-[10px] text-[#6E6659] shrink-0">{formatFileSize(docBFile.size)}</span>
                        </div>

                        {isExtractingB && (
                          <div className="flex items-center space-x-2 text-xs text-[#B85C38]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{language === 'hi' ? 'पाठ निकाला जा रहा है...' : 'Extracting document text...'}</span>
                          </div>
                        )}

                        {docBError && (
                          <p className="text-[11px] text-[#991B1B] font-semibold">{docBError}</p>
                        )}

                        {docBExtractedText && (
                          <div className="text-[10px] text-[#6E6659] bg-[#FBF8F1] p-2 rounded border border-[#E7E1D3] max-h-24 overflow-y-auto font-mono">
                            {docBExtractedText.slice(0, 300)}...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleRunComparison}
              disabled={isCompareDisabled}
              aria-disabled={isCompareDisabled}
              className={`w-full py-2.5 font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 ease-out ${
                isCompareDisabled
                  ? 'bg-[#D9A391] text-[#FBF8F1]/75 cursor-not-allowed border border-[#C58E7C]/40 shadow-none'
                  : 'bg-[#B85C38] hover:bg-[#9C4B2B] text-white cursor-pointer shadow-xs border border-[#B85C38] active:scale-[0.99]'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>{isLoading ? t('comparison.btn_comparing') : t('comparison.btn_compare')}</span>
            </button>
          </div>

          {/* Initial Empty State before Comparison is Run */}
          {!comparisonResult && !isLoading && (
            <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-8 text-center space-y-3 shadow-xs">
              <div className="relative w-24 h-24 mx-auto">
                <img
                  src="/assets/empty-state-illustration.png"
                  alt="Illustration of a magnifying glass examining a document"
                  loading="eager"
                  draggable="false"
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onDoubleClick={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onTouchMove={(e) => e.preventDefault()}
                  className="w-24 h-24 object-contain mx-auto select-none pointer-events-none"
                />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#1E1B17]">{t('comparison.empty_title')}</h3>
                <p className="text-xs text-[#6E6659] mt-1 max-w-sm mx-auto">
                  {t('comparison.empty_sub')}
                </p>
              </div>
            </div>
          )}

          {/* Comparison Results */}
          {comparisonResult && (
            <div className="space-y-5">
              {/* Winner / Key Takeaway Card */}
              <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 shadow-xs space-y-2">
                <div className="flex items-center space-x-2 text-[#B85C38] font-bold text-xs">
                  <Sparkles className="w-4 h-4" />
                  <span>Comparison Recommendation</span>
                </div>
                <p className="text-sm font-semibold text-[#1E1B17]">{comparisonResult.winner_recommendation}</p>
                <p className="text-xs text-[#6E6659]">{comparisonResult.key_differences_summary}</p>
              </div>

              {/* Aligned Clauses Table */}
              <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold font-heading text-[#1E1B17]">Clause-by-Clause Comparison</h3>

                <div className="space-y-3">
                  {(comparisonResult?.aligned_pairs || []).map((pair) => (
                    <div
                      key={pair.id}
                      className={`p-4 rounded-xl border transition-all ${
                        pair.status === 'matched'
                          ? 'bg-[#F6F1E7] border-[#E7E1D3]'
                          : pair.status === 'a_only'
                          ? 'bg-[#FEF3C7] border-[#FDE68A]'
                          : 'bg-[#F6F1E7] border-[#E7E1D3]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase text-[#B85C38] bg-[#B85C38]/10 px-2 py-0.5 rounded border border-[#B85C38]/20">
                          {pair.clause_type}
                        </span>

                        {pair.status === 'matched' && (
                          <span className="text-[11px] font-semibold text-[#065F46] flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Matched Clause ({Math.round(pair.similarity_score * 100)}% similarity)</span>
                          </span>
                        )}
                        {pair.status === 'a_only' && (
                          <span className="text-[11px] font-bold text-[#92400E] flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Present ONLY in Document A (Missing in B)</span>
                          </span>
                        )}
                        {pair.status === 'b_only' && (
                          <span className="text-[11px] font-bold text-[#1E1B17] flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 text-[#B85C38]" />
                            <span>Present ONLY in Document B (Missing in A)</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {/* Doc A Side */}
                        <div className="p-3 bg-[#FBF8F1] rounded-lg border border-[#E7E1D3]">
                          <div className="font-bold text-[#1E1B17] mb-1">Doc A: {pair.doc_a_clause?.title || '—'}</div>
                          <p className="text-[#6E6659]">
                            {pair.doc_a_clause?.simple_explanation || 'No matching clause in Document A.'}
                          </p>
                        </div>

                        {/* Doc B Side */}
                        <div className="p-3 bg-[#FBF8F1] rounded-lg border border-[#E7E1D3]">
                          <div className="font-bold text-[#1E1B17] mb-1">Doc B: {pair.doc_b_clause?.title || '—'}</div>
                          <p className="text-[#6E6659]">
                            {pair.doc_b_clause?.simple_explanation || 'No matching clause in Document B.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Assistant Screen Area (Takes equal 50% width alongside comparison panel when open) */}
        {isChatOpen && (
          <div
            id="compare-chat-container"
            className="lg:col-span-6 transition-all duration-300 animate-fade-in-up relative min-h-[500px] lg:min-h-0 scroll-mt-6"
          >
            <RoboAiAssistant
              sectionId="compare"
              document={null}
              inputContext={comparisonInputContext}
              isOpen={isChatOpen}
              onToggleOpen={handleToggleChatOpen}
            />
          </div>
        )}
      </div>
    </div>
  );
};
