import { FileText, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiDocumentWithUploader } from '../../types/api';

interface FilePreviewModalProps {
  doc: ApiDocumentWithUploader;
  url: string | null;
  onClose: () => void;
  onDownload: () => void;
}

export function FilePreviewModal({ doc, url, onClose, onDownload }: FilePreviewModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-auto flex flex-col overflow-hidden"
        style={{ height: '85vh' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={16} className="text-blue-600 shrink-0" />
            <span className="text-sm font-medium text-slate-800 truncate">{doc.original_name}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 text-lg leading-none shrink-0 ml-2"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {url ? (
            doc.file_extension === 'pdf' ? (
              <iframe src={url} title={doc.original_name} className="w-full h-full border-0" />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                <FileText size={48} className="opacity-30" />
                <p className="text-sm">{t('documents.previewNotSupported')}</p>
                <button onClick={onDownload} className="btn btn-primary flex items-center gap-2">
                  <Download size={14} />
                  {t('documents.downloadToView')}
                </button>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
