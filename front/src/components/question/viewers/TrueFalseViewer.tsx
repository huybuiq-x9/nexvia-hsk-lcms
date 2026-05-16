import ContentBlockRenderer from '../ContentBlockRenderer';
import type { ApiQuestionResponse } from '../../../types/question';

interface Props {
  question: ApiQuestionResponse;
  selected?: boolean | null;
  onChange?: (value: boolean) => void;
  readonly?: boolean;
  showAnswer?: boolean;
}

export default function TrueFalseViewer({ question, selected, onChange, readonly, showAnswer }: Props) {
  const trueChoice  = question.choices.find(c => c.content.text === 'Đúng' || c.content.text === 'True');
  const correctValue = trueChoice?.is_correct === true ? true : false;

  return (
    <div className="flex flex-col gap-3">
      <ContentBlockRenderer block={question.stem} />
      <div className="flex gap-3">
        {[true, false].map(val => {
          const label = val ? 'Đúng' : 'Sai';
          const isSelected = selected === val;
          const isCorrect = showAnswer && correctValue === val;
          const isWrong = showAnswer && isSelected && correctValue !== val;
          return (
            <button
              key={String(val)}
              type="button"
              disabled={readonly}
              onClick={() => onChange?.(val)}
              className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                isCorrect   ? 'bg-green-50 border-green-400 text-green-700' :
                isWrong     ? 'bg-red-50 border-red-400 text-red-600' :
                isSelected  ? 'bg-blue-50 border-blue-500 text-blue-700' :
                'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
              } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
