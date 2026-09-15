import React from 'react';
import { SettingsModal } from './SettingsModal';

export { SettingsModal };
export const ApiKeyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  configStatus?: any;
  onConfigUpdated?: any;
}> = ({ isOpen, onClose }) => {
  return <SettingsModal isOpen={isOpen} onClose={onClose} />;
};
