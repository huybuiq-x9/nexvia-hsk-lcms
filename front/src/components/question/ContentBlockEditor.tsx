import { useEffect, useRef, useState } from 'react';
import { Image, Mic, Type, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ContentBlock, ContentMediaType } from '../../types/question';
import { CONTENT_MEDIA_TYPE } from '../../types/question';

interface Props {
  value: ContentBlock;
  onChange: (block: ContentBlock) => void;
  /** Restrict which media types are available. Defaults to all 6. */
  allowedTypes?: ContentMediaType[];
  /**
   * Called when user picks a file AND the question already has an id.
   * Returns { media_key, media_url, original_filename } after upload.
   */
  onUploadFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onUploadImageFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  onUploadAudioFile?: (file: File) => Promise<{ media_key: string; media_url: string; original_filename: string }>;
  /**
   * Called when user picks a file but question not yet saved.
   */
  onPendingFile?: (file: File, localUrl: string) => void;
  onPendingImageFile?: (file: File, localUrl: string) => void;
  onPendingAudioFile?: (file: File, localUrl: string) => void;
  onRemoveMedia?: () => void;
  placeholder?: string;   // defaults to t('questions.contentPlaceholder')
  label?: string;
  /** Hide the type selector (used when a shared selector is rendered externally) */
  hideTypeSelector?: boolean;
  /** Convert stored text → display text in the textarea */
  textDisplayTransform?: (text: string) => string;
  /** Convert typed text → stored text on change */
  textInputTransform?: (text: string) => string;
}

