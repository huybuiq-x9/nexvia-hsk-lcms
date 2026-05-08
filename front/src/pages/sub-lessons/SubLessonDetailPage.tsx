import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubLesson } from './hooks/useSubLesson';
import { SubLessonBreadcrumb } from './components/SubLessonBreadcrumb';
import { SubLessonHeader, SubLessonInfoDrawer } from './components/SubLessonHeader';
import { SubLessonWorkflowStepper } from './components/SubLessonWorkflowStepper';
import { SubLessonTabs, type Tab } from './components/SubLessonTabs';
import { SubLessonDocumentsTab } from './components/SubLessonDocumentsTab';
import { SubLessonQuestionsTab } from './components/SubLessonQuestionsTab';
import { SubLessonScormTab } from './components/SubLessonScormTab';
import { SubLessonHistoryTab } from './components/SubLessonHistoryTab';
import { SubLessonActionModal } from './components/SubLessonActionModal';
import { API_ROLE, SUB_LESSON_STATUS } from '../../types/api';

type ModalType = 'submit' | 'approve' | 'reject' | 'upload' | 'approve_scorm' | 'reject_scorm' | 'submit_scorm';

export default function SubLessonDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subLessonId } = useParams<{ subLessonId: string }>();
  const { isAdmin, isExpert, selectedRole } = useAuth();
  const { subLesson, lessonInfo, courseInfo, isLoading, reload } = useSubLesson(subLessonId);

  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [modal, setModal] = useState<{ type: ModalType; show: boolean }>({ type: 'submit', show: false });
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);

  const isTeacher = selectedRole === API_ROLE.TEACHER;
  const isConverter = selectedRole === API_ROLE.CONVERTER;
  const isDrafting = subLesson ? (
    subLesson.status === SUB_LESSON_STATUS.DRAFT ||
    subLesson.status === SUB_LESSON_STATUS.IN_PROGRESS
  ) : false;
  const isContentReviewing = subLesson?.status === SUB_LESSON_STATUS.REVIEWING;
  const isConverting = subLesson?.status === SUB_LESSON_STATUS.CONVERTING;
  const isScormReviewing = subLesson?.status === SUB_LESSON_STATUS.SCORM_REVIEWING;

  const canViewDocuments = Boolean(subLesson) && (
    isAdmin ||
    (isTeacher && isDrafting) ||
    (isExpert && isContentReviewing) ||
    (isConverter && isConverting)
  );
  const canPreviewDocuments = canViewDocuments;
  const canDownloadDocuments = canViewDocuments;
  const canCommentDocuments = Boolean(subLesson) && (
    isAdmin ||
    (isTeacher && isDrafting) ||
    (isExpert && isContentReviewing)
  );
  const canDeleteDocuments = Boolean(subLesson) && (isAdmin || isTeacher) && isDrafting;
  const canUploadDocuments = Boolean(subLesson) && (isAdmin || isTeacher) && isDrafting;
  const canSubmitForReview = Boolean(subLesson) && (isAdmin || isTeacher) && isDrafting;

  const canViewScorm = Boolean(subLesson) && (
    isAdmin ||
    (isConverter && isConverting) ||
    (isExpert && isScormReviewing)
  );
  const canPreviewScorm = canViewScorm;
  const canViewScormComments = Boolean(subLesson) && (
    isAdmin ||
    (isConverter && isConverting) ||
    (isExpert && isScormReviewing)
  );
  const canAddScormComment = Boolean(subLesson) && (isAdmin || isExpert) && isScormReviewing;

  // Expert / Admin review CONTENT
  const canReview = isContentReviewing && (isAdmin || isExpert);

  // Converter / Admin submit SCORM for review
  const canUploadScorm = isConverting && (isAdmin || isConverter);
  const canSubmitScorm = isConverting
    && Boolean(subLesson?.scorm_filename)
    && (isAdmin || isConverter);

  // Expert / Admin review SCORM
  const canReviewScorm = isScormReviewing && (isAdmin || isExpert);
  const visibleTabs = useMemo<Tab[]>(() => [
    ...(canViewDocuments ? (['documents'] as Tab[]) : []),
    'questions',
    ...(canViewScorm ? (['scorm'] as Tab[]) : []),
    'history',
  ], [canViewDocuments, canViewScorm]);

  useEffect(() => {
    if (isLoading || !subLesson) return;
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? 'history');
    }
  }, [activeTab, isLoading, subLesson, visibleTabs]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!subLesson) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>{t('courses.modal.notFound')}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">
          {t('courses.backToList')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SubLessonBreadcrumb
        courseInfo={courseInfo}
        lessonInfo={lessonInfo}
        subLessonTitle={subLesson.title}
      />

      <SubLessonHeader
        canSubmitForReview={canSubmitForReview}
        canReview={canReview}
        canSubmitScorm={canSubmitScorm}
        canReviewScorm={canReviewScorm}
        onSubmit={() => setModal({ type: 'submit', show: true })}
        onApprove={() => setModal({ type: 'approve', show: true })}
        onReject={() => setModal({ type: 'reject', show: true })}
        onSubmitScorm={() => setModal({ type: 'submit_scorm', show: true })}
        onApproveScorm={() => setModal({ type: 'approve_scorm', show: true })}
        onRejectScorm={() => setModal({ type: 'reject_scorm', show: true })}
      />

      <SubLessonInfoDrawer
        subLesson={subLesson}
        lessonTitle={lessonInfo?.title}
        isOpen={isInfoDrawerOpen}
        onToggle={() => setIsInfoDrawerOpen(open => !open)}
      />

      <SubLessonWorkflowStepper currentStatus={subLesson.status} />

      <div className="card overflow-hidden">
        <SubLessonTabs activeTab={activeTab} onTabChange={setActiveTab} visibleTabs={visibleTabs} />

        <div className="p-5">
          {activeTab === 'documents' && canViewDocuments && (
            <SubLessonDocumentsTab
              subLessonId={subLesson.id}
              subLessonStatus={subLesson.status}
              onRefresh={reload}
              canUpload={canUploadDocuments}
              canPreview={canPreviewDocuments}
              canDownload={canDownloadDocuments}
              canComment={canCommentDocuments}
              canDelete={canDeleteDocuments}
            />
          )}
          {activeTab === 'questions' && <SubLessonQuestionsTab />}
          {activeTab === 'scorm' && canViewScorm && (
            <SubLessonScormTab
              subLessonId={subLesson.id}
              canUpload={canUploadScorm}
              canPreview={canPreviewScorm}
              canViewComments={canViewScormComments}
              canAddComment={canAddScormComment}
              onUploaded={reload}
            />
          )}
          {activeTab === 'history' && <SubLessonHistoryTab />}
        </div>
      </div>

      {modal.show && (
        <SubLessonActionModal
          type={modal.type}
          subLessonId={subLesson.id}
          onClose={() => setModal(m => ({ ...m, show: false }))}
          onDone={() => {
            setModal(m => ({ ...m, show: false }));
            reload();
          }}
        />
      )}
    </div>
  );
}
