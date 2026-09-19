import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Building,
  Briefcase,
  Smartphone,
  QrCode,
  X,
  CameraOff,
  XCircle,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';
import { isMobileDevice } from '../utils/device';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import { QrCodeGenerator } from './QrCodeGenerator';

import { ActiveInputContext } from '../types/schemas';
import { ApiClient } from '../services/apiClient';
import { useLanguage } from '../context/LanguageContext';
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

import { saveStorage, loadStorage, clearFeatureStorage } from '../utils/persistence';

interface DocumentCaptureProps {
  onAnalyzeText: (text: string, file?: File, source?: 'user' | 'sample') => void;
  isLoading: boolean;
  hasCompletedAnalysis?: boolean;
  onInputContextChange?: (context: ActiveInputContext) => void;
  onCancelAnalysis?: () => void;
  activeTab?: 'upload' | 'camera' | 'sample';
  onTabChange?: (tab: 'upload' | 'camera' | 'sample') => void;
  onClearUserAnalysis?: () => void;
  onClearSampleAnalysis?: () => void;
}

export const DocumentCapture: React.FC<DocumentCaptureProps> = ({
  onAnalyzeText,
  isLoading,
  hasCompletedAnalysis = false,
  onInputContextChange,
  onCancelAnalysis,
  activeTab: propActiveTab,
  onTabChange,
  onClearUserAnalysis,
  onClearSampleAnalysis,
}) => {
  const { language, t } = useLanguage();
  const [isMobile, setIsMobile] = useState<boolean>(() => isMobileDevice());
  const [internalActiveTab, setInternalActiveTab] = useState<'upload' | 'camera' | 'sample'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'camera' || window.location.hash === '#camera') {
        return 'camera';
      }
    }
    return loadStorage<'upload' | 'camera' | 'sample'>('legallens_analyze_tab', 'upload');
  });

  const activeTab = propActiveTab || internalActiveTab;

  const setActiveTab = (tab: 'upload' | 'camera' | 'sample') => {
    setInternalActiveTab(tab);
    saveStorage('legallens_analyze_tab', tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Clean ?mode=camera and #camera from URL immediately on initial load to prevent re-triggering on refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const url = new URL(window.location.href);
      let urlChanged = false;

      if (url.searchParams.has('mode')) {
        url.searchParams.delete('mode');
        urlChanged = true;
      }

      if (url.hash === '#camera') {
        url.hash = '';
        urlChanged = true;
      }

      if (urlChanged) {
        const cleanUrl = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
        window.history.replaceState(window.history.state, '', cleanUrl);
      }
    } catch (err) {
      console.warn('Failed to clean URL parameters:', err);
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const mobileState = isMobileDevice();
      setIsMobile(mobileState);
      if (!mobileState && activeTab === 'camera') {
        setActiveTab('upload');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileName, setUploadedFileNameState] = useState<string>(() => {
    return loadStorage<string>('legallens_analyze_file_name', '');
  });
  const setUploadedFileName = (name: string) => {
    setUploadedFileNameState(name);
    saveStorage('legallens_analyze_file_name', name);
  };

  const [uploadedFileSize, setUploadedFileSizeState] = useState<string>(() => {
    return loadStorage<string>('legallens_analyze_file_size', '');
  });
  const setUploadedFileSize = (size: string) => {
    setUploadedFileSizeState(size);
    saveStorage('legallens_analyze_file_size', size);
  };

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [manualText, setManualTextState] = useState<string>(() => {
    return loadStorage<string>('legallens_analyze_pasted_text', '');
  });
  const setManualText = (val: string) => {
    setManualTextState(val);
    saveStorage('legallens_analyze_pasted_text', val);
    if (!val.trim()) {
      clearFeatureStorage('legallens_analyze_pasted_text');
      if (!uploadedFile && !uploadedFileName && !capturedPhoto) {
        if (onClearUserAnalysis) {
          onClearUserAnalysis();
        }
      }
    }
  };

  const [extractedFileText, setExtractedFileTextState] = useState<string>(() => {
    return loadStorage<string>('legallens_analyze_extracted_text', '');
  });
  const setExtractedFileText = (val: string) => {
    setExtractedFileTextState(val);
    saveStorage('legallens_analyze_extracted_text', val);
  };
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Extract inner file content / text automatically when a file is selected using unified single OCR & Parsing pipeline
  useEffect(() => {
    if (!uploadedFile) {
      // Do not wipe extractedFileText on page refresh if stored file metadata exists
      return;
    }

    setUploadedFileName(uploadedFile.name);
    setUploadedFileSize(formatFileSize(uploadedFile.size));

    const processUploadedFile = async () => {
      const isPdfFile = uploadedFile.type.includes('pdf') || uploadedFile.name.toLowerCase().endsWith('.pdf');
      if (isPdfFile) {
        try {
          const arrayBuffer = await uploadedFile.arrayBuffer();
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          if (pdfDoc.isEncrypted) {
            setExtractedFileText("Password-protected PDF detected. Please upload an unencrypted document.");
            return;
          }
          const pageCount = pdfDoc.getPageCount();
          if (pageCount > MAX_PDF_PAGES) {
            setExtractedFileText(MAX_PDF_PAGES_ERROR_MSG);
            return;
          }
        } catch {
          // If load fails on client, backend authoritative check is the source of truth
        }
      }

      try {
        const res = await ApiClient.extractPreviewText(uploadedFile);
        if (res.text && res.text.trim().length > 10) {
          setExtractedFileText(res.text);
        } else {
          setExtractedFileText(
            res.error || "I couldn't read this document's text — try re-uploading, or use a clearer photo/scan"
          );
        }
      } catch {
        setExtractedFileText(
          "I couldn't read this document's text — try re-uploading, or use a clearer photo/scan"
        );
      }
    };

    processUploadedFile();
  }, [uploadedFile]);

  const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  useEffect(() => {
    if (!capturedPhoto) return;

    const processCapturedPhoto = async () => {
      try {
        const photoFile = dataURLtoFile(capturedPhoto, 'camera_snapshot.png');
        const res = await ApiClient.extractPreviewText(photoFile);
        if (res.text && res.text.trim().length > 10) {
          setExtractedFileText(res.text);
        } else {
          setExtractedFileText(
            res.error || "I couldn't read this document's text — try re-uploading, or use a clearer photo/scan"
          );
        }
      } catch {
        setExtractedFileText(
          "I couldn't read this document's text — try re-uploading, or use a clearer photo/scan"
        );
      }
    };

    processCapturedPhoto();
  }, [capturedPhoto]);

  useEffect(() => {
    if (onInputContextChange) {
      const activeFileName = uploadedFile?.name || uploadedFileName;
      const activeFileSize = uploadedFile ? formatFileSize(uploadedFile.size) : uploadedFileSize;
      const hasActiveFile = Boolean(uploadedFile || (uploadedFileName && extractedFileText));

      onInputContextChange({
        uploadedFileName: activeFileName || undefined,
        uploadedFileType: uploadedFile?.type,
        uploadedFileSize: activeFileSize || undefined,
        pastedText: manualText.trim() || undefined,
        extractedInputText: extractedFileText.trim() || undefined,
        capturedPhoto: !!capturedPhoto,
        hasInput: hasActiveFile || !!capturedPhoto || !!manualText.trim(),
      });
    }
  }, [uploadedFile, uploadedFileName, uploadedFileSize, manualText, capturedPhoto, extractedFileText, onInputContextChange]);

  useEffect(() => {
    if (activeTab === 'camera' && !capturedPhoto) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, capturedPhoto]);

  const startCamera = async () => {
    setCameraError('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access unavailable on this device. You can upload a document file or try a sample agreement.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleSnapPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
    if (onClearUserAnalysis) {
      onClearUserAnalysis();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setUploadedFileName(file.name);
      setUploadedFileSize(formatFileSize(file.size));
      if (onClearUserAnalysis) {
        onClearUserAnalysis();
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setUploadedFile(droppedFile);
      setUploadedFileName(droppedFile.name);
      setUploadedFileSize(formatFileSize(droppedFile.size));
      if (onClearUserAnalysis) {
        onClearUserAnalysis();
      }
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
    setUploadedFileName('');
    setUploadedFileSize('');
    setExtractedFileText('');
    clearFeatureStorage('legallens_analyze_file');
    clearFeatureStorage('legallens_analyze_extracted');
    if (onClearUserAnalysis) {
      onClearUserAnalysis();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileStatusMessage = () => {
    if (isLoading) {
      return language === 'hi'
        ? 'दस्तावेज़ का विश्लेषण किया जा रहा है... कृपया प्रतीक्षा करें।'
        : 'Analyzing document... Please wait while our AI audits key terms.';
    }
    if (hasCompletedAnalysis) {
      return language === 'hi'
        ? 'विश्लेषण पूर्ण। पूर्ण परिणाम नीचे प्रदर्शित हैं। नई फ़ाइल बदलने और फिर से विश्लेषण करने के लिए यहाँ डालें।'
        : 'Analysis complete. Full results displayed below. Drop another file to replace and re-analyze.';
    }
    return t('capture.file_ready');
  };

  const getPastedTextStatusMessage = () => {
    if (isLoading) {
      return language === 'hi'
        ? 'पाठ का विश्लेषण किया जा रहा है... कृपया प्रतीक्षा करें।'
        : 'Analyzing pasted text... Please wait while our AI audits key terms.';
    }
    if (hasCompletedAnalysis) {
      return language === 'hi'
        ? 'विश्लेषण पूर्ण। पूर्ण परिणाम नीचे प्रदर्शित हैं। नया विश्लेषण शुरू करने के लिए पाठ संपादित करें।'
        : 'Analysis complete. Full results displayed below. Edit text to re-analyze.';
    }
    return language === 'hi'
      ? 'पाठ विश्लेषण के लिए तैयार है। नीचे दिए गए बटन पर क्लिक करें।'
      : 'Pasted text ready for analysis. Click button below to analyze.';
  };

  const handleSubmitPhoto = () => {
    if (capturedPhoto) {
      try {
        const photoFile = dataURLtoFile(capturedPhoto, 'camera_snapshot.png');
        onAnalyzeText('', photoFile, 'user');
      } catch (err) {
        console.warn('Failed to convert captured photo to File:', err);
        onAnalyzeText(extractedFileText || '', undefined, 'user');
      }
    }
  };

  const handleSubmitFile = () => {
    if (uploadedFile) {
      onAnalyzeText('', uploadedFile, 'user');
    } else if (extractedFileText && (uploadedFileName || Boolean(extractedFileText.trim()))) {
      onAnalyzeText(extractedFileText, undefined, 'user');
    } else if (manualText.trim()) {
      onAnalyzeText(manualText.trim(), undefined, 'user');
    }
  };

  const [selectedSample, setSelectedSampleState] = useState<'rental' | 'employment' | null>(() => {
    return loadStorage<'rental' | 'employment' | null>('legallens_sample_selected_type', null);
  });
  const setSelectedSample = (type: 'rental' | 'employment' | null) => {
    setSelectedSampleState(type);
    saveStorage('legallens_sample_selected_type', type);
  };

  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      try {
        const savedSampleResult = localStorage.getItem('legallens_sample_analyze_result');
        if (!savedSampleResult || savedSampleResult === 'null') {
          setSelectedSampleState(null);
          localStorage.removeItem('legallens_sample_selected_type');
        }
      } catch {}
    }
  }, [isLoading]);

  const handleClearSample = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedSample(null);
    clearFeatureStorage('legallens_sample_');
    if (onClearSampleAnalysis) {
      onClearSampleAnalysis();
    }
  };

  const handleLoadSample = (sampleType: 'rental' | 'employment') => {
    if (selectedSample === sampleType) {
      return;
    }
    setSelectedSample(sampleType);
    if (sampleType === 'rental') {
      const rentalText = `RESIDENTIAL TENANCY AGREEMENT (BENGALURU, KARNATAKA)

This Agreement is made on this 1st day of April 2026, by and between Mr. Ramesh Sharma (Lessor) and Mr. Ankit Kumar (Lessee).

1. PREMISES & LEASE TERM
The Lessor agrees to rent Flat 302, Green Acres Apartment, Indiranagar, Bengaluru to the Lessee for a period of 11 months starting 1st April 2026.

2. RENT AND PAYMENT SCHEDULE
The Monthly rent shall be Rs. 25,000 payable on or before the 5th of each calendar month. A late payment penalty of 5% per week shall apply after the 5th.

3. SECURITY DEPOSIT & REFUND CONDITIONS
The Lessee shall pay an interest-free Security Deposit of Rs. 1,50,000. The Security Deposit shall be returned to the Lessee after 45 days of vacating, subject to deduction of 1 month rent for painting and cleaning.

4. LOCK-IN PERIOD AND EARLY TERMINATION
There shall be a mandatory lock-in period of 6 months. If the Lessee vacates prior to completion of the lock-in period, the entire Security Deposit of Rs. 1,50,000 shall be forfeited as a penalty.

5. MAINTENANCE AND UTILITY CHARGES
The Lessee shall pay monthly society maintenance charges of Rs. 3,500 and all electricity/water bills directly to the respective authorities.

6. USE OF PREMISES & SUBLETTING RESTRICTION
The premises shall be used exclusively for residential purposes by the Lessee and immediate family. Subletting or commercial use is strictly prohibited.

7. ALTERATIONS & PROPERTY FITTINGS
The Lessee shall not make any structural alterations, paint walls, or drive heavy nails without prior written permission from the Lessor.

8. LANDLORD ENTRY & INSPECTION RIGHTS
The Lessor reserves the right to enter and inspect the premises with 24 hours prior notice during reasonable hours.

9. INDEMNITY & DAMAGE LIABILITY
The Lessee agrees to defend, indemnify, and hold harmless the Lessor against all legal claims, damages, or liabilities arising from Lessee's stay.`;
      onAnalyzeText(rentalText, undefined, 'sample');
    } else {
      const empText = `Employment Offer & Service Agreement\nTechNova Solutions appoints Senior Frontend Engineer at Gurugram office. CTC: ₹12,00,000.\nService Bond: 24 months tenure requirement or ₹3,00,000 training reimbursement penalty.\nNon-compete: 24 months post-employment non-compete restriction. Notice: 90 days.`;
      onAnalyzeText(empText, undefined, 'sample');
    }
  };

  const handoffUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?mode=camera`
    : 'http://localhost:5173/?mode=camera';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(handoffUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn('Failed to copy link:', err);
    }
  };

  useEffect(() => {
    if (showQrModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showQrModal]);

  return (
    <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 space-y-5 shadow-xs transition-all duration-200 hover:shadow-md">
      {/* Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1D3] pb-3">
        <div>
          <h2 className="text-base font-bold font-heading text-[#1E1B17] flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#B85C38]" />
            <span>{t('capture.title')}</span>
          </h2>
          <p className="text-xs text-[#6E6659]">
            {t('capture.subtitle')}
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-[#F6F1E7] p-1 rounded-lg border border-[#E7E1D3]">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${activeTab === 'upload'
                ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                : 'text-[#6E6659] hover:text-[#1E1B17]'
              }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('capture.tab_upload')}</span>
          </button>

          {isMobile && (
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${activeTab === 'camera'
                  ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                  : 'text-[#6E6659] hover:text-[#1E1B17]'
                }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{t('capture.tab_camera')}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('sample')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${activeTab === 'sample'
                ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                : 'text-[#6E6659] hover:text-[#1E1B17]'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('capture.tab_sample')}</span>
          </button>
        </div>
      </div>

      {/* Tab 1: File Upload (Desktop Primary) */}
      {activeTab === 'upload' && (() => {
        const hasActiveUploadedFile = Boolean(uploadedFile || (uploadedFileName && extractedFileText));
        const displayFileName = uploadedFile?.name || uploadedFileName;
        const displayFileSize = uploadedFile ? formatFileSize(uploadedFile.size) : uploadedFileSize;

        return (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                const input = document.getElementById('file-upload-input');
                if (input) input.click();
              }}
              className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center space-y-3 cursor-pointer ${isDragging
                  ? 'border-[#B85C38] bg-[#B85C38]/10 scale-[1.01] shadow-md ring-4 ring-[#B85C38]/20'
                  : hasActiveUploadedFile
                    ? 'border-[#B85C38] bg-[#F6F1E7]'
                    : 'border-[#CBD5E1] hover:border-[#B85C38] bg-[#F6F1E7]/60'
                }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all duration-200 ${isDragging
                    ? 'bg-[#B85C38] text-white scale-110'
                    : 'bg-[#B85C38]/10 text-[#B85C38] border border-[#B85C38]/20'
                  }`}
              >
                <Upload className="w-6 h-6" />
              </div>

              <div>
                {isDragging ? (
                  <p className="text-sm font-bold text-[#B85C38] animate-pulse">
                    {t('capture.drop_prompt')}
                  </p>
                ) : hasActiveUploadedFile ? (
                  <div className="space-y-1">
                    <div className="inline-flex items-center space-x-2 bg-[#FBF8F1] px-3 py-1.5 rounded-lg border border-[#E7E1D3] shadow-xs max-w-full">
                      <FileText className="w-4 h-4 text-[#B85C38] shrink-0" />
                      <span className="text-xs font-bold text-[#1E1B17] truncate max-w-[200px] sm:max-w-[300px]">
                        {displayFileName}
                      </span>
                      {displayFileSize && (
                        <span className="text-[10px] text-[#6E6659] font-mono shrink-0">
                          ({displayFileSize})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={handleClearFile}
                        className="p-0.5 hover:bg-[#E7E1D3] rounded text-[#6E6659] hover:text-[#1E1B17] transition-colors shrink-0"
                        title={t('capture.remove_file')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#6E6659] mt-1">
                      {getFileStatusMessage()}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-[#1E1B17]">
                      {t('capture.upload_heading')}
                    </p>
                    <p className="text-[11px] text-[#6E6659] mt-1">
                      {t('capture.upload_subtext')}
                    </p>
                  </>
                )}
              </div>

              <input
                type="file"
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
                name="fileUpload"
              />

              {!hasActiveUploadedFile && !isDragging && (
                <label
                  htmlFor="file-upload-input"
                  onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#FBF8F1] hover:bg-[#E7E1D3]/50 text-[#1E1B17] text-xs font-medium rounded-lg cursor-pointer border border-[#E7E1D3] transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>{t('capture.select_file')}</span>
              </label>
            )}
          </div>

          {/* Desktop Phone Handoff Card (Only shown on Desktop/Laptop screens) */}
          {!isMobile && (
            <div className="hidden md:flex items-center justify-between bg-[#F6F1E7] p-3 rounded-xl border border-[#E7E1D3] text-xs shadow-xs">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-[#B85C38] shrink-0" />
                <span className="text-[#1E1B17] font-medium">{t('capture.phone_prompt')}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="group px-2.5 py-1 bg-[#FBF8F1] hover:bg-[#B85C38] text-[#1E1B17] hover:text-white text-[11px] font-semibold rounded border border-[#E7E1D3] hover:border-[#B85C38] flex items-center space-x-1 transition-all duration-200 shrink-0 cursor-pointer shadow-xs"
              >
                <QrCode className="w-3.5 h-3.5 text-[#B85C38] group-hover:text-white transition-colors" />
                <span>{t('capture.snap_phone')}</span>
              </button>
            </div>
          )}

          {/* Mobile Direct Native Camera Input Card (Only shown on Mobile & Tablet devices) */}
          {isMobile && (
            <div className="flex items-center justify-between bg-[#F6F1E7] p-3 rounded-xl border border-[#E7E1D3] text-xs">
              <div className="flex items-center space-x-2">
                <Camera className="w-4 h-4 text-[#B85C38] shrink-0" />
                <span className="text-[#1E1B17]">Snap document directly using your phone camera</span>
              </div>
              <input
                type="file"
                id="mobile-native-camera-input"
                name="cameraUpload"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => {
                  const camInput = document.getElementById('mobile-native-camera-input');
                  if (camInput) camInput.click();
                }}
                className="px-3 py-1.5 bg-[#B85C38] hover:bg-[#9C4B2B] text-white text-xs font-bold rounded border border-[#B85C38] flex items-center space-x-1.5 transition-colors shrink-0 cursor-pointer shadow-xs"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Take Photo</span>
              </button>
            </div>
          )}

            <div>
              <label htmlFor="manual-text-input" className="block text-xs font-medium text-[#6E6659] mb-1">
                {t('capture.paste_label')}
              </label>
              <AutoResizeTextarea
                id="manual-text-input"
                name="manualText"
                rows={3}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder={t('capture.paste_placeholder')}
                className={`w-full bg-[#F6F1E7] border rounded-lg p-3 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38] ${
                  isWordLimitExceeded(manualText) ? 'border-[#FCA5A5] bg-[#FFF5F5]' : 'border-[#E7E1D3]'
                }`}
              />
              {manualText.trim() && !hasActiveUploadedFile && !isWordLimitExceeded(manualText) && (
                <p className="text-[11px] text-[#6E6659] mt-1">
                  {getPastedTextStatusMessage()}
                </p>
              )}
              {isWordLimitExceeded(manualText) && (
                <div className="mt-2 p-3 rounded-xl bg-[#FFF5F5] border border-[#FCA5A5] text-[#991B1B] text-xs font-semibold flex items-start space-x-2 shadow-xs animate-fade-in-up">
                  <AlertCircle className="w-4 h-4 text-[#991B1B] shrink-0 mt-0.5" />
                  <span className="flex-1 leading-relaxed">
                    {language === 'hi' ? MAX_PASTED_WORDS_ERROR_MSG_HI : MAX_PASTED_WORDS_ERROR_MSG}
                  </span>
                </div>
              )}
            </div>

            {/* Single Dominant CTA Accent Rule */}
            {(() => {
              const isWordExceeded = isWordLimitExceeded(manualText);
              const isPdfExceeded =
                extractedFileText === MAX_PDF_PAGES_ERROR_MSG ||
                extractedFileText === MAX_PDF_PAGES_ERROR_MSG_HI ||
                extractedFileText.includes('30 pages') ||
                extractedFileText.includes('30 पृष्ठों');
              const isAnalyzeDisabled =
                isLoading ||
                (!hasActiveUploadedFile && !manualText.trim()) ||
                isWordExceeded ||
                isPdfExceeded;

              if (isLoading) {
                return (
                  <button
                    disabled
                    className="w-full py-2.5 font-bold text-xs rounded-lg flex items-center justify-center space-x-2 bg-[#D9A391] text-[#FBF8F1] cursor-not-allowed border border-[#C58E7C]/40 shadow-none"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>{t('capture.btn_analyzing')}</span>
                  </button>
                );
              }

              return (
                <button
                  onClick={handleSubmitFile}
                  disabled={isAnalyzeDisabled}
                  aria-disabled={isAnalyzeDisabled}
                  className={`w-full py-2.5 font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition-all duration-200 ease-out ${
                    isAnalyzeDisabled
                      ? 'bg-[#D9A391] text-[#FBF8F1]/75 cursor-not-allowed border border-[#C58E7C]/40 shadow-none'
                      : 'bg-[#B85C38] hover:bg-[#9C4B2B] text-white cursor-pointer shadow-xs border border-[#B85C38] active:scale-[0.99]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>{t('capture.btn_analyze')}</span>
                </button>
              );
            })()}
          </div>
        );
      })()}

      {/* Tab 2: Camera Live Scanner */}
      {isMobile && activeTab === 'camera' && (
        <div className="space-y-4">
          {!capturedPhoto ? (
            <div className="relative bg-[#F6F1E7] rounded-xl overflow-hidden border border-[#E7E1D3] flex flex-col items-center justify-center min-h-[280px]">
              {cameraError ? (
                /* Improved Camera Unavailable State */
                <div className="p-6 text-center space-y-3 max-w-md mx-auto">
                  <img
                    src="/assets/empty-state-illustration.png"
                    alt="Illustration of a magnifying glass examining a document"
                    width={96}
                    height={96}
                    loading="lazy"
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                    onContextMenu={(e) => e.preventDefault()}
                    onMouseDown={(e) => e.preventDefault()}
                    onDoubleClick={(e) => e.preventDefault()}
                    onTouchStart={(e) => e.preventDefault()}
                    onTouchMove={(e) => e.preventDefault()}
                    className="w-24 h-24 object-contain mx-auto select-none pointer-events-none"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#1E1B17]">{t('capture.camera_unavailable_title')}</h4>
                    <p className="text-xs text-[#6E6659] mt-1">{t('capture.camera_unavailable_sub')}</p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-3.5 py-1.5 bg-[#FBF8F1] hover:bg-[#E7E1D3]/60 text-[#1E1B17] text-xs font-semibold rounded-lg border border-[#E7E1D3] transition-colors cursor-pointer"
                    >
                      {t('capture.upload_file_instead')}
                    </button>
                    <button
                      onClick={() => setActiveTab('sample')}
                      className="px-3.5 py-1.5 bg-[#B85C38] text-white text-xs font-bold rounded-lg hover:bg-[#9C4B2B] transition-colors cursor-pointer"
                    >
                      {t('capture.try_sample_agreement')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full max-h-[340px] object-cover rounded-xl"
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Framing Overlay */}
                  <div className="absolute inset-5 border border-dashed border-[#B85C38]/60 rounded-lg pointer-events-none flex items-center justify-center">
                    <span className="bg-[#FBF8F1]/90 px-3 py-1 rounded text-[11px] font-medium text-[#1E1B17] border border-[#E7E1D3]">
                      {t('capture.align_box')}
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <button
                      onClick={handleSnapPhoto}
                      disabled={isLoading}
                      className="px-5 py-2.5 bg-[#B85C38] hover:bg-[#9C4B2B] text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{t('capture.snap_photo')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-[#6EE7B7] bg-[#F6F1E7] max-h-[300px] flex items-center justify-center">
                <img
                  src={capturedPhoto}
                  alt="Captured Contract"
                  draggable="false"
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  onMouseDown={(e) => e.preventDefault()}
                  onDoubleClick={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onTouchMove={(e) => e.preventDefault()}
                  className="max-h-[300px] object-contain select-none pointer-events-none"
                />
                <div className="absolute top-3 left-3 bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7] px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('capture.photo_captured')}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRetakePhoto}
                  className="flex-1 py-2 px-4 bg-[#FBF8F1] hover:bg-[#E7E1D3]/60 text-[#1E1B17] text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 border border-[#E7E1D3] transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('capture.retake_photo')}</span>
                </button>
                {(() => {
                  const isPhotoDisabled = isLoading || !capturedPhoto;
                  return (
                    <button
                      onClick={handleSubmitPhoto}
                      disabled={isPhotoDisabled}
                      aria-disabled={isPhotoDisabled}
                      className={`flex-1 py-2 px-4 font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-all duration-200 ease-out ${isPhotoDisabled
                          ? 'bg-[#D9A391] text-[#FBF8F1]/75 cursor-not-allowed border border-[#C58E7C]/40 shadow-none'
                          : 'bg-[#B85C38] hover:bg-[#9C4B2B] text-white cursor-pointer shadow-xs border border-[#B85C38] active:scale-[0.99]'
                        }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{isLoading ? t('capture.analyzing_photo') : t('capture.analyze_photo')}</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sample Loader */}
      {activeTab === 'sample' && (
        <div className="space-y-3">
          <p className="text-xs text-[#6E6659]">{t('capture.sample_prompt')}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleLoadSample('rental')}
              disabled={isLoading}
              className={`p-4 rounded-xl text-left transition-all duration-200 space-y-2 group cursor-pointer relative ${
                selectedSample === 'rental'
                  ? 'border-2 border-[#B85C38] bg-[#FBF8F1] ring-4 ring-[#B85C38]/15 shadow-md'
                  : 'border border-[#E7E1D3] bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 hover:-translate-y-0.5 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#B85C38]">{t('capture.sample_rental_badge')}</span>
                {selectedSample === 'rental' && !isLoading ? (
                  <span
                    onClick={(e) => handleClearSample(e)}
                    className="px-2 py-0.5 text-[10px] font-bold text-[#991B1B] bg-[#FFF5F5] hover:bg-[#FCA5A5]/40 border border-[#FCA5A5] rounded-md transition-all flex items-center space-x-1 cursor-pointer"
                    title={language === 'hi' ? 'नमूना विश्लेषण हटाएं' : 'Remove sample analysis'}
                  >
                    <X className="w-3 h-3" />
                    <span>{language === 'hi' ? 'नमूना हटाएं' : 'Remove Sample'}</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#FBF8F1] text-[#6E6659] px-2 py-0.5 rounded border border-[#E7E1D3]">{t('capture.city_bengaluru')}</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-[#1E1B17] group-hover:text-[#B85C38] flex items-center space-x-1.5 transition-colors">
                <Building className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>{t('capture.sample_rental_title')}</span>
              </h3>
              <p className="text-xs text-[#6E6659] line-clamp-2">
                {t('capture.sample_rental_desc')}
              </p>
              <div className="pt-1 flex items-center text-xs font-semibold text-[#B85C38] space-x-1">
                <span>{t('capture.run_analysis')}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleLoadSample('employment')}
              disabled={isLoading}
              className={`p-4 rounded-xl text-left transition-all duration-200 space-y-2 group cursor-pointer relative ${
                selectedSample === 'employment'
                  ? 'border-2 border-[#B85C38] bg-[#FBF8F1] ring-4 ring-[#B85C38]/15 shadow-md'
                  : 'border border-[#E7E1D3] bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 hover:-translate-y-0.5 hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#B85C38]">{t('capture.sample_emp_badge')}</span>
                {selectedSample === 'employment' && !isLoading ? (
                  <span
                    onClick={(e) => handleClearSample(e)}
                    className="px-2 py-0.5 text-[10px] font-bold text-[#991B1B] bg-[#FFF5F5] hover:bg-[#FCA5A5]/40 border border-[#FCA5A5] rounded-md transition-all flex items-center space-x-1 cursor-pointer"
                    title={language === 'hi' ? 'नमूना विश्लेषण हटाएं' : 'Remove sample analysis'}
                  >
                    <X className="w-3 h-3" />
                    <span>{language === 'hi' ? 'नमूना हटाएं' : 'Remove Sample'}</span>
                  </span>
                ) : (
                  <span className="text-[10px] bg-[#FBF8F1] text-[#6E6659] px-2 py-0.5 rounded border border-[#E7E1D3]">{t('capture.city_gurugram')}</span>
                )}
              </div>
              <h3 className="text-xs font-bold text-[#1E1B17] group-hover:text-[#B85C38] flex items-center space-x-1.5 transition-colors">
                <Briefcase className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>{t('capture.sample_emp_title')}</span>
              </h3>
              <p className="text-xs text-[#6E6659] line-clamp-2">
                {t('capture.sample_emp_desc')}
              </p>
              <div className="pt-1 flex items-center text-xs font-semibold text-[#B85C38] space-x-1">
                <span>{t('capture.run_analysis')}</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Desktop QR Handoff Modal (Rendered via Portal into document.body to prevent containing block breaking) */}
      {showQrModal &&
        createPortal(
          <div className="fixed inset-0 w-full h-full z-50 flex items-center justify-center p-4 sm:p-6 bg-[#17140F]/65 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
            <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-6 max-w-sm w-full shadow-2xl relative space-y-4 text-center my-auto max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
              <button
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-4 text-[#6E6659] hover:text-[#1E1B17] p-1 rounded-lg hover:bg-[#E7E1D3]/60 transition-colors cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 rounded-xl bg-[#B85C38]/10 text-[#B85C38] flex items-center justify-center mx-auto border border-[#B85C38]/20">
                <Smartphone className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-bold font-heading text-[#1E1B17]">{t('capture.qr_title')}</h3>
                <p className="text-xs text-[#6E6659] mt-1">
                  {t('capture.qr_sub')}
                </p>
              </div>

              {/* Dynamic Scannable QR Code */}
              <div className="flex justify-center py-1">
                <QrCodeGenerator url={handoffUrl} size={180} />
              </div>

              <div className="flex items-center space-x-2 bg-[#F6F1E7] p-2 rounded-lg border border-[#E7E1D3]">
                <div className="text-[11px] font-mono text-[#6E6659] truncate flex-1 text-left">
                  {handoffUrl}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-[#FBF8F1] hover:bg-[#E7E1D3] text-[#1E1B17] text-[11px] font-semibold rounded border border-[#E7E1D3] flex items-center space-x-1 shrink-0 transition-colors cursor-pointer"
                  title="Copy camera handoff link"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">{t('capture.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#B85C38]" />
                      <span>{t('capture.copy')}</span>
                    </>
                  )}
                </button>
              </div>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 bg-[#F6F1E7] hover:bg-[#E7E1D3]/60 text-[#1E1B17] text-xs font-semibold rounded border border-[#E7E1D3] transition-colors cursor-pointer"
              >
                {t('capture.close_handoff')}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
