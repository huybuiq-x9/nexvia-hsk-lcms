import { useState, useEffect, useCallback } from 'react';
import { documentService } from '../../../services';
import type { ApiDocumentWithUploader } from '../../../types/api';

const ALLOWED_EXTENSIONS = ['pdf', 'pptx', 'ppt', 'docx', 'doc', 'xlsx', 'xls'];
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB

export function useSubLessonDocuments(subLessonId: string, onRefresh?: () => void) {
  const [documents, setDocuments] = useState<ApiDocumentWithUploader[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentService.listDocuments(subLessonId);
      setDocuments(res.items);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [subLessonId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const uploadDocuments = async (files: File[]) => {
    setUploading(true);
    try {
      await documentService.uploadDocuments(subLessonId, files);
      loadDocuments();
      onRefresh?.();
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    await documentService.deleteDocument(documentId);
    loadDocuments();
    onRefresh?.();
  };

  const getDownloadUrl = async (documentId: string) => {
    return await documentService.getDownloadUrl(documentId);
  };

  return {
    documents,
    loading,
    uploading,
    uploadDocuments,
    deleteDocument,
    getDownloadUrl,
    reload: loadDocuments,
    allowedExtensions: ALLOWED_EXTENSIONS,
    maxFileSize: MAX_FILE_SIZE,
  };
}
