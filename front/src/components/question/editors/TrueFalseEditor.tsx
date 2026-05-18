import { useTranslation } from 'react-i18next';
import ContentBlockEditor from '../ContentBlockEditor';
import type { ContentBlock } from '../../../types/question';

interface Props {
  stem: ContentBlock;
  onStemChange: (b: ContentBlock) => void;
  tfCorrect: boolean;
  onTfCorrectChange: (v: boolean) => void;
  onUploadFile?:      (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onUploadImageFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onUploadAudioFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?:      (file: File, localUrl: string) => void;
  onPendingImageFile?: (file: File, localUrl: string) => void;
  onPendingAudioFile?: (file: File, localUrl: string) => void;
}

export default function TrueFalseEditor({ stem, onStemChange, tfCorrect, onTfCorrectChange, onUploadFile, onUploadImageFile, onUploadAudioFile, onPendingFile, onPendingImageFile, onPendingAudioFile }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <ContentBlockEditor
        label={t('questions.stem')}
        value={stem}
        onChange={onStemChange}
        onUploadFile={onUploadFile}
        onUploadImageFile={onUploadImageFile}
        onUploadAudioFile={onUploadAudioFile}
        onPendingFile={onPendingFile}
        onPendingImageFile={onPendingImageFile}
        onPendingAudioFile={onPendingAudioFile}
        placeholder={t('questions.stemPlaceholderTF')}
      />
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-2">{t('questions.correctAnswer')}</label>
        <div className="flex gap-3">
          {([true, false] as const).map(val => (
            <button
              key={String(val)}
              type="button"
              onClick={() => onTfCorrectChange(val)}
              className={`flex-1 flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                tfCorrect === val
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                tfCorrect === val ? 'border-green-500' : 'border-slate-300'
              }`}>
                {tfCorrect === val && <span className="w-2 h-2 rounded-full bg-green-500" />}
              </span>
              {val ? t('questions.answerTrue') : t('questions.answerFalse')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Build choices payload for TF — always 2 fixed choices (values are intentionally language-neutral keys) */
export function buildTFChoices(correctIsTrue: boolean) {
  return [
    { content: { type: 'text' as const, text: 'true'  }, is_correct: correctIsTrue,  order_index: 0 },
    { content: { type: 'text' as const, text: 'false' }, is_correct: !correctIsTrue, order_index: 1 },
  ];
}
