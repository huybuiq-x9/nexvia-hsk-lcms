import { Volume2 } from 'lucide-react';
import type { ContentBlock } from '../../types/question';

interface Props {
  block: ContentBlock | null | undefined;
  className?: string;
}

/**
 * Renders a ContentBlock (text / image / audio / text+image / text+audio).
 * Purely presentational — used by question viewers, previews, exam display.
 */
export default function ContentBlockRenderer({ block, className = '' }: Props) {
  if (!block) return null;

  const hasText  = !!block.text;
  const hasMedia = !!block.media_url || !!block.media_key;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {hasText && (
        <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{block.text}</p>
      )}

      {hasMedia && (block.type === 'image' || block.type === 'text_image') && block.media_url && (
        <img
          src={block.media_url}
          alt={block.original_filename ?? 'image'}
          className="max-w-full max-h-64 rounded-lg border border-slate-200 object-contain"
        />
      )}

      {hasMedia && (block.type === 'audio' || block.type === 'text_audio') && block.media_url && (
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
          <Volume2 size={16} className="text-slate-500 shrink-0" />
          <audio controls className="h-8 flex-1 min-w-0" src={block.media_url}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}
