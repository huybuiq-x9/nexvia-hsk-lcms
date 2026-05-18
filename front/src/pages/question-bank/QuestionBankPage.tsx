import { useState } from 'react';
import { Eye, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QuestionViewer } from '../../components/question';
import { useQuestions } from './hooks/useQuestions';
import type { ApiQuestionResponse, QuestionCategory, QuestionStatus, QuestionType } from '../../types/question';
import {
  QUESTION_CATEGORY,
  QUESTION_CATEGORY_COLORS,
  QUESTION_STATUS,
  QUESTION_STATUS_COLORS,
  QUESTION_TYPE,
} from '../../types/question';

const PAGE_SIZE = 20;

export default function QuestionBankPage() {
  const { t } = useTranslation();

  const TYPE_OPTIONS = [
    { value: '' as const, label: t('questions.filter.allTypes') },
    ...Object.values(QUESTION_TYPE).map(v => ({ value: v, label: t(`questions.type.${v}`) })),
  ];

  const CATEGORY_OPTIONS = [
    { value: '' as const,                    label: t('questions.filter.allCategories') },
    { value: QUESTION_CATEGORY.VOCABULARY,   label: t('questions.category_vocabulary') },
    { value: QUESTION_CATEGORY.GRAMMAR,      label: t('questions.category_grammar') },
    { value: QUESTION_CATEGORY.READING,      label: t('questions.category_reading') },
  ];

  const STATUS_OPTIONS = [
    { value: '' as const,               label: t('questions.filter.allStatuses') },
    { value: QUESTION_STATUS.DRAFT,     label: t('questions.status_draft') },
    { value: QUESTION_STATUS.PUBLISHED, label: t('questions.status_published') },
    { value: QUESTION_STATUS.ARCHIVED,  label: t('questions.status_archived') },
  ];

  const [typeFilter,     setTypeFilter]     = useState<QuestionType | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<QuestionCategory | ''>('');
  const [statusFilter,   setStatusFilter]   = useState<QuestionStatus | ''>('');
  const [page,           setPage]           = useState(0);
  const [viewing,        setViewing]        = useState<ApiQuestionResponse | null>(null);

  const { items, total, loading, error } = useQuestions({
    question_type: typeFilter    || undefined,
    category:      categoryFilter || undefined,
    status:        statusFilter  || undefined,
    skip:  page * PAGE_SIZE,
    limit: PAGE_SIZE,
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (viewing) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-slate-800">{t('questions.view')}</h1>
          <button type="button" onClick={() => setViewing(null)} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>
        <QuestionViewer question={viewing} readonly showAnswer showMeta />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-slate-800">{t('questions.title')}</h1>
        <p className="text-sm text-slate-500">{total} {t('questions.total')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value as QuestionCategory | ''); setPage(0); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value as QuestionType | ''); setPage(0); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as QuestionStatus | ''); setPage(0); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* List */}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-slate-500">{t('common.loading')}</p>}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <p className="text-sm">{t('questions.noResults')}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {items.map(q => (
          <div
            key={q.id}
            className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:border-slate-300 transition-colors"
          >
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-medium border px-2 py-0.5 rounded ${QUESTION_CATEGORY_COLORS[q.category]}`}>
                  {t(`questions.category_${q.category}`)}
                </span>
                <span className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                  {t(`questions.type.${q.question_type}`)}
                </span>
                <span className={`text-xs font-medium border px-2 py-0.5 rounded ${QUESTION_STATUS_COLORS[q.status]}`}>
                  {t(`questions.status_${q.status}`)}
                </span>
              </div>
              <p className="text-sm text-slate-700 line-clamp-2">
                {q.stem.text ?? `[${q.stem.type}]`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewing(q)}
                title={t('questions.view')}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <Eye size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center mt-2">
          <button
            type="button"
            onClick={() => setPage(p => p - 1)}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            ←
          </button>
          <span className="text-sm text-slate-500">{page + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
