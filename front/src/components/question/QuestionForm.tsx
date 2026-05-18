import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TrueFalseEditor, { buildTFChoices } from './editors/TrueFalseEditor';
import ChoiceEditor from './editors/ChoiceEditor';
import FillEditor from './editors/FillEditor';
import SequenceEditor from './editors/SequenceEditor';
import MatchingEditor from './editors/MatchingEditor';
import PairMatchEditor from './editors/PairMatchEditor';
import ContentBlockEditor from './ContentBlockEditor';
import QuestionViewer, { type QuestionAnswer } from './QuestionViewer';
import type {
  ApiQuestionCreate,
  ApiQuestionChoiceCreate,
  ApiQuestionBlankCreate,
  ContentBlock,
  QuestionType,
  ApiQuestionResponse,
  MediaUploadTarget,
} from '../../types/question';
import {
  CONTENT_MEDIA_TYPE,
  DIFFICULTY,
  QUESTION_CATEGORY,
  QUESTION_TYPE,
} from '../../types/question';
import type { QuestionCategory } from '../../types/question';
import { questionService } from '../../services';
import { useToast } from '../../contexts/ToastContext';

const TYPE_GROUP_KEYS = ['choice', 'fill', 'interact'] as const;
type TypeGroupKey = typeof TYPE_GROUP_KEYS[number];

const TYPE_GROUP_MAP: Record<QuestionType, TypeGroupKey> = {
  [QUESTION_TYPE.TF]:         'choice',
  [QUESTION_TYPE.SC]:         'choice',
  [QUESTION_TYPE.MC]:         'choice',
  [QUESTION_TYPE.FIT]:        'fill',
  [QUESTION_TYPE.FITS]:       'fill',
  [QUESTION_TYPE.FIB]:        'fill',
  [QUESTION_TYPE.SQ]:         'interact',
  [QUESTION_TYPE.MAT]:        'interact',
  [QUESTION_TYPE.PAIR_MATCH]: 'interact',
};

interface Props {
  subLessonId?: string;
  questionId?: string;
  initialData?: ApiQuestionResponse;
  onSaved?: (q: ApiQuestionResponse) => void;
  onCancel?: () => void;
  /** When true, show a compact card header with collapse toggle */
  cardMode?: boolean;
  cardIndex?: number;
}

type MatchingPair = {
  source: ApiQuestionChoiceCreate;
  target: ApiQuestionChoiceCreate;
};

type PairMatchPair = {
  left:  ApiQuestionChoiceCreate;
  right: ApiQuestionChoiceCreate;
};

// Keyed by slot path: "stem", "explanation", "choice_0", "pair_source_0", "pair_target_0", etc.
type PendingFiles = Map<string, File>;

const emptyTextBlock = (): ContentBlock => ({ type: CONTENT_MEDIA_TYPE.TEXT, text: '' });

