import { useState } from 'react';
import { GripVertical } from 'lucide-react';
import ContentBlockRenderer from '../ContentBlockRenderer';
import type { ApiQuestionChoice, ApiQuestionResponse } from '../../../types/question';

interface Props {
  question: ApiQuestionResponse;
  /** current ordering — array of choice ids in user's current order */
  order?: string[];
  onChange?: (order: string[]) => void;
  readonly?: boolean;
  showAnswer?: boolean;
}

export default function SequenceViewer({ question, order, onChange, readonly, showAnswer }: Props) {
  const initial = order?.length
    ? order.map(id => question.choices.find(c => c.id === id)!).filter(Boolean)
    : [...question.choices].sort((a, b) => a.order_index - b.order_index);

  const [items, setItems] = useState<ApiQuestionChoice[]>(initial);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function onDragStart(idx: number) { setDragIdx(idx); }
  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const next = [...items];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(idx, 0, moved);
    setItems(next);
    setDragIdx(idx);
    onChange?.(next.map(c => c.id));
  }
  function onDragEnd() { setDragIdx(null); }

  const correctOrder = showAnswer
    ? [...question.choices].sort((a, b) => (a.correct_order ?? 0) - (b.correct_order ?? 0))
    : null;

  return (
    <div className="flex flex-col gap-3">
      <ContentBlockRenderer block={question.stem} />
      <div className="flex flex-col gap-1.5">
        {items.map((choice, idx) => {
          const correctPos = correctOrder?.findIndex(c => c.id === choice.id) ?? -1;
          const isCorrect  = showAnswer && correctPos === idx;
          const isWrong    = showAnswer && correctPos !== idx;
          return (
            <div
              key={choice.id}
              draggable={!readonly}
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => onDragOver(e, idx)}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-2 p-2.5 rounded-lg border select-none transition-colors ${
                isCorrect ? 'bg-green-50 border-green-400' :
                isWrong   ? 'bg-red-50 border-red-400' :
                'bg-white border-slate-200'
              } ${!readonly ? 'cursor-grab active:cursor-grabbing' : ''}`}
            >
              {!readonly && <GripVertical size={14} className="text-slate-400 shrink-0" />}
              <span className="w-6 h-6 flex items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 shrink-0">
                {idx + 1}
              </span>
              <ContentBlockRenderer block={choice.content} className="flex-1 min-w-0" />
              {showAnswer && (
                <span className="text-xs text-slate-400 shrink-0">→ {correctPos + 1}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
