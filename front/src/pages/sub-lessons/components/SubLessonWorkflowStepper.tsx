import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUB_LESSON_STATUS } from '../../../types/api';

const WORKFLOW_STEPS = [
  { key: SUB_LESSON_STATUS.DRAFT },
  { key: SUB_LESSON_STATUS.IN_PROGRESS },
  { key: SUB_LESSON_STATUS.REVIEWING },
  { key: SUB_LESSON_STATUS.CONVERTING },
  { key: SUB_LESSON_STATUS.APPROVED },
];

const WORKFLOW_LABELS: Record<string, string> = {
  [SUB_LESSON_STATUS.DRAFT]:       'stepDraft',
  [SUB_LESSON_STATUS.IN_PROGRESS]: 'stepInProgress',
  [SUB_LESSON_STATUS.REVIEWING]:   'stepReviewing',
  [SUB_LESSON_STATUS.CONVERTING]:  'stepConverting',
  [SUB_LESSON_STATUS.APPROVED]:    'stepApproved',
};

interface SubLessonWorkflowStepperProps {
  currentStatus: string;
}

export function SubLessonWorkflowStepper({ currentStatus }: SubLessonWorkflowStepperProps) {
  const { t } = useTranslation();
  const currentIdx = WORKFLOW_STEPS.findIndex(s => s.key === currentStatus);

  return (
    <div className="card p-4">
      <div className="flex items-center overflow-x-auto gap-1">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isDone ? 'bg-green-500 text-white' :
                    isCurrent ? 'bg-blue-600 text-white' :
                    'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? <Check size={13} /> : idx + 1}
                </div>
                <span className={`text-[10px] mt-1 whitespace-nowrap ${
                  isCurrent ? 'text-blue-600 font-semibold' :
                  isFuture ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {t(`subLessons.workflow.${WORKFLOW_LABELS[step.key]}`)}
                </span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div
                  className={`w-8 sm:w-16 h-0.5 mx-1 ${
                    idx < currentIdx ? 'bg-green-400' : 'bg-slate-100'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
