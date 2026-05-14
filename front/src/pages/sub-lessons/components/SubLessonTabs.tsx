import { FileText, HelpCircle, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type Tab = 'documents' | 'scorm' | 'questions';

interface SubLessonTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  visibleTabs?: Tab[];
}

const TABS: { key: Tab; labelKey: string; icon: React.ReactNode }[] = [
  { key: 'documents', labelKey: 'documents', icon: <FileText size={16} /> },
  { key: 'scorm', labelKey: 'scorm', icon: <Package size={16} /> },
  { key: 'questions', labelKey: 'questions', icon: <HelpCircle size={16} /> },
];

export function SubLessonTabs({ activeTab, onTabChange, visibleTabs }: SubLessonTabsProps) {
  const { t } = useTranslation();
  const tabs = visibleTabs ? TABS.filter(tab => visibleTabs.includes(tab.key)) : TABS;

  return (
    <div className="flex border-b border-slate-200 overflow-x-auto">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === tab.key
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.icon} {t(`subLessons.tabs.${tab.labelKey}`)}
        </button>
      ))}
    </div>
  );
}
