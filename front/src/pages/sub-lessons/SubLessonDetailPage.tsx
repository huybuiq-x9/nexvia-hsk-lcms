import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { useUserCache } from '../../hooks/useUserCache';
import { useSubLesson } from './hooks/useSubLesson';
import { SubLessonHeader, SubLessonInfoDrawer } from './components/SubLessonHeader';
import { SubLessonWorkflowStepper } from './components/SubLessonWorkflowStepper';
import { SubLessonTabs, type Tab } from './components/SubLessonTabs';
import { SubLessonDocumentsTab } from './components/SubLessonDocumentsTab';
import { SubLessonScormTab } from './components/SubLessonScormTab';
import { SubLessonQuestionsTab } from './components/SubLessonQuestionsTab';
import { SubLessonActionModal } from './components/SubLessonActionModal';
import { API_ROLE, SUB_LESSON_STATUS, type ApiScormPackage } from '../../types/api';

type ModalType = 'submit' | 'approve' | 'reject' | 'upload' | 'submit_scorm' | 'approve_scorm' | 'reject_scorm';

export default function SubLessonDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subLessonId } = useParams<{ subLessonId: string }>();
  const { isAdmin, isExpert, selectedRole } = useAuth();
  const { cache: userCache, loadUser } = useUserCache();
  const { subLesson, reviewLogs, lessonInfo, courseInfo, isLoading, reload } = useSubLesson(subLessonId);
  const { setBreadcrumbs } = useBreadcrumbs();

  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [modal, setModal] = useState<{ type: ModalType; show: boolean }>({ type: 'submit', show: false });
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
  const [currentScormPackage, setCurrentScormPackage] = useState<ApiScormPackage | null>(null);
  const [documentCount, setDocumentCount] = useState(0);

  const isTeacher = selectedRole === API_ROLE.TEACHER;
  const isConverter = selectedRole === API_ROLE.CONVERTER;
  const isDrafting = subLesson ? (
    subLesson.status === SUB_LESSON_STATUS.DRAFT ||
    subLesson.status === SUB_LESSON_STATUS.IN_PROGRESS
  ) : false;
  const isContentReviewing = subLesson?.status === SUB_LESSON_STATUS.REVIEWING;
  const isReadyForScorm = subLesson ? (
    subLesson.status === SUB_LESSON_STATUS.CONVERTING ||
    subLesson.status === SUB_LESSON_STATUS.SCORM_REVIEWING
  ) : false;
  const isScormReviewing = subLesson?.status === SUB_LESSON_STATUS.SCORM_REVIEWING;

  const canViewDocuments = Boolean(subLesson) && (
    isAdmin ||
    (isTeacher && isDrafting) ||
    (isExpert && isContentReviewing)
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
  const canSubmitForReview = Boolean(subLesson) && (isAdmin || isTeacher) && isDrafting && documentCount > 0;
  const canViewScorm = Boolean(subLesson) && (isAdmin || isTeacher || isExpert || isConverter);
  const canUploadScorm = Boolean(subLesson) && isReadyForScorm && (isAdmin || isConverter);
  const canCommentScorm = canViewScorm;
  const canSubmitScorm = Boolean(subLesson) && subLesson?.status === SUB_LESSON_STATUS.CONVERTING && currentScormPackage?.status === 'ready' && (isAdmin || isConverter);
  const canReviewScorm = isScormReviewing && (isAdmin || isExpert);

  // Expert / Admin review CONTENT
  const canReview = isContentReviewing && (isAdmin || isExpert);
  const visibleTabs = useMemo<Tab[]>(() => [
    ...(canViewDocuments ? (['documents'] as Tab[]) : []),
    ...(canViewScorm ? (['scorm'] as Tab[]) : []),
    'questions',
  ], [canViewDocuments, canViewScorm]);

  useEffect(() => {
    if (courseInfo?.assigned_expert_id) loadUser(courseInfo.assigned_expert_id);
    if (lessonInfo?.assigned_teacher_id) loadUser(lessonInfo.assigned_teacher_id);
    if (lessonInfo?.assigned_converter_id) loadUser(lessonInfo.assigned_converter_id);
  }, [courseInfo?.assigned_expert_id, lessonInfo?.assigned_teacher_id, lessonInfo?.assigned_converter_id, loadUser]);

  useEffect(() => {
    if (subLesson && courseInfo && lessonInfo) {
      setBreadcrumbs([
        { label: t('subLessons.breadcrumb'), href: '/courses' },
        { label: courseInfo.title, href: `/courses/${courseInfo.id}` },
        { label: lessonInfo.title, href: `/lessons/${lessonInfo.id}` },
        { label: subLesson.title },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [subLesson, courseInfo, lessonInfo, setBreadcrumbs, t]);

  const currentTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? 'questions');

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
        expert={courseInfo?.assigned_expert_id ? userCache[courseInfo.assigned_expert_id] : undefined}
        teacher={lessonInfo?.assigned_teacher_id ? userCache[lessonInfo.assigned_teacher_id] : undefined}
        converter={lessonInfo?.assigned_converter_id ? userCache[lessonInfo.assigned_converter_id] : undefined}
        hasExpert={Boolean(courseInfo?.assigned_expert_id)}
        hasTeacher={Boolean(lessonInfo?.assigned_teacher_id)}
        hasConverter={Boolean(lessonInfo?.assigned_converter_id)}
        reviewLogs={reviewLogs}
        isOpen={isInfoDrawerOpen}
        onToggle={() => setIsInfoDrawerOpen(open => !open)}
      />

      <SubLessonWorkflowStepper currentStatus={subLesson.status} />

      <div className="card overflow-hidden">
        <SubLessonTabs activeTab={currentTab} onTabChange={setActiveTab} visibleTabs={visibleTabs} />

        <div className="p-5">
          {currentTab === 'documents' && canViewDocuments && (
            <SubLessonDocumentsTab
              subLessonId={subLesson.id}
              subLessonStatus={subLesson.status}
              onRefresh={reload}
              onDocumentsChange={setDocumentCount}
              onPreviewOpen={() => setIsInfoDrawerOpen(false)}
              canUpload={canUploadDocuments}
              canPreview={canPreviewDocuments}
              canDownload={canDownloadDocuments}
              canComment={canCommentDocuments}
              canDelete={canDeleteDocuments}
            />
          )}
          {currentTab === 'scorm' && canViewScorm && (
            <SubLessonScormTab
              subLessonId={subLesson.id}
              canUpload={canUploadScorm}
              canComment={canCommentScorm}
              onRefresh={reload}
              onScormPackageChange={setCurrentScormPackage}
              onPreviewOpen={() => setIsInfoDrawerOpen(false)}
            />
          )}
          {currentTab === 'questions' && (
            <SubLessonQuestionsTab
              subLessonId={subLesson.id}
              canEdit={Boolean(isAdmin || isTeacher) && isDrafting}
              canReview={canReview}
            />
          )}
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
