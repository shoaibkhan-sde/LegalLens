export const MAX_PDF_PAGES = 30;
export const MAX_PDF_PAGES_ERROR_MSG = "You can upload a PDF with up to 30 pages.";
export const MAX_PDF_PAGES_ERROR_MSG_HI = "आप 30 पृष्ठों तक की PDF अपलोड कर सकते हैं।";

export const MAX_PASTED_WORDS = 12000;
export const MAX_PASTED_WORDS_ERROR_MSG = "You can paste up to 12,000 words.";
export const MAX_PASTED_WORDS_ERROR_MSG_HI = "आप 12,000 शब्दों तक पेस्ट कर सकते हैं।";

/**
 * Counts whitespace-delimited words in a string
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Checks whether pasted text exceeds the max word count limit
 */
export function isWordLimitExceeded(text: string): boolean {
  return countWords(text) > MAX_PASTED_WORDS;
}