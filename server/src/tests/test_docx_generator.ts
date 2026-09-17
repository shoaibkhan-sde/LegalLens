import zlib from 'zlib';
import { extractAndCleanDocumentTextAsync } from '../services/astraBackend.js';

// CRC32 implementation for ZIP generation
function crc32(buf: Buffer): number {
  let table = (crc32 as any).table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    (crc32 as any).table = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipBuffer(files: Record<string, string | Buffer>): Buffer {
  const fileEntries: {
    path: string;
    compressed: Buffer;
    uncompressed: Buffer;
    crc: number;
    offset: number;
  }[] = [];

  const parts: Buffer[] = [];
  let currentOffset = 0;

  for (const [filePath, content] of Object.entries(files)) {
    const uncompressed = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const compressed = zlib.deflateRawSync(uncompressed);
    const crc = crc32(uncompressed);
    const pathBuf = Buffer.from(filePath, 'utf-8');

    const entryOffset = currentOffset;

    // Local Header (30 bytes + path length + compressed length)
    const localHeader = Buffer.alloc(30 + pathBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header sig
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0, 6); // Flags
    localHeader.writeUInt16LE(8, 8); // Compression method: DEFLATE
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14); // CRC-32
    localHeader.writeUInt32LE(compressed.length, 18); // Compressed size
    localHeader.writeUInt32LE(uncompressed.length, 22); // Uncompressed size
    localHeader.writeUInt16LE(pathBuf.length, 26); // Path length
    localHeader.writeUInt16LE(0, 28); // Extra field length
    pathBuf.copy(localHeader, 30);

    parts.push(localHeader, compressed);
    currentOffset += localHeader.length + compressed.length;

    fileEntries.push({
      path: filePath,
      compressed,
      uncompressed,
      crc,
      offset: entryOffset
    });
  }

  const cdOffset = currentOffset;
  let cdSize = 0;

  // Central Directory
  for (const entry of fileEntries) {
    const pathBuf = Buffer.from(entry.path, 'utf-8');
    const cdHeader = Buffer.alloc(46 + pathBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0); // Central header sig
    cdHeader.writeUInt16LE(20, 4); // Version made by
    cdHeader.writeUInt16LE(20, 6); // Version needed
    cdHeader.writeUInt16LE(0, 8); // Flags
    cdHeader.writeUInt16LE(8, 10); // Compression: DEFLATE
    cdHeader.writeUInt16LE(0, 12); // Mod time
    cdHeader.writeUInt16LE(0, 14); // Mod date
    cdHeader.writeUInt32LE(entry.crc, 16); // CRC-32
    cdHeader.writeUInt32LE(entry.compressed.length, 20); // Compressed size
    cdHeader.writeUInt32LE(entry.uncompressed.length, 24); // Uncompressed size
    cdHeader.writeUInt16LE(pathBuf.length, 28); // Path length
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // File comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal attr
    cdHeader.writeUInt32LE(0, 38); // External attr
    cdHeader.writeUInt32LE(entry.offset, 42); // Relative offset
    pathBuf.copy(cdHeader, 46);

    parts.push(cdHeader);
    cdSize += cdHeader.length;
    currentOffset += cdHeader.length;
  }

  // End of Central Directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD sig
  eocd.writeUInt16LE(0, 4); // Disk num
  eocd.writeUInt16LE(0, 6); // CD disk num
  eocd.writeUInt16LE(fileEntries.length, 8); // CD entries on disk
  eocd.writeUInt16LE(fileEntries.length, 10); // Total CD entries
  eocd.writeUInt32LE(cdSize, 12); // CD size
  eocd.writeUInt32LE(cdOffset, 16); // CD offset
  eocd.writeUInt16LE(0, 20); // Comment length

  parts.push(eocd);

  return Buffer.concat(parts);
}

