import { useEffect, useRef, useState } from 'react';
import { Image, Mic, Type, X } from 'lucide-react';
import type { ContentBlock, ContentMediaType } from '../../types/question';
import { CONTENT_MEDIA_TYPE } from '../../types/question';

interface Props {
  value: ContentBlock;
  onChange: (block: ContentBlock) => void;
  /** Restrict which media types are available. Defaults to all 5. */
  allowedTypes?: ContentMediaType[];
  /**
   * Called when user picks a file AND the question already has an id.
   * Returns { media_key, media_url, original_filename } after upload.
   */
  onUploadFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  /**
   * Called when user picks a file but question not yet saved.
   * The form stores the file and uploads it after saving.
   */
  onPendingFile?: (file: File, localUrl: string) => void;
  onRemoveMedia?: () => void;
  placeholder?: string;
  label?: string;
}

const ALL_TYPES: ContentMediaType[] = [
  CONTENT_MEDIA_TYPE.TEXT,
  CONTENT_MEDIA_TYPE.IMAGE,
  CONTENT_MEDIA_TYPE.AUDIO,
  CONTENT_MEDIA_TYPE.TEXT_IMAGE,
  CONTENT_MEDIA_TYPE.TEXT_AUDIO,
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  text:       <Type size={14} />,
  image:      <Image size={14} />,
  audio:      <Mic size={14} />,
  text_image: <><Type size={14} /><span className="text-xs">+</span><Image size={14} /></>,
  text_audio: <><Type size={14} /><span className="text-xs">+</span><Mic size={14} /></>,
};

const TYPE_LABELS: Record<string, string> = {
  text:       'Text',
  image:      'Ảnh',
  audio:      'Audio',
  text_image: 'Text + Ảnh',
  text_audio: 'Text + Audio',
};

export default function ContentBlockEditor({
  value,
  onChange,
  allowedTypes = ALL_TYPES,
  onUploadFile,
  onPendingFile,
  onRemoveMedia,
  placeholder = 'Nhập nội dung...',
  label,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Revoke local object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  // Clear local preview when block gets a real media_url (after upload on save)
  useEffect(() => {
    if (value.media_url && localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
  }, [value.media_url]);

  const needsText  = ['text', 'text_image', 'text_audio'].includes(value.type);
  const needsMedia = ['image', 'audio', 'text_image', 'text_audio'].includes(value.type);
  const isImage    = ['image', 'text_image'].includes(value.type);
  const isAudio    = ['audio', 'text_audio'].includes(value.type);

  function handleTypeChange(t: ContentMediaType) {
    const next: ContentBlock = { type: t };
    if (['text', 'text_image', 'text_audio'].includes(t)) next.text = value.text ?? '';
    if (['image', 'audio', 'text_image', 'text_audio'].includes(t) && value.media_key) {
      next.media_key = value.media_key;
      next.media_url = value.media_url;
      next.original_filename = value.original_filename;
    }
    onChange(next);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (onUploadFile) {
      // Already have a question id — upload immediately
      try {
        setUploading(true);
        const result = await onUploadFile(file);
        onChange({
          ...value,
          media_key: result.media_key,
          media_url: result.media_url,
          original_filename: result.original_filename,
        });
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    } else if (onPendingFile) {
      // No question id yet — store locally and show preview
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      const url = URL.createObjectURL(file);
      setLocalPreviewUrl(url);
      onChange({ ...value, original_filename: file.name });
      onPendingFile(file, url);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleRemove() {
    onRemoveMedia?.();
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    onChange({
      ...value,
      media_key: undefined,
      media_url: undefined,
      original_filename: undefined,
    });
  }

  const displayUrl = value.media_url ?? localPreviewUrl;

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-medium text-slate-600">{label}</label>}

      {/* Type selector */}
      <div className="flex flex-wrap gap-1">
        {allowedTypes.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeChange(t)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
              value.type === t
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            {TYPE_ICONS[t]}
            <span>{TYPE_LABELS[t]}</span>
          </button>
        ))}
      </div>

      {/* Text input */}
      {needsText && (
        <textarea
          rows={2}
          value={value.text ?? ''}
          onChange={e => onChange({ ...value, text: e.target.value })}
          placeholder={placeholder}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* Media area */}
      {needsMedia && (
        <div className="relative">
          {displayUrl ? (
            <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
              {isImage && (
                <img
                  src={displayUrl}
                  alt={value.original_filename}
                  className="max-h-48 w-full object-contain"
                />
              )}
              {isAudio && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <audio controls className="h-8 flex-1 min-w-0" src={displayUrl} />
                  <span className="text-xs text-slate-500 truncate max-w-[120px]">{value.original_filename}</span>
                </div>
              )}
              {localPreviewUrl && !value.media_url && (
                <div className="absolute top-1 left-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded">
                  Chờ lưu
                </div>
              )}
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-500"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading || (!onUploadFile && !onPendingFile)}
              className="w-full border-2 border-dashed border-slate-200 rounded-lg py-4 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-400 transition-colors disabled:opacity-50"
            >
              {uploading ? 'Đang tải...' : isImage ? 'Chọn ảnh' : 'Chọn file audio'}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={isImage ? 'image/jpeg,image/png,image/webp' : 'audio/mpeg,audio/mp4,audio/ogg,audio/wav'}
            onChange={handleFile}
          />
        </div>
      )}
    </div>
  );
}
