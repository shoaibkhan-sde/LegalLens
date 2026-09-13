import React, { useState } from 'react';
import { Key, ShieldCheck, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ApiClient } from '../services/apiClient';
import { ServerConfigStatus } from '../types/schemas';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  configStatus: ServerConfigStatus;
  onConfigUpdated: (newStatus: ServerConfigStatus) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  configStatus,
  onConfigUpdated,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmitKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) {
      setErrorMsg('Please enter a valid API key string.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const updatedStatus = await ApiClient.updateApiKey(apiKeyInput.trim());
      onConfigUpdated(updatedStatus);
      setSuccessMsg('API key successfully updated server-side! Astra live mode active.');
      setApiKeyInput('');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update API key.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1E1B17]/60 backdrop-blur-xs p-4">
      <div className="bg-[#FBF8F1] border border-[#E7E1D3] rounded-2xl p-6 max-w-md w-full shadow-lg relative space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#6E6659] hover:text-[#1E1B17]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#B85C38]/10 text-[#B85C38] flex items-center justify-center border border-[#B85C38]/20">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold font-heading text-[#1E1B17]">GPT-6 Astra Key Settings</h2>
            <p className="text-xs text-[#6E6659]">Server-Side In-Memory Key Configuration</p>
          </div>
        </div>

        <div className="bg-[#F6F1E7] rounded-xl p-3.5 border border-[#E7E1D3] text-xs space-y-2 text-[#1E1B17]">
          <div className="flex items-start space-x-2 text-[#065F46]">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Zero Leak Guarantee:</strong> Keys are submitted directly to backend memory via <code>POST /api/config/key</code>. Never stored in browser <code>localStorage</code> or public JS bundles.
            </span>
          </div>
          <div className="text-[#6E6659]">
            Current Status:{' '}
            {configStatus.isConfigured ? (
              <span className="text-[#065F46] font-semibold">Live Astra API Key Active</span>
            ) : (
              <span className="text-[#92400E] font-semibold">Demo Mode (Fallback Sample Engine Active)</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmitKey} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#1E1B17] mb-1.5">
              Enter GPT-6 Astra API Key
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="astra-sk-..."
              className="w-full bg-[#F6F1E7] border border-[#E7E1D3] rounded-lg px-3.5 py-2 text-xs text-[#1E1B17] focus:outline-none focus:border-[#B85C38]"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center space-x-2 text-[#991B1B] text-xs bg-[#FFF5F5] p-2.5 rounded border border-[#FCA5A5]">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2 text-[#065F46] text-xs bg-[#D1FAE5] p-2.5 rounded border border-[#6EE7B7]">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded bg-[#F6F1E7] hover:bg-[#E7E1D3]/60 text-[#1E1B17] text-xs font-semibold border border-[#E7E1D3] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded bg-[#B85C38] hover:bg-[#9C4B2B] text-white text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Saving...' : 'Save Key'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
