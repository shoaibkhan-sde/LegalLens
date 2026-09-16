import fs from 'fs';
import path from 'path';
import { isReadableProse, containsPdfObjectNoise } from '../services/astraBackend';

function extractPdfTextWithZlib(fileBuffer: Buffer): string {
  const rawStr = fileBuffer.toString('latin1');
  const streamMatches = rawStr.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/gi) || [];
  let streamWords: string[] = [];

  streamMatches.forEach((sBlock) => {
    const content = sBlock.replace(/^stream[\r\n]+/i, '').replace(/[\r\n]+endstream$/i, '');
    let decompressedText = content;

    const parenthesized = decompressedText.match(/\(([^()]+)\)/g) || [];
    parenthesized.forEach((p) => {
      const cleanP = p.replace(/[()]/g, '').trim();
      if (cleanP.length > 1) {
        streamWords.push(cleanP);
      }
    });

    const lines = decompressedText.split(/[\r\n]+/);
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (
        trimmed.length > 3 &&
        !trimmed.startsWith('/') &&
        !trimmed.startsWith('<<') &&
        !trimmed.startsWith('>>') &&
        !/^\d+\s+\d+\s+[Robj]/i.test(trimmed)
      ) {
        const cleanLine = trimmed.replace(/\\[0-9]{3}/g, '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleanLine.length > 5) {
          streamWords.push(cleanLine);
        }
      }
    });
  });

  return Array.from(new Set(streamWords)).join(' ').replace(/\s+/g, ' ').trim();
}

const pdfPath = path.resolve(process.cwd(), 'server/src/tests/fixtures/08_loan_agreement.pdf');
const buffer = fs.readFileSync(pdfPath);
const text = extractPdfTextWithZlib(buffer);
console.log('Extracted text:', text);
console.log('isReadableProse:', isReadableProse(text));
console.log('containsPdfObjectNoise:', containsPdfObjectNoise(text));

