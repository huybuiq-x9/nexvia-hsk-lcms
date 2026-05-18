import { useState } from 'react';
import ContentBlockRenderer from '../ContentBlockRenderer';
import type { ApiQuestionResponse } from '../../../types/question';

interface Props {
  question: ApiQuestionResponse;
  /** Map of source choice id → target choice id */
  matches?: Record<string, string>;
  onChange?: (matches: Record<string, string>) => void;
  readonly?: boolean;
  showAnswer?: boolean;
}

/**
 * MAT — drag source items onto target slots.
 */
export default function MatchingViewer({ question, matches = {}, onChange, readonly, showAnswer }: Props) {
  const sources = question.choices.filter(c => c.group_name === 'source');
  const targets = question.choices.filter(c => c.group_name === 'target');
  const [dragging, setDragging] = useState<string | null>(null);

  // targets that already have a source dropped on them
  const usedTargets = new Set(Object.values(matches));

  function drop(targetId: string) {
    if (!dragging || readonly) return;
    onChange?.({ ...matches, [dragging]: targetId });
    setDragging(null);
  }

  function removeMatch(srcId: string) {
    if (readonly) return;
    const next = { ...matches };
    delete next[srcId];
    onChange?.(next);
  }

  function isCorrectMatch(srcId: string, tgtId: string) {
    const src = sources.find(s => s.id === srcId);
    return src?.match_id === tgtId;
  }

  return (
    <div className="flex flex-col gap-3">
      <ContentBlockRenderer block={question.stem} />
      <div className="grid grid-cols-2 gap-4">
        {/* Sources */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-500">Kéo sang phải</p>
          {sources.map(src => {
            const tgtId = matches[src.id];
            const tgt = targets.find(t => t.id === tgtId);
            const correct = showAnswer && tgtId && isCorrectMatch(src.id, tgtId);
            const wrong   = showAnswer && tgtId && !correct;
            return (
              <div
                key={src.id}
                draggable={!readonly && !tgtId}
                onDragStart={() => setDragging(src.id)}
                onDragEnd={() => setDragging(null)}
                className={`p-2.5 rounded-lg border text-sm transition-colors ${
                  correct ? 'bg-green-50 border-green-400' :
                  wrong   ? 'bg-red-50 border-red-400' :
                  tgtId   ? 'bg-slate-100 border-slate-300' :
                  'bg-white border-slate-200 cursor-grab'
                }`}
              >
                <ContentBlockRenderer block={src.content} />
                {tgt && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-slate-500">→</span>
                    <ContentBlockRenderer block={tgt.content} className="flex-1" />
                    {!readonly && (
                      <button type="button" onClick={() => removeMatch(src.id)} className="text-slate-400 hover:text-red-500 text-xs">✕</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Targets */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-slate-500">Thả vào đây</p>
          {targets.map(tgt => {
            const taken = usedTargets.has(tgt.id);
            return (
              <div
                key={tgt.id}
                onDragOver={e => e.preventDefault()}
                onDrop={() => drop(tgt.id)}
                className={`p-2.5 rounded-lg border text-sm min-h-[44px] transition-colors ${
                  taken ? 'bg-slate-50 border-slate-200' :
                  'border-dashed border-slate-300 hover:border-blue-300'
                }`}
              >
                <ContentBlockRenderer block={tgt.content} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
