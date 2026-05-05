import { X } from 'lucide-react';

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
}

export default function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  onClearAll,
  hasActiveFilters,
  layout = 'stacked',
}: FilterBarProps) {
  return (
    <div className={`card p-4 ${layout === 'inline' ? 'space-y-3' : 'space-y-3'}`}>
      {layout === 'inline' ? (
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="input pl-9 pr-4 w-full py-2 text-sm"
            />
          </div>

          {/* Separator */}
          <div className="w-px h-6 bg-slate-200 hidden sm:block" />

          {/* Filters */}
          {filters.map(filter => (
            <div key={filter.key} className="flex items-center gap-1.5">
              <label className="text-xs text-slate-500 font-medium whitespace-nowrap hidden md:block">
                {filter.label}:
              </label>
              <select
                value={filter.value}
                onChange={e => filter.onChange(e.target.value)}
                className="input py-2 text-xs min-w-[110px]"
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
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-2 rounded-lg hover:bg-red-50 shrink-0"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Search row */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="input pl-9 pr-4 w-full"
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
                  className="input py-1.5 text-xs min-w-[120px]"
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
                className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50"
              >
                <X size={12} />
                Clear
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
