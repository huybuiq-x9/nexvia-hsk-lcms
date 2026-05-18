import { useCallback, useEffect, useState } from 'react';
import { questionService } from '../../../services';
import type { ApiQuestionResponse, Difficulty, QuestionCategory, QuestionStatus, QuestionType } from '../../../types/question';

interface Filters {
  sub_lesson_id?: string;
  question_type?: QuestionType;
  category?: QuestionCategory;
  status?: QuestionStatus;
  difficulty?: Difficulty;
  skip?: number;
  limit?: number;
}

export function useQuestions(filters: Filters = {}) {
  const [items,   setItems]   = useState<ApiQuestionResponse[]>([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await questionService.list(filters);
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setError('Không tải được danh sách câu hỏi.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => { load(); }, [load]);

  return { items, total, loading, error, reload: load };
}
