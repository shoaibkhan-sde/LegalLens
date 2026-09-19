import React, { useRef, useEffect } from 'react';

interface AutoResizeTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

export const AutoResizeTextarea: React.FC<AutoResizeTextareaProps> = ({
  value,
  className = '',
  rows = 3,
  onChange,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Temporarily reset height to auto to compute exact scrollHeight
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  // Recalculate height on container / element width changes (e.g. layout reflow when AI Assistant chat opens/closes)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    let animationFrameId: number;
    let lastWidth = textarea.clientWidth;

    const handleResize = () => {
      if (!textarea) return;
      const currentWidth = textarea.clientWidth;
      if (Math.abs(currentWidth - lastWidth) > 1) {
        lastWidth = currentWidth;
        animationFrameId = requestAnimationFrame(() => {
          adjustHeight();
        });
      }
    };

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        handleResize();
      });
      observer.observe(textarea);
      if (textarea.parentElement) {
        observer.observe(textarea.parentElement);
      }
    }

    window.addEventListener('resize', handleResize);

    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={rows}
      onChange={(e) => {
        onChange?.(e);
        adjustHeight();
      }}
      className={`resize-none overflow-y-auto transition-[height] duration-150 ease-out ${className}`}
      {...props}
    />
  );
};
