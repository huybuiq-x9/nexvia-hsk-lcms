import { Plus, Trash2 } from 'lucide-react';
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

/**
 * PAIR_MATCH editor — same layout as MAT but with group_name = "left"/"right".
 * Supports image choices for "vẽ đường nối ảnh với từ" use-cases.
 */
export default function PairMatchEditor({ stem, pairs, onStemChange, onPairsChange, onUploadFile, onPendingFile }: Props) {
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
        label="Câu hỏi"
        value={stem}
        onChange={onStemChange}
        onUploadFile={onUploadFile}
        onPendingFile={onPendingFile}
        placeholder="Nhập yêu cầu vẽ đường nối..."
      />

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-[1fr_1fr_32px] gap-2">
          <span className="text-xs font-medium text-slate-500">Cột trái</span>
          <span className="text-xs font-medium text-slate-500">Cột phải</span>
          <span />
        </div>
        {pairs.map((pair, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_1fr_32px] gap-2 items-start">
            <ContentBlockEditor
              value={pair.left.content}
              onChange={b => updateSide(idx, 'left', b)}
              placeholder="Mục cột trái..."
            />
            <ContentBlockEditor
              value={pair.right.content}
              onChange={b => updateSide(idx, 'right', b)}
              placeholder="Mục cột phải..."
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
