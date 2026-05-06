import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const currentLanguage = i18n.language?.startsWith('vi') ? 'vi' : 'en';

  const changeLanguage = (language: 'en' | 'vi') => {
    if (currentLanguage !== language) {
      i18n.changeLanguage(language);
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white/80 p-1 shadow-sm"
      title={t('language.switch')}
    >
      <Globe size={15} className="ml-1 text-slate-400" />
      <button
        type="button"
        onClick={() => changeLanguage('en')}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
          currentLanguage === 'en'
            ? 'bg-blue-600 text-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
        aria-pressed={currentLanguage === 'en'}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => changeLanguage('vi')}
        className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
          currentLanguage === 'vi'
            ? 'bg-blue-600 text-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
        aria-pressed={currentLanguage === 'vi'}
      >
        VI
      </button>
    </div>
  );
}
