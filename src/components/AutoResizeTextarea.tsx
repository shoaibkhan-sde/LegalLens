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

  return (
    <textarea
      ref={textareaRef}
      value={value}
      rows={rows}
      onChange={(e) => {
        onChange?.(e);
        adjustHeight();
      }}
      className={`resize-none overflow-hidden transition-[height] duration-150 ease-out ${className}`}
      {...props}
    />
  );
};
