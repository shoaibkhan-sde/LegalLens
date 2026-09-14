import React from 'react';

interface FormattedMessageTextProps {
  text: string;
}

export const FormattedMessageText: React.FC<FormattedMessageTextProps> = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks: Array<{ type: 'text' | 'table'; content: string[] }> = [];

  let currentBlock: { type: 'text' | 'table'; content: string[] } | null = null;

  lines.forEach((line) => {
    const trimmed = line.trim();
    const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
    if (isTableLine) {
      if (currentBlock && currentBlock.type === 'table') {
        currentBlock.content.push(line);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'table', content: [line] };
      }
    } else {
      if (currentBlock && currentBlock.type === 'text') {
        currentBlock.content.push(line);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'text', content: [line] };
      }
    }
  });
  if (currentBlock) blocks.push(currentBlock);

  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, bIdx) => {
        if (block.type === 'table') {
          const tableRows = block.content
            .map((r) =>
              r
                .trim()
                .slice(1, -1)
                .split('|')
                .map((cell) => cell.trim())
            )
            .filter((row) => row.length > 0);

          const headers = tableRows[0] || [];
          const dataRows = tableRows.slice(1).filter((r) => !r.every((cell) => /^[:\-\s]+$/.test(cell)));

          return (
            <div key={bIdx} className="my-2.5 overflow-x-auto rounded-lg border border-[#E7E1D3] shadow-2xs">
              <table className="w-full border-collapse text-left text-xs">
                {headers.length > 0 && (
                  <thead>
                    <tr className="bg-[#F6F1E7] border-b border-[#E7E1D3] text-[#1E1B17]">
                      {headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 font-bold border-r last:border-r-0 border-[#E7E1D3]">
                          {h.replace(/\*\*/g, '')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {dataRows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className={rIdx % 2 === 0 ? 'bg-[#FBF8F1]' : 'bg-white'}
                    >
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="px-3 py-2 border-t border-r last:border-r-0 border-[#E7E1D3] text-[#1E1B17]"
                        >
                          {cell.replace(/\*\*/g, '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        const paragraphText = block.content.join('\n');
        const cleanParagraph = paragraphText.replace(/\*\*([^*]+)\*\*/g, '$1');

        return (
          <p key={bIdx} className="whitespace-pre-wrap leading-relaxed">
            {cleanParagraph}
          </p>
        );
      })}
    </div>
  );
};
