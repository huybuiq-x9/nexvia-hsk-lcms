import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface FilterOption {
  value: string;
  label: string;
}

export type FilterLayout = 'stacked' | 'inline';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filters: {
    key: string;
    label: string;
    value: string;
    options: FilterOption[];
    onChange: (value: string) => void;
  }[];
  onClearAll: () => void;
  hasActiveFilters: boolean;
  layout?: FilterLayout;
  extra?: ReactNode;
}

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  onClearAll,
  hasActiveFilters,
  layout = 'stacked',
  extra,
}: FilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className={`card border-blue-100/70 bg-white/95 p-4 shadow-blue-100/40 ${layout === 'inline' ? 'space-y-3' : 'space-y-3'}`}>
      {layout === 'inline' ? (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="input h-11 w-full rounded-lg border-slate-200 bg-white pl-10 pr-4 text-sm shadow-inner shadow-slate-100/60 placeholder:text-slate-400"
            />
          </div>

          {/* Separator */}
          <div className="hidden h-8 w-px bg-blue-100 sm:block" />

          {/* Filters */}
          {filters.map(filter => (
            <div key={filter.key} className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap hidden md:block">
                {filter.label}:
              </label>
              <select
                value={filter.value}
                onChange={e => filter.onChange(e.target.value)}
                className="input h-11 min-w-[130px] rounded-lg border-slate-200 bg-white py-2 text-sm font-medium text-slate-700"
              >
                {filter.options.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Clear */}
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              <X size={12} />
              {t('common.clear')}
            </button>
          )}

          {/* Extra (e.g. role filter button) */}
          {extra && <div className="ml-auto">{extra}</div>}
        </div>
      ) : (
        <>
          {/* Search row */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" />
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="input h-11 w-full rounded-lg border-slate-200 bg-white pl-10 pr-4 shadow-inner shadow-slate-100/60 placeholder:text-slate-400"
            />
          </div>

          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2">
            {filters.map(filter => (
              <div key={filter.key} className="flex items-center gap-2">
                <label className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  {filter.label}:
                </label>
                <select
                  value={filter.value}
                  onChange={e => filter.onChange(e.target.value)}
                  className="input min-w-[130px] rounded-lg border-slate-200 bg-white py-2 text-xs font-medium text-slate-700"
                >
                  {filter.options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {hasActiveFilters && (
              <button
                onClick={onClearAll}
                className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <X size={12} />
                {t('common.clear')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
