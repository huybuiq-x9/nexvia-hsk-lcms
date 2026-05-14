import { useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileDropzoneProps {
  accept?: string[];
  maxSize?: number; // bytes
  onFiles: (files: File[]) => void;
  uploading?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  label?: string;
  hint?: string;
  uploadingLabel?: string;
}

export function FileDropzone({
  accept = [],
  maxSize = 200 * 1024 * 1024,
  onFiles,
  uploading = false,
  disabled = false,
  multiple = true,
  label,
  hint,
  uploadingLabel,
}: FileDropzoneProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = { current: 0 };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX, y = e.clientY;
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        dragCountRef.current = 0;
      }
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) onFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer
        ${uploading || disabled
          ? 'border-slate-100 bg-slate-50 cursor-not-allowed'
          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }
      `}
      data-max-size={maxSize}
      onDragEnter={!disabled ? handleDragEnter : undefined}
      onDragOver={!disabled ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; } : undefined}
      onDragLeave={!disabled ? handleDragLeave : undefined}
      onDrop={!disabled ? handleDrop : undefined}
      onClick={!disabled && !uploading ? () => fileInputRef.current?.click() : undefined}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={accept.map(e => `.${e}`).join(',')}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-blue-600 font-medium">{uploadingLabel ?? t('documents.uploading')}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <Upload size={24} className="text-slate-400" />
          <p className="text-sm font-medium text-slate-600">{label ?? t('documents.dropzone')}</p>
          <p className="text-xs text-slate-400">{hint ?? t('documents.dropzoneHint')}</p>
        </div>
      )}
    </div>
  );
}