const ALL_TYPES: ContentMediaType[] = [
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

export default function ContentBlockEditor({
  value,
  onChange,
  allowedTypes = ALL_TYPES,
  onUploadFile,
  onUploadImageFile,
  onUploadAudioFile,
  onPendingFile,
  onPendingImageFile,
  onPendingAudioFile,
  onRemoveMedia,
  placeholder,
  label,
  hideTypeSelector = false,
  textDisplayTransform,
  textInputTransform,
}: Props) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('questions.contentPlaceholder');
  const [uploading,      setUploading]      = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [localPreviewUrl,      setLocalPreviewUrl]      = useState<string | null>(null);
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<string | null>(null);
  const [localAudioPreviewUrl, setLocalAudioPreviewUrl] = useState<string | null>(null);

  const fileRef      = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl)      URL.revokeObjectURL(localPreviewUrl);
      if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl);
      if (localAudioPreviewUrl) URL.revokeObjectURL(localAudioPreviewUrl);
    };
  }, []);

  useEffect(() => {
    if (value.media_url && localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
  }, [value.media_url]);

  useEffect(() => {
    if (value.image_url && localImagePreviewUrl) {
      URL.revokeObjectURL(localImagePreviewUrl);
      setLocalImagePreviewUrl(null);
    }
  }, [value.image_url]);

  useEffect(() => {
    if (value.audio_url && localAudioPreviewUrl) {
      URL.revokeObjectURL(localAudioPreviewUrl);
      setLocalAudioPreviewUrl(null);
    }
  }, [value.audio_url]);

  const isDualMedia = value.type === CONTENT_MEDIA_TYPE.TEXT_IMAGE_AUDIO;
  const needsText  = ['text', 'text_image', 'text_audio', 'text_image_audio'].includes(value.type);
  const needsMedia = ['image', 'audio', 'text_image', 'text_audio'].includes(value.type);
  const isImage    = ['image', 'text_image'].includes(value.type);
  const isAudio    = ['audio', 'text_audio'].includes(value.type);

  function handleTypeChange(t: ContentMediaType) {
    const next: ContentBlock = { type: t };
    if (['text', 'text_image', 'text_audio', 'text_image_audio'].includes(t)) next.text = value.text ?? '';
    // preserve single media
    if (['image', 'audio', 'text_image', 'text_audio'].includes(t) && value.media_key) {
      next.media_key = value.media_key;
      next.media_url = value.media_url;
      next.original_filename = value.original_filename;
    }
    // preserve dual media
    if (t === 'text_image_audio') {
      if (value.image_key) { next.image_key = value.image_key; next.image_url = value.image_url; next.image_filename = value.image_filename; }
      if (value.audio_key) { next.audio_key = value.audio_key; next.audio_url = value.audio_url; next.audio_filename = value.audio_filename; }
    }
    onChange(next);
  }

  // ── Single media file handler ─────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadFile) {
      try {
        setUploading(true);
        const r = await onUploadFile(file);
        onChange({ ...value, media_key: r.media_key, media_url: r.media_url, original_filename: r.original_filename });
      } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
    } else if (onPendingFile) {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
      const url = URL.createObjectURL(file);
      setLocalPreviewUrl(url);
      onChange({ ...value, original_filename: file.name });
      onPendingFile(file, url);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // ── Dual media: image handler ─────────────────────────────────────────────
  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadImageFile) {
      try {
        setUploadingImage(true);
        const r = await onUploadImageFile(file);
        onChange({ ...value, image_key: r.media_key, image_url: r.media_url, image_filename: r.original_filename });
      } finally { setUploadingImage(false); if (imageFileRef.current) imageFileRef.current.value = ''; }
    } else if (onPendingImageFile) {
      if (localImagePreviewUrl) URL.revokeObjectURL(localImagePreviewUrl);
      const url = URL.createObjectURL(file);
      setLocalImagePreviewUrl(url);
      onChange({ ...value, image_filename: file.name });
      onPendingImageFile(file, url);
      if (imageFileRef.current) imageFileRef.current.value = '';
    }
  }

  // ── Dual media: audio handler ─────────────────────────────────────────────
  async function handleAudioFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onUploadAudioFile) {
      try {
        setUploadingAudio(true);
        const r = await onUploadAudioFile(file);
        onChange({ ...value, audio_key: r.media_key, audio_url: r.media_url, audio_filename: r.original_filename });
      } finally { setUploadingAudio(false); if (audioFileRef.current) audioFileRef.current.value = ''; }
    } else if (onPendingAudioFile) {
      if (localAudioPreviewUrl) URL.revokeObjectURL(localAudioPreviewUrl);
      const url = URL.createObjectURL(file);
      setLocalAudioPreviewUrl(url);
      onChange({ ...value, audio_filename: file.name });
      onPendingAudioFile(file, url);
      if (audioFileRef.current) audioFileRef.current.value = '';
    }
  }

  function handleRemoveSingle() {
    onRemoveMedia?.();
    if (localPreviewUrl) { URL.revokeObjectURL(localPreviewUrl); setLocalPreviewUrl(null); }
    onChange({ ...value, media_key: undefined, media_url: undefined, original_filename: undefined });
  }

  function handleRemoveImage() {
    if (localImagePreviewUrl) { URL.revokeObjectURL(localImagePreviewUrl); setLocalImagePreviewUrl(null); }
    onChange({ ...value, image_key: undefined, image_url: undefined, image_filename: undefined });
  }

  function handleRemoveAudio() {
    if (localAudioPreviewUrl) { URL.revokeObjectURL(localAudioPreviewUrl); setLocalAudioPreviewUrl(null); }
    onChange({ ...value, audio_key: undefined, audio_url: undefined, audio_filename: undefined });
  }

  const displayUrl      = value.media_url ?? localPreviewUrl;
  const displayImageUrl = value.image_url ?? localImagePreviewUrl;
  const displayAudioUrl = value.audio_url ?? localAudioPreviewUrl;

  const isPendingSingle = !!localPreviewUrl && !value.media_url;
  const isPendingImage  = !!localImagePreviewUrl && !value.image_url;
  const isPendingAudio  = !!localAudioPreviewUrl && !value.audio_url;

  return (
    <div className="flex flex-col gap-2">
      {(label || !hideTypeSelector) && (
        <div className="flex items-center justify-between gap-2">
          {label && <label className="text-xs font-medium text-slate-600">{label}</label>}

          {!hideTypeSelector && (
            <div className="flex flex-wrap gap-1 ml-auto">
              {allowedTypes.map(t => (
                <button
                  key={t}
                  type="button"
                  title={TYPE_LABELS[t]}
                  onClick={() => handleTypeChange(t)}
                  className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs border transition-colors ${
                    value.type === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {TYPE_ICONS[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Text input */}
      {needsText && (
        <textarea
          rows={2}
          value={textDisplayTransform ? textDisplayTransform(value.text ?? '') : (value.text ?? '')}
          onChange={e => {
            const raw = e.target.value;
            onChange({ ...value, text: textInputTransform ? textInputTransform(raw) : raw });
          }}
          placeholder={resolvedPlaceholder}
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {/* Single media (image / audio / text_image / text_audio) */}
      {needsMedia && (
        <div className="relative">
          {displayUrl ? (
            <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
              {isImage && <img src={displayUrl} alt={value.original_filename} className="max-h-48 w-full object-contain" />}
              {isAudio && (
                <div className="flex items-center gap-2 px-3 py-2">
                  <audio controls className="h-8 flex-1 min-w-0" src={displayUrl} />
                  <span className="text-xs text-slate-500 truncate max-w-[120px]">{value.original_filename}</span>
                </div>
              )}
              {isPendingSingle && (
                <div className="absolute top-1 left-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded">{t('questions.pendingSave')}</div>
              )}
              <button type="button" onClick={handleRemoveSingle}
                className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-500">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              disabled={uploading || (!onUploadFile && !onPendingFile)}
              className="w-full border-2 border-dashed border-slate-200 rounded-lg py-4 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-400 transition-colors disabled:opacity-50">
              {uploading ? t('questions.uploading') : isImage ? t('questions.selectImage') : t('questions.selectAudio')}
            </button>
          )}
          <input ref={fileRef} type="file" className="hidden"
            accept={isImage ? 'image/jpeg,image/png,image/webp' : 'audio/mpeg,audio/mp4,audio/ogg,audio/wav'}
            onChange={handleFile} />
        </div>
      )}

      {/* Dual media: text_image_audio */}
      {isDualMedia && (
        <div className="flex flex-col gap-2">
          {/* Image slot */}
          <div className="relative">
            {displayImageUrl ? (
              <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                <img src={displayImageUrl} alt={value.image_filename} className="max-h-48 w-full object-contain" />
                {isPendingImage && (
                  <div className="absolute top-1 left-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded">{t('questions.pendingSave')}</div>
                )}
                <button type="button" onClick={handleRemoveImage}
                  className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => imageFileRef.current?.click()}
                disabled={uploadingImage || (!onUploadImageFile && !onPendingImageFile)}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg py-3 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-400 transition-colors disabled:opacity-50">
                {uploadingImage ? t('questions.uploading') : t('questions.selectImage')}
              </button>
            )}
            <input ref={imageFileRef} type="file" className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageFile} />
          </div>

          {/* Audio slot */}
          <div className="relative">
            {displayAudioUrl ? (
              <div className="relative rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                <div className="flex items-center gap-2 px-3 py-2">
                  <audio controls className="h-8 flex-1 min-w-0" src={displayAudioUrl} />
                  <span className="text-xs text-slate-500 truncate max-w-[120px]">{value.audio_filename}</span>
                </div>
                {isPendingAudio && (
                  <div className="absolute top-1 left-1 bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded">{t('questions.pendingSave')}</div>
                )}
                <button type="button" onClick={handleRemoveAudio}
                  className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => audioFileRef.current?.click()}
                disabled={uploadingAudio || (!onUploadAudioFile && !onPendingAudioFile)}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg py-3 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-400 transition-colors disabled:opacity-50">
                {uploadingAudio ? t('questions.uploading') : t('questions.selectAudio')}
              </button>
            )}
            <input ref={audioFileRef} type="file" className="hidden"
              accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav"
              onChange={handleAudioFile} />
          </div>
        </div>
      )}
    </div>
  );
}
