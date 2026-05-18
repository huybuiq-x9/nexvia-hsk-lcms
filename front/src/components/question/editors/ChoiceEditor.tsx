import { Image, Mic, Type, Plus, Trash2 } from 'lucide-react';
import ContentBlockEditor from '../ContentBlockEditor';
import type { ApiQuestionChoiceCreate, ContentBlock, ContentMediaType } from '../../../types/question';
import { CONTENT_MEDIA_TYPE } from '../../../types/question';

const CHOICE_TYPES: ContentMediaType[] = [
  CONTENT_MEDIA_TYPE.TEXT,
  CONTENT_MEDIA_TYPE.IMAGE,
  CONTENT_MEDIA_TYPE.AUDIO,
  CONTENT_MEDIA_TYPE.TEXT_IMAGE,
  CONTENT_MEDIA_TYPE.TEXT_AUDIO,
  CONTENT_MEDIA_TYPE.TEXT_IMAGE_AUDIO,
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text:             <Type size={14} />,
  image:            <Image size={14} />,
  audio:            <Mic size={14} />,
  text_image:       <><Type size={14} /><span className="text-xs">+</span><Image size={14} /></>,
  text_audio:       <><Type size={14} /><span className="text-xs">+</span><Mic size={14} /></>,
  text_image_audio: <><Type size={14} /><span className="text-xs">+</span><Image size={14} /><span className="text-xs">+</span><Mic size={14} /></>,
};

const TYPE_LABELS: Record<string, string> = {
  text:             'Text',
  image:            'Ảnh',
  audio:            'Audio',
  text_image:       'Text + Ảnh',
  text_audio:       'Text + Audio',
  text_image_audio: 'Text + Ảnh + Audio',
};

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
  // Shared type for all choices — derived from first choice
  const sharedType: ContentMediaType = choices[0]?.content.type ?? CONTENT_MEDIA_TYPE.TEXT;

  function handleSharedTypeChange(t: ContentMediaType) {
    onChoicesChange(choices.map(c => {
      const next: ContentBlock = { type: t };
      if (['text', 'text_image', 'text_audio', 'text_image_audio'].includes(t)) next.text = c.content.text ?? '';
      if (['image', 'audio', 'text_image', 'text_audio'].includes(t) && c.content.media_key) {
        next.media_key = c.content.media_key;
        next.media_url = c.content.media_url;
        next.original_filename = c.content.original_filename;
      }
      if (t === 'text_image_audio') {
        if (c.content.image_key) { next.image_key = c.content.image_key; next.image_url = c.content.image_url; next.image_filename = c.content.image_filename; }
        if (c.content.audio_key) { next.audio_key = c.content.audio_key; next.audio_url = c.content.audio_url; next.audio_filename = c.content.audio_filename; }
      }
      return { ...c, content: next };
    }));
  }

  function addChoice() {
    const needsText = ['text', 'text_image', 'text_audio', 'text_image_audio'].includes(sharedType);
    onChoicesChange([
      ...choices,
      { content: { type: sharedType, text: needsText ? '' : undefined }, is_correct: false, order_index: choices.length },
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
        {/* Label + shared type selector */}
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-medium text-slate-600">
            Đáp án {multiple ? '(chọn nhiều đáp án đúng)' : '(chọn 1 đáp án đúng)'}
          </label>
          <div className="flex gap-1">
            {CHOICE_TYPES.map(t => (
              <button
                key={t}
                type="button"
                title={TYPE_LABELS[t]}
                onClick={() => handleSharedTypeChange(t)}
                className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs border transition-colors ${
                  sharedType === t
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {TYPE_ICONS[t]}
              </button>
            ))}
          </div>
        </div>

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
                hideTypeSelector
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
