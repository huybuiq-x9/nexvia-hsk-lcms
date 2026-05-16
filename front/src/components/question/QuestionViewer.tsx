import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TrueFalseViewer from './viewers/TrueFalseViewer';
import ChoiceViewer from './viewers/ChoiceViewer';
import FillViewer from './viewers/FillViewer';
import SequenceViewer from './viewers/SequenceViewer';
import MatchingViewer from './viewers/MatchingViewer';
import PairMatchViewer from './viewers/PairMatchViewer';
import ContentBlockRenderer from './ContentBlockRenderer';
import type { ApiQuestionResponse } from '../../types/question';
import { DIFFICULTY_COLORS } from '../../types/question';

export interface QuestionAnswer {
  /** TF: boolean; SC: string; MC: string[]; FIT/FITS/FIB: Record<number,string>; SQ: string[]; MAT/PAIR_MATCH: Record<string,string> */
  value: unknown;
}

interface Props {
  question: ApiQuestionResponse;
  answer?: QuestionAnswer;
  onAnswer?: (answer: QuestionAnswer) => void;
  readonly?: boolean;
  showAnswer?: boolean;
  showMeta?: boolean;
  /** Quiz mode: user submits answer, then sees result + explanation */
  quizMode?: boolean;
  className?: string;
}

function hasAnswer(answer: QuestionAnswer | undefined): boolean {
  if (!answer) return false;
  const v = answer.value;
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return true;
  if (typeof v === 'string') return v !== '';
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v as object).length > 0;
  return false;
}

export default function QuestionViewer({
  question,
  answer,
  onAnswer,
  readonly = false,
  showAnswer = false,
  showMeta = true,
  quizMode = false,
  className = '',
}: Props) {
  const { t } = useTranslation();
  const [submitted,    setSubmitted]    = useState(false);
  const [internalAnswer, setInternalAnswer] = useState<QuestionAnswer | undefined>(undefined);

  // In quizMode without external answer management, use internal state
  const effectiveAnswer  = quizMode && !onAnswer ? internalAnswer  : answer;
  const effectiveSetAnswer = quizMode && !onAnswer
    ? (a: QuestionAnswer) => setInternalAnswer(a)
    : (a: QuestionAnswer) => onAnswer?.(a);

  const isShowingAnswer = showAnswer || (quizMode && submitted);
  const isReadonly      = readonly   || (quizMode && submitted);

  function set(value: unknown) {
    if (quizMode && submitted) return;
    effectiveSetAnswer({ value });
  }

  const inner = (() => {
    switch (question.question_type) {
      case 'tf':
        return (
          <TrueFalseViewer
            question={question}
            selected={effectiveAnswer?.value as boolean | null}
            onChange={set}
            readonly={isReadonly}
            showAnswer={isShowingAnswer}
          />
        );
      case 'sc':
        return (
          <ChoiceViewer
            question={question}
            selected={effectiveAnswer?.value as string}
            onChange={set}
            readonly={isReadonly}
            showAnswer={isShowingAnswer}
          />
        );
      case 'mc':
        return (
          <ChoiceViewer
            question={question}
            selected={effectiveAnswer?.value as string[]}
            onChange={set}
            readonly={isReadonly}
            showAnswer={isShowingAnswer}
          />
        );
      case 'fit':
      case 'fits':
      case 'fib':
        return (
          <FillViewer
            question={question}
            answers={effectiveAnswer?.value as Record<number, string>}
            onChange={set}
            readonly={isReadonly}
            showAnswer={isShowingAnswer}
          />
        );
      case 'sq':
        return (
          <SequenceViewer
            question={question}
            order={effectiveAnswer?.value as string[]}
            onChange={set}
            readonly={isReadonly}
            showAnswer={isShowingAnswer}
          />
        );
      case 'mat':
        return (
          <MatchingViewer
            question={question}
            matches={effectiveAnswer?.value as Record<string, string>}
            onChange={set}
            readonly={isReadonly}
            showAnswer={isShowingAnswer}
          />
        );
      case 'pair_match':
        return (
          <PairMatchViewer
            question={question}
            matches={effectiveAnswer?.value as Record<string, string>}
            onChange={set}
            readonly={isReadonly}
            showAnswer={isShowingAnswer}
          />
        );
      default:
        return <p className="text-sm text-slate-500">{t('questions.unsupported')}</p>;
    }
  })();

  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-3 ${className}`}>
      {showMeta && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
            {t(`questions.type.${question.question_type}`)}
          </span>
          <span className={`text-xs font-medium border px-2 py-0.5 rounded ${DIFFICULTY_COLORS[question.difficulty]}`}>
            {t(`questions.difficulty_${question.difficulty}`)}
          </span>
          {question.tags.map(tag => (
            <span key={tag} className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{tag}</span>
          ))}
        </div>
      )}

      {inner}

      {/* Quiz mode: submit button + result */}
      {quizMode && !submitted && (
        <button
          type="button"
          disabled={!hasAnswer(effectiveAnswer)}
          onClick={() => setSubmitted(true)}
          className="mt-1 w-full py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {t('questions.checkAnswer')}
        </button>
      )}

      {quizMode && submitted && (
        <button
          type="button"
          onClick={() => { setSubmitted(false); setInternalAnswer(undefined); onAnswer?.({ value: undefined }); }}
          className="mt-1 w-full py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {t('questions.retry')}
        </button>
      )}

      {(isShowingAnswer) && question.explanation && (
        <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs font-medium text-amber-700 mb-1">{t('questions.explanationLabel')}</p>
          <ContentBlockRenderer block={question.explanation} />
        </div>
      )}
    </div>
  );
}
