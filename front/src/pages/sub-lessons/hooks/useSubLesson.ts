import { useState, useEffect, useCallback } from 'react';
import { courseService } from '../../../services';
import type { ApiReviewLog, ApiSubLessonResponse } from '../../../types/api';

interface LessonInfo {
  id: string;
  title: string;
  course_id: string;
}

interface CourseInfo {
  id: string;
  title: string;
}

export function useSubLesson(subLessonId: string | undefined) {
  const [subLesson, setSubLesson] = useState<ApiSubLessonResponse | null>(null);
  const [reviewLogs, setReviewLogs] = useState<ApiReviewLog[]>([]);
  const [lessonInfo, setLessonInfo] = useState<LessonInfo | null>(null);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubLesson = useCallback(async () => {
    if (!subLessonId) return;
    try {
      const [sl, logs] = await Promise.all([
        courseService.getSubLesson(subLessonId),
        courseService.listSubLessonReviewLogs(subLessonId).catch(() => ({ total: 0, items: [] })),
      ]);
      setSubLesson(sl);
      setReviewLogs(logs.items);
    } catch {
      setSubLesson(null);
      setReviewLogs([]);
    }
  }, [subLessonId]);

  useEffect(() => {
    if (!subLessonId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setIsLoading(true);
      loadSubLesson()
        .catch(() => {
          if (!cancelled) {
            setSubLesson(null);
            setReviewLogs([]);
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    });
    return () => { cancelled = true; };
  }, [subLessonId, loadSubLesson]);

  useEffect(() => {
    if (!subLesson?.lesson_id) return;
    courseService.getLesson(subLesson.lesson_id).then(lesson => {
      setLessonInfo({ id: lesson.id, title: lesson.title, course_id: lesson.course_id });
      courseService.getCourse(lesson.course_id).then(course => {
        setCourseInfo({ id: course.id, title: course.title });
      }).catch(() => {});
    }).catch(() => {});
  }, [subLesson?.lesson_id]);

  return {
    subLesson,
    reviewLogs,
    lessonInfo,
    courseInfo,
    isLoading,
    reload: loadSubLesson,
  };
}
