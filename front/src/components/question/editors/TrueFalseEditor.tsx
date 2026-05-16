import ContentBlockEditor from '../ContentBlockEditor';
import type { ContentBlock } from '../../../types/question';

interface Props {
  stem: ContentBlock;
  onStemChange: (b: ContentBlock) => void;
  tfCorrect: boolean;
  onTfCorrectChange: (v: boolean) => void;
  onUploadFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onPendingFile?: (file: File) => void;
}

export default function TrueFalseEditor({ stem, onStemChange, tfCorrect, onTfCorrectChange, onUploadFile, onPendingFile }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <ContentBlockEditor
        label="Câu hỏi"
        value={stem}
        onChange={onStemChange}
        onUploadFile={onUploadFile}
        onPendingFile={onPendingFile}
        placeholder="Nhập nội dung câu hỏi Đúng/Sai..."
      />
      <div>
        <label className="text-xs font-medium text-slate-600 block mb-2">Đáp án</label>
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
              {val ? 'Đúng' : 'Sai'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Build choices payload for TF — always 2 fixed choices */
export function buildTFChoices(correctIsTrue: boolean) {
  return [
    { content: { type: 'text' as const, text: 'Đúng' }, is_correct: correctIsTrue,  order_index: 0 },
    { content: { type: 'text' as const, text: 'Sai'  }, is_correct: !correctIsTrue, order_index: 1 },
  ];
}