export function createDocxBufferFromText(paragraphs: string[]): Buffer {
  const xmlParagraphs = paragraphs.map(p => `<w:p><w:r><w:t xml:space="preserve">${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`).join('\n');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${xmlParagraphs}
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  return createZipBuffer({
    '[Content_Types].xml': contentTypesXml,
    '_rels/.rels': relsXml,
    'word/document.xml': documentXml,
  });
}

export function extractDocxTextFromZip(fileBuffer: Buffer): string {
  try {
    let offset = 0;
    const documentXmlParts: string[] = [];

    while (offset < fileBuffer.length - 30) {
      // Check for Local File Header signature 0x04034b50 ("PK\x03\x04")
      if (
        fileBuffer[offset] === 0x50 &&
        fileBuffer[offset + 1] === 0x4b &&
        fileBuffer[offset + 2] === 0x03 &&
        fileBuffer[offset + 3] === 0x04
      ) {
        const compMethod = fileBuffer.readUInt16LE(offset + 8);
        const compSize = fileBuffer.readUInt32LE(offset + 18);
        const fileNameLen = fileBuffer.readUInt16LE(offset + 26);
        const extraLen = fileBuffer.readUInt16LE(offset + 28);

        const fileName = fileBuffer.toString('utf-8', offset + 30, offset + 30 + fileNameLen);
        const dataOffset = offset + 30 + fileNameLen + extraLen;

        if (fileName.includes('word/document.xml') || fileName.includes('word/header') || fileName.includes('word/footer')) {
          let xmlContent = '';
          const rawSlice = fileBuffer.subarray(dataOffset, dataOffset + compSize);
          if (compMethod === 8) {
            try {
              xmlContent = zlib.inflateRawSync(rawSlice).toString('utf-8');
            } catch (zErr) {
              try {
                xmlContent = zlib.inflateSync(rawSlice).toString('utf-8');
              } catch (_) {}
            }
          } else if (compMethod === 0) {
            xmlContent = rawSlice.toString('utf-8');
          }

          if (xmlContent) {
            // Extract paragraphs for clean structure with line breaks
            const pMatches = xmlContent.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/gi) || [];
            if (pMatches.length > 0) {
              const paragraphs = pMatches.map(p => {
                const wtMatches = p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
                return wtMatches.map(m => m.replace(/<[^>]+>/g, '')).join('');
              }).filter(p => p.trim().length > 0);
              documentXmlParts.push(paragraphs.join('\n'));
            } else {
              const wtMatches = xmlContent.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi) || [];
              const text = wtMatches.map(m => m.replace(/<[^>]+>/g, '')).join(' ');
              if (text.trim()) documentXmlParts.push(text.trim());
            }
          }
        }

        // Advance to next entry
        offset = dataOffset + compSize;
      } else {
        offset++;
      }
    }

    if (documentXmlParts.length > 0) {
      return documentXmlParts.join('\n\n').trim();
    }
  } catch (err) {
    console.warn('Zip parsing error for DOCX:', err);
  }
  return '';
}

// Quick Test of extractAndCleanDocumentTextAsync on DOCX
async function main() {
  const testParagraphs = [
    'MASTER SERVICES AGREEMENT',
    'This Master Services Agreement ("Agreement") is entered into as of January 1, 2026.',
    '1. SERVICES & OBLIGATIONS: Provider agrees to deliver software engineering services.',
    '2. PAYMENT TERMS: Client shall pay invoices within 30 days of receipt.',
    '3. CONFIDENTIALITY: Both parties agree to protect proprietary information.'
  ];
  const docxBuf = createDocxBufferFromText(testParagraphs);
  console.log(`Generated DOCX buffer size: ${docxBuf.length} bytes`);
  const extracted = extractDocxTextFromZip(docxBuf);
  console.log(`Extracted Text Result (${extracted.length} chars):\n${extracted}`);
}

if (process.argv[1]?.includes('test_docx_generator')) {
  main().catch(console.error);
}
