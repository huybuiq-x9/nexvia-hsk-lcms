import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react';

export default function QuestionBankPage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
        <HelpCircle size={28} className="text-purple-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">{t('nav.questionBank')}</h2>
      <p className="text-sm text-slate-500 max-w-sm">{t('stub.questionBank')}</p>
    </div>
  );
}
