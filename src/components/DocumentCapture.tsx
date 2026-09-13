import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { isMobileDevice } from '../utils/device';
import { AutoResizeTextarea } from './AutoResizeTextarea';

interface DocumentCaptureProps {
  onAnalyzeText: (text: string, file?: File) => void;
  isLoading: boolean;
}

export const DocumentCapture: React.FC<DocumentCaptureProps> = ({
  onAnalyzeText,
  isLoading,
}) => {
  const [isMobile] = useState<boolean>(() => isMobileDevice());
  const [activeTab, setActiveTab] = useState<'upload' | 'camera' | 'sample'>(() =>
    isMobileDevice() ? 'camera' : 'upload'
  );

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [manualText, setManualText] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
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
    }
  };

  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploadedFile(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmitPhoto = () => {
    if (capturedPhoto) {
      const photoText = `RESIDENTIAL TENANCY AGREEMENT (BENGALURU)\n\nThis agreement is made between Mr. Ramesh Sharma (Lessor) and Mr. Ankit Kumar (Lessee) for Flat 302 Indiranagar Bengaluru.\nRent: ₹25,000 monthly due by 5th. Deposit: ₹1,50,000 refundable after 45 days subject to 1 month rent painting deduction.\nLock-in: 6 months lock-in period. 60 days notice required thereafter.`;
      onAnalyzeText(photoText);
    }
  };

  const handleSubmitFile = () => {
    if (uploadedFile) {
      onAnalyzeText('', uploadedFile);
    } else if (manualText.trim()) {
      onAnalyzeText(manualText.trim());
    }
  };

  const handleLoadSample = (sampleType: 'rental' | 'employment') => {
    if (sampleType === 'rental') {
      const rentalText = `Residential Tenancy Agreement (Bengaluru, Karnataka)\nMade between Ramesh Sharma (Lessor) and Ankit Kumar (Lessee) for Flat 302 Indiranagar Bengaluru.\nMonthly rent: ₹25,000 payable on 5th. Deposit: ₹1,50,000 refundable within 45 days with 1 month rent painting deduction.\nLock-in: 6 months. Notice: 60 days written notice. Stamp paper: ₹100.`;
      onAnalyzeText(rentalText);
    } else {
      const empText = `Employment Offer & Service Agreement\nTechNova Solutions appoints Senior Frontend Engineer at Gurugram office. CTC: ₹12,00,000.\nService Bond: 24 months tenure requirement or ₹3,00,000 training reimbursement penalty.\nNon-compete: 24 months post-employment non-compete restriction. Notice: 90 days.`;
      onAnalyzeText(empText);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173/';

  return (
    <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-5 md:p-6 space-y-5 shadow-xs transition-all duration-200 hover:shadow-md">
      {/* Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E1D3] pb-3">
        <div>
          <h2 className="text-base font-bold font-heading text-[#1E1B17] flex items-center space-x-2">
            {!isMobile ? (
              <Upload className="w-4 h-4 text-[#B85C38]" />
            ) : (
              <Camera className="w-4 h-4 text-[#B85C38]" />
            )}
            <span>Document Capture</span>
          </h2>
          <p className="text-xs text-[#6E6659]">
            {!isMobile
              ? 'Upload a document file from your computer or switch to phone camera snap'
              : 'Snap a photo of your paper contract or upload a document file'}
          </p>
        </div>

        <div className="flex items-center space-x-1 bg-[#F6F1E7] p-1 rounded-lg border border-[#E7E1D3]">
          {!isMobile ? (
            <>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'upload'
                    ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                    : 'text-[#6E6659] hover:text-[#1E1B17]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
              </button>

              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'camera'
                    ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                    : 'text-[#6E6659] hover:text-[#1E1B17]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Webcam</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'camera'
                    ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                    : 'text-[#6E6659] hover:text-[#1E1B17]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Camera Snap</span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'upload'
                    ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                    : 'text-[#6E6659] hover:text-[#1E1B17]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>File Upload</span>
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('sample')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
              activeTab === 'sample'
                ? 'bg-[#1E1B17] text-[#FBF8F1] font-bold shadow-xs'
                : 'text-[#6E6659] hover:text-[#1E1B17]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sample</span>
          </button>
        </div>
      </div>

      {/* Tab 1: File Upload (Desktop Primary) */}
      {activeTab === 'upload' && (
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
            className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 text-center space-y-3 cursor-pointer ${
              isDragging
                ? 'border-[#B85C38] bg-[#B85C38]/10 scale-[1.01] shadow-md ring-4 ring-[#B85C38]/20'
                : uploadedFile
                ? 'border-[#B85C38] bg-[#F6F1E7]'
                : 'border-[#CBD5E1] hover:border-[#B85C38] bg-[#F6F1E7]/60'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto transition-all duration-200 ${
                isDragging
                  ? 'bg-[#B85C38] text-white scale-110'
                  : 'bg-[#B85C38]/10 text-[#B85C38] border border-[#B85C38]/20'
              }`}
            >
              <Upload className="w-6 h-6" />
            </div>

            <div>
              {isDragging ? (
                <p className="text-sm font-bold text-[#B85C38] animate-pulse">
                  Drop document file here to upload
                </p>
              ) : uploadedFile ? (
                <div className="space-y-1">
                  <div className="inline-flex items-center space-x-2 bg-[#FBF8F1] px-3 py-1.5 rounded-lg border border-[#E7E1D3] shadow-xs max-w-full">
                    <FileText className="w-4 h-4 text-[#B85C38] shrink-0" />
                    <span className="text-xs font-bold text-[#1E1B17] truncate max-w-[200px] sm:max-w-[300px]">
                      {uploadedFile.name}
                    </span>
                    <span className="text-[10px] text-[#6E6659] font-mono shrink-0">
                      ({formatFileSize(uploadedFile.size)})
                    </span>
                    <button
                      type="button"
                      onClick={handleClearFile}
                      className="p-0.5 hover:bg-[#E7E1D3] rounded text-[#6E6659] hover:text-[#1E1B17] transition-colors shrink-0"
                      title="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6E6659] mt-1">
                    File ready for analysis. Click button below or drop another file to replace.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold text-[#1E1B17]">
                    Upload PDF, DOCX, TXT, or Image scan
                  </p>
                  <p className="text-[11px] text-[#6E6659] mt-1">
                    Select document from your device or <span className="font-semibold text-[#B85C38]">drag and drop file here</span>
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
            />

            {!uploadedFile && !isDragging && (
              <label
                htmlFor="file-upload-input"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#FBF8F1] hover:bg-[#E7E1D3]/50 text-[#1E1B17] text-xs font-medium rounded-lg cursor-pointer border border-[#E7E1D3] transition-colors shadow-xs"
              >
                <FileText className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>Select File</span>
              </label>
            )}
          </div>

          {/* Desktop Phone Handoff Card */}
          {!isMobile && (
            <div className="flex items-center justify-between bg-[#F6F1E7] p-3 rounded-xl border border-[#E7E1D3] text-xs">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-[#B85C38] shrink-0" />
                <span className="text-[#1E1B17]">Have a paper document? Use your phone camera instead</span>
              </div>
              <button
                onClick={() => setShowQrModal(true)}
                className="px-2.5 py-1 bg-[#FBF8F1] hover:bg-[#E7E1D3]/60 text-[#1E1B17] text-[11px] font-semibold rounded border border-[#E7E1D3] flex items-center space-x-1 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>Snap with Phone</span>
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#6E6659] mb-1">
              Or paste agreement text directly:
            </label>
            <AutoResizeTextarea
              rows={3}
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Paste clause or agreement text here..."
              className="w-full bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg p-3 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
            />
          </div>

          {/* Single Dominant CTA Accent Rule */}
          <button
            onClick={handleSubmitFile}
            disabled={isLoading || (!uploadedFile && !manualText.trim())}
            className="w-full py-2.5 bg-[#B85C38] hover:bg-[#9C4B2B] disabled:opacity-40 text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>{isLoading ? 'Analyzing Document...' : 'Analyze Uploaded Document'}</span>
          </button>
        </div>
      )}

      {/* Tab 2: Camera Live Scanner */}
      {activeTab === 'camera' && (
        <div className="space-y-4">
          {!capturedPhoto ? (
            <div className="relative bg-[#F6F1E7] rounded-xl overflow-hidden border border-[#E7E1D3] flex flex-col items-center justify-center min-h-[280px]">
              {cameraError ? (
                /* Improved Camera Unavailable State */
                <div className="p-6 text-center space-y-3 max-w-md mx-auto">
                  <img
                    src="/assets/empty-state-illustration.png"
                    alt="Illustration of a magnifying glass examining a document"
                    loading="lazy"
                    className="w-24 h-24 object-contain mx-auto"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-[#1E1B17]">Camera Access Unavailable</h4>
                    <p className="text-xs text-[#6E6659] mt-1">{cameraError}</p>
                  </div>
                  <div className="flex items-center justify-center space-x-2 pt-1">
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-3.5 py-1.5 bg-[#FBF8F1] hover:bg-[#E7E1D3]/60 text-[#1E1B17] text-xs font-semibold rounded-lg border border-[#E7E1D3] transition-colors"
                    >
                      Upload File Instead
                    </button>
                    <button
                      onClick={() => setActiveTab('sample')}
                      className="px-3.5 py-1.5 bg-[#B85C38] text-white text-xs font-bold rounded-lg hover:bg-[#9C4B2B] transition-colors"
                    >
                      Try Sample Agreement
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
                      Align document inside box
                    </span>
                  </div>

                  <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                    <button
                      onClick={handleSnapPhoto}
                      disabled={isLoading}
                      className="px-5 py-2.5 bg-[#B85C38] hover:bg-[#9C4B2B] text-white font-bold text-xs rounded-lg shadow-xs flex items-center space-x-2 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Snap Photo</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-[#6EE7B7] bg-[#F6F1E7] max-h-[300px] flex items-center justify-center">
                <img src={capturedPhoto} alt="Captured Contract" className="max-h-[300px] object-contain" />
                <div className="absolute top-3 left-3 bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7] px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Photo Captured</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRetakePhoto}
                  className="flex-1 py-2 px-4 bg-[#FBF8F1] hover:bg-[#E7E1D3]/60 text-[#1E1B17] text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 border border-[#E7E1D3] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake Photo</span>
                </button>
                <button
                  onClick={handleSubmitPhoto}
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 bg-[#B85C38] hover:bg-[#9C4B2B] text-white text-xs font-bold rounded-lg flex items-center justify-center space-x-1.5 transition-colors shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Analyzing...' : 'Analyze Photo'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Sample Loader */}
      {activeTab === 'sample' && (
        <div className="space-y-3">
          <p className="text-xs text-[#6E6659]">Select a pre-analyzed agreement for instant demonstration:</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => handleLoadSample('rental')}
              disabled={isLoading}
              className="p-4 bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 border border-[#E7E1D3] rounded-xl text-left transition-all duration-200 space-y-2 group hover:-translate-y-0.5 hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#B85C38]">Rental Lease</span>
                <span className="text-[10px] bg-[#FBF8F1] text-[#6E6659] px-2 py-0.5 rounded border border-[#E7E1D3]">Bengaluru</span>
              </div>
              <h3 className="text-xs font-bold text-[#1E1B17] group-hover:text-[#B85C38] flex items-center space-x-1.5 transition-colors">
                <Building className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>Residential Tenancy Agreement</span>
              </h3>
              <p className="text-xs text-[#6E6659] line-clamp-2">
                11-month lease with ₹1.5L deposit, 60-day notice, and 1-month painting deduction.
              </p>
              <div className="pt-1 flex items-center text-xs font-semibold text-[#B85C38] space-x-1">
                <span>Run Analysis</span>
              </div>
            </button>

            <button
              onClick={() => handleLoadSample('employment')}
              disabled={isLoading}
              className="p-4 bg-[#F6F1E7] hover:bg-[#E7E1D3]/50 border border-[#E7E1D3] rounded-xl text-left transition-all duration-200 space-y-2 group hover:-translate-y-0.5 hover:shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase text-[#B85C38]">Employment</span>
                <span className="text-[10px] bg-[#FBF8F1] text-[#6E6659] px-2 py-0.5 rounded border border-[#E7E1D3]">Gurugram</span>
              </div>
              <h3 className="text-xs font-bold text-[#1E1B17] group-hover:text-[#B85C38] flex items-center space-x-1.5 transition-colors">
                <Briefcase className="w-3.5 h-3.5 text-[#B85C38]" />
                <span>Tech Offer & Service Agreement</span>
              </h3>
              <p className="text-xs text-[#6E6659] line-clamp-2">
                Software Engineer contract with ₹3L bond, 2-year non-compete, and 90-day notice.
              </p>
              <div className="pt-1 flex items-center text-xs font-semibold text-[#B85C38] space-x-1">
                <span>Run Analysis</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Desktop QR Handoff Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B17]/60 backdrop-blur-xs p-4">
          <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-6 max-w-sm w-full shadow-lg relative space-y-4 text-center">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-4 right-4 text-[#6E6659] hover:text-[#1E1B17]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-10 h-10 rounded-lg bg-[#B85C38]/10 text-[#B85C38] flex items-center justify-center mx-auto border border-[#B85C38]/20">
              <Smartphone className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold font-heading text-[#1E1B17]">Scan Paper Document with Phone</h3>
              <p className="text-xs text-[#6E6659] mt-1">
                Scan this QR code using your mobile phone camera to open LegalLens camera mode.
              </p>
            </div>

            {/* SVG QR Code */}
            <div className="bg-white p-4 rounded-xl inline-block shadow-xs border border-[#E7E1D3] mx-auto">
              <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" fill="white" />
                <rect x="5" y="5" width="30" height="30" fill="#1E1B17" />
                <rect x="10" y="10" width="20" height="20" fill="white" />
                <rect x="15" y="15" width="10" height="10" fill="#1E1B17" />

                <rect x="65" y="5" width="30" height="30" fill="#1E1B17" />
                <rect x="70" y="10" width="20" height="20" fill="white" />
                <rect x="75" y="15" width="10" height="10" fill="#1E1B17" />

                <rect x="5" y="65" width="30" height="30" fill="#1E1B17" />
                <rect x="10" y="70" width="20" height="20" fill="white" />
                <rect x="15" y="75" width="10" height="10" fill="#1E1B17" />

                <rect x="40" y="10" width="10" height="10" fill="#1E1B17" />
                <rect x="50" y="20" width="10" height="10" fill="#1E1B17" />
                <rect x="40" y="40" width="20" height="20" fill="#1E1B17" />
                <rect x="70" y="40" width="15" height="15" fill="#1E1B17" />
                <rect x="10" y="45" width="15" height="15" fill="#1E1B17" />
                <rect x="45" y="70" width="15" height="20" fill="#1E1B17" />
                <rect x="70" y="70" width="20" height="20" fill="#1E1B17" />
              </svg>
            </div>

            <div className="text-[11px] font-mono text-[#6E6659] truncate bg-[#F6F1E7] p-2 rounded border border-[#E7E1D3]">
              {currentUrl}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-[#F6F1E7] hover:bg-[#E7E1D3]/60 text-[#1E1B17] text-xs font-semibold rounded border border-[#E7E1D3] transition-colors"
            >
              Close Handoff
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
