import ContentBlockRenderer from '../ContentBlockRenderer';
import type { ApiQuestionResponse } from '../../../types/question';

interface Props {
  question: ApiQuestionResponse;
  /** Map of blank_index → answer string */
  answers?: Record<number, string>;
  onChange?: (answers: Record<number, string>) => void;
  readonly?: boolean;
  showAnswer?: boolean;
}

/**
 * Handles FIT, FITS, and FIB question types.
 *
 * FIT/FITS: renders stem text with inline inputs replacing ___ or {{n}} placeholders.
 * FIB:      renders stem normally, then a separate answer box below.
 */
export default function FillViewer({ question, answers = {}, onChange, readonly, showAnswer }: Props) {
  const isFib  = question.question_type === 'fib';
  const isFit  = question.question_type === 'fit';

  function handleChange(idx: number, val: string) {
    onChange?.({ ...answers, [idx]: val });
  }

  if (isFib) {
    return (
      <div className="flex flex-col gap-3">
        <ContentBlockRenderer block={question.stem} />
        <BlankInput
          blankIndex={1}
          value={answers[1] ?? ''}
          onChange={v => handleChange(1, v)}
          readonly={readonly}
          showAnswer={showAnswer}
          accepted={question.blanks[0]?.accepted_answers ?? []}
        />
      </div>
    );
  }

  if (isFit) {
    const text = question.stem?.text ?? '';
    const parts = text.split(/_{2,}/);
    return (
      <div className="flex flex-col gap-2">
        {question.stem && <ContentBlockRenderer block={{ ...question.stem, text: undefined }} />}
        <div className="text-sm text-slate-800 leading-relaxed flex flex-wrap items-center gap-1">
          {parts.map((part, i) => (
            <span key={i} className="inline-flex items-center gap-1 flex-wrap">
              <span>{part}</span>
              {i < parts.length - 1 && (
                <BlankInput
                  blankIndex={1}
                  value={answers[1] ?? ''}
                  onChange={v => handleChange(1, v)}
                  readonly={readonly}
                  showAnswer={showAnswer}
                  accepted={question.blanks[0]?.accepted_answers ?? []}
                  inline
                />
              )}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // FITS — {{1}}, {{2}}...
  const text = question.stem?.text ?? '';
  const parts = text.split(/({{(\d+)}})/g);
  return (
    <div className="flex flex-col gap-2">
      {question.stem && <ContentBlockRenderer block={{ ...question.stem, text: undefined }} />}
      <div className="text-sm text-slate-800 leading-relaxed flex flex-wrap items-center gap-1">
        {parts.map((part, i) => {
          const match = part.match(/^{{(\d+)}}$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            const blank = question.blanks.find(b => b.blank_index === idx);
            return (
              <BlankInput
                key={i}
                blankIndex={idx}
                value={answers[idx] ?? ''}
                onChange={v => handleChange(idx, v)}
                readonly={readonly}
                showAnswer={showAnswer}
                accepted={blank?.accepted_answers ?? []}
                inline
              />
            );
          }
          if (part.match(/^\d+$/) || part === '') return null;
          return <span key={i}>{part}</span>;
        })}
      </div>
    </div>
  );
}

function BlankInput({
  blankIndex, value, onChange, readonly, showAnswer, accepted, inline,
}: {
  blankIndex: number;
  value: string;
  onChange: (v: string) => void;
  readonly?: boolean;
  showAnswer?: boolean;
  accepted: string[];
  inline?: boolean;
}) {
  const trimmed = value.trim().toLowerCase();
  const isCorrect = showAnswer && accepted.some(a => a.toLowerCase() === trimmed);
  const isWrong   = showAnswer && value.trim() !== '' && !isCorrect;

  const base = `border-b-2 text-sm bg-transparent focus:outline-none px-1 text-center min-w-[80px] ${
    isCorrect ? 'border-green-400 text-green-700' :
    isWrong   ? 'border-red-400 text-red-600' :
    'border-slate-400 focus:border-blue-500 text-slate-800'
  }`;

  return (
    <span className={inline ? 'inline-block' : 'block w-full'}>
      {showAnswer && isCorrect ? null : (
        <input
          type="text"
          disabled={readonly}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`[${blankIndex}]`}
          className={base + (inline ? '' : ' w-full py-1')}
        />
      )}
      {showAnswer && (
        <span className="text-xs text-green-700 font-medium ml-1">
          ✓ {accepted[0]}
        </span>
      )}
    </span>
  );
}
