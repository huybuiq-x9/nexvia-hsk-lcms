import { useEffect, useState } from 'react';
import { FileArchive, RefreshCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ApiScormPackage } from '../../../types/api';
import type { Scorm2004API } from 'scorm-again';

declare global {
  interface Window {
    API_1484_11?: Scorm2004API;
  }
}

interface ScormPreviewModalProps {
  scormPackage: ApiScormPackage;
  launchUrl: string;
  onClose: () => void;
}

export function ScormPreviewModal({
  scormPackage,
  launchUrl,
  onClose,
}: ScormPreviewModalProps) {
  const { t } = useTranslation();
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const title = scormPackage.title || scormPackage.original_filename;

  useEffect(() => {
    let api: Scorm2004API | null = null;
    let disposed = false;

    void import('scorm-again').then(({ Scorm2004API }) => {
      if (disposed) return;
      api = new Scorm2004API({
        autocommit: true,
        autocommitSeconds: 10,
        dataCommitFormat: 'json',
        renderCommonCommitFields: true,
        sendFullCommit: true,
        logLevel: import.meta.env.DEV ? 'INFO' : 'ERROR',
        onLogMessage: (level, message) => {
          if (import.meta.env.DEV) {
            console.debug(`[SCORM ${level}]`, message);
          }
        },
      });

      api.cmi.learner_id = 'preview-user';
      api.cmi.learner_name = 'Preview User';
      window.API_1484_11 = api;
      setRuntimeReady(true);
    });

    return () => {
      disposed = true;
      if (api && window.API_1484_11 === api) {
        delete window.API_1484_11;
      }
    };
  }, [scormPackage.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl mx-auto flex flex-col overflow-hidden h-[92dvh]">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileArchive size={16} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 truncate">{title}</h2>
              <p className="text-xs text-slate-400 truncate">
                {scormPackage.launch_path || scormPackage.original_filename}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setFrameKey(key => key + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title={t('scorm.reloadPreview')}
              aria-label={t('scorm.reloadPreview')}
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              title={t('scorm.closePreview')}
              aria-label={t('scorm.closePreview')}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-100">
          {runtimeReady ? (
            <iframe
              key={frameKey}
              src={launchUrl}
              title={title}
              className="w-full h-full border-0 bg-white"
              allow="fullscreen"
              allowFullScreen
            />
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
