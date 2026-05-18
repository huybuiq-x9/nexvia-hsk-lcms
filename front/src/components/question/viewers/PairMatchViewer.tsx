import { useCallback, useEffect, useRef, useState } from 'react';
import ContentBlockRenderer from '../ContentBlockRenderer';
import type { ApiQuestionResponse } from '../../../types/question';

interface Props {
  question: ApiQuestionResponse;
  /** Map of left choice id → right choice id */
  matches?: Record<string, string>;
  onChange?: (matches: Record<string, string>) => void;
  readonly?: boolean;
  showAnswer?: boolean;
}

/**
 * PAIR_MATCH — click left item, then click right item to draw a line.
 * SVG overlay renders the connection lines.
 */
export default function PairMatchViewer({ question, matches = {}, onChange, readonly, showAnswer }: Props) {
  const lefts  = question.choices.filter(c => c.group_name === 'left');
  const rights = question.choices.filter(c => c.group_name === 'right');
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRefs  = useRef<Record<string, HTMLDivElement | null>>({});
  const rightRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number; color: string; leftId: string }>>([]);

  const computeLines = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newLines: typeof lines = [];

    const activeMatches = showAnswer
      ? Object.fromEntries(lefts.map(l => [l.id, l.match_id ?? '']))
      : matches;

    for (const [leftId, rightId] of Object.entries(activeMatches)) {
      if (!rightId) continue;
      const lEl = leftRefs.current[leftId];
      const rEl = rightRefs.current[rightId];
      if (!lEl || !rEl) continue;
      const lRect = lEl.getBoundingClientRect();
      const rRect = rEl.getBoundingClientRect();

      const isCorrect = showAnswer && lefts.find(l => l.id === leftId)?.match_id === rightId;
      const color = showAnswer ? (isCorrect ? '#16a34a' : '#dc2626') : '#3b82f6';

      newLines.push({
        leftId,
        x1: lRect.right - rect.left,
        y1: lRect.top  + lRect.height / 2 - rect.top,
        x2: rRect.left - rect.left,
        y2: rRect.top  + rRect.height / 2 - rect.top,
        color,
      });
    }
    setLines(newLines);
  }, [matches, showAnswer, lefts]);

  useEffect(() => {
    computeLines();
  }, [computeLines]);

  function handleLeftClick(id: string) {
    if (readonly) return;
    setSelected(prev => (prev === id ? null : id));
  }

  function handleRightClick(rightId: string) {
    if (readonly || !selected) return;
    onChange?.({ ...matches, [selected]: rightId });
    setSelected(null);
    setTimeout(computeLines, 50);
  }

  function removeMatch(leftId: string) {
    if (readonly) return;
    const next = { ...matches };
    delete next[leftId];
    onChange?.(next);
    setTimeout(computeLines, 50);
  }

  const usedRights = new Set(Object.values(matches));

  return (
    <div className="flex flex-col gap-3">
      <ContentBlockRenderer block={question.stem} />
      <div ref={containerRef} className="relative grid grid-cols-[1fr_60px_1fr] gap-0">
        {/* Left column */}
        <div className="flex flex-col gap-2 pr-2">
          {lefts.map(l => {
            const isSelected = selected === l.id;
            const matched = matches[l.id];
            const isCorrect = showAnswer && l.match_id === matches[l.id];
            const isWrong   = showAnswer && matched && !isCorrect;
            return (
              <div
                key={l.id}
                ref={el => { leftRefs.current[l.id] = el; }}
                onClick={() => matched ? removeMatch(l.id) : handleLeftClick(l.id)}
                className={`p-2.5 rounded-lg border text-sm cursor-pointer select-none transition-colors ${
                  isCorrect  ? 'bg-green-50 border-green-400' :
                  isWrong    ? 'bg-red-50 border-red-400' :
                  isSelected ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300' :
                  matched    ? 'bg-slate-50 border-slate-300' :
                  'bg-white border-slate-200 hover:border-blue-300'
                }`}
              >
                <ContentBlockRenderer block={l.content} />
              </div>
            );
          })}
        </div>

        {/* SVG connector area */}
        <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
          {lines.map(ln => (
            <line
              key={ln.leftId}
              x1={ln.x1} y1={ln.y1}
              x2={ln.x2} y2={ln.y2}
              stroke={ln.color}
              strokeWidth={2}
              strokeDasharray={showAnswer ? undefined : '5,3'}
            />
          ))}
          {selected && (
            <circle
              cx={leftRefs.current[selected]?.getBoundingClientRect().right ?? 0}
              cy={(leftRefs.current[selected]?.getBoundingClientRect().top ?? 0) +
                  (leftRefs.current[selected]?.getBoundingClientRect().height ?? 0) / 2}
              r={5} fill="#3b82f6"
            />
          )}
        </svg>

        {/* Right column */}
        <div className="flex flex-col gap-2 pl-2">
          {rights.map(r => {
            const isTarget = selected !== null && !usedRights.has(r.id);
            return (
              <div
                key={r.id}
                ref={el => { rightRefs.current[r.id] = el; }}
                onClick={() => handleRightClick(r.id)}
                className={`p-2.5 rounded-lg border text-sm select-none transition-colors ${
                  isTarget ? 'cursor-pointer border-blue-300 bg-blue-50 hover:bg-blue-100' :
                  usedRights.has(r.id) ? 'bg-slate-50 border-slate-200' :
                  'bg-white border-slate-200'
                }`}
              >
                <ContentBlockRenderer block={r.content} />
              </div>
            );
          })}
        </div>
      </div>
      {!readonly && (
        <p className="text-xs text-slate-400">Click ô trái → click ô phải để nối. Click lại ô đã nối để xóa.</p>
      )}
    </div>
  );
}
