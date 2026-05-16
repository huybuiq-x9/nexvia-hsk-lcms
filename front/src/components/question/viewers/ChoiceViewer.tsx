import ContentBlockRenderer from '../ContentBlockRenderer';
import type { ApiQuestionResponse } from '../../../types/question';

interface Props {
  question: ApiQuestionResponse;
  /** SC: string (choice id) | MC: string[] */
  selected?: string | string[];
  onChange?: (value: string | string[]) => void;
  readonly?: boolean;
  showAnswer?: boolean;
}

export default function ChoiceViewer({ question, selected, onChange, readonly, showAnswer }: Props) {
  const isMulti = question.question_type === 'mc';
  const selectedIds: string[] = Array.isArray(selected)
    ? selected
    : selected ? [selected] : [];

  function toggle(id: string) {
    if (readonly) return;
    if (isMulti) {
      const next = selectedIds.includes(id)
        ? selectedIds.filter(s => s !== id)
        : [...selectedIds, id];
      onChange?.(next);
    } else {
      onChange?.(id);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ContentBlockRenderer block={question.stem} />
      <div className="flex flex-col gap-2">
        {question.choices.map((choice, idx) => {
          const isSelected = selectedIds.includes(choice.id);
          const isCorrect  = showAnswer && !!choice.is_correct;
          const isWrong    = showAnswer && isSelected && !choice.is_correct;
          return (
            <button
              key={choice.id}
              type="button"
              disabled={readonly}
              onClick={() => toggle(choice.id)}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                isCorrect  ? 'bg-green-50 border-green-400' :
                isWrong    ? 'bg-red-50 border-red-400' :
                isSelected ? 'bg-blue-50 border-blue-500' :
                'bg-white border-slate-200 hover:border-blue-300'
              } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <span className={`shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold border ${
                isCorrect  ? 'bg-green-500 border-green-500 text-white' :
                isWrong    ? 'bg-red-500 border-red-500 text-white' :
                isSelected ? 'bg-blue-500 border-blue-500 text-white' :
                'border-slate-300 text-slate-500'
              }`}>
                {String.fromCharCode(65 + idx)}
              </span>
              <ContentBlockRenderer block={choice.content} className="flex-1 min-w-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
