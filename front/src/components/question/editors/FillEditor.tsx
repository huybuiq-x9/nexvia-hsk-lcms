import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ContentBlockEditor from '../ContentBlockEditor';
import type { ApiQuestionBlankCreate, ContentBlock } from '../../../types/question';

/** Parse all {{N}} indices from stem text (sorted ascending) */
function parseBlanksFromStem(text: string): number[] {
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  const indices = [...new Set(matches.map(m => parseInt(m[1], 10)))];
  return indices.sort((a, b) => a - b);
}

/** {{N}} → ___ for display in textarea */
function toDisplayText(text: string): string {
  return text.replace(/\{\{\d+\}\}/g, '___');
}

/** ___ (in order) → {{1}}, {{2}}... for storage; preserve existing {{N}} */
function toStoredText(text: string): string {
  let counter = 0;
  return text.replace(/___/g, () => `{{${++counter}}}`);
}

/** Replace {{N}} with ___① ___② for the preview label below the textarea */
function formatStemPreview(text: string): string {
  const circled = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'];
  return text.replace(/\{\{(\d+)\}\}/g, (_, n) => {
    const i = parseInt(n, 10) - 1;
    return `___${i >= 0 && i < circled.length ? circled[i] : n}`;
  });
}

interface Props {
  questionType: 'fit' | 'fits' | 'fib';
  stem: ContentBlock;
  blanks: ApiQuestionBlankCreate[];
  onStemChange: (b: ContentBlock) => void;
  onBlanksChange: (blanks: ApiQuestionBlankCreate[]) => void;
  onUploadFile?:      (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onUploadImageFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onUploadAudioFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?:      (file: File, localUrl: string) => void;
  onPendingImageFile?: (file: File, localUrl: string) => void;
  onPendingAudioFile?: (file: File, localUrl: string) => void;
}

export default function FillEditor({ questionType, stem, blanks, onStemChange, onBlanksChange, onUploadFile, onUploadImageFile, onUploadAudioFile, onPendingFile, onPendingImageFile, onPendingAudioFile }: Props) {
  const { t } = useTranslation();

  function addAnswer(blankIdx: number) {
    onBlanksChange(blanks.map(b =>
      b.blank_index === blankIdx
        ? { ...b, accepted_answers: [...b.accepted_answers, ''] }
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

  function handleStemChange(b: ContentBlock) {
    onStemChange(b);
    if (questionType === 'fits') {
      const indices = parseBlanksFromStem(b.text ?? '');
      const next: ApiQuestionBlankCreate[] = indices.map(idx => {
        const existing = blanks.find(bl => bl.blank_index === idx);
        return existing ?? { blank_index: idx, accepted_answers: [''], case_sensitive: false };
      });
      onBlanksChange(next);
    }
  }

  const isFits = questionType === 'fits';

  const stemHint =
    questionType === 'fit'  ? t('questions.stemPlaceholderFIT') :
    questionType === 'fits' ? t('questions.stemPlaceholderFITS') :
    t('questions.stemPlaceholderFIB');

  const stemPreviewText = isFits && stem.text
    ? formatStemPreview(stem.text)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <ContentBlockEditor
          label={t('questions.stem')}
          value={stem}
          onChange={handleStemChange}
          onUploadFile={onUploadFile}
          onUploadImageFile={onUploadImageFile}
          onUploadAudioFile={onUploadAudioFile}
          onPendingFile={onPendingFile}
          onPendingImageFile={onPendingImageFile}
          onPendingAudioFile={onPendingAudioFile}
          placeholder={stemHint}
          textDisplayTransform={isFits ? toDisplayText : undefined}
          textInputTransform={isFits ? toStoredText : undefined}
        />
        {stemPreviewText ? (
          <p className="text-xs text-blue-600 mt-1 font-medium">{stemPreviewText}</p>
        ) : (
          <p className="text-xs text-slate-400 mt-1">{stemHint}</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="text-xs font-medium text-slate-600">{t('questions.acceptedAnswers')}</label>

        {questionType === 'fits' && blanks.length === 0 && (
          <p className="text-xs text-slate-400 italic">{t('questions.blanksFromStemHint')}</p>
        )}

        {blanks.map(blank => (
          <div key={blank.blank_index} className="rounded-lg border border-slate-200 p-3 flex flex-col gap-2">
            <span className="text-xs font-medium text-slate-600">
              {questionType === 'fits'
                ? t('questions.blankN', { n: `___${['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩'][blank.blank_index - 1] ?? blank.blank_index}` })
                : t('questions.blank')}
            </span>

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
              onClick={() => addAnswer(blank.blank_index)}
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
