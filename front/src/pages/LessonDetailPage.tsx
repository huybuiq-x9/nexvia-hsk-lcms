import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Plus,
  FileText,
  Users,
  User,
  Pencil,
  AlertCircle,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { courseService, userService } from '../services';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type {
  ApiLessonWithSubLessons,
  ApiSubLessonResponse,
  ApiUserWithRoles,
} from '../types/api';
import { API_ROLE, LESSON_STATUS_COLORS, SUB_LESSON_STATUS_COLORS } from '../types/api';

// ─── User Badge ────────────────────────────────────────────────────────────────

const UserBadge = ({ user }: { user: ApiUserWithRoles | null | undefined }) =>
  user ? (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
        <span className="text-blue-700 font-semibold text-xs">
          {user.full_name.split(' ').slice(-1)[0][0]?.toUpperCase() ?? '?'}
        </span>
      </div>
      <span className="text-sm text-slate-700">{user.full_name}</span>
    </div>
  ) : (
    <span className="text-sm text-slate-400 italic">—</span>
  );

// ─── Sub-lessons Editor ────────────────────────────────────────────────────────

interface SubLessonDraft {
  _key: string;
  _isDeleted?: boolean;
  title: string;
  description: string;
  order_index: number;
}

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

const SubLessonsEditor = ({
  lessonId,
  initialSubLessons,
  onSaved,
  onCancel,
}: {
  lessonId: string;
  initialSubLessons: ApiSubLessonResponse[];
  onSaved: (updated: ApiSubLessonResponse[]) => void;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [draft, setDraft] = useState<SubLessonDraft[]>(() =>
    [...initialSubLessons].sort((a, b) => a.order_index - b.order_index).map(sl => ({
      _key: sl.id,
      title: sl.title,
      description: sl.description ?? '',
      order_index: sl.order_index,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropZoneIdx, setDropZoneIdx] = useState<number | null>(null);

  const visible = draft.filter(sl => !sl._isDeleted).sort((a, b) => a.order_index - b.order_index);

  const update = (key: string, patch: Partial<SubLessonDraft>) => {
    setDraft(prev => prev.map(sl => sl._key === key ? { ...sl, ...patch } : sl));
  };

  const remove = (key: string) => {
    const sl = draft.find(s => s._key === key)!;
    if (sl._key.length === 36 && sl._key.includes('-')) {
      setDraft(prev => prev.map(s => s._key === key ? { ...s, _isDeleted: true } : s));
    } else {
      setDraft(prev => prev.filter(s => s._key !== key));
    }
  };

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDropZoneIdx(idx);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
      setDropZoneIdx(null);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragIdx === null) return;
    if (dragIdx === dropIdx || dragIdx === dropIdx - 1) {
      setDragIdx(null);
      setDropZoneIdx(null);
      return;
    }
    const reordered = [...visible];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(dropIdx, 0, moved);
    const reindexed = reordered.map((sl, i) => ({ ...sl, order_index: i }));
    const deleted = draft.filter(sl => sl._isDeleted);
    setDraft([...reindexed, ...deleted]);
    setDragIdx(null);
    setDropZoneIdx(null);
  };

  const handleSave = async () => {
    const toSave = draft.filter(sl => !sl._isDeleted);
    const existing = toSave.filter(sl => sl._key.length === 36 && sl._key.includes('-'));
    const created = toSave.filter(sl => !(sl._key.length === 36 && sl._key.includes('-')));
    const deletedIds = draft
      .filter(sl => sl._isDeleted && sl._key.length === 36 && sl._key.includes('-'))
      .map(sl => sl._key);

    if (toSave.some(sl => !sl.title.trim())) {
      toastError(t('courses.modal.validationLessonName'));
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        ...existing.map((sl, idx) =>
          courseService.updateSubLesson(sl._key, {
            title: sl.title.trim(),
            description: sl.description.trim() || null,
            order_index: idx,
          })
        ),
        ...created.map((sl, idx) =>
          courseService.createSubLesson(lessonId, {
            title: sl.title.trim(),
            description: sl.description.trim() || null,
            order_index: existing.length + idx,
          })
        ),
      ]);
      if (deletedIds.length > 0) {
        await courseService.deleteSubLessonBatch(lessonId, deletedIds);
      }
      success(t('courses.modal.updateSuccess'));
      // Refresh from server
      const updated = await courseService.getLesson(lessonId);
      onSaved(updated.sub_lessons);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('courses.modal.errorGeneric');
      toastError(t('courses.modal.errorGeneric'), msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Editor header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {t('courses.editSubLessons')}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {t('courses.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isSaving
              ? <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : null
            }
            {t('courses.saveChanges')}
          </button>
        </div>
      </div>

      {/* Sub-lesson list */}
      {visible.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400 italic">
          {t('courses.noSubLessons')}
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Top drop zone */}
          <div
            onDragOver={e => handleDragOver(e, 0)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, 0)}
            className={`h-1 rounded-full transition-all duration-100 ${
              dropZoneIdx === 0 && dragIdx !== null && dragIdx !== 0 ? 'h-1.5 bg-blue-400' : ''
            }`}
          />

          {visible.map((sl) => {
            const actualIdx = visible.indexOf(sl);
            const isDragging = dragIdx === actualIdx;
            const isExpanded = expandedKeys.has(sl._key);

            return (
              <div key={sl._key}>
                {/* Row */}
                <div
                  draggable
                  onDragStart={e => handleDragStart(e, actualIdx)}
                  onDragOver={e => handleDragOver(e, actualIdx)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, actualIdx)}
                  className={`flex items-start gap-2 border rounded-lg px-3 py-2.5 transition-all ${
                    isDragging
                      ? 'opacity-40 border-blue-300 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div
                    draggable="false"
                    className="w-5 h-5 flex items-center justify-center rounded text-slate-400 shrink-0 mt-0.5 cursor-grab active:cursor-grabbing"
                  >
                    <GripVertical size={13} />
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(sl._key)}
                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 shrink-0 mt-0.5 transition-colors"
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={sl.title}
                      onChange={e => update(sl._key, { title: e.target.value })}
                      placeholder={t('courses.subLessonNamePlaceholder2')}
                      className="w-full text-sm font-medium bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(sl._key)}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-slate-400 hover:text-red-500 shrink-0 transition-colors"
                    title="Xóa"
                  >
                    <X size={13} />
                  </button>
                </div>

                {/* Expanded description */}
                {isExpanded && (
                  <div className="ml-10 mt-1">
                    <textarea
                      value={sl.description}
                      onChange={e => update(sl._key, { description: e.target.value })}
                      placeholder={t('courses.subLessonDescriptionPlaceholder')}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-none bg-white"
                      rows={2}
                    />
                  </div>
                )}

                {/* Gap drop zone */}
                <div
                  onDragOver={e => handleDragOver(e, actualIdx + 1)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, actualIdx + 1)}
                  className={`h-1 rounded-full transition-all duration-100 ${
                    dropZoneIdx === actualIdx + 1 && dragIdx !== null && dragIdx !== actualIdx + 1
                      ? 'h-1.5 bg-blue-400'
                      : ''
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Add sub-lesson */}
      <button
        type="button"
        onClick={() => {
          const newSl: SubLessonDraft = {
            _key: makeKey(),
            title: '',
            description: '',
            order_index: visible.length,
          };
          setDraft(prev => [...prev, newSl]);
          setExpandedKeys(prev => {
            const next = new Set(prev);
            next.add(newSl._key);
            return next;
          });
        }}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors py-1"
      >
        <Plus size={14} />
        {t('courses.addSubLessonBtn')}
      </button>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LessonDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { isAdmin, selectedRole } = useAuth();
  const canManageSubLessons =
    isAdmin || selectedRole === API_ROLE.TEACHER || selectedRole === API_ROLE.CONVERTER;

  const [lesson, setLesson] = useState<ApiLessonWithSubLessons | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditingSubLessons, setIsEditingSubLessons] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, ApiUserWithRoles>>({});

  const loadUser = useCallback((id: string) => {
    if (!id || userCache[id]) return;
    userService.getUser(id).then(u => {
      setUserCache(c => ({ ...c, [id]: u }));
    }).catch(() => {});
  }, [userCache]);

  const loadLesson = useCallback(async () => {
    if (!lessonId) return;
    try {
      const data = await courseService.getLesson(lessonId);
      setLesson(data);
    } catch {
      setLesson(null);
    }
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    (async () => {
      setIsLoading(true);
      try {
        await loadLesson();
      } catch {
        setLesson(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [lessonId, loadLesson]);

  useEffect(() => {
    if (!lesson?.course_id) return;
    courseService.getCourse(lesson.course_id).then(c => {
      setCourseTitle(c.title);
      setCourseId(c.id);
      loadUser(c.assigned_expert_id);
    }).catch(() => {});
    if (lesson.assigned_teacher_id) loadUser(lesson.assigned_teacher_id);
    if (lesson.assigned_converter_id) loadUser(lesson.assigned_converter_id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.course_id, lesson?.assigned_teacher_id, lesson?.assigned_converter_id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-20 text-slate-400">
        <p>{t('courses.modal.notFound')}</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">{t('courses.backToList')}</button>
      </div>
    );
  }

  const teacher = lesson.assigned_teacher_id ? userCache[lesson.assigned_teacher_id] : null;
  const converter = lesson.assigned_converter_id ? userCache[lesson.assigned_converter_id] : null;

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-slate-500">
        <button
          onClick={() => navigate(`/courses/${courseId}`)}
          className="hover:text-slate-700 transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={14} />
          Quay lại
        </button>
        <ChevronRight size={14} />
        <span className="truncate max-w-[200px]">{courseTitle}</span>
        <ChevronRight size={14} />
        <span className="text-slate-800 font-medium truncate max-w-[200px]">{lesson.title}</span>
      </div>

      {/* Header */}
      <div className="card p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${LESSON_STATUS_COLORS[lesson.status] ?? ''}`}>
                {lesson.status}
              </span>
              <h1 className="text-xl font-bold text-slate-900 mt-2">{lesson.title}</h1>
              {lesson.description && (
                <p className="text-sm text-slate-500 mt-1">{lesson.description}</p>
              )}
            </div>
            {canManageSubLessons && (
              <button
                onClick={() => setIsEditingSubLessons(true)}
                className="btn btn-primary flex items-center gap-1.5 text-sm shrink-0"
              >
                <Pencil size={14} />
                {t('courses.edit')}
              </button>
            )}
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div>
            <div className="text-xs text-slate-400">{t('courses.lessonDetail.subLessonCount')}</div>
            <div className="text-sm font-medium text-slate-800">{lesson.sub_lessons.length}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{t('courses.lessonDetail.updatedAt')}</div>
            <div className="text-sm font-medium text-slate-800">
              {new Date(lesson.updated_at).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">{t('courses.lessonDetail.createdAt')}</div>
            <div className="text-sm font-medium text-slate-800">
              {new Date(lesson.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Assignees */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Users size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">{t('courses.lessonDetail.teacher')}</span>
            <UserBadge user={teacher} />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">{t('courses.lessonDetail.converter')}</span>
            <UserBadge user={converter} />
          </div>
        </div>
      </div>

      {/* Sub-lessons */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">{t('courses.lessonDetail.subLessons')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {lesson.sub_lessons.length} {t('courses.lessons')}
            </p>
          </div>
          {canManageSubLessons && !isEditingSubLessons && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary flex items-center gap-1.5 text-sm"
            >
              <Plus size={14} />
              {t('courses.modal.addSubLesson')}
            </button>
          )}
        </div>

        <div className="p-5">
          {isEditingSubLessons ? (
            <SubLessonsEditor
              lessonId={lesson.id}
              initialSubLessons={lesson.sub_lessons}
              onSaved={(updated) => {
                setLesson(prev => prev ? { ...prev, sub_lessons: updated } : prev);
                setIsEditingSubLessons(false);
              }}
              onCancel={() => setIsEditingSubLessons(false)}
            />
          ) : lesson.sub_lessons.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400 italic space-y-3">
              <FileText size={36} className="mx-auto opacity-40" />
              <p>{t('courses.noSubLessons')}</p>
              {canManageSubLessons && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-secondary flex items-center gap-1.5 mx-auto text-sm"
                >
                  <Plus size={14} />
                  Tạo bài học con đầu tiên
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {lesson.sub_lessons.map((sl, idx) => (
                <Link
                  key={sl.id}
                  to={`/sub-lessons/${sl.id}`}
                  className="flex items-center gap-3 px-3 py-3.5 hover:bg-blue-50/50 transition-all group"
                >
                  <span className="text-xs text-slate-400 w-5 shrink-0">{idx + 1}</span>
                  <FileText size={15} className="text-slate-400 group-hover:text-blue-500 transition-colors shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                      {sl.title}
                    </div>
                    {sl.description && (
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{sl.description}</div>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${SUB_LESSON_STATUS_COLORS[sl.status] ?? ''}`}>
                    {sl.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <CreateSubLessonModal
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newSl) => {
            setShowCreateModal(false);
            setLesson(prev => prev ? {
              ...prev,
              sub_lessons: [...prev.sub_lessons, newSl],
            } : prev);
          }}
        />
      )}
    </div>
  );
}

// ─── Create SubLesson Modal ────────────────────────────────────────────────────

const CreateSubLessonModal = ({
  lessonId,
  lessonTitle,
  onClose,
  onCreated,
}: {
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
  onCreated: (newSubLesson: ApiSubLessonResponse) => void;
}) => {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError(t('courses.modal.validationLessonName'));
      return;
    }
    setFormError('');
    setIsSaving(true);
    try {
      const sl = await courseService.createSubLesson(lessonId, {
        title: title.trim(),
        description: description.trim() || null,
        order_index: 0,
      });
      success(t('courses.modal.createSubLessonSuccess'));
      onCreated(sl);
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        || t('courses.modal.errorGeneric');
      toastError(t('courses.modal.errorGeneric'), msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{lessonTitle}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
              <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{formError}</p>
            </div>
          )}

          <div>
            <label className="label">
              {t('courses.modal.subLessonName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('courses.modal.subLessonNamePlaceholder')}
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="label">{t('courses.modal.description')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={t('courses.modal.descriptionPlaceholder')}
              className="input resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn btn-secondary flex-1 justify-center">
              {t('courses.modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn btn-primary flex-1 justify-center disabled:opacity-50"
            >
              {isSaving
                ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : t('courses.modal.submitCreate')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
