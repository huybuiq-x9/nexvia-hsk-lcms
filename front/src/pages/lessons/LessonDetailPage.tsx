import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ChevronRight,
  Plus,
  FileText,
  Users,
  User,
  UserCheck,
  Pencil,
  X,
  GripVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { courseService, userService } from '../../services';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { CollapsibleDrawer } from '../../components/ui/CollapsibleDrawer';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type {
  ApiLessonWithSubLessons,
  ApiSubLessonResponse,
  ApiUserWithRoles,
} from '../../types/api';


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

      <div className="flex gap-3 pt-3 border-t border-slate-100">
        <button
          onClick={onCancel}
          className="btn btn-secondary flex-1 justify-center"
        >
          {t('courses.cancel')}
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary flex-1 justify-center disabled:opacity-50"
        >
          {isSaving
            ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : t('courses.saveChanges')
          }
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LessonDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();
  const { isAdmin, isTeacher, isConverter } = useAuth();
  const { setBreadcrumbs } = useBreadcrumbs();
  const canManageSubLessons = isAdmin || isTeacher || isConverter;

  const [lesson, setLesson] = useState<ApiLessonWithSubLessons | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [courseId, setCourseId] = useState<string>('');
  const [assignedExpertId, setAssignedExpertId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingSubLessons, setIsEditingSubLessons] = useState(false);
  const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false);
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
      setAssignedExpertId(c.assigned_expert_id);
      loadUser(c.assigned_expert_id);
    }).catch(() => {});
    if (lesson.assigned_teacher_id) loadUser(lesson.assigned_teacher_id);
    if (lesson.assigned_converter_id) loadUser(lesson.assigned_converter_id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.course_id, lesson?.assigned_teacher_id, lesson?.assigned_converter_id]);

  useEffect(() => {
    if (lesson && courseTitle) {
      setBreadcrumbs([
        { label: t('nav.courses'), href: '/courses' },
        { label: courseTitle, href: `/courses/${courseId || lesson.course_id}` },
        { label: lesson.title },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [lesson, courseTitle, courseId, setBreadcrumbs, t]);

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

  const expert = assignedExpertId ? userCache[assignedExpertId] : null;
  const teacher = lesson.assigned_teacher_id ? userCache[lesson.assigned_teacher_id] : null;
  const converter = lesson.assigned_converter_id ? userCache[lesson.assigned_converter_id] : null;

  return (
    <div className="space-y-5">
      <CollapsibleDrawer
        isOpen={isInfoDrawerOpen}
        onToggle={() => setIsInfoDrawerOpen(open => !open)}
        openLabel="Open lesson information"
        closeLabel="Close lesson information"
      >
        <div className="p-5 space-y-5">
          <div>
            <StatusBadge status={lesson.status} type="lesson" />
            <h1 className="text-xl font-bold text-slate-900 mt-2 break-words">{lesson.title}</h1>
            {lesson.description && (
              <p className="text-sm text-slate-500 mt-1 break-words">{lesson.description}</p>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <div className="text-xs text-slate-400">{t('courses.lessonDetail.subLessonCount')}</div>
              <div className="text-sm font-medium text-slate-800 mt-0.5">{lesson.sub_lessons.length}</div>
            </div>
            {lesson.sub_lessons.length > 0 && (() => {
              const approved = lesson.sub_lessons.filter(sl => sl.status === 'approved').length;
              const total = lesson.sub_lessons.length;
              const pct = Math.round((approved / total) * 100);
              return (
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Progress</div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{approved}/{total} sub-lessons approved</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
            <div>
              <div className="text-xs text-slate-400">{t('courses.lessonDetail.updatedAt')}</div>
              <div className="text-sm font-medium text-slate-800 mt-0.5">
                {new Date(lesson.updated_at).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400">{t('courses.lessonDetail.createdAt')}</div>
              <div className="text-sm font-medium text-slate-800 mt-0.5">
                {new Date(lesson.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <UserCheck size={14} />
                <span>{t('courses.modal.expert')}</span>
              </div>
              <UserBadge user={expert} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Users size={14} />
                <span>{t('courses.lessonDetail.teacher')}</span>
              </div>
              <UserBadge user={teacher} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <User size={14} />
                <span>{t('courses.lessonDetail.converter')}</span>
              </div>
              <UserBadge user={converter} />
            </div>
          </div>
        </div>
      </CollapsibleDrawer>

      {/* Sub-lessons */}
      {(() => {
        const total = lesson.sub_lessons.length;
        const approvedSl = lesson.sub_lessons.filter(sl => sl.status === 'approved').length;
        const reviewingSl = lesson.sub_lessons.filter(sl => sl.status === 'reviewing').length;
        const scormReviewingSl = lesson.sub_lessons.filter(sl => sl.status === 'scorm_reviewing').length;
        const convertingSl = lesson.sub_lessons.filter(sl => sl.status === 'converting').length;
        const inProgressSl = lesson.sub_lessons.filter(sl => sl.status === 'in_progress').length;
        const draftSl = lesson.sub_lessons.filter(sl => sl.status === 'draft').length;
        const pct = total > 0 ? Math.round((approvedSl / total) * 100) : 0;

        function slAccent(status: string) {
          if (status === 'approved') return 'bg-emerald-500';
          if (status === 'reviewing') return 'bg-amber-400';
          if (status === 'converting') return 'bg-violet-500';
          if (status === 'scorm_reviewing') return 'bg-cyan-500';
          if (status === 'in_progress') return 'bg-blue-500';
          return 'bg-slate-400';
        }

        return (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Title + count */}
              <h2 className="font-semibold text-slate-900 shrink-0">{t('courses.lessonDetail.subLessons')}</h2>

              {/* Progress bar */}
              {total > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400 tabular-nums shrink-0">{approvedSl}/{total} {t('subLessons.status.approved')}</span>
                  <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 tabular-nums shrink-0">{pct}%</span>
                </div>
              )}

              {/* Status badges + Edit button — pushed to the right */}
              <div className="flex items-center gap-1.5 ml-auto flex-wrap">
                {total > 0 && (
                  <>
                    {draftSl > 0 && (
                      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-700">{draftSl}</span>
                        <span className="text-[11px] text-slate-500">{t('subLessons.status.draft')}</span>
                      </div>
                    )}
                    {inProgressSl > 0 && (
                      <div className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-xs font-semibold text-blue-700">{inProgressSl}</span>
                        <span className="text-[11px] text-blue-600">{t('subLessons.status.in_progress')}</span>
                      </div>
                    )}
                    {reviewingSl > 0 && (
                      <div className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-xs font-semibold text-amber-700">{reviewingSl}</span>
                        <span className="text-[11px] text-amber-600">{t('subLessons.status.reviewing')}</span>
                      </div>
                    )}
                    {convertingSl > 0 && (
                      <div className="flex items-center gap-1 rounded-full border border-violet-100 bg-violet-50 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                        <span className="text-xs font-semibold text-violet-700">{convertingSl}</span>
                        <span className="text-[11px] text-violet-600">{t('subLessons.status.converting')}</span>
                      </div>
                    )}
                    {scormReviewingSl > 0 && (
                      <div className="flex items-center gap-1 rounded-full border border-cyan-100 bg-cyan-50 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />
                        <span className="text-xs font-semibold text-cyan-700">{scormReviewingSl}</span>
                        <span className="text-[11px] text-cyan-600">{t('subLessons.status.scorm_reviewing')}</span>
                      </div>
                    )}
                    {approvedSl > 0 && (
                      <div className="flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-xs font-semibold text-emerald-700">{approvedSl}</span>
                        <span className="text-[11px] text-emerald-600">{t('subLessons.status.approved')}</span>
                      </div>
                    )}
                  </>
                )}

                {canManageSubLessons && !isEditingSubLessons && (
                  <button
                    onClick={() => setIsEditingSubLessons(true)}
                    className="btn btn-primary flex items-center gap-1.5 text-sm shrink-0"
                  >
                    <Pencil size={14} />
                    {t('courses.edit')}
                  </button>
                )}
              </div>
            </div>
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
              </div>
            ) : (
              <div className="divide-y divide-slate-100 -mx-5">
                {lesson.sub_lessons.map((sl, idx) => (
                  <Link
                    key={sl.id}
                    to={`/sub-lessons/${sl.id}`}
                    className="relative flex items-center gap-3 pl-8 pr-5 py-3.5 hover:bg-blue-50/50 transition-all group"
                  >
                    <span className={`absolute left-0 top-0 h-full w-1 ${slAccent(sl.status)}`} />
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
                    <StatusBadge status={sl.status} type="subLesson" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}
