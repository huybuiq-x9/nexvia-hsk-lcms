import { GripVertical, Plus, Trash2 } from 'lucide-react';
import ContentBlockEditor from '../ContentBlockEditor';
import type { ApiQuestionChoiceCreate, ContentBlock } from '../../../types/question';
import { CONTENT_MEDIA_TYPE } from '../../../types/question';

interface Props {
  stem: ContentBlock;
  choices: ApiQuestionChoiceCreate[];
  onStemChange: (b: ContentBlock) => void;
  onChoicesChange: (choices: ApiQuestionChoiceCreate[]) => void;
  onUploadFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?: (file: File) => void;
}

/**
 * SQ editor — items listed in correct order, displayed shuffled.
 * correct_order = position in this list (0-based).
 * order_index = display order (shuffled) — set randomly at save time.
 */
export default function SequenceEditor({ stem, choices, onStemChange, onChoicesChange, onUploadFile, onPendingFile }: Props) {
  function addItem() {
    onChoicesChange([
      ...choices,
      {
        content: { type: CONTENT_MEDIA_TYPE.TEXT, text: '' },
        correct_order: choices.length,
        order_index: choices.length,
      },
    ]);
  }

  function removeItem(idx: number) {
    const next = choices.filter((_, i) => i !== idx).map((c, i) => ({ ...c, correct_order: i, order_index: i }));
    onChoicesChange(next);
  }

  function updateItem(idx: number, content: ContentBlock) {
    onChoicesChange(choices.map((c, i) => i === idx ? { ...c, content } : c));
  }

  function move(idx: number, dir: -1 | 1) {
    const next = [...choices];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChoicesChange(next.map((c, i) => ({ ...c, correct_order: i, order_index: i })));
  }

  return (
    <div className="flex flex-col gap-4">
      <ContentBlockEditor
        label="Câu hỏi"
        value={stem}
        onChange={onStemChange}
        onUploadFile={onUploadFile}
        onPendingFile={onPendingFile}
        placeholder="Nhập yêu cầu xếp thứ tự..."
      />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-600">Các mục (xếp theo thứ tự đúng)</label>
        {choices.map((choice, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <div className="flex flex-col gap-0.5 mt-2 shrink-0">
              <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs leading-none">▲</button>
              <GripVertical size={14} className="text-slate-300" />
              <button type="button" onClick={() => move(idx, 1)} disabled={idx === choices.length - 1}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30 text-xs leading-none">▼</button>
            </div>
            <span className="mt-2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500 shrink-0">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <ContentBlockEditor
                value={choice.content}
                onChange={b => updateItem(idx, b)}
                placeholder={`Mục ${idx + 1}...`}
              />
            </div>
            <button type="button" onClick={() => removeItem(idx)} className="mt-2 text-slate-400 hover:text-red-500 shrink-0">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mt-1">
          <Plus size={14} /> Thêm mục
        </button>
      </div>
    </div>
  );
}
