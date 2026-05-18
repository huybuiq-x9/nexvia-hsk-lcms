import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ContentBlockEditor from '../ContentBlockEditor';
import type { ApiQuestionChoiceCreate, ContentBlock } from '../../../types/question';
import { CONTENT_MEDIA_TYPE } from '../../../types/question';

interface Pair {
  source: ApiQuestionChoiceCreate;
  target: ApiQuestionChoiceCreate;
}

interface Props {
  stem: ContentBlock;
  pairs: Pair[];
  onStemChange: (b: ContentBlock) => void;
  onPairsChange: (pairs: Pair[]) => void;
  onUploadFile?:      (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onUploadImageFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onUploadAudioFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?:      (file: File, localUrl: string) => void;
  onPendingImageFile?: (file: File, localUrl: string) => void;
  onPendingAudioFile?: (file: File, localUrl: string) => void;
}

export default function MatchingEditor({ stem, pairs, onStemChange, onPairsChange, onUploadFile, onUploadImageFile, onUploadAudioFile, onPendingFile, onPendingImageFile, onPendingAudioFile }: Props) {
  const { t } = useTranslation();

  function addPair() {
    onPairsChange([
      ...pairs,
      {
        source: { content: { type: CONTENT_MEDIA_TYPE.TEXT, text: '' }, group_name: 'source', order_index: pairs.length },
        target: { content: { type: CONTENT_MEDIA_TYPE.TEXT, text: '' }, group_name: 'target', order_index: pairs.length },
      },
    ]);
  }

  function removePair(idx: number) {
    onPairsChange(pairs.filter((_, i) => i !== idx));
  }

  function updateSide(idx: number, side: 'source' | 'target', content: ContentBlock) {
    onPairsChange(pairs.map((p, i) => i === idx ? { ...p, [side]: { ...p[side], content } } : p));
  }

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
        placeholder={t('questions.stemPlaceholderMAT')}
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_32px] gap-2">
          <span className="text-xs font-medium text-slate-500">{t('questions.sourceCol')}</span>
          <span className="text-xs font-medium text-slate-500">{t('questions.targetCol')}</span>
          <span />
        </div>
        {pairs.map((pair, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-start">
            <ContentBlockEditor
              value={pair.source.content}
              onChange={b => updateSide(idx, 'source', b)}
              placeholder={t('questions.sourcePlaceholder')}
            />
            <ContentBlockEditor
              value={pair.target.content}
              onChange={b => updateSide(idx, 'target', b)}
              placeholder={t('questions.targetPlaceholder')}
            />
            <button type="button" onClick={() => removePair(idx)} className="mt-1 text-slate-400 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addPair} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mt-1">
          <Plus size={14} /> {t('questions.addPair')}
        </button>
      </div>
    </div>
  );
}

export function flattenMatchingPairs(pairs: Pair[]): ApiQuestionChoiceCreate[] {
  const result: ApiQuestionChoiceCreate[] = [];
  for (const p of pairs) {
    result.push({ ...p.source });
    result.push({ ...p.target });
  }
  return result;
}
