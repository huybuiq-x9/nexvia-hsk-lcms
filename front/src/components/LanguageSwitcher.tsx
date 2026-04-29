import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const next: string = i18n.language === 'vi' ? 'en' : 'vi';
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
      title={i18n.language === 'vi' ? t('language.switchToEn') : t('language.switchToVi')}
    >
      <Globe size={15} />
      <span className="font-medium">{i18n.language === 'vi' ? 'EN' : 'VI'}</span>
    </button>
  );
}
