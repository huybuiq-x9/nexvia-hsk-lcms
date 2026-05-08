import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubLesson } from './hooks/useSubLesson';
import { SubLessonBreadcrumb } from './components/SubLessonBreadcrumb';
import { SubLessonHeader } from './components/SubLessonHeader';
import { SubLessonWorkflowStepper } from './components/SubLessonWorkflowStepper';
import { SubLessonTabs } from './components/SubLessonTabs';
import { SubLessonDocumentsTab } from './components/SubLessonDocumentsTab';
import { SubLessonQuestionsTab } from './components/SubLessonQuestionsTab';
import { SubLessonScormTab } from './components/SubLessonScormTab';
import { SubLessonHistoryTab } from './components/SubLessonHistoryTab';
import { SubLessonActionModal } from './components/SubLessonActionModal';
import { API_ROLE, SUB_LESSON_STATUS } from '../../types/api';

type Tab = 'documents' | 'questions' | 'scorm' | 'history';
type ModalType = 'submit' | 'approve' | 'reject' | 'upload' | 'approve_scorm' | 'reject_scorm' | 'submit_scorm';

export default function SubLessonDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subLessonId } = useParams<{ subLessonId: string }>();
  const { isAdmin, isExpert, selectedRole } = useAuth();
  const { subLesson, lessonInfo, courseInfo, isLoading, reload } = useSubLesson(subLessonId);

  const [activeTab, setActiveTab] = useState<Tab>('documents');
  const [modal, setModal] = useState<{ type: ModalType; show: boolean }>({ type: 'submit', show: false });

  const isTeacher = selectedRole === API_ROLE.TEACHER || selectedRole === API_ROLE.CONVERTER;
  const isConverter = selectedRole === API_ROLE.CONVERTER;

  const isEditable = subLesson ? (
    subLesson.status === SUB_LESSON_STATUS.DRAFT ||
    subLesson.status === SUB_LESSON_STATUS.IN_PROGRESS
  ) : false;

  const canUploadDocuments = isEditable && (isAdmin || isTeacher);
  const canSubmitForReview = isEditable && (isAdmin || isTeacher);

  // Expert / Admin review CONTENT
  const canReview = subLesson?.status === SUB_LESSON_STATUS.REVIEWING && (isAdmin || isExpert);

  // Converter / Admin submit SCORM for review
  const canUploadScorm = subLesson?.status === SUB_LESSON_STATUS.CONVERTING && (isAdmin || isConverter);
  const canSubmitScorm = subLesson?.status === SUB_LESSON_STATUS.CONVERTING
    && Boolean(subLesson.scorm_filename)
    && (isAdmin || isConverter);

  // Expert / Admin review SCORM
  const canReviewScorm = subLesson?.status === SUB_LESSON_STATUS.SCORM_REVIEWING && (isAdmin || isExpert);

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
        subLesson={subLesson}
        lessonTitle={lessonInfo?.title}
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

      <SubLessonWorkflowStepper currentStatus={subLesson.status} />

      <div className="card overflow-hidden">
        <SubLessonTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="p-5">
          {activeTab === 'documents' && (
            <SubLessonDocumentsTab
              subLessonId={subLesson.id}
              subLessonStatus={subLesson.status}
              onRefresh={reload}
              canUpload={canUploadDocuments}
            />
          )}
          {activeTab === 'questions' && <SubLessonQuestionsTab />}
          {activeTab === 'scorm' && (
            <SubLessonScormTab
              subLessonId={subLesson.id}
              canUpload={canUploadScorm}
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
