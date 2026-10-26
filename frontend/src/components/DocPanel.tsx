import { Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import { copyText, downloadText } from '../download';

export function DocPanel({ text, filename }: { text: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (await copyText(text)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  return (
    <div>
      <div className="mb-2 flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="btn-ghost" onClick={() => downloadText(filename, text, 'text/markdown')}>
          <Download size={15} /> Download .md
        </button>
      </div>
      <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 font-mono text-[13px] leading-relaxed text-slate-800">{text}</pre>
    </div>
  );
}
