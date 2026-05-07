import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, Trash2, Eye } from 'lucide-react';
import { useSubLessonDocuments } from '../hooks/useSubLessonDocuments';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { FileIcon } from '../../../components/ui/FileIcon';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import { FilePreviewModal } from '../../../components/ui/FilePreviewModal';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useToast } from '../../../contexts/ToastContext';
import { formatFileSize, formatDate } from '../../../utils/formatters';
import type { ApiDocumentWithUploader } from '../../../types/api';

interface SubLessonDocumentsTabProps {
  subLessonId: string;
  onRefresh: () => void;
  canUpload?: boolean;
}

export function SubLessonDocumentsTab({ subLessonId, onRefresh, canUpload = true }: SubLessonDocumentsTabProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    documents,
    loading,
    uploading,
    uploadDocuments,
    deleteDocument,
    getDownloadUrl,
  } = useSubLessonDocuments(subLessonId, onRefresh);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<ApiDocumentWithUploader | null>(null);
  const [, setPreviewLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    try {
      await uploadDocuments(files);
      toast.success(t('documents.uploadSuccess'));
    } catch {
      toast.error(t('documents.uploadError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteId);
      toast.success(t('documents.deleteSuccess'));
      setDeleteId(null);
    } catch {
      toast.error(t('courses.modal.errorGeneric'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (doc: ApiDocumentWithUploader) => {
    try {
      const url = await getDownloadUrl(doc.id);
      window.open(url, '_blank');
    } catch {
      toast.error(t('courses.modal.errorGeneric'));
    }
  };

  const handlePreview = async (doc: ApiDocumentWithUploader) => {
    setPreviewLoading(true);
    setPreviewUrl(null);
    setPreviewDoc(null);
    try {
      const url = await getDownloadUrl(doc.id);
      setPreviewUrl(url);
      setPreviewDoc(doc);
    } catch {
      toast.error(t('courses.modal.errorGeneric'));
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <FileDropzone
          accept={['pdf', 'pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls']}
          maxSize={200 * 1024 * 1024}
          onFiles={handleFiles}
          uploading={uploading}
        />
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={36} />}
          message={t('documents.noDocuments')}
          hint={t('documents.noDocumentsHint')}
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {documents.map(doc => (
            <div
              key={doc.id}
              className="flex items-center gap-3 py-3 px-1 hover:bg-slate-50 rounded-lg transition-colors group"
            >
              <div
                className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${
                  doc.file_extension === 'pdf' ? 'bg-red-50 text-red-700 border-red-200' :
                  (doc.file_extension === 'pptx' || doc.file_extension === 'ppt') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                  (doc.file_extension === 'docx' || doc.file_extension === 'doc') ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  (doc.file_extension === 'xlsx' || doc.file_extension === 'xls') ? 'bg-green-50 text-green-700 border-green-200' :
                  'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                <FileIcon extension={doc.file_extension} size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{doc.original_name}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span>·</span>
                  <span>{formatDate(doc.created_at)}</span>
                  <span>·</span>
                  <span>{doc.uploader.full_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {doc.file_extension === 'pdf' && (
                  <button
                    onClick={() => handlePreview(doc)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                    title={t('documents.preview')}
                  >
                    <Eye size={15} />
                  </button>
                )}
                <button
                  onClick={() => handleDownload(doc)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                  title={t('documents.download')}
                >
                  <Download size={15} />
                </button>
                {canUpload && (
                  <button
                    onClick={() => setDeleteId(doc.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                    title={t('documents.delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          title={t('documents.deleteConfirm')}
          message=""
          confirmLabel={t('documents.delete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          variant="danger"
          loading={deleting}
          icon={<Trash2 size={20} className="text-red-600" />}
        />
      )}

      {previewDoc && (
        <FilePreviewModal
          doc={previewDoc}
          url={previewUrl}
          onClose={() => { setPreviewDoc(null); setPreviewUrl(null); }}
          onDownload={() => handleDownload(previewDoc)}
        />
      )}
    </div>
  );
}
