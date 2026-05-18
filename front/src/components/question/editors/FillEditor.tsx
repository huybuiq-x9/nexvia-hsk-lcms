import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ContentBlockEditor from '../ContentBlockEditor';
import type { ApiQuestionBlankCreate, ContentBlock } from '../../../types/question';

interface Props {
  questionType: 'fit' | 'fits' | 'fib';
  stem: ContentBlock;
  blanks: ApiQuestionBlankCreate[];
  onStemChange: (b: ContentBlock) => void;
  onBlanksChange: (blanks: ApiQuestionBlankCreate[]) => void;
  onUploadFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?: (file: File) => void;
}

export default function FillEditor({ questionType, stem, blanks, onStemChange, onBlanksChange, onUploadFile, onPendingFile }: Props) {
  const { t } = useTranslation();

  function addAnswer(blankIdx: number, answer: string) {
    onBlanksChange(blanks.map(b =>
      b.blank_index === blankIdx
        ? { ...b, accepted_answers: [...b.accepted_answers, answer] }
        : b
    ));
  }

  function removeAnswer(blankIdx: number, ansIdx: number) {
    onBlanksChange(blanks.map(b =>
      b.blank_index === blankIdx
        ? { ...b, accepted_answers: b.accepted_answers.filter((_, i) => i !== ansIdx) }
        : b
    ));
  }

  function updateAnswer(blankIdx: number, ansIdx: number, val: string) {
    onBlanksChange(blanks.map(b =>
      b.blank_index === blankIdx
        ? { ...b, accepted_answers: b.accepted_answers.map((a, i) => i === ansIdx ? val : a) }
        : b
    ));
  }

  function addBlank() {
    const nextIdx = blanks.length > 0 ? Math.max(...blanks.map(b => b.blank_index)) + 1 : 1;
    onBlanksChange([...blanks, { blank_index: nextIdx, accepted_answers: [''], case_sensitive: false }]);
  }

  function removeBlank(blankIdx: number) {
    onBlanksChange(blanks.filter(b => b.blank_index !== blankIdx));
  }

  const stemHint =
    questionType === 'fit'  ? t('questions.stemPlaceholderFIT') :
    questionType === 'fits' ? t('questions.stemPlaceholderFITS') :
    t('questions.stemPlaceholderFIB');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <ContentBlockEditor
          label={t('questions.stem')}
          value={stem}
          onChange={onStemChange}
          onUploadFile={onUploadFile}
          onPendingFile={onPendingFile}
          placeholder={stemHint}
        />
        <p className="text-xs text-slate-400 mt-1">{stemHint}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">{t('questions.acceptedAnswers')}</label>
          {questionType === 'fits' && (
            <button type="button" onClick={addBlank} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
              <Plus size={12} /> {t('questions.addBlank')}
            </button>
          )}
        </div>

        {blanks.map(blank => (
          <div key={blank.blank_index} className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-600">
                {questionType === 'fits'
                  ? t('questions.blankN', { n: `{{${blank.blank_index}}}` })
                  : t('questions.blank')}
              </span>
              {questionType === 'fits' && blanks.length > 1 && (
                <button type="button" onClick={() => removeBlank(blank.blank_index)} className="text-slate-400 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {blank.accepted_answers.map((ans, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={ans}
                  onChange={e => updateAnswer(blank.blank_index, i, e.target.value)}
                  placeholder={i === 0 ? t('questions.mainAnswer') : t('questions.altAnswer')}
                  className="flex-1 text-sm border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {blank.accepted_answers.length > 1 && (
                  <button type="button" onClick={() => removeAnswer(blank.blank_index, i)} className="text-slate-400 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => addAnswer(blank.blank_index, '')}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 self-start"
            >
              <Plus size={12} /> {t('questions.addAlternative')}
            </button>

            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={blank.case_sensitive}
                onChange={e => onBlanksChange(blanks.map(b =>
                  b.blank_index === blank.blank_index ? { ...b, case_sensitive: e.target.checked } : b
                ))}
                className="rounded"
              />
              {t('questions.caseSensitive')}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
