import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X, Eye, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { MultiQuestionForm, QuestionForm, QuestionViewer } from '../../../components/question';
import { useQuestions } from '../../question-bank/hooks/useQuestions';
import { questionService } from '../../../services';
import { useToast } from '../../../contexts/ToastContext';
import type { ApiQuestionResponse } from '../../../types/question';
import {
  DIFFICULTY_COLORS,
  QUESTION_STATUS_COLORS,
} from '../../../types/question';

interface Props {
  subLessonId: string;
  canEdit: boolean;    // teacher + in_progress/draft
  canReview: boolean;  // expert + reviewing
}

export function SubLessonQuestionsTab({ subLessonId, canEdit, canReview }: Props) {
  const { t } = useTranslation();
  const toast = useToast();

  const { items, loading, error, reload } = useQuestions({ sub_lesson_id: subLessonId });

  const [panel, setPanel] = useState<'list' | 'create' | 'edit' | 'view'>('list');
  const [selected, setSelected] = useState<ApiQuestionResponse | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(q: ApiQuestionResponse) {
    if (!window.confirm(t('questions.confirmDelete'))) return;
    setDeleting(q.id);
    try {
      await questionService.delete(q.id);
      toast.success(t('questions.deleteSuccess'));
      reload();
    } catch {
      toast.error(t('questions.deleteError'));
    } finally {
      setDeleting(null);
    }
  }

  async function handlePublish(q: ApiQuestionResponse) {
    try {
      await questionService.publish(q.id);
      toast.success(t('questions.publishSuccess'));
      reload();
    } catch {
      toast.error(t('questions.publishError'));
    }
  }

  async function handleReject(q: ApiQuestionResponse) {
    const comment = window.prompt(t('questions.rejectComment')) ?? undefined;
    try {
      await questionService.reject(q.id, comment);
      toast.success(t('questions.rejectSuccess'));
      reload();
    } catch {
      toast.error(t('questions.rejectError'));
    }
  }

  // ── Form panel ────────────────────────────────────────────────────────────

  if (panel === 'create') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">{t('questions.createTitle')}</h2>
          <button type="button" onClick={() => { setPanel('list'); setSelected(null); reload(); }} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <MultiQuestionForm
          subLessonId={subLessonId}
          onAllSaved={() => { setPanel('list'); setSelected(null); reload(); }}
          onCancel={() => { setPanel('list'); setSelected(null); reload(); }}
        />
      </div>
    );
  }

  if (panel === 'edit') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">{t('questions.editTitle')}</h2>
          <button type="button" onClick={() => { setPanel('list'); setSelected(null); }} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <QuestionForm
          subLessonId={subLessonId}
          questionId={selected?.id}
          initialData={selected ?? undefined}
          onSaved={() => { setPanel('list'); setSelected(null); reload(); }}
          onCancel={() => { setPanel('list'); setSelected(null); }}
        />
      </div>
    );
  }

  if (panel === 'view' && selected) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">{t('questions.viewTitle')}</h2>
          <button type="button" onClick={() => { setPanel('list'); setSelected(null); }} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <QuestionViewer question={selected} quizMode showMeta />
        {canReview && selected.status === 'draft' && (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { handleReject(selected); setPanel('list'); }}
              className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
            >
              {t('questions.reject')}
            </button>
            <button
              type="button"
              onClick={() => { handlePublish(selected); setPanel('list'); }}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('questions.approve')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── List panel ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setSelected(null); setPanel('create'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Plus size={14} /> {t('courses.createQuestion')}
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-slate-500">{t('questions.loading')}</p>}

      {!loading && items.length === 0 && (
        <EmptyState
          icon={<HelpCircle size={40} className="opacity-50" />}
          message={t('courses.noQuestions')}
          action={
            canEdit ? (
              <button
                type="button"
                onClick={() => { setSelected(null); setPanel('create'); }}
                className="btn btn-secondary flex items-center gap-2 mx-auto"
              >
                <Plus size={14} /> {t('courses.createQuestion')}
              </button>
            ) : undefined
          }
        />
      )}

      <div className="flex flex-col gap-2">
        {items.map(q => (
          <div key={q.id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                  {t(`questions.type.${q.question_type}`)}
                </span>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded ${DIFFICULTY_COLORS[q.difficulty]}`}>
                  {t(`questions.difficulty_${q.difficulty}`)}
                </span>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded ${QUESTION_STATUS_COLORS[q.status]}`}>
                  {t(`questions.status_${q.status}`)}
                </span>
              </div>
              <p className="text-sm text-slate-700 line-clamp-2">{q.stem.text ?? `[${q.stem.type}]`}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => { setSelected(q); setPanel('view'); }}
                title={t('questions.view')}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <Eye size={15} />
              </button>
              {canEdit && q.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => { setSelected(q); setPanel('edit'); }}
                  title={t('questions.edit')}
                  className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Pencil size={15} />
                </button>
              )}
              {canReview && q.status === 'draft' && (
                <>
                  <button
                    type="button"
                    onClick={() => handlePublish(q)}
                    title={t('questions.approve')}
                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                  >
                    <CheckCircle size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(q)}
                    title={t('questions.reject')}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                  >
                    <XCircle size={15} />
                  </button>
                </>
              )}
              {canEdit && q.status === 'draft' && (
                <button
                  type="button"
                  onClick={() => handleDelete(q)}
                  disabled={deleting === q.id}
                  title={t('questions.delete')}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
