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
import { PDFDocument } from 'pdf-lib';
import {
  MAX_PDF_PAGES,
  MAX_PDF_PAGES_ERROR_MSG,
  MAX_PDF_PAGES_ERROR_MSG_HI,
  MAX_PASTED_WORDS,
  MAX_PASTED_WORDS_ERROR_MSG,
  MAX_PASTED_WORDS_ERROR_MSG_HI,
  countWords,
  isWordLimitExceeded,
} from '../utils/constants';

import { useLanguage } from '../context/LanguageContext';
import {
  saveStorage,
  loadStorage,
  saveErrorStorage,
  loadErrorStorage,
  clearFeatureStorage,
} from '../utils/persistence';

interface ComparisonViewProps { }

export const ComparisonView: React.FC<ComparisonViewProps> = () => {
  const { language, t } = useLanguage();

  // Document A State
  const [docAMode, setDocAModeState] = useState<'paste' | 'upload'>(() => {
    return loadStorage<'paste' | 'upload'>('legallens_compare_doc_a_mode', 'paste');
  });
  const setDocAMode = (mode: 'paste' | 'upload') => {
    setDocAModeState(mode);
    saveStorage('legallens_compare_doc_a_mode', mode);
  };

  const [docAPastedText, setDocAPastedTextState] = useState<string>(() => {
    return loadStorage<string>('legallens_compare_doc_a_pasted_text', '');
  });
  const setDocAPastedText = (val: string) => {
    setDocAPastedTextState(val);
    saveStorage('legallens_compare_doc_a_pasted_text', val);
    saveStorage('legallens_doc_a_pasted_text', val);
  };

  const [docAFile, setDocAFile] = useState<File | null>(null);
  const [docAFileName, setDocAFileNameState] = useState<string>(() => {
    return loadStorage<string>('legallens_compare_doc_a_file_name', '');
  });
  const setDocAFileName = (val: string) => {
    setDocAFileNameState(val);
    saveStorage('legallens_compare_doc_a_file_name', val);
  };

  const [docAExtractedText, setDocAExtractedTextState] = useState<string>(() => {
    return loadStorage<string>('legallens_compare_doc_a_extracted_text', '');
  });
  const setDocAExtractedText = (val: string) => {
    setDocAExtractedTextState(val);
    saveStorage('legallens_compare_doc_a_extracted_text', val);
  };

  const [isExtractingA, setIsExtractingA] = useState<boolean>(false);
  const [docAError, setDocAErrorState] = useState<string | null>(() => {
    return loadErrorStorage('legallens_compare_doc_a_error');
  });
  const setDocAError = (val: string | null) => {
    setDocAErrorState(val);
    saveErrorStorage('legallens_compare_doc_a_error', val);
  };

  // Document B State
  const [docBMode, setDocBModeState] = useState<'paste' | 'upload'>(() => {
    return loadStorage<'paste' | 'upload'>('legallens_compare_doc_b_mode', 'paste');
  });
  const setDocBMode = (mode: 'paste' | 'upload') => {
    setDocBModeState(mode);
    saveStorage('legallens_compare_doc_b_mode', mode);
  };

  const [docBPastedText, setDocBPastedTextState] = useState<string>(() => {
    return loadStorage<string>('legallens_compare_doc_b_pasted_text', '');
  });
  const setDocBPastedText = (val: string) => {
    setDocBPastedTextState(val);
    saveStorage('legallens_compare_doc_b_pasted_text', val);
    saveStorage('legallens_doc_b_pasted_text', val);
  };

  const [docBFile, setDocBFile] = useState<File | null>(null);
  const [docBFileName, setDocBFileNameState] = useState<string>(() => {
    return loadStorage<string>('legallens_compare_doc_b_file_name', '');
  });
  const setDocBFileName = (val: string) => {
    setDocBFileNameState(val);
    saveStorage('legallens_compare_doc_b_file_name', val);
  };

  const [docBExtractedText, setDocBExtractedTextState] = useState<string>(() => {
    return loadStorage<string>('legallens_compare_doc_b_extracted_text', '');
  });
  const setDocBExtractedText = (val: string) => {
    setDocBExtractedTextState(val);
    saveStorage('legallens_compare_doc_b_extracted_text', val);
  };

  const [isExtractingB, setIsExtractingB] = useState<boolean>(false);
  const [docBError, setDocBErrorState] = useState<string | null>(() => {
    return loadErrorStorage('legallens_compare_doc_b_error');
  });
  const setDocBError = (val: string | null) => {
    setDocBErrorState(val);
    saveErrorStorage('legallens_compare_doc_b_error', val);
  };

  const [comparisonResult, setComparisonResultState] = useState<ComparisonResult | null>(() => {
    return loadStorage<ComparisonResult | null>('legallens_compare_result', null);
  });
  const setComparisonResult = (val: ComparisonResult | null) => {
    setComparisonResultState(val);
    saveStorage('legallens_compare_result', val);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessageState] = useState<string | null>(() => {
    return loadErrorStorage('legallens_compare_error_message');
  });
  const setErrorMessage = (val: string | null) => {
    setErrorMessageState(val);
    saveErrorStorage('legallens_compare_error_message', val);
  };

  const handleResetComparison = () => {
    setDocAPastedText('');
    setDocAExtractedText('');
    setDocAFileName('');
    setDocAFile(null);
    setDocAError(null);

    setDocBPastedText('');
    setDocBExtractedText('');
    setDocBFileName('');
    setDocBFile(null);
    setDocBError(null);

    setComparisonResult(null);
    setErrorMessage(null);

    clearFeatureStorage('legallens_compare_');
    clearFeatureStorage('legallens_doc_a_');
    clearFeatureStorage('legallens_doc_b_');
  };
  const [isChatOpen, setIsChatOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('legallens_is_compare_chat_open');
      if (saved !== null) return JSON.parse(saved);
    } catch { }
    return false;
  });

  const handleToggleChatOpen = (openState: boolean) => {
    setIsChatOpen(openState);
    try {
      localStorage.setItem('legallens_is_compare_chat_open', JSON.stringify(openState));
    } catch { }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileUploadA = async (file: File) => {
    setDocAFile(file);
    setDocAFileName(file.name);
    setDocAError(null);
    setIsExtractingA(true);

    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        if (pdfDoc.isEncrypted) {
          const encMsg = language === 'hi'
            ? 'दस्तावेज़ A: पासवर्ड से सुरक्षित PDF। कृपया एक अनएंक्रिप्टेड दस्तावेज़ अपलोड करें।'
            : 'Document A: Password-protected PDF detected. Please upload an unencrypted document.';
          setDocAError(encMsg);
          setDocAExtractedText('');
          setIsExtractingA(false);
          return;
        }
        if (pdfDoc.getPageCount() > MAX_PDF_PAGES) {
          const limitMsg = language === 'hi'
            ? `दस्तावेज़ A: ${MAX_PDF_PAGES_ERROR_MSG_HI}`
            : `Document A: ${MAX_PDF_PAGES_ERROR_MSG}`;
          setDocAError(limitMsg);
          setDocAExtractedText('');
          setIsExtractingA(false);
          return;
        }
      } catch {
        // Continue to server extraction if pdf-lib parse fails
      }
    }

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
    setDocBFileName(file.name);
    setDocBError(null);
    setIsExtractingB(true);

    const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        if (pdfDoc.isEncrypted) {
          const encMsg = language === 'hi'
            ? 'दस्तावेज़ B: पासवर्ड से सुरक्षित PDF। कृपया एक अनएंक्रिप्टेड दस्तावेज़ अपलोड करें।'
            : 'Document B: Password-protected PDF detected. Please upload an unencrypted document.';
          setDocBError(encMsg);
          setDocBExtractedText('');
          setIsExtractingB(false);
          return;
        }
        if (pdfDoc.getPageCount() > MAX_PDF_PAGES) {
          const limitMsg = language === 'hi'
            ? `दस्तावेज़ B: ${MAX_PDF_PAGES_ERROR_MSG_HI}`
            : `Document B: ${MAX_PDF_PAGES_ERROR_MSG}`;
          setDocBError(limitMsg);
          setDocBExtractedText('');
          setIsExtractingB(false);
          return;
        }
      } catch {
        // Continue to server extraction if pdf-lib parse fails
      }
    }

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

  const handleClearDocA = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocAFile(null);
    setDocAFileName('');
    setDocAExtractedText('');
    setDocAError(null);
    clearFeatureStorage('legallens_compare_doc_a');
    clearFeatureStorage('legallens_doc_a');
  };

  const handleClearDocB = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDocBFile(null);
    setDocBFileName('');
    setDocBExtractedText('');
    setDocBError(null);
    clearFeatureStorage('legallens_compare_doc_b');
    clearFeatureStorage('legallens_doc_b');
  };

  const activeTextA =
    docAMode === 'upload'
      ? docAExtractedText.trim()
      : docAPastedText.trim();

  const activeTextB =
    docBMode === 'upload'
      ? docBExtractedText.trim()
      : docBPastedText.trim();

  const activeTitleA =
    docAMode === 'upload' && (docAFile || docAFileName)
      ? (docAFile?.name || docAFileName)
      : 'Document A';

  const activeTitleB =
    docBMode === 'upload' && (docBFile || docBFileName)
      ? (docBFile?.name || docBFileName)
      : 'Document B';

  const hasDocA = Boolean(activeTextA);
  const hasDocB = Boolean(activeTextB);

  const hasDocAPastedText = docAPastedText.trim().length > 0;
  const hasDocAFile = Boolean(docAFile || (docAFileName && docAExtractedText));

  const hasDocBPastedText = docBPastedText.trim().length > 0;
  const hasDocBFile = Boolean(docBFile || (docBFileName && docBExtractedText));

  const isDocAWordExceeded = docAMode === 'paste' && isWordLimitExceeded(docAPastedText);
  const isDocBWordExceeded = docBMode === 'paste' && isWordLimitExceeded(docBPastedText);

  const effectiveDocAError =
    docAError ||
    (isDocAWordExceeded
      ? language === 'hi'
        ? `दस्तावेज़ A: ${MAX_PASTED_WORDS_ERROR_MSG_HI}`
        : `Document A: ${MAX_PASTED_WORDS_ERROR_MSG}`
      : null);

  const effectiveDocBError =
    docBError ||
    (isDocBWordExceeded
      ? language === 'hi'
        ? `दस्तावेज़ B: ${MAX_PASTED_WORDS_ERROR_MSG_HI}`
        : `Document B: ${MAX_PASTED_WORDS_ERROR_MSG}`
      : null);

  const isCompareDisabled =
    !hasDocA ||
    !hasDocB ||
    isLoading ||
    isExtractingA ||
    isExtractingB ||
    Boolean(effectiveDocAError) ||
    Boolean(effectiveDocBError);

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

  React.useEffect(() => {
    if (comparisonResult) {
      setTimeout(() => {
        const resultsContainer = document.getElementById('comparison-results-container');
        if (resultsContainer) {
          resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 120);
    }
  }, [comparisonResult]);

  const handleRunComparison = async () => {
    if (isCompareDisabled) return;

    setIsLoading(true);
    setErrorMessage(null);
    setDocAError(null);
    setDocBError(null);
    setComparisonResult(null);

    setTimeout(() => {
      const targetEl = document.getElementById('comparison-results-container') || document.getElementById('doc-a-slot-container');
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    const formatDocumentRejectReason = (rawError: string, docLabel: string): string => {
      const isHindi = language === 'hi';
      let cleanMsg = rawError
        .replace(/^Error:\s*/i, '')
        .replace(/^Document rejected by Guard 1:\s*/i, '')
        .trim();

      if (
        !cleanMsg ||
        cleanMsg.toLowerCase().includes('analysis failed') ||
        cleanMsg.toLowerCase().includes('failed to analyze')
      ) {
        cleanMsg = isHindi
          ? 'यह एक वैध कानूनी दस्तावेज़ नहीं लगता है। कृपया एक वैध कानूनी समझौता अपलोड करें या पेस्ट करें।'
          : 'this does not appear to be a valid legal document. Please upload or paste a legal agreement.';
      } else {
        const lower = cleanMsg.toLowerCase();
        if (!lower.includes('legal agreement') && !lower.includes('कानूनी')) {
          cleanMsg = isHindi
            ? `${cleanMsg} (कृपया एक वैध कानूनी समझौता अपलोड करें या पेस्ट करें।)`
            : `${cleanMsg}. Please upload or paste a legal agreement.`;
        }
      }

      const prefix = isHindi ? `${docLabel} की तुलना नहीं की जा सकी:` : `${docLabel} could not be compared:`;
      if (!cleanMsg.toLowerCase().includes(docLabel.toLowerCase())) {
        return `${prefix} ${cleanMsg}`;
      }
      return cleanMsg;
    };

    try {
      const textA = activeTextA;
      const textB = activeTextB;
      const docALabel = language === 'hi' ? 'दस्तावेज़ A' : 'Document A';
      const docBLabel = language === 'hi' ? 'दस्तावेज़ B' : 'Document B';

      // Parallelize Document A & Document B Guard 1 legal classification & analysis
      const [resA, resB] = await Promise.allSettled([
        ApiClient.analyzeDocument(textA, docAMode === 'upload' ? docAFile || undefined : undefined, language),
        ApiClient.analyzeDocument(textB, docBMode === 'upload' ? docBFile || undefined : undefined, language),
      ]);

      if (resA.status === 'rejected' && resB.status === 'rejected') {
        const reasonA = resA.reason?.message || String(resA.reason || '');
        const reasonB = resB.reason?.message || String(resB.reason || '');
        const cleanA = formatDocumentRejectReason(reasonA, docALabel);
        const cleanB = formatDocumentRejectReason(reasonB, docBLabel);

        setDocAError(cleanA);
        setDocBError(cleanB);
        setErrorMessage(
          language === 'hi'
            ? `तुलना त्रुटि — दोनों दस्तावेज़ कानूनी सत्यापन में विफल रहे:\n• ${cleanA}\n• ${cleanB}`
            : `Comparison Error — Both documents failed legal validation:\n• ${cleanA}\n• ${cleanB}`
        );
        return;
      }

      if (resA.status === 'rejected') {
        const reasonA = resA.reason?.message || String(resA.reason || '');
        const cleanA = formatDocumentRejectReason(reasonA, docALabel);

        setDocAError(cleanA);
        setDocBError(null); // Document B is valid, preserve Document B!
        setErrorMessage(cleanA);
        return;
      }

      if (resB.status === 'rejected') {
        const reasonB = resB.reason?.message || String(resB.reason || '');
        const cleanB = formatDocumentRejectReason(reasonB, docBLabel);

        setDocAError(null); // Document A is valid, preserve Document A!
        setDocBError(cleanB);
        setErrorMessage(cleanB);
        return;
      }

      // Both documents passed Guard 1 legal classification
      setDocAError(null);
      setDocBError(null);
      const docA = resA.value;
      const docB = resB.value;

      const compRes = await ApiClient.compareDocuments(docA, docB);
      setComparisonResult(compRes);
    } catch (err: any) {
      setErrorMessage(err.message || 'Comparison failed. Please try again.');
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all duration-300 items-start">
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
            <div className="flex items-center justify-between border-b border-[#E7E1D3] pb-3">
              <div className="flex items-center space-x-3">
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
              {(Boolean(docAPastedText || docBPastedText || docAExtractedText || docBExtractedText || comparisonResult || errorMessage)) && (
                <button
                  type="button"
                  onClick={handleResetComparison}
                  className="px-2.5 py-1 text-[11px] font-bold text-[#991B1B] bg-[#FFF5F5] hover:bg-[#FCA5A5]/30 border border-[#FCA5A5] rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Clear inputs and start fresh comparison"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{language === 'hi' ? 'रीसेट करें' : 'Start Fresh'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Document A Slot */}
              <div
                id="doc-a-slot-container"
                className={`space-y-2 p-3.5 rounded-2xl transition-all duration-200 ${effectiveDocAError
                    ? 'bg-[#FFF5F5] border-2 border-[#FCA5A5] ring-4 ring-[#991B1B]/15 shadow-sm'
                    : 'border border-[#E7E1D3]/70 bg-transparent'
                  }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-semibold text-[#B85C38] flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('comparison.doc_a')}</span>
                  </label>

                  <div className="inline-flex p-0.5 rounded-lg bg-[#E7E1D3]/50 border border-[#E7E1D3] text-[10px] font-bold">
                    <button
                      type="button"
                      disabled={hasDocAFile}
                      onClick={() => !hasDocAFile && setDocAMode('paste')}
                      title={
                        hasDocAFile
                          ? language === 'hi'
                            ? 'पाठ चिपकाने के लिए पहले अपलोड की गई फ़ाइल साफ़ करें'
                            : 'Clear uploaded file to paste text instead'
                          : undefined
                      }
                      className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 ${hasDocAFile
                          ? 'opacity-40 cursor-not-allowed text-[#6E6659] select-none'
                          : docAMode === 'paste'
                            ? 'bg-[#B85C38] text-white shadow-xs cursor-pointer'
                            : 'text-[#6E6659] hover:text-[#1E1B17] cursor-pointer'
                        }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>{language === 'hi' ? 'टेक्स्ट पेस्ट करें' : 'Paste Text'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={hasDocAPastedText}
                      onClick={() => !hasDocAPastedText && setDocAMode('upload')}
                      title={
                        hasDocAPastedText
                          ? language === 'hi'
                            ? 'फ़ाइल अपलोड करने के लिए पहले चिपकाया गया पाठ साफ़ करें'
                            : 'Clear pasted text to upload a file instead'
                          : undefined
                      }
                      className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 ${hasDocAPastedText
                          ? 'opacity-40 cursor-not-allowed text-[#6E6659] select-none'
                          : docAMode === 'upload'
                            ? 'bg-[#B85C38] text-white shadow-xs cursor-pointer'
                            : 'text-[#6E6659] hover:text-[#1E1B17] cursor-pointer'
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
                      {docAMode === 'upload' && (docAFile || docAFileName)
                        ? `📄 Doc A: "${docAFile?.name || docAFileName}" (${docAFile ? formatFileSize(docAFile.size) + ' • ' : ''}${docAExtractedText.length} chars)`
                        : `📝 Doc A: Pasted Text (${activeTextA.length} chars)`}
                    </span>
                    {docAMode === 'upload' && (docAFile || docAFileName) && (
                      <button
                        type="button"
                        onClick={handleClearDocA}
                        className="text-[#991B1B] hover:text-[#7F1D1D] ml-1 font-bold cursor-pointer"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {docAMode === 'paste' ? (
                  <div className="space-y-2">
                    <AutoResizeTextarea
                      rows={4}
                      value={docAPastedText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDocAPastedText(val);
                        setDocAError(null);
                        try {
                          sessionStorage.setItem('legallens_doc_a_pasted_text', val);
                        } catch { }
                      }}
                      placeholder={t('comparison.placeholder_a')}
                      className={`w-full bg-[#F6F1E7] border rounded-lg p-3 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38] ${effectiveDocAError ? 'border-[#FCA5A5] bg-[#FFF5F5]' : 'border-[#E7E1D3]'
                        }`}
                    />
                    {effectiveDocAError && (
                      <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-start space-x-2 shadow-xs animate-fade-in-up">
                        <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                        <span className="flex-1 leading-relaxed">{effectiveDocAError}</span>
                      </div>
                    )}
                  </div>
                ) : (() => {
                  const hasActiveDocAFile = Boolean(docAFile || (docAFileName && docAExtractedText));
                  const displayDocAName = docAFile?.name || docAFileName;
                  const displayDocASize = docAFile ? formatFileSize(docAFile.size) : '';

                  return (
                    <div className="space-y-2">
                      {!hasActiveDocAFile ? (
                        <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors bg-[#F6F1E7]/60 group cursor-pointer ${effectiveDocAError ? 'border-[#FCA5A5] bg-[#FFF5F5]' : 'border-[#E7E1D3] hover:border-[#B85C38]'
                          }`}>
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
                        <div className={`border rounded-xl p-3 space-y-2 ${effectiveDocAError ? 'bg-[#FFF5F5] border-[#FCA5A5]' : 'bg-[#F6F1E7] border-[#E7E1D3]'
                          }`}>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2 truncate">
                              <FileCheck2 className="w-4 h-4 text-[#B85C38] shrink-0" />
                              <span className="font-semibold text-[#1E1B17] truncate">{displayDocAName}</span>
                              {displayDocASize && (
                                <span className="text-[10px] text-[#6E6659] shrink-0">({displayDocASize})</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={handleClearDocA}
                              className="p-1 hover:bg-[#E7E1D3] rounded text-[#6E6659] hover:text-[#1E1B17] transition-colors shrink-0"
                              title="Remove file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isExtractingA && (
                            <div className="flex items-center space-x-2 text-xs text-[#B85C38]">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{language === 'hi' ? 'पाठ निकाला जा रहा है...' : 'Extracting document text...'}</span>
                            </div>
                          )}

                          {docAExtractedText && !effectiveDocAError && (
                            <div className="text-[10px] text-[#6E6659] bg-[#FBF8F1] p-2 rounded border border-[#E7E1D3] max-h-24 overflow-y-auto font-mono">
                              {docAExtractedText.slice(0, 300)}...
                            </div>
                          )}
                        </div>
                      )}

                      {effectiveDocAError && (
                        <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-start space-x-2 shadow-xs animate-fade-in-up">
                          <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                          <span className="flex-1 leading-relaxed">{effectiveDocAError}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Document B Slot */}
              <div
                id="doc-b-slot-container"
                className={`space-y-2 p-3.5 rounded-2xl transition-all duration-200 ${effectiveDocBError
                    ? 'bg-[#FFF5F5] border-2 border-[#FCA5A5] ring-4 ring-[#991B1B]/15 shadow-sm'
                    : 'border border-[#E7E1D3]/70 bg-transparent'
                  }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-semibold text-[#B85C38] flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{t('comparison.doc_b')}</span>
                  </label>

                  <div className="inline-flex p-0.5 rounded-lg bg-[#E7E1D3]/50 border border-[#E7E1D3] text-[10px] font-bold">
                    <button
                      type="button"
                      disabled={hasDocBFile}
                      onClick={() => !hasDocBFile && setDocBMode('paste')}
                      title={
                        hasDocBFile
                          ? language === 'hi'
                            ? 'पाठ चिपकाने के लिए पहले अपलोड की गई फ़ाइल साफ़ करें'
                            : 'Clear uploaded file to paste text instead'
                          : undefined
                      }
                      className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 ${hasDocBFile
                          ? 'opacity-40 cursor-not-allowed text-[#6E6659] select-none'
                          : docBMode === 'paste'
                            ? 'bg-[#B85C38] text-white shadow-xs cursor-pointer'
                            : 'text-[#6E6659] hover:text-[#1E1B17] cursor-pointer'
                        }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>{language === 'hi' ? 'टेक्स्ट पेस्ट करें' : 'Paste Text'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={hasDocBPastedText}
                      onClick={() => !hasDocBPastedText && setDocBMode('upload')}
                      title={
                        hasDocBPastedText
                          ? language === 'hi'
                            ? 'फ़ाइल अपलोड करने के लिए पहले चिपकाया गया पाठ साफ़ करें'
                            : 'Clear pasted text to upload a file instead'
                          : undefined
                      }
                      className={`px-2 py-0.5 rounded-md transition-all flex items-center space-x-1 ${hasDocBPastedText
                          ? 'opacity-40 cursor-not-allowed text-[#6E6659] select-none'
                          : docBMode === 'upload'
                            ? 'bg-[#B85C38] text-white shadow-xs cursor-pointer'
                            : 'text-[#6E6659] hover:text-[#1E1B17] cursor-pointer'
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
                      {docBMode === 'upload' && (docBFile || docBFileName)
                        ? `📄 Doc B: "${docBFile?.name || docBFileName}" (${docBFile ? formatFileSize(docBFile.size) + ' • ' : ''}${docBExtractedText.length} chars)`
                        : `📝 Doc B: Pasted Text (${activeTextB.length} chars)`}
                    </span>
                    {docBMode === 'upload' && (docBFile || docBFileName) && (
                      <button
                        type="button"
                        onClick={handleClearDocB}
                        className="text-[#991B1B] hover:text-[#7F1D1D] ml-1 font-bold cursor-pointer"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {docBMode === 'paste' ? (
                  <div className="space-y-2">
                    <AutoResizeTextarea
                      rows={4}
                      value={docBPastedText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDocBPastedText(val);
                        setDocBError(null);
                        try {
                          sessionStorage.setItem('legallens_doc_b_pasted_text', val);
                        } catch { }
                      }}
                      placeholder={t('comparison.placeholder_b')}
                      className={`w-full bg-[#F6F1E7] border rounded-lg p-3 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38] ${effectiveDocBError ? 'border-[#FCA5A5] bg-[#FFF5F5]' : 'border-[#E7E1D3]'
                        }`}
                    />
                    {effectiveDocBError && (
                      <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-start space-x-2 shadow-xs animate-fade-in-up">
                        <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                        <span className="flex-1 leading-relaxed">{effectiveDocBError}</span>
                      </div>
                    )}
                  </div>
                ) : (() => {
                  const hasActiveDocBFile = Boolean(docBFile || (docBFileName && docBExtractedText));
                  const displayDocBName = docBFile?.name || docBFileName;
                  const displayDocBSize = docBFile ? formatFileSize(docBFile.size) : '';

                  return (
                    <div className="space-y-2">
                      {!hasActiveDocBFile ? (
                        <div className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-colors bg-[#F6F1E7]/60 group cursor-pointer ${effectiveDocBError ? 'border-[#FCA5A5] bg-[#FFF5F5]' : 'border-[#E7E1D3] hover:border-[#B85C38]'
                          }`}>
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
                        <div className={`border rounded-xl p-3 space-y-2 ${effectiveDocBError ? 'bg-[#FFF5F5] border-[#FCA5A5]' : 'bg-[#F6F1E7] border-[#E7E1D3]'
                          }`}>
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2 truncate">
                              <FileCheck2 className="w-4 h-4 text-[#B85C38] shrink-0" />
                              <span className="font-semibold text-[#1E1B17] truncate">{displayDocBName}</span>
                              {displayDocBSize && (
                                <span className="text-[10px] text-[#6E6659] shrink-0">({displayDocBSize})</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={handleClearDocB}
                              className="p-1 hover:bg-[#E7E1D3] rounded text-[#6E6659] hover:text-[#1E1B17] transition-colors shrink-0"
                              title="Remove file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {isExtractingB && (
                            <div className="flex items-center space-x-2 text-xs text-[#B85C38]">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>{language === 'hi' ? 'पाठ निकाला जा रहा है...' : 'Extracting document text...'}</span>
                            </div>
                          )}

                          {docBExtractedText && !effectiveDocBError && (
                            <div className="text-[10px] text-[#6E6659] bg-[#FBF8F1] p-2 rounded border border-[#E7E1D3] max-h-24 overflow-y-auto font-mono">
                              {docBExtractedText.slice(0, 300)}...
                            </div>
                          )}
                        </div>
                      )}

                      {effectiveDocBError && (
                        <div className="p-3 rounded-xl bg-[#FFF5F5] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-start space-x-2 shadow-xs animate-fade-in-up">
                          <AlertTriangle className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                          <span className="flex-1 leading-relaxed">{effectiveDocBError}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {isLoading ? (
              <button
                disabled
                className="w-full py-2.5 font-bold text-xs rounded-lg flex items-center justify-center space-x-2 bg-[#D9A391] text-[#FBF8F1] cursor-not-allowed border border-[#C58E7C]/40 shadow-none"
              >
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>{t('comparison.btn_comparing')}</span>
              </button>
            ) : (
              <button
                onClick={handleRunComparison}
                disabled={isCompareDisabled}
                aria-disabled={isCompareDisabled}
                className={`w-full py-2.5 font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 ease-out ${isCompareDisabled
                    ? 'bg-[#D9A391] text-[#FBF8F1]/75 cursor-not-allowed border border-[#C58E7C]/40 shadow-none'
                    : 'bg-[#B85C38] hover:bg-[#9C4B2B] text-white cursor-pointer shadow-xs border border-[#B85C38] active:scale-[0.99]'
                  }`}
              >
                <GitCompare className="w-4 h-4" />
                <span>{t('comparison.btn_compare')}</span>
              </button>
            )}
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
            <div id="comparison-results-container" className="space-y-5 scroll-mt-28">
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
                      className={`p-4 rounded-xl border transition-all ${pair.status === 'matched'
                          ? 'bg-[#F6F1E7] border-[#E7E1D3]'
                          : pair.status === 'a_only'
                            ? 'bg-[#FEF3C7] border-[#FDE68A]'
                            : 'bg-[#F6F1E7] border-[#E7E1D3]'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase text-[#B85C38] bg-[#B85C38]/10 px-2 py-0.5 rounded border border-[#B85C38]/20">
                          {pair.doc_a_clause?.clause_type || pair.doc_b_clause?.clause_type || pair.clause_type}
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
                          <div className="font-bold text-[#1E1B17] mb-1">
                            Doc A: {pair.doc_a_clause ? (pair.doc_a_clause.title || pair.doc_a_clause.clause_type || 'Clause') : '—'}
                          </div>
                          <p className="text-[#6E6659]">
                            {pair.doc_a_clause
                              ? (pair.doc_a_clause.simple_explanation || 'Meaning temporarily unavailable for this clause.')
                              : 'No matching clause in Document A.'}
                          </p>
                        </div>

                        {/* Doc B Side */}
                        <div className="p-3 bg-[#FBF8F1] rounded-lg border border-[#E7E1D3]">
                          <div className="font-bold text-[#1E1B17] mb-1">
                            Doc B: {pair.doc_b_clause ? (pair.doc_b_clause.title || pair.doc_b_clause.clause_type || 'Clause') : '—'}
                          </div>
                          <p className="text-[#6E6659]">
                            {pair.doc_b_clause
                              ? (pair.doc_b_clause.simple_explanation || 'Meaning temporarily unavailable for this clause.')
                              : 'No matching clause in Document B.'}
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
            className="lg:col-span-6 transition-all duration-300 animate-fade-in-up relative lg:sticky lg:top-24 scroll-mt-6"
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