export default function QuestionForm({
  subLessonId, questionId, initialData, onSaved, onCancel, cardMode, cardIndex,
}: Props) {
  const toast = useToast();
  const { t } = useTranslation();

  const [qType,    setQType]    = useState<QuestionType>(initialData?.question_type ?? QUESTION_TYPE.SC);
  const [category, setCategory] = useState<QuestionCategory>(initialData?.category ?? QUESTION_CATEGORY.VOCABULARY);
  const [stem,       setStem]       = useState<ContentBlock>(initialData?.stem ?? emptyTextBlock());
  const [explanation, setExplanation] = useState<ContentBlock | null>(initialData?.explanation ?? null);
  const [choices,    setChoices]    = useState<ApiQuestionChoiceCreate[]>(
    initialData?.choices.map(c => ({
      content: c.content, is_correct: c.is_correct, order_index: c.order_index,
      correct_order: c.correct_order, group_name: c.group_name, match_id: c.match_id ?? undefined,
    })) ?? []
  );
  const initialType = initialData?.question_type ?? QUESTION_TYPE.SC;
  const defaultBlank: ApiQuestionBlankCreate[] = ['fit', 'fits', 'fib'].includes(initialType)
    ? [{ blank_index: 1, accepted_answers: [''], case_sensitive: false }]
    : [];
  const [blanks, setBlanks] = useState<ApiQuestionBlankCreate[]>(
    initialData?.blanks.length
      ? initialData.blanks.map(b => ({
          blank_index: b.blank_index, accepted_answers: b.accepted_answers, case_sensitive: b.case_sensitive,
        }))
      : defaultBlank
  );
  const [tfCorrect, setTfCorrect] = useState<boolean>(
    initialData?.choices.find(c => c.content.text === 'true' || c.content.text === 'Đúng' || c.content.text === 'True')?.is_correct ?? true
  );
  const [matchingPairs, setMatchingPairs] = useState<MatchingPair[]>(() => {
    const srcs = initialData?.choices.filter(c => c.group_name === 'source') ?? [];
    const tgts = initialData?.choices.filter(c => c.group_name === 'target') ?? [];
    if (!srcs.length) return [
      { source: { content: emptyTextBlock(), group_name: 'source', order_index: 0 },
        target: { content: emptyTextBlock(), group_name: 'target', order_index: 0 } },
    ];
    return srcs.map((s, i) => ({
      source: { content: s.content, group_name: 'source', order_index: s.order_index },
      target: { content: tgts[i]?.content ?? emptyTextBlock(), group_name: 'target', order_index: i },
    }));
  });
  const [pairMatchPairs, setPairMatchPairs] = useState<PairMatchPair[]>(() => {
    const lefts  = initialData?.choices.filter(c => c.group_name === 'left')  ?? [];
    const rights = initialData?.choices.filter(c => c.group_name === 'right') ?? [];
    if (!lefts.length) return [
      { left:  { content: emptyTextBlock(), group_name: 'left',  order_index: 0 },
        right: { content: emptyTextBlock(), group_name: 'right', order_index: 0 } },
    ];
    return lefts.map((l, i) => ({
      left:  { content: l.content, group_name: 'left',  order_index: l.order_index },
      right: { content: rights[i]?.content ?? emptyTextBlock(), group_name: 'right', order_index: i },
    }));
  });

  const [saving,        setSaving]        = useState(false);
  const [preview,       setPreview]       = useState(false);
  const [previewAnswer, setPreviewAnswer] = useState<QuestionAnswer | undefined>(undefined);
  const [savedId,       setSavedId]       = useState<string | undefined>(questionId);
  const [collapsed,     setCollapsed]     = useState(false);

  // Pending files: slot key → File
  const pendingFilesRef    = useRef<PendingFiles>(new Map());
  // Local blob URLs for preview (not stored in stem/choices to avoid conflicts with ContentBlockEditor)
  const pendingLocalUrls   = useRef<Map<string, string>>(new Map());

  // ── Pending file registration ─────────────────────────────────────────────

  function setPending(slot: string, file: File) {
    pendingFilesRef.current.set(slot, file);
  }

  function clearPending(slot: string) {
    pendingFilesRef.current.delete(slot);
  }

  // ── Upload helpers (used after question is created) ───────────────────────

  async function uploadFile(id: string, target: MediaUploadTarget, file: File, choiceId?: string) {
    return questionService.uploadMedia(id, target, file, choiceId);
  }

  // ── Build payload ─────────────────────────────────────────────────────────

  function buildChoices(): ApiQuestionChoiceCreate[] {
    switch (qType) {
      case 'tf':   return buildTFChoices(tfCorrect);
      case 'sc':
      case 'mc':   return choices;
      case 'sq':   return choices.map((c, i) => ({ ...c, correct_order: i, order_index: i }));
      case 'mat': {
        const result: ApiQuestionChoiceCreate[] = [];
        for (const p of matchingPairs) {
          result.push({ ...p.source, group_name: 'source' });
          result.push({ ...p.target, group_name: 'target' });
        }
        return result;
      }
      case 'pair_match': {
        const result: ApiQuestionChoiceCreate[] = [];
        for (const p of pairMatchPairs) {
          result.push({ ...p.left,  group_name: 'left' });
          result.push({ ...p.right, group_name: 'right' });
        }
        return result;
      }
      default: return [];
    }
  }

  function buildBlanks(): ApiQuestionBlankCreate[] {
    if (!['fit', 'fits', 'fib'].includes(qType)) return [];
    if (blanks.length === 0) return [{ blank_index: 1, accepted_answers: [''], case_sensitive: false }];
    return blanks;
  }

  // ── Upload all pending files after question create/update ─────────────────

  async function flushPendingFiles(id: string, savedQuestion: ApiQuestionResponse) {
    const pending = pendingFilesRef.current;
    if (pending.size === 0) return savedQuestion;

    const updates: Record<string, ContentBlock> = {};

    for (const [slot, file] of pending.entries()) {
      try {
        if (slot === 'stem') {
          const r = await uploadFile(id, 'stem', file);
          updates['stem'] = { ...(updates['stem'] ?? stem), media_key: r.media_key, media_url: r.media_url, original_filename: r.original_filename };
        } else if (slot === 'stem_image') {
          const r = await uploadFile(id, 'stem_image', file);
          updates['stem'] = { ...(updates['stem'] ?? stem), image_key: r.media_key, image_url: r.media_url, image_filename: r.original_filename };
        } else if (slot === 'stem_audio') {
          const r = await uploadFile(id, 'stem_audio', file);
          updates['stem'] = { ...(updates['stem'] ?? stem), audio_key: r.media_key, audio_url: r.media_url, audio_filename: r.original_filename };
        } else if (slot === 'explanation') {
          const r = await uploadFile(id, 'explanation', file);
          updates['explanation'] = { ...(updates['explanation'] ?? explanation ?? emptyTextBlock()), media_key: r.media_key, media_url: r.media_url, original_filename: r.original_filename };
        } else if (slot === 'explanation_image') {
          const r = await uploadFile(id, 'explanation_image', file);
          updates['explanation'] = { ...(updates['explanation'] ?? explanation ?? emptyTextBlock()), image_key: r.media_key, image_url: r.media_url, image_filename: r.original_filename };
        } else if (slot === 'explanation_audio') {
          const r = await uploadFile(id, 'explanation_audio', file);
          updates['explanation'] = { ...(updates['explanation'] ?? explanation ?? emptyTextBlock()), audio_key: r.media_key, audio_url: r.media_url, audio_filename: r.original_filename };
        } else if (slot.startsWith('choice_')) {
          const idx = parseInt(slot.replace('choice_', ''), 10);
          const choiceId = savedQuestion.choices[idx]?.id;
          if (choiceId) {
            const r = await uploadFile(id, 'choice', file, choiceId);
            updates[slot] = { ...savedQuestion.choices[idx].content, media_key: r.media_key, media_url: r.media_url, original_filename: r.original_filename };
          }
        }
      } catch {
        toast.error(`Lỗi upload file cho slot ${slot}.`);
      }
    }

    // If we have any updates, patch the question
    const hasStemUpdate        = 'stem' in updates;
    const hasExplanationUpdate = 'explanation' in updates;
    const choiceKeys           = Object.keys(updates).filter(k => k.startsWith('choice_'));

    if (!hasStemUpdate && !hasExplanationUpdate && choiceKeys.length === 0) return savedQuestion;

    // Rebuild updated choices
    const updatedChoices = savedQuestion.choices.map((c, i) => {
      const choiceBlock = updates[`choice_${i}`];
      if (!choiceBlock) return { content: c.content, is_correct: c.is_correct, order_index: c.order_index, correct_order: c.correct_order, group_name: c.group_name, match_id: c.match_id ?? undefined };
      return { content: choiceBlock, is_correct: c.is_correct, order_index: c.order_index, correct_order: c.correct_order, group_name: c.group_name, match_id: c.match_id ?? undefined };
    });

    const patchPayload: ApiQuestionCreate = {
      sub_lesson_id: savedQuestion.sub_lesson_id,
      question_type: savedQuestion.question_type,
      difficulty:    savedQuestion.difficulty,
      stem:          hasStemUpdate        ? updates['stem']        : savedQuestion.stem,
      explanation:   hasExplanationUpdate ? updates['explanation'] : savedQuestion.explanation ?? undefined,
      choices:       updatedChoices,
      blanks:        savedQuestion.blanks.map(b => ({ blank_index: b.blank_index, accepted_answers: b.accepted_answers, case_sensitive: b.case_sensitive })),
    };

    const patched = await questionService.update(id, patchPayload);
    pending.clear();
    return patched;
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const payload: ApiQuestionCreate = {
        sub_lesson_id: subLessonId ?? null,
        question_type: qType,
        category,
        difficulty: initialData?.difficulty ?? DIFFICULTY.MEDIUM,
        stem,
        explanation: explanation ?? undefined,
        choices: buildChoices(),
        blanks: buildBlanks(),
      };

      let saved = questionId
        ? await questionService.update(questionId, payload)
        : await questionService.create(payload);

      setSavedId(saved.id);

      // Upload any pending files now that we have an id
      saved = await flushPendingFiles(saved.id, saved);

      // Update stem/explanation state with real URLs if they changed
      if (saved.stem.media_url) setStem(saved.stem);
      if (saved.explanation?.media_url) setExplanation(saved.explanation);

      toast.success(t('questions.saveSuccess'));
      onSaved?.(saved);
    } catch {
      toast.error(t('questions.saveError'));
    } finally {
      setSaving(false);
    }
  }

  // ── Build preview question ────────────────────────────────────────────────

  function buildPreviewQuestion(): ApiQuestionResponse {
    const urls = pendingLocalUrls.current;
    const stemPreview = urls.has('stem')
      ? { ...stem, media_url: urls.get('stem') }
      : stem;
    const explanationPreview = explanation
      ? (urls.has('explanation') ? { ...explanation, media_url: urls.get('explanation') } : explanation)
      : null;
    return {
      id: savedId ?? 'preview',
      sub_lesson_id: subLessonId ?? null,
      question_type: qType,
      category,
      difficulty: initialData?.difficulty ?? DIFFICULTY.MEDIUM,
      stem: stemPreview,
      explanation: explanationPreview,
      status: 'draft',
      order_index: 0,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      choices: buildChoices().map((c, i) => {
        const localUrl = urls.get(`choice_${i}`);
        return {
          id: `preview-choice-${i}`,
          content: localUrl ? { ...c.content, media_url: localUrl } : c.content,
          is_correct: c.is_correct ?? null,
          order_index: c.order_index ?? i,
          correct_order: c.correct_order ?? null,
          group_name: c.group_name ?? null,
          match_id: null,
        };
      }),
      blanks: buildBlanks().map(b => ({
        id: `preview-blank-${b.blank_index}`,
        blank_index: b.blank_index,
        accepted_answers: b.accepted_answers,
        case_sensitive: b.case_sensitive ?? false,
      })),
    };
  }

  // ── Upload wrappers: immediate (savedId exists) or pending ────────────────

  function stemUploadProps() {
    if (savedId) {
      return {
        onUploadFile: async (file: File) => {
          const r = await uploadFile(savedId, 'stem', file);
          setStem(prev => ({ ...prev, media_key: r.media_key, media_url: r.media_url, original_filename: r.original_filename }));
          return r;
        },
        onUploadImageFile: async (file: File) => {
          const r = await uploadFile(savedId, 'stem_image', file);
          setStem(prev => ({ ...prev, image_key: r.media_key, image_url: r.media_url, image_filename: r.original_filename }));
          return r;
        },
        onUploadAudioFile: async (file: File) => {
          const r = await uploadFile(savedId, 'stem_audio', file);
          setStem(prev => ({ ...prev, audio_key: r.media_key, audio_url: r.media_url, audio_filename: r.original_filename }));
          return r;
        },
      };
    }
    return {
      onPendingFile: (file: File, localUrl: string) => {
        setPending('stem', file);
        pendingLocalUrls.current.set('stem', localUrl);
      },
      onPendingImageFile: (file: File, localUrl: string) => {
        setPending('stem_image', file);
        pendingLocalUrls.current.set('stem_image', localUrl);
      },
      onPendingAudioFile: (file: File, localUrl: string) => {
        setPending('stem_audio', file);
        pendingLocalUrls.current.set('stem_audio', localUrl);
      },
    };
  }

  function explanationUploadProps() {
    if (savedId) {
      return {
        onUploadFile: async (file: File) => {
          const r = await uploadFile(savedId, 'explanation', file);
          setExplanation(prev => prev ? { ...prev, media_key: r.media_key, media_url: r.media_url, original_filename: r.original_filename } : prev);
          return r;
        },
        onUploadImageFile: async (file: File) => {
          const r = await uploadFile(savedId, 'explanation_image', file);
          setExplanation(prev => prev ? { ...prev, image_key: r.media_key, image_url: r.media_url, image_filename: r.original_filename } : prev);
          return r;
        },
        onUploadAudioFile: async (file: File) => {
          const r = await uploadFile(savedId, 'explanation_audio', file);
          setExplanation(prev => prev ? { ...prev, audio_key: r.media_key, audio_url: r.media_url, audio_filename: r.original_filename } : prev);
          return r;
        },
      };
    }
    return {
      onPendingFile: (file: File, localUrl: string) => {
        setPending('explanation', file);
        pendingLocalUrls.current.set('explanation', localUrl);
      },
      onPendingImageFile: (file: File, localUrl: string) => {
        setPending('explanation_image', file);
        pendingLocalUrls.current.set('explanation_image', localUrl);
      },
      onPendingAudioFile: (file: File, localUrl: string) => {
        setPending('explanation_audio', file);
        pendingLocalUrls.current.set('explanation_audio', localUrl);
      },
    };
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const header = cardMode ? (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-slate-200 cursor-pointer select-none"
      onClick={() => setCollapsed(c => !c)}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">{t('questions.stem')} {(cardIndex ?? 0) + 1}</span>
        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">
          {t(`questions.type.${qType}`)}
        </span>
        <span className="text-xs text-slate-500 truncate max-w-[220px]">
          {stem.text ? stem.text.slice(0, 60) + (stem.text.length > 60 ? '…' : '') : ''}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {savedId && <span className="text-xs text-green-600 font-medium">✓ {t('questions.saveSuccess')}</span>}
        <span className="text-slate-400 text-xs">{collapsed ? '▼' : '▲'}</span>
      </div>
    </div>
  ) : null;

  const body = (
    <div className={`flex flex-col gap-6 ${cardMode ? 'p-4' : ''}`}>
      {/* Question type + Category */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">{t('questions.questionType')}</label>
          <select
            value={qType}
            onChange={e => {
              const next = e.target.value as QuestionType;
              setQType(next);
              setPreviewAnswer(undefined);
              if (['fit', 'fits', 'fib'].includes(next) && blanks.length === 0) {
                setBlanks([{ blank_index: 1, accepted_answers: [''], case_sensitive: false }]);
              }
            }}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {TYPE_GROUP_KEYS.map(groupKey => (
              <optgroup key={groupKey} label={t(`questions.typeGroup.${groupKey}`)}>
                {Object.values(QUESTION_TYPE).filter(v => TYPE_GROUP_MAP[v] === groupKey).map(v => (
                  <option key={v} value={v}>{t(`questions.type.${v}`)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600 block mb-1">{t('questions.category')}</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as QuestionCategory)}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value={QUESTION_CATEGORY.VOCABULARY}>{t('questions.category_vocabulary')}</option>
            <option value={QUESTION_CATEGORY.GRAMMAR}>{t('questions.category_grammar')}</option>
            <option value={QUESTION_CATEGORY.READING}>{t('questions.category_reading')}</option>
          </select>
        </div>
      </div>

      {/* Question-type-specific editor */}
      <div className="rounded-xl border border-slate-200 p-4">
        {qType === 'tf' && (
          <TrueFalseEditor
            stem={stem} onStemChange={setStem}
            tfCorrect={tfCorrect} onTfCorrectChange={setTfCorrect}
            {...stemUploadProps()}
          />
        )}
        {(qType === 'sc' || qType === 'mc') && (
          <ChoiceEditor
            stem={stem} choices={choices} multiple={qType === 'mc'}
            onStemChange={setStem} onChoicesChange={setChoices}
            {...stemUploadProps()}
            onPendingChoice={(idx, file, localUrl) => {
              setPending(`choice_${idx}`, file);
              pendingLocalUrls.current.set(`choice_${idx}`, localUrl);
            }}
          />
        )}
        {(qType === 'fit' || qType === 'fits' || qType === 'fib') && (
          <FillEditor
            questionType={qType} stem={stem} blanks={blanks}
            onStemChange={setStem} onBlanksChange={setBlanks}
            {...stemUploadProps()}
          />
        )}
        {qType === 'sq' && (
          <SequenceEditor
            stem={stem} choices={choices}
            onStemChange={setStem} onChoicesChange={setChoices}
            {...stemUploadProps()}
          />
        )}
        {qType === 'mat' && (
          <MatchingEditor
            stem={stem} pairs={matchingPairs}
            onStemChange={setStem} onPairsChange={setMatchingPairs}
            {...stemUploadProps()}
          />
        )}
        {qType === 'pair_match' && (
          <PairMatchEditor
            stem={stem} pairs={pairMatchPairs}
            onStemChange={setStem} onPairsChange={setPairMatchPairs}
            {...stemUploadProps()}
          />
        )}
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-slate-600">{t('questions.explanation')} ({t('questions.cancel').toLowerCase()})</label>
          {!explanation && (
            <button type="button"
              onClick={() => setExplanation({ type: CONTENT_MEDIA_TYPE.TEXT, text: '' })}
              className="text-xs text-blue-600 hover:text-blue-700">{t('questions.addExplanation')}</button>
          )}
        </div>
        {explanation && (
          <div className="flex flex-col gap-2">
            <ContentBlockEditor
              value={explanation}
              onChange={setExplanation}
              {...explanationUploadProps()}
              placeholder={t('questions.explanation') + '...'}
            />
            <button type="button" onClick={() => { setExplanation(null); clearPending('explanation'); }} className="self-start text-xs text-slate-400 hover:text-red-500">{t('questions.removeExplanation')}</button>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => { setPreview(false); setPreviewAnswer(undefined); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <span className="text-sm font-semibold text-slate-700">{t('questions.preview')}</span>
              <button
                type="button"
                onClick={() => { setPreview(false); setPreviewAnswer(undefined); }}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >✕</button>
            </div>
            <div className="p-5 overflow-y-auto">
              <QuestionViewer
                question={buildPreviewQuestion()}
                answer={previewAnswer}
                onAnswer={a => setPreviewAnswer(a)}
                quizMode
                showMeta
                className="border-0 p-0 shadow-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 justify-between">
        <button
          type="button"
          onClick={() => { setPreviewAnswer(undefined); setPreview(p => !p); }}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          {t('questions.preview')}
        </button>
        <div className="flex gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
              {t('questions.cancel')}
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? t('questions.saving') : questionId ? t('questions.update') : t('questions.save')}
          </button>
        </div>
      </div>
    </div>
  );

  if (cardMode) {
    return (
      <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
        {header}
        {!collapsed && body}
      </div>
    );
  }

  return <div className="flex flex-col gap-6">{body}</div>;
}
