import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ContentBlockEditor from '../ContentBlockEditor';
import type { ApiQuestionChoiceCreate, ContentBlock } from '../../../types/question';
import { CONTENT_MEDIA_TYPE } from '../../../types/question';

interface Pair {
  left:  ApiQuestionChoiceCreate;
  right: ApiQuestionChoiceCreate;
}

interface Props {
  stem: ContentBlock;
  pairs: Pair[];
  onStemChange: (b: ContentBlock) => void;
  onPairsChange: (pairs: Pair[]) => void;
  onUploadFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?: (file: File) => void;
}

export default function PairMatchEditor({ stem, pairs, onStemChange, onPairsChange, onUploadFile, onPendingFile }: Props) {
  const { t } = useTranslation();

  function addPair() {
    onPairsChange([
      ...pairs,
      {
        left:  { content: { type: CONTENT_MEDIA_TYPE.TEXT, text: '' }, group_name: 'left',  order_index: pairs.length },
        right: { content: { type: CONTENT_MEDIA_TYPE.TEXT, text: '' }, group_name: 'right', order_index: pairs.length },
      },
    ]);
  }

  function removePair(idx: number) {
    onPairsChange(pairs.filter((_, i) => i !== idx));
  }

  function updateSide(idx: number, side: 'left' | 'right', content: ContentBlock) {
    onPairsChange(pairs.map((p, i) => i === idx ? { ...p, [side]: { ...p[side], content } } : p));
  }

  return (
    <div className="flex flex-col gap-4">
      <ContentBlockEditor
        label={t('questions.stem')}
        value={stem}
        onChange={onStemChange}
        onUploadFile={onUploadFile}
        onPendingFile={onPendingFile}
        placeholder={t('questions.stemPlaceholderPAIR')}
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_32px] gap-2">
          <span className="text-xs font-medium text-slate-500">{t('questions.leftCol')}</span>
          <span className="text-xs font-medium text-slate-500">{t('questions.rightCol')}</span>
          <span />
        </div>
        {pairs.map((pair, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-start">
            <ContentBlockEditor
              value={pair.left.content}
              onChange={b => updateSide(idx, 'left', b)}
              placeholder={t('questions.leftPlaceholder')}
            />
            <ContentBlockEditor
              value={pair.right.content}
              onChange={b => updateSide(idx, 'right', b)}
              placeholder={t('questions.rightPlaceholder')}
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
