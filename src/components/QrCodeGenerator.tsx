import React, { useEffect, useRef, useState } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setError(false);

    if (!canvasRef.current) return;

    try {
      // Generate QR matrix with Error Correction Level 'H' (30% data recovery for centered logo)
      const qrData = QRCode.create(url, { errorCorrectionLevel: 'H' });
      if (!isMounted || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scale = 3; // 3x High-DPI canvas resolution
      const canvasWidth = size * scale;
      canvas.width = canvasWidth;
      canvas.height = canvasWidth;

      const modules = qrData.modules;
      const moduleCount = modules.size;
      const padding = Math.floor(canvasWidth * 0.05); // 5% border padding
      const cellSize = (canvasWidth - padding * 2) / moduleCount;

      // 1. Draw Clean Warm Background
      ctx.fillStyle = '#FBF8F1';
      ctx.fillRect(0, 0, canvasWidth, canvasWidth);

      // Helper to check if a cell is inside the 7x7 Finder Pattern corners
      const isFinderPattern = (row: number, col: number) => {
        if (row < 7 && col < 7) return true;
        if (row < 7 && col >= moduleCount - 7) return true;
        if (row >= moduleCount - 7 && col < 7) return true;
        return false;
      };

      // Helper to draw rounded rectangles
      const drawRoundedRect = (
        x: number,
        y: number,
        w: number,
        h: number,
        r: number,
        fillStyle: string
      ) => {
        ctx.beginPath();
        ctx.fillStyle = fillStyle;
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.rect(x, y, w, h);
        }
        ctx.fill();
      };

      // 2. Draw Data Modules as Smooth Terracotta Rounded Dots (#B85C38)
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (modules.get(row, col) && !isFinderPattern(row, col)) {
            const x = padding + col * cellSize;
            const y = padding + row * cellSize;
            const dotSize = cellSize * 0.88;
            const offset = (cellSize - dotSize) / 2;
            const radius = dotSize * 0.38;

            drawRoundedRect(x + offset, y + offset, dotSize, dotSize, radius, '#B85C38');
          }
        }
      }

      // 3. Draw Branded Finder Patterns (Rounded Outer Eye & Inner Core)
      const drawFinderEye = (startRow: number, startCol: number) => {
        const x = padding + startCol * cellSize;
        const y = padding + startRow * cellSize;
        const eyeWidth = 7 * cellSize;
        const outerRadius = eyeWidth * 0.22;

        // Outer Dark Ring (#1E1B17)
        drawRoundedRect(x, y, eyeWidth, eyeWidth, outerRadius, '#1E1B17');

        // Inner Background Cutout (#FBF8F1)
        const innerMargin = cellSize;
        const innerWidth = 5 * cellSize;
        const innerRadius = innerWidth * 0.2;
        drawRoundedRect(
          x + innerMargin,
          y + innerMargin,
          innerWidth,
          innerWidth,
          innerRadius,
          '#FBF8F1'
        );

        // Center Solid Eye (#B85C38)
        const centerMargin = 2 * cellSize;
        const centerWidth = 3 * cellSize;
        const centerRadius = centerWidth * 0.25;
        drawRoundedRect(
          x + centerMargin,
          y + centerMargin,
          centerWidth,
          centerWidth,
          centerRadius,
          '#B85C38'
        );
      };

      drawFinderEye(0, 0); // Top-Left
      drawFinderEye(0, moduleCount - 7); // Top-Right
      drawFinderEye(moduleCount - 7, 0); // Bottom-Left

      // 4. Draw Center LegalLens Brand Badge with Scale Icon
      const badgeSize = canvasWidth * 0.22;
      const badgeX = (canvasWidth - badgeSize) / 2;
      const badgeY = (canvasWidth - badgeSize) / 2;

      // Clear background for logo badge
      drawRoundedRect(badgeX, badgeY, badgeSize, badgeSize, badgeSize * 0.25, '#FBF8F1');

      // Outer border stroke
      ctx.strokeStyle = '#E7E1D3';
      ctx.lineWidth = scale * 1.5;
      ctx.stroke();

      // Inner dark container
      const innerBadgeX = badgeX + scale * 3;
      const innerBadgeY = badgeY + scale * 3;
      const innerBadgeSize = badgeSize - scale * 6;
      drawRoundedRect(
        innerBadgeX,
        innerBadgeY,
        innerBadgeSize,
        innerBadgeSize,
        innerBadgeSize * 0.22,
        '#1E1B17'
      );

      // Vector Scale Motif
      const centerX = canvasWidth / 2;
      const centerY = canvasWidth / 2;
      const iconRadius = innerBadgeSize * 0.26;

      ctx.strokeStyle = '#B85C38';
      ctx.lineWidth = scale * 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Beam
      ctx.beginPath();
      ctx.moveTo(centerX - iconRadius, centerY - iconRadius * 0.2);
      ctx.lineTo(centerX + iconRadius, centerY - iconRadius * 0.2);
      ctx.stroke();

      // Pillar
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - iconRadius * 0.65);
      ctx.lineTo(centerX, centerY + iconRadius * 0.65);
      ctx.stroke();

      // Base
      ctx.beginPath();
      ctx.moveTo(centerX - iconRadius * 0.45, centerY + iconRadius * 0.65);
      ctx.lineTo(centerX + iconRadius * 0.45, centerY + iconRadius * 0.65);
      ctx.stroke();
    } catch (err: any) {
      console.error('Failed to generate styled QR code:', err);
      if (isMounted) setError(true);
    }

    return () => {
      isMounted = false;
    };
  }, [url, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-[#F6F1E7] border border-[#E7E1D3] rounded-2xl flex items-center justify-center text-xs text-[#6E6659] p-4 text-center ${className}`}
      >
        Failed to render QR Code
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center rounded-2xl p-1 bg-[#FBF8F1] border border-[#E7E1D3] shadow-sm overflow-hidden select-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: size - 8, height: size - 8 }}
        draggable="false"
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        className="rounded-xl object-contain select-none pointer-events-none"
      />
    </div>
  );
};

