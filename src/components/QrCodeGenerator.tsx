import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeGeneratorProps {
  url: string;
  size?: number;
  className?: string;
}

export const QrCodeGenerator: React.FC<QrCodeGeneratorProps> = ({
  url,
  size = 180,
  className = '',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setError(false);

    QRCode.toDataURL(url, {
      width: size * 2, // High DPI render
      margin: 2,
      color: {
        dark: '#1E1B17',
        light: '#FFFFFF',
      },
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
        if (isMounted) {
          setError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-[#F6F1E7] border border-[#E7E1D3] rounded-xl flex items-center justify-center text-xs text-[#6E6659] p-4 text-center ${className}`}
      >
        Failed to render QR Code
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-white animate-pulse border border-[#E7E1D3] rounded-xl flex items-center justify-center text-xs text-[#6E6659] ${className}`}
      >
        Generating QR Code...
      </div>
    );
  }

  return (
    <img
      src={qrDataUrl}
      alt="QR code to open LegalLens camera mode on mobile"
      style={{ width: size, height: size }}
      className={`rounded-xl shadow-xs border border-[#E7E1D3] object-contain ${className}`}
    />
  );
};
