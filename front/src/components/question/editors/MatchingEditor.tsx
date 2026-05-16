import { Plus, Trash2 } from 'lucide-react';
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
  onUploadFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?: (file: File) => void;
}

/**
 * MAT editor — edit pairs side by side.
 * Caller flattens pairs → choices array (with group_name + match_id) before submitting.
 */
export default function MatchingEditor({ stem, pairs, onStemChange, onPairsChange, onUploadFile, onPendingFile }: Props) {
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
        label="Câu hỏi"
        value={stem}
        onChange={onStemChange}
        onUploadFile={onUploadFile}
        onPendingFile={onPendingFile}
        placeholder="Nhập yêu cầu kéo thả..."
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_32px] gap-2">
          <span className="text-xs font-medium text-slate-500">Nguồn (trái)</span>
          <span className="text-xs font-medium text-slate-500">Đích (phải)</span>
          <span />
        </div>
        {pairs.map((pair, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-start">
            <ContentBlockEditor
              value={pair.source.content}
              onChange={b => updateSide(idx, 'source', b)}
              placeholder="Mục nguồn..."
            />
            <ContentBlockEditor
              value={pair.target.content}
              onChange={b => updateSide(idx, 'target', b)}
              placeholder="Mục đích..."
            />
            <button type="button" onClick={() => removePair(idx)} className="mt-1 text-slate-400 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addPair} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mt-1">
          <Plus size={14} /> Thêm cặp
        </button>
      </div>
    </div>
  );
}

/** Flatten pairs → choices array with group_name + temporary match_id placeholders */
export function flattenMatchingPairs(pairs: Pair[]): ApiQuestionChoiceCreate[] {
  const result: ApiQuestionChoiceCreate[] = [];
  for (const p of pairs) {
    result.push({ ...p.source });
    result.push({ ...p.target });
  }
  return result;
}
