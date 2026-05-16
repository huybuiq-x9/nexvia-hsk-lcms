import { Plus, Trash2 } from 'lucide-react';
import ContentBlockEditor from '../ContentBlockEditor';
import type { ApiQuestionChoiceCreate, ContentBlock } from '../../../types/question';
import { CONTENT_MEDIA_TYPE } from '../../../types/question';

interface Props {
  stem: ContentBlock;
  choices: ApiQuestionChoiceCreate[];
  multiple: boolean;
  onStemChange: (b: ContentBlock) => void;
  onChoicesChange: (choices: ApiQuestionChoiceCreate[]) => void;
  onUploadFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?: (file: File) => void;
  /** Called when question already has an id and we can upload immediately */
  onUploadChoice?: (idx: number, file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  /** Called when question not yet saved — store the file for later upload */
  onPendingChoice?: (idx: number, file: File, localUrl: string) => void;
}

export default function ChoiceEditor({
  stem, choices, multiple,
  onStemChange, onChoicesChange,
  onUploadFile, onPendingFile,
  onUploadChoice, onPendingChoice,
}: Props) {
  function addChoice() {
    onChoicesChange([
      ...choices,
      { content: { type: CONTENT_MEDIA_TYPE.TEXT, text: '' }, is_correct: false, order_index: choices.length },
    ]);
  }

  function removeChoice(idx: number) {
    onChoicesChange(choices.filter((_, i) => i !== idx));
  }

  function updateChoice(idx: number, patch: Partial<ApiQuestionChoiceCreate>) {
    onChoicesChange(choices.map((c, i) => i === idx ? { ...c, ...patch } : c));
  }

  function toggleCorrect(idx: number) {
    if (multiple) {
      updateChoice(idx, { is_correct: !choices[idx].is_correct });
    } else {
      onChoicesChange(choices.map((c, i) => ({ ...c, is_correct: i === idx })));
    }
  }

  function choiceUploadProps(idx: number) {
    if (onUploadChoice) {
      return { onUploadFile: (f: File) => onUploadChoice(idx, f) };
    }
    if (onPendingChoice) {
      return { onPendingFile: (f: File, localUrl: string) => onPendingChoice(idx, f, localUrl) };
    }
    return {};
  }

  return (
    <div className="flex flex-col gap-4">
      <ContentBlockEditor
        label="Câu hỏi"
        value={stem}
        onChange={onStemChange}
        onUploadFile={onUploadFile}
        onPendingFile={onPendingFile}
        placeholder="Nhập nội dung câu hỏi..."
      />

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-600">
          Đáp án {multiple ? '(chọn nhiều đáp án đúng)' : '(chọn 1 đáp án đúng)'}
        </label>
        {choices.map((choice, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <button
              type="button"
              onClick={() => toggleCorrect(idx)}
              title={choice.is_correct ? 'Đáp án đúng' : 'Chọn làm đáp án đúng'}
              className={`mt-1 shrink-0 w-5 h-5 flex items-center justify-center rounded-full border-2 transition-colors ${
                choice.is_correct
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'border-slate-300 hover:border-green-400'
              }`}
            >
              {choice.is_correct && <span className="text-xs">✓</span>}
            </button>

            <div className="flex-1 min-w-0">
              <ContentBlockEditor
                value={choice.content}
                onChange={b => updateChoice(idx, { content: b })}
                {...choiceUploadProps(idx)}
                placeholder={`Đáp án ${String.fromCharCode(65 + idx)}...`}
              />
            </div>

            <button
              type="button"
              onClick={() => removeChoice(idx)}
              className="mt-1 shrink-0 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={addChoice}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mt-1"
        >
          <Plus size={14} /> Thêm đáp án
        </button>
      </div>
    </div>
  );
}
