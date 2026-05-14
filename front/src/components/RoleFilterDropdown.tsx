import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { ApiUserWithRoles } from '../types/api';

interface RoleSectionProps {
  label: string;
  users: ApiUserWithRoles[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onLoad: () => void;
}

function RoleSection({ label, users, selectedIds, onChange, onLoad }: RoleSectionProps) {
  const [expanded, setExpanded] = useState(selectedIds.length > 0);

  useEffect(() => {
    if (selectedIds.length === 0) setExpanded(false);
  }, [selectedIds.length]);

  const toggle = () => {
    if (!expanded) {
      onLoad();
      setExpanded(true);
    } else {
      onChange([]);
      setExpanded(false);
    }
  };

  const toggleUser = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < users.length;
  const isAllChecked = users.length > 0 && selectedIds.length === users.length;

  return (
    <div className="py-1.5">
      <label className="flex items-center gap-2 px-3 py-1 cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={expanded}
          ref={el => { if (el) el.indeterminate = isIndeterminate; }}
          onChange={toggle}
          className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
        />
        <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors ${expanded ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
          {label}
          {selectedIds.length > 0 && (
            <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 font-bold">
              {selectedIds.length}
            </span>
          )}
        </span>
      </label>

      {expanded && (
        <div className="mt-1 mx-2 rounded-lg bg-slate-50 border border-slate-100 max-h-40 overflow-y-auto">
          {users.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400 italic">Loading...</div>
          ) : (
            <>
              {users.length > 2 && (
                <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white transition-colors border-b border-slate-100">
                  <input
                    type="checkbox"
                    checked={isAllChecked}
                    onChange={() => onChange(isAllChecked ? [] : users.map(u => u.id))}
                    className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 italic">Select all</span>
                </label>
              )}
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer shrink-0"
                  />
                  <span className="text-sm text-slate-700 truncate">{u.full_name}</span>
                </label>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface RoleFilterDropdownProps {
  experts: ApiUserWithRoles[];
  teachers: ApiUserWithRoles[];
  converters: ApiUserWithRoles[];
  selectedExpertIds: string[];
  selectedTeacherIds: string[];
  selectedConverterIds: string[];
  onExpertChange: (ids: string[]) => void;
  onTeacherChange: (ids: string[]) => void;
  onConverterChange: (ids: string[]) => void;
  onLoadExperts: () => void;
  onLoadTeachers: () => void;
  onLoadConverters: () => void;
  labels: {
    expert: string;
    teacher: string;
    converter: string;
  };
}

export default function RoleFilterDropdown({
  experts, teachers, converters,
  selectedExpertIds, selectedTeacherIds, selectedConverterIds,
  onExpertChange, onTeacherChange, onConverterChange,
  onLoadExperts, onLoadTeachers, onLoadConverters,
  labels,
}: RoleFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeCount = selectedExpertIds.length + selectedTeacherIds.length + selectedConverterIds.length;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        title="Filter by role"
        className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-sm transition-colors ${
          activeCount > 0
            ? 'border-blue-300 bg-blue-50 text-blue-600'
            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <SlidersHorizontal size={15} />
        {activeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 text-[10px] font-bold bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-slate-200 w-60 overflow-hidden">
          <RoleSection
            label={labels.expert}
            users={experts}
            selectedIds={selectedExpertIds}
            onChange={onExpertChange}
            onLoad={onLoadExperts}
          />
          <div className="border-t border-slate-100 mx-3" />
          <RoleSection
            label={labels.teacher}
            users={teachers}
            selectedIds={selectedTeacherIds}
            onChange={onTeacherChange}
            onLoad={onLoadTeachers}
          />
          <div className="border-t border-slate-100 mx-3" />
          <RoleSection
            label={labels.converter}
            users={converters}
            selectedIds={selectedConverterIds}
            onChange={onConverterChange}
            onLoad={onLoadConverters}
          />
          {activeCount > 0 && (
            <>
              <div className="border-t border-slate-100 mt-1.5" />
              <div className="px-3 py-2.5">
                <button
                  onClick={() => { onExpertChange([]); onTeacherChange([]); onConverterChange([]); }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                >
                  Clear role filters
                </button>
              </div>
            </>
          )}
          <div className="pb-0.5" />
        </div>
      )}
    </div>
  );
}
